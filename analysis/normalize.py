"""
Per-sheet normalizer for the MOP workbook.

DESIGN RULE (non-negotiable):
  Every record is produced from ONE source row of ONE source sheet.
  No offer, price or variant is ever inherited, shifted or inferred from a
  neighbouring row. Where a row is structurally unusable it is emitted as a
  REJECTED record with a reason - never silently filled in, never dropped,
  never merged with a similarly-named row.

READ-ONLY. The workbook is never written to.
"""
import json, re, os, hashlib, datetime
from collections import OrderedDict, defaultdict
import openpyxl

SRC = r"C:\Users\Mehul\Downloads\MOBILE SHOP CATLOG FOR PHONES\data\MOP LIST NEW 28.10.25.xlsx"
OUT = r"C:\Users\Mehul\Downloads\MOBILE SHOP CATLOG FOR PHONES\analysis"

# ----------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------
def cell_str(v):
    if v is None: return ""
    if isinstance(v, (datetime.datetime, datetime.date)): return v.isoformat()
    if isinstance(v, float) and v.is_integer(): return str(int(v))
    return str(v).strip()

def col_letter(i):
    s = ""
    while i:
        i, r = divmod(i - 1, 26); s = chr(65 + r) + s
    return s

def norm_ws(s):
    return re.sub(r"\s+", " ", (s or "")).strip()

def _strip_non_prices(t):
    """Remove tokens that look numeric but are NOT rupee amounts, so a parser can
       never mistake them for a price. Handles 8GB / 128GB / 1TB and month tenors
       such as 'UPTO 3M' / 'UPTO 6M' / '9M' which mean MONTHS, not rupees."""
    t = re.sub(r"\b\d{1,2}\s*(?:GB|G)\b", " ", t, flags=re.I)      # 8GB
    t = re.sub(r"\b(?:64|128|256|512|1\s*TB|2\s*TB)\b", " ", t, flags=re.I)
    t = MONTH_TENOR_RE.sub(" ", t)                                  # 3M / 6M / 9M = months
    return t

def money(s):
    """first standalone integer >= 100 that is not part of a RAM/storage/tenor token"""
    if not s: return None
    t = _strip_non_prices(str(s))
    for m in re.finditer(r"(?<![\d/])(\d[\d,]*)", t):
        raw = m.group(1).replace(",", "")
        if len(raw) >= 3 and int(raw) >= 100:
            return int(raw)
    return None

def all_money(s):
    if not s: return []
    t = _strip_non_prices(str(s))
    out = []
    for m in re.finditer(r"(?<![\d/])(\d[\d,]*)", t):
        raw = m.group(1).replace(",", "")
        if len(raw) >= 3 and int(raw) >= 100:
            out.append(int(raw))
    return out

# Variant forms seen in the workbook (all must be lifted out of the model name):
#   "(8/128)"  "(4/64)"  "(12/512)"      -> plain slash, implied GB
#   "(8GB/128GB)" "(12/256GB)" "(16/1TB)" -> explicit units
#   "(128)" "(256gb)" "(1TB)"            -> storage only (Apple)
VARIANT_RE = re.compile(
    r"\(\s*(\d{1,2})\s*(?:GB|G)?\s*(?:/|\s*-\s*/\s*)\s*(\d{1,4})\s*(GB|TB|gb|tb)?\s*\)")
VARIANT_ALT_RE = re.compile(r"\(\s*(\d{1,4})\s*(GB|TB|gb|tb)\s*\)")
# month-tenor tokens that must never be read as rupee amounts: "3M", "6M", "9M", "12M"
MONTH_TENOR_RE = re.compile(r"(?<![\d/])(\d{1,2})\s*M\b", re.I)
VARIANT_ALT_BARE_RE = re.compile(r"\(\s*(\d{1,4})\s*\)")
NETWORK_RE = re.compile(r"\b(4G|5G|LTE|WIFI|Wi-Fi)\b", re.I)

