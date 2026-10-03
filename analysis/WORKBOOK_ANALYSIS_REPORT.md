# Anant Electronics - MOP Workbook Analysis Report

**Purpose:** structural analysis of the reference workbook, produced *before* any database,
sync service or UI is written. Every claim below is derived from the file itself.

## 0. File Provenance

| Field | Value |
|---|---|
| File | `data/MOP LIST NEW 28.10.25.xlsx` |
| Size | 864,057 bytes |
| SHA-256 | `1b1fa266a5b0e79ec7f45e542cd277299e5ac2fab07009af13da6a8b07462951` |
| Sheets | 18 |
| Generated | 2026-10-03T15:21:59 |
| Original modified? | **No** - opened read-only, never saved |

> **This workbook is a REFERENCE, not the live database.** The production source of truth is
> the Google Sheet; this file only defines the structure the parser must understand.

## 1. Worksheet Inventory

| # | Sheet | Brand / content | Type | Populated rows | Records | Cols used |
|---|---|---|---|---|---|---|
| 1 | **MI** | Xiaomi / Redmi / POCO | phones + tablets + TVs | 56 | 53 ok / 55 total | A,B,C,E |
| 2 | **GOOGLE** | Google Pixel | phones | 10 | 9 ok / 9 total | A,B,C,D |
| 3 | **SAMSUNG** | Samsung | phones + tablets + audio + wearables | 156 | 155 ok / 155 total | A,B,D |
| 4 | **OPPO** | OPPO | phones + tablets + accessories | 48 | 47 ok / 47 total | A,B,C |
| 5 | **REALME** | realme | phones + tablets | 65 | 63 ok / 64 total | A,B,C |
| 6 | **MOTOROLA** | Motorola | phones + tablets | 45 | 44 ok / 45 total | A,B,C |
| 7 | **VIVO  IQOO** | vivo / iQOO | phones + tablets | 57 | 55 ok / 56 total | A,B,C |
| 8 | **LENOVO** | Lenovo | tablets only | 11 | 11 ok / 11 total | A,B |
| 9 | **NOKIA** | Nokia (HMD) | feature phones | 29 | 28 ok / 28 total | A,B,C |
| 10 | **APPLE** | Apple | iPhones + tablets + wearables + audio | 42 | 30 ok / 41 total | A,B,C,D |
| 11 | **INFINIX  TECNO** | Infinix / Tecno / Lava / itel / AI Plus | multi-brand phones | 66 | 59 ok / 60 total | A,B,C,D,G |
| 12 | **NOTHING** | Nothing | phones | 10 | 10 ok / 10 total | A,B,C |
| 13 | **ONEPLUS** | OnePlus | phones | 5 | 4 ok / 4 total | A,B |
| 14 | **ACCESSORIES** | Accessories (Insta360 / DJI / boAt / JBL / Zebronics) | accessories | 43 | 31 ok / 43 total | A,E,F |
| 15 | **ACC. 2** | Accessories - screen guards & laminations | accessories | 22 | 22 ok / 22 total | A |
| 16 | **SERVICE CENTER** | Service centres (Jaipur) | service directory | 68 | 0 ok / 68 total | A,B,C |
| 17 | **NO WEEK OFF CALENDER** | Store calendar | calendar | 7 | 0 ok / 7 total | A,B |
| 18 | **Sheet100** | - | empty | 0 | 0 ok / 0 total |  |

Note the `max_row` reported by Excel (many sheets show ~1000) is **padding**. Real data
occupies only the first 30-180 rows; the table above counts genuinely populated rows.

## 2. Detected Columns, Pricing Fields and Offer Fields (per sheet)

### MI - Xiaomi / Redmi / POCO

- **Header row:** row 1 -> `B=MOP`, `C=OFFER`, `E=CASHBACK`
- **Model column:** `A`   |   **Price column:** varies (see rules)   |   **Offer column:** varies
- **Records:** 55 total, 53 with a price, 16 with an offer
- **Special parsing rules:** Header `B=MOP, C=OFFER, E=CASHBACK` sits on row 1 with **no MODEL header** - col A is the model by convention. Sheet mixes 3 categories in one column: phones (r2-43), tablets (r45-58), TVs (r60-67). Rows 56/58 are continuation labels (`NANO TEXTURE DISPLAY -`) belonging to the PAD rows above, not products.
- **Irregularities:** No CASHBACK value is ever populated anywhere on this sheet despite the header.

### GOOGLE - Google Pixel

- **Header row:** row 1 -> `A=MODEL`, `B=MOP`, `C=OFFER PRICE`, `D=CARD OFFER`
- **Model column:** `A`   |   **Price column:** varies (see rules)   |   **Offer column:** varies
- **Records:** 9 total, 9 with a price, 9 with an offer
- **Special parsing rules:** The only clean 4-column sheet: `MODEL | MOP | OFFER PRICE | CARD OFFER`. `OFFER PRICE` is a genuine price column distinct from MOP, and `CARD OFFER` is a separate card-offer column.
- **Irregularities:** Row 2 has OFFER PRICE == MOP (55999), i.e. an offer that is really no discount. Do not render it as a saving.

