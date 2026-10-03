"""
READ-ONLY exhaustive inspection of the MOP workbook.
Opens the file with openpyxl and NEVER saves it.
Emits a JSON structure + a human-readable report to analysis/.
"""
import json, re, sys, os, hashlib, datetime
from collections import Counter, defaultdict
import openpyxl

SRC = r"C:\Users\Mehul\Downloads\MOBILE SHOP CATLOG FOR PHONES\data\MOP LIST NEW 28.10.25.xlsx"
OUT = r"C:\Users\Mehul\Downloads\MOBILE SHOP CATLOG FOR PHONES\analysis"

def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def cell_str(v):
    if v is None:
        return ""
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.isoformat()
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v).strip()

# ---------- header/keyword taxonomy ----------
HEADER_PATTERNS = {
    "model":      r"^(model|product|item|handset|device|phone|mobile|description|name|particulars|model\s*name)$",
    "price":      r"(mop|price|rate|mrp|amount|cost|dp|mop\s*/\s*price|dealer\s*price)",
    "offer":      r"(offer|scheme|discount|benefit|special)",
    "cashback":   r"cash\s*back|cashback",
    "card_offer": r"card\s*offer|cc\s*offer|credit\s*card|card\s*discount|emi",
    "brand":      r"^brand$",
    "variant":    r"variant|storage|ram|rom|config|configuration|spec",
    "stock":      r"stock|qty|quantity|available",
    "note":       r"note|remark|comment|condition|box",
    "warranty":   r"warranty|gemi|service",
    "commission": r"comm?ission|margin",
}
HEADER_ORDER = ["brand","model","variant","price","offer","cashback","card_offer","stock","warranty","commission","note"]

def classify_header(text):
    t = re.sub(r"[^a-z0-9/ ]+", " ", text.lower()).strip()
    t = re.sub(r"\s+", " ", t)
    if not t:
        return None
    for key in HEADER_ORDER:
        if re.search(HEADER_PATTERNS[key], t):
            return key
    return "unknown"

def col_letter(idx):
    s = ""
    while idx:
        idx, r = divmod(idx - 1, 26)
        s = chr(65 + r) + s
    return s

# ---------- price / offer parsing (record-scoped only) ----------
PRICE_RE = re.compile(r"(?:rs\.?\s*)?(\d[\d,]{2,})\s*(?:/-|/\-|\b)", re.I)
def find_prices(text):
    out = []
    for m in re.finditer(r"(\d[\d,]*)", text):
        raw = m.group(1).replace(",", "")
        if len(raw) >= 3:
            out.append(int(raw))
    return out