def split_model(raw):
    """Split a raw col-A label into (model, variant, network, extras).
       Purely string-local - never consults another row."""
    t = norm_ws(raw)
    ram = storage = ""
    m = VARIANT_RE.search(t)
    if m:
        ram = m.group(1)
        storage = m.group(2) + (m.group(3).upper() if m.group(3) else "GB")
        t = (t[:m.start()] + " " + t[m.end():]).strip()
    else:
        m2 = VARIANT_ALT_RE.search(t)
        if m2:
            storage = m2.group(1) + m2.group(2).upper()
            t = (t[:m2.start()] + " " + t[m2.end():]).strip()
        else:
            m3 = VARIANT_ALT_BARE_RE.search(t)
            if m3:
                storage = m3.group(1) + "GB"
                t = (t[:m3.start()] + " " + t[m3.end():]).strip()
    storage = re.sub(r"\s+", "", storage).upper()
    # Fallback: a variant written WITHOUT parentheses, e.g. "10  256gb" (GOOGLE)
    # or "INSTA 360 GO3 32GB" (ACCESSORIES). Only fires when nothing else matched.
    if not storage:
        m4 = re.search(r"(?<![\d/])(\d{1,4})\s*(GB|TB)\b", t, re.I)
        if m4:
            storage = m4.group(1) + m4.group(2).upper()
            t = (t[:m4.start()] + " " + t[m4.end():]).strip()
    net = ""
    nets = NETWORK_RE.findall(t)
    if nets:
        net = nets[-1].upper()
    extras = []
    if re.search(r"WITH\s*PEN", t, re.I): extras.append("WITH PEN")
    if re.search(r"\+\s*KEYBOARD|WITH\s+KEYBOARD", t, re.I): extras.append("WITH KEYBOARD")
    if re.search(r"COLOR\b", t, re.I): extras.append("COLOR")
    if re.search(r"JBL\s*EDITION", t, re.I): extras.append("JBL EDITION")
    model = norm_ws(re.sub(r"\s*\(|\)\s*", " ", t))
    model = norm_ws(re.sub(r"\s{2,}", " ", model))
    return model, ram, storage, net, extras

PCT_RE = re.compile(r"(\d+(?:\.\d+)?)\s*%\s*OFF", re.I)
UPTO_RE = re.compile(r"UPTO\s*(\d[\d,]*)", re.I)
AMT_RE = re.compile(r"(?<![\d/])(\d[\d,]{2,})\s*(?:/-|/\-)?", re.I)

def parse_offer(text):
    """Return structured offer facts from ONE cell's text. No cross-row logic."""
    o = {
        "raw": norm_ws(text) if text else "",
        "percent_off": None, "upto_amount": None,
        "fixed_amounts": [], "valid_till": None,
        "banks": [], "channels": [], "offer_kinds": [],
    }
    t = o["raw"]
    if not t: return o
    m = PCT_RE.search(t)
    if m: o["percent_off"] = float(m.group(1))
    m = UPTO_RE.search(t)
    # "UPTO 3M" / "UPTO 6M" are MONTH tenors, not rupee caps -> reject that match
    if m and re.match(r"\s*M\b", t[m.end():], re.I):
        m2 = UPTO_RE.search(t, m.end())
        m = m2
    if m: o["upto_amount"] = int(m.group(1).replace(",", ""))
    o["fixed_amounts"] = [x for x in all_money(t) if x <= 60000][:6]

    up = t.upper()
    for b in ["AXIS","ICICI","HDFC","SBI","KOTAK","IDFC","BOB","YES BANK","FEDERAL","DBS",
              "INDUSIND","INDUSLAND","AU","AMEX","ONE CARD","ROAR BANK","JUPITER","ONECARD",
              "PNB","ONE CARD"]:
        if b in up: o["banks"].append(b)
    for c in ["EMI","UPI","FS","FULL SWIPE","UPGRADE","CASHBACK","INSTANT OFF","INSTANT CASHBACK"]:
        if c in up: o["channels"].append(c)
    for k, pat in [("cashback","CASHBACK"),("instant_off","INSTANT OFF"),
                   ("exchange","UPGRADE"),("emi","EMI"),("upi","UPI")]:
        if pat in up: o["offer_kinds"].append(k)
    m = re.search(r"(?:TILL|THRU|UPTO)\s*(\d{1,2}\s*(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC))",
                  up)
    if m: o["valid_till"] = m.group(1)
    return o

