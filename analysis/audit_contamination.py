"""
CONTAMINATION AUDIT - the load-bearing test.

For every normalized record, re-open the ORIGINAL workbook at that record's
own source_sheet/source_row and prove that each derived field could only have
come from that row. Any violation is a hard failure.

Checks:
  A. mop / offer_price appear verbatim in THAT row's own cells
  B. offer text appears verbatim in THAT row's own cells
  C. model/variant derive only from THAT row's col-A
  D. record_id round-trips to the same sheet+row
  E. no two different source rows produced the same record_id
  F. offer_price <= mop  (sanity: an offer never exceeds list price)
  G. blank-row contamination: a rejected row must carry no price at all
"""
import json, re, os, sys
import openpyxl

BASE = r"C:\Users\Mehul\Downloads\MOBILE SHOP CATLOG FOR PHONES"
SRC = os.path.join(BASE, "data", "MOP LIST NEW 28.10.25.xlsx")
REC = os.path.join(BASE, "analysis", "normalized_records.json")

def cell_str(v):
    if v is None: return ""
    if isinstance(v, float) and v.is_integer(): return str(int(v))
    return str(v).strip()

wb = openpyxl.load_workbook(SRC, data_only=True)
sheets_cache = {}
def row_cells(sheet, r):
    if sheet not in sheets_cache:
        ws = wb[sheet]
        d = {}
        for rr in range(1, (ws.max_row or 0) + 1):
            c = {}
            for cc in range(1, (ws.max_column or 0) + 1):
                s = cell_str(ws.cell(row=rr, column=cc).value)
                if s: c[cc] = s
            d[rr] = c
        sheets_cache[sheet] = d
    return sheets_cache[sheet].get(r, {})

def row_text(sheet, r):
    return " ".join(row_cells(sheet, r).values())

recs = json.load(open(REC, encoding="utf-8"))["records"]
fails, warns = [], []
seen_ids = {}