### SAMSUNG - Samsung

- **Header row:** row 1 -> `A=MODEL`, `B=MOP`, `D=OFFER`
- **Model column:** `A`   |   **Price column:** varies (see rules)   |   **Offer column:** varies
- **Records:** 155 total, 155 with a price, 123 with an offer
- **Special parsing rules:** **Hardest sheet.** Header is `A=MODEL, B=MOP, D=OFFER` - column C is empty, so the offer lives in D. The MOP cell itself often contains TWO prices: `B22 = "15999/-   15499/- OFFER 28 SEPT"`. First number = MOP, second = offer price, and the trailing `OFFER <date>` belongs to that same cell.
- **Irregularities:** Sheet stacks 4 categories in one column: phones r2-107, tablets r109-156, audio (BUDS) r158-162, wearables (WATCH) r164-178. Some MOP cells are text-only with a trailing qualifier (`13000  FIX`).

### OPPO - OPPO

- **Header row:** row 1 -> `A=MODEL`, `B=MOP`, `C=CARD OFFER`
- **Model column:** `A`   |   **Price column:** varies (see rules)   |   **Offer column:** varies
- **Records:** 47 total, 47 with a price, 36 with an offer
- **Special parsing rules:** `MODEL | MOP | CARD OFFER`. Offer text encodes 4 different shapes: flat rupee instant-off, `10% OFF UPTO 2000/-`, `5% OFF UPTO 2500/-`, and `UPTO 1000/-`.
- **Irregularities:** Row 48 `BUBBLE SCREEN` is an accessory priced like a product but sits in the phone block. Row 31 (RENO 14) is a single-row block with its own offer.

### REALME - realme

- **Header row:** row 1 -> `A=MODEL`, `B=MOP`, `C=OFFER PRICE`
- **Model column:** `A`   |   **Price column:** varies (see rules)   |   **Offer column:** varies
- **Records:** 64 total, 63 with a price, 15 with an offer
- **Special parsing rules:** `MODEL | MOP | OFFER PRICE` header, but column C is used inconsistently: sometimes an offer price, sometimes a full bank-offer sentence.
- **Irregularities:** **R41 `P4X (8/256)` has an EMPTY price cell** - it must never inherit R40's 25500. R32 and R34 offers begin with `OLD MRP STOCK AVAILABLE - 43999/- FIX`, embedding a second price. R34's offer says `TILL 30 SEP` while every neighbour says `TILL 31 OCT` - per-row dates are real and must not be normalised away.

### MOTOROLA - Motorola

- **Header row:** **none - inferred**
- **Model column:** `A`   |   **Price column:** varies (see rules)   |   **Offer column:** varies
- **Records:** 45 total, 44 with a price, 15 with an offer
- **Special parsing rules:** **No header row at all** - data starts on row 2. Two price representations coexist: cell B for phones, and a price appended to col A for tablets (`PAD 60 NEO - WITH PEN (6/128) WIFI - 25500/-`).
- **Irregularities:** R40 `TABLET` is a section label, not a product. Offers reference two different expiry dates (7 OCT vs 20 SEP) on neighbouring rows.

### VIVO  IQOO - vivo / iQOO

- **Header row:** row 1 -> `B=MOP`, `C=CASHBACK OFFER`
- **Model column:** `A`   |   **Price column:** varies (see rules)   |   **Offer column:** varies
- **Records:** 56 total, 55 with a price, 39 with an offer
- **Special parsing rules:** Header `B=MOP, C=CASHBACK OFFER` with **no MODEL header**. Offers are mostly `INSTANT OFF UPTO N` with no rupee amount at the start, unlike every other sheet.
- **Irregularities:** **R31 `V70 ELITE (12/512)` has an offer but NO price** - the offer must not be shown against the R30 price. Spacing/typos throughout (`INDUSLAND`, `INSTATNT`, `, ,`).

### LENOVO - Lenovo

- **Header row:** **none - inferred**
- **Model column:** `A`   |   **Price column:** varies (see rules)   |   **Offer column:** varies
- **Records:** 11 total, 11 with a price, 0 with an offer
- **Special parsing rules:** No header row (starts r2). Pure `A=model, B=price`, no offer column at all. Models carry Lenovo part numbers (`ZADB0092IN`, `041in`).
- **Irregularities:** No offers exist on this sheet - the UI must show a clean 'no offer' state, not an error.

### NOKIA - Nokia (HMD)

- **Header row:** row 1 -> `A=MODEL`, `B=MOP`
- **Model column:** `A`   |   **Price column:** varies (see rules)   |   **Offer column:** varies
- **Records:** 28 total, 28 with a price, 1 with an offer
- **Special parsing rules:** `MODEL | MOP` header only; no offer column header. Prices are tiny (1000-15000). One stray offer exists in col C at r33.
- **Irregularities:** Model names are bare numbers (`110`, `235 4G NEW`) - brand must come from the SHEET, never from the label.

### APPLE - Apple