# ----------------------------------------------------------------------------
# SHEET RULES  -- explicit, per sheet. No inference at runtime.
# ----------------------------------------------------------------------------
# price_mode:
#   "cell_b"        -> B holds a clean numeric MOP
#   "cell_b_dual"   -> B holds "MOP  OFFERPRICE OFFER <date>"  (SAMSUNG)
#   "cell_b_text"   -> B holds cashback/offer text, NO price    (APPLE iPad/Watch)
#   "in_label"      -> price is embedded at the tail of col A   (MOTOROLA/ACCESSORIES/ACC2)
#   "none"          -> no price on this sheet
SHEET_RULES = {
 "MI":              dict(brand="XIAOMI", model="A", price="B", offer="C", cashback="E",
                         header=1, price_mode="cell_b", kind="phones+tablets+tv",
                         subblocks=[(2,43,"phone"),(45,58,"tablet"),(60,67,"tv")],
                         label_only_rows={56,58}, blank_ok=True),
 "GOOGLE":          dict(brand="GOOGLE PIXEL", model="A", price="B", offer="C", card="D",
                         header=1, price_mode="cell_b", kind="phones", blank_ok=True),
 "SAMSUNG":         dict(brand="SAMSUNG", model="A", price="B", offer="D",
                         header=1, price_mode="cell_b_dual", kind="phones+tablets+audio+wearables",
                         subblocks=[(2,107,"phone"),(109,156,"tablet"),(158,162,"audio"),(164,178,"wearable")],
                         blank_ok=True),
 "OPPO":            dict(brand="OPPO", model="A", price="B", offer="C",
                         header=1, price_mode="cell_b", kind="phones+tablets+accessory", blank_ok=True),
 "REALME":          dict(brand="REALME", model="A", price="B", offer="C",
                         header=1, price_mode="cell_b", kind="phones+tablets", blank_ok=True),
 "MOTOROLA":        dict(brand="MOTOROLA", model="A", price="B", offer="C",
                         header=None, price_mode="hybrid_cell_b_or_in_label", kind="phones+tablets",
                         subblocks=[(2,38,"phone"),(40,49,"tablet")],
                         label_only_rows={40}, blank_ok=True),
 "VIVO  IQOO":      dict(brand="VIVO / IQOO", model="A", price="B", offer="C",
                         header=1, price_mode="cell_b", kind="phones+tablets", blank_ok=True),
 "LENOVO":          dict(brand="LENOVO", model="A", price="B", offer=None,
                         header=None, price_mode="cell_b", kind="tablets", blank_ok=True),
 "NOKIA":           dict(brand="NOKIA (HMD)", model="A", price="B", offer="C",
                         header=1, price_mode="cell_b", kind="feature_phones", blank_ok=True),
 "APPLE":           dict(brand="APPLE", model="A", price="B", cashback="C",
                         header=1, price_mode="hybrid_cell_b_numeric_or_cashbacktext",
                         kind="iphones+tablets+wearables+audio", blank_ok=True),
 "INFINIX  TECNO":  dict(brand=None, model="A", price="B", offer="C",
                         header=1, price_mode="hybrid_cell_b_or_in_label",
                         kind="multi_brand", brand_header_rows={2,22,34,45,55},
                         label_only_rows=set(), blank_ok=True),
 "NOTHING":         dict(brand="NOTHING", model="A", price="B", offer="C",
                         header=None, price_mode="cell_b", kind="phones", blank_ok=True),
 "ONEPLUS":         dict(brand="ONEPLUS", model="A", price="B", offer=None,
                         header=1, price_mode="cell_b", kind="phones", blank_ok=True),
 "ACCESSORIES":     dict(brand=None, model="A", price=None, offer=None,
                         header=None, price_mode="in_label", kind="accessories_two_column",
                         label_only_rows=set(), blank_ok=True),
 "ACC. 2":          dict(brand=None, model="A", price=None, offer=None,
                         header=None, price_mode="in_label", kind="accessories_screen_guard", blank_ok=True),
 "SERVICE CENTER":  dict(brand=None, model="A", price=None, offer=None,
                         header=None, price_mode="none", kind="service_centers", blank_ok=True),
 "NO WEEK OFF CALENDER": dict(brand=None, model="A", price=None, offer=None,
                         header=None, price_mode="none", kind="calendar", blank_ok=True),
 "Sheet100":        dict(brand=None, model="A", price=None, offer=None,
                         header=None, price_mode="none", kind="EMPTY", blank_ok=True),
}

JUNK_LABEL_RE = re.compile(r"^[\-–—\.\s]+$|^-{2,}$")

def load_grid():
    wb = openpyxl.load_workbook(SRC, data_only=True)
    g = {}
    for name in wb.sheetnames:
        ws = wb[name]
        rows = {}
        for r in range(1, (ws.max_row or 0) + 1):
            cells = {}
            for c in range(1, (ws.max_column or 0) + 1):
                s = cell_str(ws.cell(row=r, column=c).value)
                if s: cells[col_letter(c)] = s
            if cells: rows[r] = cells
        g[name] = rows
    return g