def main():
    print("sha256:", sha256(SRC))
    wb = openpyxl.load_workbook(SRC, data_only=True, read_only=False)
    report = {
        "file": SRC,
        "sha256": sha256(SRC),
        "bytes": os.path.getsize(SRC),
        "inspected_at": datetime.datetime.now().isoformat(),
        "sheet_count": len(wb.sheetnames),
        "sheetnames": list(wb.sheetnames),
        "sheets": [],
    }

    for name in wb.sheetnames:
        ws = wb[name]
        max_r, max_c = ws.max_row or 0, ws.max_column or 0

        # Scan every cell once, build grid + column profile
        grid = []                     # grid[r][c] -> string
        col_vals = defaultdict(list)  # col letter -> non-empty strings
        non_blank = 0
        for r in range(1, max_r + 1):
            row = []
            for c in range(1, max_c + 1):
                s = cell_str(ws.cell(row=r, column=c).value)
                row.append(s)
                if s:
                    non_blank += 1
                    col_vals[col_letter(c)].append((r, s))
            grid.append(row)

        # detect header row: row within first 8 that has most header-like labels
        header_row, header_map, header_best = None, {}, 0
        for r in range(1, min(9, max_r) + 1):
            hits = 0
            tmp = {}
            for c in range(1, max_c + 1):
                k = classify_header(grid[r - 1][c - 1])
                if k and k != "unknown":
                    hits += 1
                    tmp[col_letter(c)] = {"raw": grid[r - 1][c - 1], "type": k}
            if hits > header_best:
                header_best, header_row, header_map = hits, r, tmp

        # product rows: a row with a non-numeric label in the leftmost populated col
        # AND a number somewhere to its right (that number = the price)
        model_col = header_map.get("A", {}).get("type")
        if "model" not in [v["type"] for v in header_map.values()] and col_vals.get("A"):
            model_col = "A"

        price_cols = [col for col, v in header_map.items() if v["type"] in ("price",)]
        offer_cols = [col for col, v in header_map.items() if v["type"] in ("offer", "card_offer")]
        cashback_cols = [col for col, v in header_map.items() if v["type"] in ("cashback",)]

        product_rows, blank_rows, section_rows = [], [], []
        for r in range(1, max_r + 1):
            non_empty = [(col_letter(c + 1), grid[r - 1][c]) for c in range(max_c) if grid[r - 1][c]]
            if not non_empty:
                blank_rows.append(r); continue
            first_col, first_val = non_empty[0]
            nums_right = [v for col, v in non_empty[1:] if re.fullmatch(r"\d[\d,]*\.?\d*", v)]
            label_like = not re.fullmatch(r"[\d,./\-₹\s]+", first_val)
            if label_like and nums_right:
                product_rows.append(r)
            elif label_like:
                section_rows.append(r)

        # is it a products sheet or a non-mobile / utility sheet?
        has_price = any(re.search(r"^(mop|price|rate)", classify_header(x) or "", re.I) or True for x in [])
        keyword_hits = Counter()
        for col, vals in col_vals.items():
            for _, v in vals[:400]:
                vv = v.upper()
                if "CASHBACK" in vv: keyword_hits["cashback"] += 1
                if "OFFER" in vv: keyword_hits["offer"] += 1
                if "EMI" in vv or "AXIS" in vv or "ICICI" in vv or "HDFC" in vv or "KOTAK" in vv or "SBI" in vv or "IDFC" in vv:
                    keyword_hits["icb/emi/card"] += 1
                if "MRP" in vv: keyword_hits["mrp"] += 1
                if re.search(r"\b(4|6|8|12|16)\s*(GB|G)\b|\b(64|128|256|512|1TB)\b", vv):
                    keyword_hits["ram/storage"] += 1
        kind = "products" if (product_rows and keyword_hits.get("ram/storage", 0) > 3) else (
               "accessories" if keyword_hits.get("ram/storage", 0) <= 3 and product_rows else "unknown")
        if not product_rows:
            kind = "non-product"

        report["sheets"].append({
            "name": name,
            "max_row": max_r, "max_column": max_c,
            "non_blank_cells": non_blank,
            "density_pct": round(100.0 * non_blank / max(1, max_r * max_c), 2),
            "header_row": header_row,
            "header_map": header_map,
            "detected_columns": {col: len(v) for col, v in sorted(col_vals.items())},
            "column_first_rows": {col: v[0][0] for col, v in sorted(col_vals.items())},
            "keyword_hits": dict(keyword_hits),
            "kind_guess": kind,
            "product_row_count": len(product_rows),
            "product_rows_first10": product_rows[:10],
            "product_rows_last5": product_rows[-5:],
            "blank_row_count": len(blank_rows),
            "section_or_label_only_rows": section_rows[:25],
            "merged_ranges": [str(m) for m in list(ws.merged_cells.ranges)[:20]],
            "hidden": ws.sheet_state,
        })

    out = os.path.join(OUT, "workbook_structure.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print("wrote", out)

    # console summary
    print("\n" + "=" * 100)
    print(f"{'SHEET':<34}{'ROWS':>7}{'COLS':>6}{'HDR':>5}{'PRODUCTS':>10}{'BLANK':>7}  KIND")
    print("=" * 100)
    for s in report["sheets"]:
        print(f"{s['name'][:33]:<34}{s['max_row']:>7}{s['max_column']:>6}"
              f"{(s['header_row'] or '-'):>5}{s['product_row_count']:>10}{s['blank_row_count']:>7}  {s['kind_guess']}")

if __name__ == "__main__":
    main()