- **Header row:** row 1 -> `B=PRICE`, `C=CASHBACK`
- **Model column:** `A`   |   **Price column:** varies (see rules)   |   **Offer column:** varies
- **Records:** 41 total, 30 with a price, 22 with an offer
- **Special parsing rules:** Header is `B=PRICE, C=CASHBACK` - **no MODEL header**, and the price column is called PRICE not MOP.
- **Irregularities:** **Most irregular sheet.** For iPhones/audio, B is a number. For iPad + Watch rows (r38-46), B contains *cashback text* (`4000/- INSTANT CASHBACK ON ICICI...`) and there is NO price anywhere. R5 and R49/R50 have an offer in C but no price in B. R8 (`RBNNN4`) has an empty col A with content only in D - a stray note.

### INFINIX  TECNO - Infinix / Tecno / Lava / itel / AI Plus

- **Header row:** row 1 -> `A=MODEL`, `B=MOP`
- **Model column:** `A`   |   **Price column:** varies (see rules)   |   **Offer column:** varies
- **Records:** 60 total, 59 with a price, 10 with an offer
- **Special parsing rules:** **Brand is carried by section-header rows, not by a column.** Rows 2/22/34/45/55 contain only a brand name (`INFINIX`, `TECNO`, `LAVA`, `ITEL`, `Ai Plus`) and act as headers for the rows beneath them.
- **Irregularities:** The only sheet where brand must be tracked as *state* down the rows. Prices also appear in col B as text (`9000/-  FIX`). Mixed feature phones and smartphones in one sheet.

### NOTHING - Nothing

- **Header row:** **none - inferred**
- **Model column:** `A`   |   **Price column:** varies (see rules)   |   **Offer column:** varies
- **Records:** 10 total, 10 with a price, 10 with an offer
- **Special parsing rules:** **No header row** - data starts on row 3. `A=model, B=price, C=offer`. Offers are the most complex in the workbook: a percentage + an `UPTO` cap + a second percentage on EMI + a list of banks, all in one cell.
- **Irregularities:** Offers embed an `OLD MRP STOCK <price>` figure that is NOT the offer price - it is a stock note.

### ONEPLUS - OnePlus

- **Header row:** row 1 -> `A=MODEL`, `B=PRICE`
- **Model column:** `A`   |   **Price column:** varies (see rules)   |   **Offer column:** varies
- **Records:** 4 total, 4 with a price, 0 with an offer
- **Special parsing rules:** Smallest sheet. `MODEL | PRICE` header (PRICE, not MOP), no offer column, only 4 products.
- **Irregularities:** No offers - clean empty state.

### ACCESSORIES - Accessories (Insta360 / DJI / boAt / JBL / Zebronics)

- **Header row:** **none - inferred**
- **Model column:** `A`   |   **Price column:** varies (see rules)   |   **Offer column:** varies
- **Records:** 43 total, 31 with a price, 0 with an offer
- **Special parsing rules:** **Two independent product lists side by side in one sheet**: list 1 in col A with the price appended to the label (`INSTA 360 GO3 32GB _ 32000/-`), list 2 in col E with the price in col F (`F=14999   10000/-` = MOP + offer).
- **Irregularities:** Brand headers again appear as label-only rows (`INSTA 360`, `DJI`, `ZOOOK`, `BOAT`, `JBL`, `ZEBRONICS`). Col F sometimes holds TWO prices (MOP + offer), sometimes one.

### ACC. 2 - Accessories - screen guards & laminations

- **Header row:** **none - inferred**
- **Model column:** `A`   |   **Price column:** varies (see rules)   |   **Offer column:** varies
- **Records:** 22 total, 22 with a price, 0 with an offer
- **Special parsing rules:** No header, no columns - every row is a single string in col A with the price appended: `TEMPERED 2.5D  -  100/-`.
- **Irregularities:** Low prices (100-1300). No offers anywhere.

### SERVICE CENTER - Service centres (Jaipur)

- **Header row:** **none - inferred**
- **Model column:** `A`   |   **Price column:** varies (see rules)   |   **Offer column:** varies
- **Records:** 68 total, 0 with a price, 0 with an offer
- **Special parsing rules:** **Not a product sheet.** Col A = serial number, col B = `Name - Address ... phone`. Brands appear as label-only rows (`SAMSUNG`, `APPLE`, `NOTHING`, ...).
- **Irregularities:** Must never be rendered as a product with a price. One masked phone (`+917****8363`). Data quality varies wildly.

### NO WEEK OFF CALENDER - Store calendar

- **Header row:** **none - inferred**
- **Model column:** `A`   |   **Price column:** varies (see rules)   |   **Offer column:** varies
- **Records:** 7 total, 0 with a price, 0 with an offer
- **Special parsing rules:** **Not a product sheet.** Col A = date (real Excel dates for some rows, free text for others like `01 TO 07 MARCH`), col B = festival/closure note.
- **Irregularities:** Mixed date types in one column - needs its own parser, not the product parser.

### Sheet100 - -