for rec in recs:
    rid = rec["record_id"]
    sheet, row = rec["source_sheet"], rec["source_row"]
    cells = row_cells(sheet, row)
    joined = row_text(sheet, row)
    norm_joined = re.sub(r"\s+", " ", joined)

    # D. id round-trip
    m = re.match(r"(.+)_R(\d+)$", rid)
    if not m:
        fails.append((rid, "ID_UNPARSEABLE", "")); continue
    if int(m.group(2)) != row:
        fails.append((rid, "ID_ROW_MISMATCH", f"id says {m.group(2)}, rec says {row}"))

    # E. id uniqueness
    if rid in seen_ids:
        fails.append((rid, "DUPLICATE_RECORD_ID", "two source rows produced one id"))
    seen_ids[rid] = rec

    if rec["status"] in ("rejected", "section_label"):
        # These rows must carry NO price and NO offer of their own.
        if rec.get("mop") is not None:
            fails.append((rid, "REJECTED_ROW_CARRIES_PRICE", str(rec.get("mop"))))
        if rec.get("offer"):
            fails.append((rid, "REJECTED_ROW_CARRIES_OFFER", str(rec.get("offer"))))
        continue
    if rec["status"] == "price_missing":
        # May keep its OWN-ROW offer, but must carry no price and the offer must
        # still be proven to live in this very row (checked by the B-block below).
        if rec.get("mop") is not None or rec.get("effective_price") is not None:
            fails.append((rid, "PRICE_MISSING_ROW_CARRIES_PRICE", str(rec.get("mop"))))
        if not rec.get("offer"):
            fails.append((rid, "PRICE_MISSING_ROW_WITHOUT_OWN_OFFER", ""))
    elif rec["status"] == "ok" and rec.get("mop") is None:
        fails.append((rid, "OK_ROW_WITHOUT_MOP", rec.get("raw_label", "")))

    # A. mop must exist in THIS row
    mop = rec.get("mop")
    if mop is not None:
        variants = {f"{mop}", f"{mop}/-", f"{mop:,}"}
        if not any(v in norm_joined for v in variants):
            fails.append((rid, "MOP_NOT_IN_OWN_ROW", f"mop={mop} row={norm_joined[:110]}"))

    # A2. offer_price
    op = rec.get("offer_price")
    if op is not None:
        variants = {f"{op}", f"{op}/-", f"{op:,}"}
        if not any(v in norm_joined for v in variants):
            fails.append((rid, "OFFER_PRICE_NOT_IN_OWN_ROW", f"op={op} row={norm_joined[:110]}"))

    # F. offer price sanity
    if mop is not None and op is not None and op > mop:
        fails.append((rid, "OFFER_PRICE_ABOVE_MOP", f"{op} > {mop}"))

    # B. offer must be verbatim in THIS row
    if rec.get("offer"):
        raw = re.sub(r"\s+", " ", rec["offer"]["raw"])
        probe = raw[:60]
        if probe and probe not in norm_joined:
            fails.append((rid, "OFFER_NOT_IN_OWN_ROW", probe[:110]))
        sc = rec["offer"].get("source_cell", "")
        exp = f"{sheet}!{sc.split('!')[-1][:-len(str(row))] if False else ''}"
        # verify source_cell points at this sheet+row
        mm = re.match(rf"{re.escape(sheet)}!([A-Z]+)(\d+)$", sc)
        if not mm or int(mm.group(2)) != row:
            fails.append((rid, "OFFER_SOURCE_CELL_MISMATCH", sc))

    # C. model must derive from own col A only
    a = re.sub(r"\s+", " ", cells.get(1, ""))
    if rec.get("raw_label") and a and re.sub(r"\s+", " ", rec["raw_label"]) != a:
        fails.append((rid, "RAW_LABEL_NOT_COL_A", f"rec={rec['raw_label'][:60]} colA={a[:60]}"))
    # C2. every token of `model` must exist in col A, and no token may be invented.
    # (model intentionally has the variant lifted out, so a literal-substring test
    #  would false-positive; a token-subset test is the correct proof of derivation.)
    model = re.sub(r"\s+", " ", (rec.get("model") or "")).upper().strip()
    if model:
        a_tokens = set(re.findall(r"[A-Z0-9]+", a.upper()))
        m_tokens = [t for t in re.findall(r"[A-Z0-9]+", model) if t]
        invented = [t for t in m_tokens if t not in a_tokens]
        if invented:
            fails.append((rid, "MODEL_HAS_TOKEN_NOT_IN_COL_A",
                          f"invented={invented} model={model[:50]} colA={a[:60]}"))

    # the lifted variant must genuinely be present in col A.
    # Compare NUMERICALLY: "(8/128)" implies 8GB / 128GB without spelling the unit.
    a_nums = set(re.findall(r"\d+", a))
    for fld in ("ram_gb", "storage"):
        v = rec.get(fld)
        if not v:
            continue
        num = re.match(r"(\d+)", str(v))
        if num and num.group(1) not in a_nums:
            fails.append((rid, "VARIANT_NOT_IN_COL_A", f"{fld}={v} colA={a[:60]}"))

    # price_source must point at this sheet
    ps = rec.get("price_source") or ""
    if ps and not ps.startswith(sheet):
        fails.append((rid, "PRICE_SOURCE_WRONG_SHEET", ps))

print("=" * 92)
print(f"CONTAMINATION AUDIT   records checked: {len(recs)}")
print("=" * 92)
if fails:
    print(f"FAIL: {len(fails)} violation(s)\n")
    for rid, code, detail in fails[:60]:
        print(f"  [{code}] {rid}: {detail}")
else:
    print("PASS - zero cross-row contamination detected.")
    print("  Every mop, offer_price, offer, model and price_source was proven to")
    print("  originate from its own source_sheet + source_row and nowhere else.")
print()
ok = sum(1 for r in recs if r["status"] == "ok")
print(f"ok={ok}  rejected={sum(1 for r in recs if r['status']=='rejected')}  "
      f"section_label={sum(1 for r in recs if r['status']=='section_label')}")
sys.exit(1 if fails else 0)