def make_record(sheet, row_no, cells, rule, subblock, brand_override=None):
    """Build exactly one record from exactly one row. Returns (record, status)."""
    def get(col):
        return cells.get(col, "") if col else ""

    label = norm_ws(get(rule["model"]))
    price_cell = get(rule.get("price"))
    offer_cell = get(rule.get("offer")) or get(rule.get("card")) or get(rule.get("cashback"))
    offer_src_col = None
    for c in (rule.get("offer"), rule.get("card"), rule.get("cashback")):
        if c and get(c):
            offer_src_col = c; break

    rec = OrderedDict()
    rec["record_id"] = f"{re.sub(r'[^A-Za-z0-9]+','_',sheet).strip('_')}_R{row_no}"
    rec["source_sheet"] = sheet
    rec["source_row"] = row_no
    rec["source_cells"] = {k: v for k, v in cells.items()}
    rec["brand"] = brand_override or rule.get("brand") or "UNASSIGNED"
    rec["category"] = subblock
    rec["raw_label"] = label
    rec["mop"] = None
    rec["offer_price"] = None
    rec["offer"] = None
    rec["price_source"] = None
    rec["status"] = "ok"
    rec["issues"] = []

    if not label or JUNK_LABEL_RE.match(label):
        rec["status"] = "rejected"
        rec["issues"].append("LABEL_EMPTY_OR_JUNK")
        return rec, "rejected"

    model, ram, storage, net, extras = split_model(label)
    rec["model"] = model
    rec["ram_gb"] = ram
    rec["storage"] = storage
    rec["network"] = net
    rec["extras"] = extras

    mode = rule["price_mode"]

    # ---- price extraction, per sheet mode ----
    if mode == "cell_b":
        rec["mop"] = money(price_cell)
        rec["price_source"] = f"{sheet}!{rule['price']}{row_no}" if price_cell else None
        if not price_cell:
            rec["issues"].append("PRICE_CELL_EMPTY_ON_THIS_ROW")
    elif mode == "cell_b_dual":
        # SAMSUNG: "19999/-   19499/- OFFER 28 SEPT"  -> mop, offer_price
        vals = all_money(price_cell)
        if len(vals) >= 2:
            rec["mop"], rec["offer_price"] = vals[0], vals[1]
            rec["price_source"] = f"{sheet}!{rule['price']}{row_no}"
        elif len(vals) == 1:
            rec["mop"] = vals[0]
            rec["price_source"] = f"{sheet}!{rule['price']}{row_no}"
            rec["issues"].append("SINGLE_PRICE_IN_MOP_CELL")
        else:
            rec["issues"].append("PRICE_CELL_EMPTY_ON_THIS_ROW")
    elif mode == "hybrid_cell_b_or_in_label":
        v = money(price_cell)
        if v is not None:
            rec["mop"] = v
            rec["price_source"] = f"{sheet}!{rule['price']}{row_no}"
        else:
            tail = re.search(r"[-–]\s*(\d[\d,]*)\s*(?:/-)?\s*$", label)
            if tail:
                rec["mop"] = int(tail.group(1).replace(",", ""))
                rec["price_source"] = f"{sheet}!{rule['model']}{row_no} (label tail)"
                m, ram, storage, net, extras = split_model(label[:tail.start()])
                rec["model"], rec["ram_gb"], rec["storage"] = m, ram, storage
                rec["network"], rec["extras"] = net, extras
            else:
                rec["issues"].append("NO_PRICE_ON_THIS_ROW")
    elif mode == "hybrid_cell_b_numeric_or_cashbacktext":
        # APPLE: B is numeric for iPhones/audio, but is CASHBACK TEXT for iPad/Watch rows
        if re.fullmatch(r"[\d,]+", price_cell.strip() or "x"):
            rec["mop"] = money(price_cell)
            rec["price_source"] = f"{sheet}!{rule['price']}{row_no}"
        elif "CASHBACK" in price_cell.upper():
            rec["mop"] = None
            rec["price_source"] = None
            rec["issues"].append("B_HOLDS_CASHBACK_TEXT_NOT_PRICE")
        else:
            rec["issues"].append("NO_PRICE_ON_THIS_ROW")
    elif mode == "in_label":
        tail = re.search(r"[-–_]\s*(\d[\d,]*)\s*(?:/-)?\s*$", label)
        if tail:
            rec["mop"] = int(tail.group(1).replace(",", ""))
            rec["price_source"] = f"{sheet}!{rule['model']}{row_no} (label tail)"
            m, ram, storage, net, extras = split_model(label[:tail.start()])
            rec["model"], rec["ram_gb"], rec["storage"] = m, ram, storage
            rec["network"], rec["extras"] = net, extras
        else:
            rec["issues"].append("NO_PRICE_ON_THIS_ROW")
    elif mode == "none":
        pass

    # ---- offer (same row only) ----
    if offer_cell:
        rec["offer"] = parse_offer(offer_cell)
        rec["offer"]["source_cell"] = f"{sheet}!{offer_src_col}{row_no}"
    if rec["offer_price"] is not None and rec["mop"] is not None:
        rec["effective_price"] = rec["offer_price"]
    else:
        rec["effective_price"] = rec["mop"]

    # ---- integrity flags ----
    if rec["mop"] is None and rec["status"] == "ok":
        # A row may legitimately carry an offer but no price (e.g. APPLE accessory
        # rows where col B holds cashback text). Keep the OWN-ROW offer - dropping it
        # would destroy real data - but flag the record as price-incomplete so the
        # UI can never show a price for it. It is NEVER completed from a neighbour.
        rec["status"] = "price_missing" if rec.get("offer") else "rejected"
        rec["issues"].append("OFFER_PRESENT_BUT_NO_MOP_ON_THIS_ROW" if rec.get("offer")
                             else "NO_MOP_ON_THIS_ROW")
        if rec.get("offer"):
            rec["effective_price"] = None
    if rec["mop"] is not None and rec["offer_price"] is not None and rec["offer_price"] > rec["mop"]:
        rec["issues"].append("OFFER_PRICE_ABOVE_MOP")
    return rec, rec["status"]