- **Header row:** **none - inferred**
- **Model column:** `A`   |   **Price column:** varies (see rules)   |   **Offer column:** varies
- **Records:** 0 total, 0 with a price, 0 with an offer
- **Special parsing rules:** Completely empty sheet (0 populated rows).
- **Irregularities:** Must be skipped without erroring the sync.

## 3. Pricing Field Shapes Found Across the Workbook

There is **no single price convention**. Six distinct shapes exist:

| # | Shape | Example source cell | Example |
|---|---|---|---|
| 1 | Plain numeric MOP | `MI!B2` | `15500` |
| 2 | Numeric + `/-` suffix | `NOKIA!B33` | `15000/-` |
| 3 | Two prices in one cell (MOP + offer) | `SAMSUNG!B22` | `15999/-   15499/- OFFER 28 SEPT` |
| 4 | Price embedded in the model label | `MOTOROLA!A41` | `PAD 60 NEO - WITH PEN  (6/128) WIFI    -  25500/-` |
| 5 | Price with a trailing qualifier word | `SAMSUNG!B74` | `13000  FIX` |
| 6 | Price column actually holds offer text | `APPLE!B38` | `4000/- INSTANT CASHBACK ON ICICI , SBI , AXIS CC FS ...` |

Shape 6 is the trap: a naive parser reads `4000` as the MOP for an iPad and shows a
fictional price. Shape 4 is the opposite trap: a parser that only looks at column B
drops every Motorola tablet.

## 4. Offer Field Shapes

| Shape | Example | Handling |
|---|---|---|
| Flat rupee instant-off | `1500/- INSTANT OFF ON EMI SBI, HDFC ...` | fixed amount + banks |
| Percent + cap | `10% OFF UPTO 2000/- ...` | `percent_off` + `upto_amount` |
| Percent, no cap | `10% INSTANT OFF ON FULL / UPI ...` | `percent_off` only |
| Two-tier (EMI + FS/UPI) | `2000/- ... CC EMI ... & 1500/- ... CC FS` | two offers, one record |
| Stock note, not an offer | `OLD MRP STOCK AVAILABLE 19999/- ( BLACK & BLUE )` | note + embedded stock price |
| Upgrade offer | `2400 UPGRADE OFFER ONLY FINANCE & CASH ... / 3000 UPI ...` | exchange + cashback |
| Per-row expiry dates | `... TILL 31 OCT` vs `... TILL 30 SEP` | stored per record, never global |

## 5. Non-Mobile / Non-Product Sheets

| Sheet | Why it is not a product sheet | Disposition |
|---|---|---|
| `SERVICE CENTER` | Serial no. + `Name - Address - phone`; brand label rows | separate directory module |
| `NO WEEK OFF CALENDER` | Dates + festival names, mixed date types | separate calendar module |
| `Sheet100` | Completely empty | skipped silently |
| `ACCESSORIES` / `ACC. 2` | Real products, but non-mobile accessories | accessories catalogue |
| `LENOVO`, `NOKIA`, `INFINIX TECNO` (feature phones) | Tablets / keypad phones, not smartphones | included, badged by category |

## 6. Special Parsing Rules (hard requirements)

1. **Row-scoped extraction only.** Every price, offer and variant is read from the single
   row it belongs to. No value is ever inherited from the row above or below.
2. **Per-sheet explicit configuration.** Each sheet declares its own column roles and price
   mode in `analysis/normalize.py`. Nothing is inferred from a single sheet and applied
   globally.
3. **Empty price cells stay empty.** A missing MOP produces a `price_missing` or
   `rejected` record - never a filled-in neighbour value.
4. **Brand from sheet, brand-section rows, or label - in that priority**, so a bare `110`
   on `NOKIA` is a Nokia, and `hero Shakti 2025` under the `LAVA` header row is a Lava.
5. **Embedded stock prices are notes.** `OLD MRP STOCK AVAILABLE 19999/-` is recorded as a
   stock note, never as the offer price.
6. **Variant split is string-local.** `(8/128)` becomes RAM + storage and is removed from
   the model name; `1 TB` / `1TB` / `12.1` variants are preserved.
7. **Blank separator rows carry no data** and are skipped, but their position is never used
   to shift anything.

## 7. Irregular Structures Found (ranked by risk)

| Risk | Sheet / row | Problem | Guard |
|---|---|---|---|
| HIGH | `APPLE` r38-r46 | Col B holds cashback text, no price | `B_HOLDS_CASHBACK_TEXT_NOT_PRICE` -> no price shown |
| HIGH | `VIVO IQOO` r31 | Offer present, price empty | `price_missing` - offer kept, no price |
| HIGH | `REALME` r41 | Label present, price cell empty | `rejected` - never inherits r40 |
| HIGH | `MOTOROLA` r41-r49 | Price lives inside the label | label-tail extraction |
| MED | `SAMSUNG` | Two prices in one cell | first=MOP, second=offer price |
| MED | `ACCESSORIES` | Two product lists side by side (A and E/F) | both columns parsed separately |
| MED | `INFINIX TECNO` | Brand carried by header rows | brand state machine |
| MED | `ACCESSORIES` / `SERVICE CENTER` | Brand label rows with no price | `section_label`, not a product |
| LOW | `APPLE` r8 | Stray note in col D, empty col A | `LABEL_EMPTY_OR_JUNK` |
| LOW | `NOKIA` | Bare numeric model names | brand from sheet name |

## 8. Normalized Records - Sample with Exact Provenance

Every sample below shows the record together with the **exact source sheet + row** it came
from and the verbatim raw cells of that row.

### Xiaomi POCO phone with cash price

`record_id` **MI_R2**  |  source: **`MI` row 2**

| Source cell | Verbatim value |
|---|---|
| `MI!A2` | POCO C85X  5G  (4/64) |
| `MI!B2` | 15500 |
| `MI!C2` | 15000/- LAST CASH PRICE |

```json
{
 "record_id": "MI_R2",
 "source_sheet": "MI",
 "source_row": 2,
 "brand": "XIAOMI",
 "category": "phone",
 "raw_label": "POCO C85X 5G (4/64)",
 "mop": 15500,
 "offer_price": null,
 "offer": {
  "raw": "15000/- LAST CASH PRICE",
  "percent_off": null,
  "upto_amount": null,
  "fixed_amounts": [
   15000
  ],
  "valid_till": null,
  "banks": [],
  "channels": [],
  "offer_kinds": [],
  "source_cell": "MI!C2"
 },
 "price_source": "MI!B2",
 "status": "ok",
 "issues": [],
 "model": "POCO C85X 5G",
 "ram_gb": "4",
 "storage": "64GB",
 "network": "5G",
 "extras": [],
 "effective_price": 15500
}
```

### Xiaomi NOTE 15 with ICB bank offer

`record_id` **MI_R22**  |  source: **`MI` row 22**

| Source cell | Verbatim value |
|---|---|
| `MI!A22` | NOTE 15 (8/128) |
| `MI!B22` | 29500 |
| `MI!C22` | 2000/- ICB ON AXIS/ICICI/HDFC/SBI/KOTAK/IDFC CC EMI ( NCE UPTO 3M ) & 1500/- ICB ON ICICI/AXIS/SBI CC FS ( OFFER TILL 31 OCT ) |

```json
{
 "record_id": "MI_R22",
 "source_sheet": "MI",
 "source_row": 22,
 "brand": "XIAOMI",
 "category": "phone",
 "raw_label": "NOTE 15 (8/128)",
 "mop": 29500,
 "offer_price": null,
 "offer": {
  "raw": "2000/- ICB ON AXIS/ICICI/HDFC/SBI/KOTAK/IDFC CC EMI ( NCE UPTO 3M ) & 1500/- ICB ON ICICI/AXIS/SBI CC FS ( OFFER TILL 31 OCT )",
  "percent_off": null,
  "upto_amount": null,
  "fixed_amounts": [
   2000,
   1500
  ],
  "valid_till": "31 OCT",
  "banks": [
   "AXIS",
   "ICICI",
   "HDFC",
   "SBI",
   "KOTAK",
   "IDFC"
  ],
  "channels": [
   "EMI",
   "FS"
  ],
  "offer_kinds": [
   "emi"
  ],
  "source_cell": "MI!C22"
 },
 "price_source": "MI!B22",
 "status": "ok",
 "issues": [],
 "model": "NOTE 15",
 "ram_gb": "8",
 "storage": "128GB",
 "network": "",
 "extras": [],
 "effective_price": 29500
}
```

### Samsung A06 dual price in one cell

`record_id` **SAMSUNG_R2**  |  source: **`SAMSUNG` row 2**

| Source cell | Verbatim value |
|---|---|
| `SAMSUNG!A2` | A06 5G (4/64) |
| `SAMSUNG!B2` | 15999/-   15499/- OFFER 28 SEPT |

```json
{
 "record_id": "SAMSUNG_R2",
 "source_sheet": "SAMSUNG",
 "source_row": 2,
 "brand": "SAMSUNG",
 "category": "phone",
 "raw_label": "A06 5G (4/64)",
 "mop": 15999,
 "offer_price": 15499,
 "offer": null,
 "price_source": "SAMSUNG!B2",
 "status": "ok",
 "issues": [],
 "model": "A06 5G",
 "ram_gb": "4",
 "storage": "64GB",
 "network": "5G",
 "extras": [],
 "effective_price": 15499
}
```

### Samsung with upgrade + UPI offer

`record_id` **SAMSUNG_R37**  |  source: **`SAMSUNG` row 37**

| Source cell | Verbatim value |
|---|---|
| `SAMSUNG!A37` | S25 PLUS (12/256) |
| `SAMSUNG!B37` | 100000 |
| `SAMSUNG!D37` | 9000 UPGRADE ONLY CASH 30 APR + 14000 HDFC FULL SWIPE 10 OCT |