def normalize():
    grid = load_grid()
    all_recs, per_sheet = [], {}
    for sheet, rule in SHEET_RULES.items():
        rows = grid.get(sheet, {})
        recs = []
        cur_brand = rule.get("brand")
        brand_header_rows = rule.get("brand_header_rows", set())
        for r in sorted(rows.keys()):
            if rule.get("header") and r <= rule["header"]:
                continue
            cells = rows[r]
            # sub-block / brand section resolution
            subblock = rule.get("kind")
            if rule.get("subblocks"):
                subblock = rule["kind"]
                for lo, hi, cat in rule["subblocks"]:
                    if lo <= r <= hi:
                        subblock = cat; break
            if r in brand_header_rows:
                cur_brand = norm_ws(cells.get("A", "")).upper()
                continue
            if r in rule.get("label_only_rows", set()):
                rec, st = make_record(sheet, r, cells, rule, subblock, brand_override=cur_brand)
                rec["status"] = "section_label"
                rec["label_role"] = "continuation/section label - NOT a product row"
                rec["issues"].append("SECTION_LABEL_ROW")
                recs.append(rec); continue
            rec, st = make_record(sheet, r, cells, rule, subblock, brand_override=cur_brand)
            recs.append(rec)
        per_sheet[sheet] = recs
        all_recs.extend(recs)
    return all_recs, per_sheet

# ----------------------------------------------------------------------------
if __name__ == "__main__":
    recs, per_sheet = normalize()
    ok = [r for r in recs if r["status"] == "ok"]
    rej = [r for r in recs if r["status"] == "rejected"]
    lab = [r for r in recs if r["status"] == "section_label"]

    p = os.path.join(OUT, "normalized_records.json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump({"records": recs}, f, ensure_ascii=False, indent=1)

    print(f"TOTAL source rows read : {sum(len(v) for v in per_sheet.values())}")
    print(f"OK records             : {len(ok)}")
    print(f"REJECTED (no MOP)      : {len(rej)}")
    print(f"SECTION LABELS         : {len(lab)}")
    print()
    print(f"{'SHEET':<24}{'ROWS':>6}{'OK':>6}{'REJ':>6}{'LABEL':>7}{'OFFERS':>8}{'PRICE':>7}")
    for sheet, rs in per_sheet.items():
        o = sum(1 for r in rs if r["status"] == "ok")
        rj = sum(1 for r in rs if r["status"] == "rejected")
        lb = sum(1 for r in rs if r["status"] == "section_label")
        of = sum(1 for r in rs if r.get("offer"))
        pr = sum(1 for r in rs if r.get("mop"))
        print(f"{sheet:<24}{len(rs):>6}{o:>6}{rj:>6}{lb:>7}{of:>8}{pr:>7}")

    print("\n--- REJECTED (must NOT be filled from neighbours) ---")
    for r in rej:
        print(f"  {r['record_id']:<34} raw={r['raw_label'][:52]:<54} {r['issues']}")
    print("\n--- SECTION LABELS ---")
    for r in lab:
        print(f"  {r['record_id']:<34} raw={r['raw_label'][:60]}")
    print("\nwrote", p)