```json
{
 "record_id": "SAMSUNG_R37",
 "source_sheet": "SAMSUNG",
 "source_row": 37,
 "brand": "SAMSUNG",
 "category": "phone",
 "raw_label": "S25 PLUS (12/256)",
 "mop": 100000,
 "offer_price": null,
 "offer": {
  "raw": "9000 UPGRADE ONLY CASH 30 APR + 14000 HDFC FULL SWIPE 10 OCT",
  "percent_off": null,
  "upto_amount": null,
  "fixed_amounts": [
   9000,
   14000
  ],
  "valid_till": null,
  "banks": [
   "HDFC"
  ],
  "channels": [
   "FULL SWIPE",
   "UPGRADE"
  ],
  "offer_kinds": [
   "exchange"
  ],
  "source_cell": "SAMSUNG!D37"
 },
 "price_source": "SAMSUNG!B37",
 "status": "ok",
 "issues": [
  "SINGLE_PRICE_IN_MOP_CELL"
 ],
 "model": "S25 PLUS",
 "ram_gb": "12",
 "storage": "256GB",
 "network": "",
 "extras": [],
 "effective_price": 100000
}
```

### Google Pixel separate offer-price column

`record_id` **GOOGLE_R3**  |  source: **`GOOGLE` row 3**

| Source cell | Verbatim value |
|---|---|
| `GOOGLE!A3` | 10  256gb |
| `GOOGLE!B3` | 79999 |
| `GOOGLE!C3` | 75000 |
| `GOOGLE!D3` | 4000 INSTANT OFF ON HDFC CARD FS & 5000 ON EMI TRANSACTION ONLY UPTO 6M & 9M  (TILL 31 OCT) |

```json
{
 "record_id": "GOOGLE_R3",
 "source_sheet": "GOOGLE",
 "source_row": 3,
 "brand": "GOOGLE PIXEL",
 "category": "phones",
 "raw_label": "10 256gb",
 "mop": 79999,
 "offer_price": null,
 "offer": {
  "raw": "75000",
  "percent_off": null,
  "upto_amount": null,
  "fixed_amounts": [],
  "valid_till": null,
  "banks": [],
  "channels": [],
  "offer_kinds": [],
  "source_cell": "GOOGLE!C3"
 },
 "price_source": "GOOGLE!B3",
 "status": "ok",
 "issues": [],
 "model": "10",
 "ram_gb": "",
 "storage": "256GB",
 "network": "",
 "extras": [],
 "effective_price": 79999
}
```

### realme row with EMPTY price

`record_id` **REALME_R41**  |  source: **`REALME` row 41**

| Source cell | Verbatim value |
|---|---|
| `REALME!A41` | P4X (8/256) |

```json
{
 "record_id": "REALME_R41",
 "source_sheet": "REALME",
 "source_row": 41,
 "brand": "REALME",
 "category": "phones+tablets",
 "raw_label": "P4X (8/256)",
 "mop": null,
 "offer_price": null,
 "offer": null,
 "price_source": null,
 "status": "rejected",
 "issues": [
  "PRICE_CELL_EMPTY_ON_THIS_ROW",
  "NO_MOP_ON_THIS_ROW"
 ],
 "model": "P4X",
 "ram_gb": "8",
 "storage": "256GB",
 "network": "",
 "extras": [],
 "effective_price": null
}
```

### realme OLD MRP stock offer

`record_id` **REALME_R34**  |  source: **`REALME` row 34**

| Source cell | Verbatim value |
|---|---|
| `REALME!A34` | 16 PRO PLUS (12/256) |
| `REALME!B34` | 59500 |
| `REALME!C34` | OLD MRP STOCK AVAILABLE - 48999/- FIX 10% OFF OFF ON EMI  ROAR BANK , PNB JUPITAR, HDFC, IDFC, KOTAK, ONECARD, AU, AXIS FEDERAL  BOB  & J&K & 10%  OFF ON FS - UPI yes bank SBI, AXIS, ONECARD |

```json
{
 "record_id": "REALME_R34",
 "source_sheet": "REALME",
 "source_row": 34,
 "brand": "REALME",
 "category": "phones+tablets",
 "raw_label": "16 PRO PLUS (12/256)",
 "mop": 59500,
 "offer_price": null,
 "offer": {
  "raw": "OLD MRP STOCK AVAILABLE - 48999/- FIX 10% OFF OFF ON EMI ROAR BANK , PNB JUPITAR, HDFC, IDFC, KOTAK, ONECARD, AU, AXIS FEDERAL BOB & J&K & 10% OFF ON FS - UPI yes bank SBI, AXIS, ONECARD, AU BOB FEDERAL & JK TILL 30 SEP",
  "percent_off": 10.0,
  "upto_amount": null,
  "fixed_amounts": [
   48999
  ],
  "valid_till": "30 SEP",
  "banks": [
   "AXIS",
   "HDFC",
   "SBI",
   "KOTAK",
   "IDFC",
   "BOB",
   "YES BANK",
   "FEDERAL",
   "AU",
   "ROAR BANK",
   "ONECARD",
   "PNB"
  ],
  "channels": [
   "EMI",
   "UPI",
   "FS"
  ],
  "offer_kinds": [
   "emi",
   "upi"
  ],
  "source_cell": "REALME!C34"
 },
 "price_source": "REALME!B34",
 "status": "ok",
 "issues": [],
 "model": "16 PRO PLUS",
 "ram_gb": "12",
 "storage": "256GB",
 "network": "",
 "extras": [],
 "effective_price": 59500
}
```

### Motorola tablet, price inside label

`record_id` **MOTOROLA_R41**  |  source: **`MOTOROLA` row 41**

| Source cell | Verbatim value |
|---|---|
| `MOTOROLA!A41` | PAD 60 NEO - WITH PEN  (6/128) WIFI    -  25500/- |

```json
{
 "record_id": "MOTOROLA_R41",
 "source_sheet": "MOTOROLA",
 "source_row": 41,
 "brand": "MOTOROLA",
 "category": "tablet",
 "raw_label": "PAD 60 NEO - WITH PEN (6/128) WIFI - 25500/-",
 "mop": 25500,
 "offer_price": null,
 "offer": null,
 "price_source": "MOTOROLA!A41 (label tail)",
 "status": "ok",
 "issues": [],
 "model": "PAD 60 NEO - WITH PEN WIFI",
 "ram_gb": "6",
 "storage": "128GB",
 "network": "WIFI",
 "extras": [
  "WITH PEN"
 ],
 "effective_price": 25500
}
```

### vivo row with offer but NO price

`record_id` **VIVO_IQOO_R31**  |  source: **`VIVO  IQOO` row 31**

| Source cell | Verbatim value |
|---|---|
| `VIVO  IQOO!A31` | V70 ELITE (12/512) |
| `VIVO  IQOO!C31` | INSTATNT OF EMI UPTO 5000 & 3000 ON FULL SWIPE /UPI  IDFC, DBS, SBI, YES, BOB, ONE CARD, INDUSLAND, KOTAK, HDFC  TILL 30 SEP |

```json
{
 "record_id": "VIVO_IQOO_R31",
 "source_sheet": "VIVO  IQOO",
 "source_row": 31,
 "brand": "VIVO / IQOO",
 "category": "phones+tablets",
 "raw_label": "V70 ELITE (12/512)",
 "mop": null,
 "offer_price": null,
 "offer": {
  "raw": "INSTATNT OF EMI UPTO 5000 & 3000 ON FULL SWIPE /UPI IDFC, DBS, SBI, YES, BOB, ONE CARD, INDUSLAND, KOTAK, HDFC TILL 30 SEP",
  "percent_off": null,
  "upto_amount": 5000,
  "fixed_amounts": [
   5000,
   3000
  ],
  "valid_till": "30 SEP",
  "banks": [
   "HDFC",
   "SBI",
   "KOTAK",
   "IDFC",
   "BOB",
   "DBS",
   "INDUSLAND",
   "ONE CARD",
   "ONE CARD"
  ],
  "channels": [
   "EMI",
   "UPI",
   "FULL SWIPE"
  ],
  "offer_kinds": [
   "emi",
   "upi"
  ],
  "source_cell": "VIVO  IQOO!C31"
 },
 "price_source": null,
 "status": "price_missing",
 "issues": [
  "PRICE_CELL_EMPTY_ON_THIS_ROW",
  "OFFER_PRESENT_BUT_NO_MOP_ON_THIS_ROW"
 ],
 "model": "V70 ELITE",
 "ram_gb": "12",
 "storage": "512GB",
 "network": "",
 "extras": [],
 "effective_price": null
}
```

### Apple iPad, col B holds cashback not price

`record_id` **APPLE_R38**  |  source: **`APPLE` row 38**

| Source cell | Verbatim value |
|---|---|
| `APPLE!A38` | IPAD PRO |
| `APPLE!B38` | 4000/- INSTANT CASHBACK ON ICICI , SBI,  AXIS CC FS & 4000/- ON EMI ICICI, SBI,  AND AXIS CC |

```json
{
 "record_id": "APPLE_R38",
 "source_sheet": "APPLE",
 "source_row": 38,
 "brand": "APPLE",
 "category": "iphones+tablets+wearables+audio",
 "raw_label": "IPAD PRO",
 "mop": null,
 "offer_price": null,
 "offer": null,
 "price_source": null,
 "status": "rejected",
 "issues": [
  "B_HOLDS_CASHBACK_TEXT_NOT_PRICE",
  "NO_MOP_ON_THIS_ROW"
 ],
 "model": "IPAD PRO",
 "ram_gb": "",
 "storage": "",
 "network": "",
 "extras": [],
 "effective_price": null
}
```

### Infinix brand-section state

`record_id` **INFINIX_TECNO_R7**  |  source: **`INFINIX  TECNO` row 7**

| Source cell | Verbatim value |
|---|---|
| `INFINIX  TECNO!A7` | HOT 70 PRO (6/128) |
| `INFINIX  TECNO!B7` | 25500 |
| `INFINIX  TECNO!C7` | 2000 INSTANT OFF ON FS HDFC CC |

```json
{
 "record_id": "INFINIX_TECNO_R7",
 "source_sheet": "INFINIX  TECNO",
 "source_row": 7,
 "brand": "INFINIX",
 "category": "multi_brand",
 "raw_label": "HOT 70 PRO (6/128)",
 "mop": 25500,
 "offer_price": null,
 "offer": {
  "raw": "2000 INSTANT OFF ON FS HDFC CC",
  "percent_off": null,
  "upto_amount": null,
  "fixed_amounts": [
   2000
  ],
  "valid_till": null,
  "banks": [
   "HDFC"
  ],
  "channels": [
   "FS",
   "INSTANT OFF"
  ],
  "offer_kinds": [
   "instant_off"
  ],
  "source_cell": "INFINIX  TECNO!C7"
 },
 "price_source": "INFINIX  TECNO!B7",
 "status": "ok",
 "issues": [],
 "model": "HOT 70 PRO",
 "ram_gb": "6",
 "storage": "128GB",
 "network": "",
 "extras": [],
 "effective_price": 25500
}
```

### Lava feature phone (brand from row above)

`record_id` **INFINIX_TECNO_R40**  |  source: **`INFINIX  TECNO` row 40**

| Source cell | Verbatim value |
|---|---|
| `INFINIX  TECNO!A40` | SMART 4 MFG  (3/32)  4G |
| `INFINIX  TECNO!B40` | 9000/-  FIX |

```json
{
 "record_id": "INFINIX_TECNO_R40",
 "source_sheet": "INFINIX  TECNO",
 "source_row": 40,
 "brand": "LAVA",
 "category": "multi_brand",
 "raw_label": "SMART 4 MFG (3/32) 4G",
 "mop": 9000,
 "offer_price": null,
 "offer": null,
 "price_source": "INFINIX  TECNO!B40",
 "status": "ok",
 "issues": [],
 "model": "SMART 4 MFG 4G",
 "ram_gb": "3",
 "storage": "32GB",
 "network": "4G",
 "extras": [],
 "effective_price": 9000
}
```

### Accessory price appended to label

`record_id` **ACCESSORIES_R2**  |  source: **`ACCESSORIES` row 2**

| Source cell | Verbatim value |
|---|---|
| `ACCESSORIES!A2` | INSTA 360 GO3  32GB _ 32000/- |
| `ACCESSORIES!E2` | WILLEN  - |
| `ACCESSORIES!F2` | 14999   10000/- |

```json
{
 "record_id": "ACCESSORIES_R2",
 "source_sheet": "ACCESSORIES",
 "source_row": 2,
 "brand": "UNASSIGNED",
 "category": "accessories_two_column",
 "raw_label": "INSTA 360 GO3 32GB _ 32000/-",
 "mop": 32000,
 "offer_price": null,
 "offer": null,
 "price_source": "ACCESSORIES!A2 (label tail)",
 "status": "ok",
 "issues": [],
 "model": "INSTA 360 GO3",
 "ram_gb": "",
 "storage": "32GB",
 "network": "",
 "extras": [],
 "effective_price": 32000
}
```

### Nokia feature phone

`record_id` **NOKIA_R2**  |  source: **`NOKIA` row 2**

| Source cell | Verbatim value |
|---|---|
| `NOKIA!A2` | HMD 100 single sim |
| `NOKIA!B2` | 1000 |

```json
{
 "record_id": "NOKIA_R2",
 "source_sheet": "NOKIA",
 "source_row": 2,
 "brand": "NOKIA (HMD)",
 "category": "feature_phones",
 "raw_label": "HMD 100 single sim",
 "mop": 1000,
 "offer_price": null,
 "offer": null,
 "price_source": "NOKIA!B2",
 "status": "ok",
 "issues": [],
 "model": "HMD 100 single sim",
 "ram_gb": "",
 "storage": "",
 "network": "",
 "extras": [],
 "effective_price": 1000
}
```

## 9. Data Quality Summary

| Status | Count | Meaning |
|---|---|---|
| `ok` | 621 | Complete record with a price from its own row |
| `price_missing` | 4 | Has its own offer but no price anywhere - show offer, no price |
| `rejected` | 97 | Structurally unusable - excluded, never back-filled |
| `section_label` | 3 | Brand/section heading - not a product |
| **Total source rows read** | **725** | |

## 10. Contamination Audit

A verification pass re-opens the workbook and, for every record, proves each derived field
appears **verbatim in that record's own source row** - MOP, offer price, offer text, model
tokens, RAM/storage, and the offer's source cell reference.

```
CONTAMINATION AUDIT   records checked: 725
PASS - zero cross-row contamination detected.
  Every mop, offer_price, offer, model and price_source was proven to
  originate from its own source_sheet + source_row and nowhere else.
```

Reproduce with `python analysis/audit_contamination.py` (exit code 0 = pass).

## 11. Recommended Architecture (for approval before build)

```
Google Sheet (live source)
   -> Sheets API fetch (per-tab grid, values only)
   -> per-sheet rule config (same rules validated here)
   -> validator: contamination audit + row/sheet/schema checks
   -> atomic promote to verified dataset (versioned, all-or-nothing)
   -> website reads the verified dataset
```

Failure policy: if the fetch, the parse, or the validation fails for any reason, the
previous verified dataset stays live untouched. A new version is only promoted after it
passes the full audit; partial writes are never published.
