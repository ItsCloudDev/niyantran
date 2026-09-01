#!/usr/bin/env python3
"""Export SOURCE REGISTRY + HTML FEATURE MAP from the handover xlsm to JSON."""
from __future__ import annotations

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
ROOT = Path(__file__).resolve().parents[2]
XLSM = ROOT / "docs" / "NIYANTRAN-Terminal-Source-Map.xlsm"
OUT = Path(__file__).resolve().parents[1] / "src" / "data"


def col_row(cell_ref: str) -> tuple[int, int]:
    m = re.match(r"([A-Z]+)(\d+)", cell_ref)
    if not m:
        return 0, 0
    col, row = m.group(1), int(m.group(2))
    n = 0
    for ch in col:
        n = n * 26 + (ord(ch) - 64)
    return n, row


def load_shared(z: zipfile.ZipFile) -> list[str]:
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    out = []
    for si in root.findall("m:si", NS):
        texts = [t.text or "" for t in si.findall(".//m:t", NS)]
        out.append("".join(texts))
    return out


def sheet_rows(z: zipfile.ZipFile, sheet_path: str, shared: list[str]) -> list[list[str]]:
    root = ET.fromstring(z.read(sheet_path))
    grid: dict[tuple[int, int], str] = {}
    max_c = max_r = 0
    for c in root.findall(".//m:c", NS):
        ref = c.get("r") or ""
        col, row = col_row(ref)
        if not col:
            continue
        t = c.get("t")
        v = c.find("m:v", NS)
        is_el = c.find("m:is", NS)
        val = ""
        if t == "s" and v is not None and v.text is not None:
            val = shared[int(v.text)]
        elif t == "inlineStr" and is_el is not None:
            val = "".join(x.text or "" for x in is_el.findall(".//m:t", NS))
        elif v is not None and v.text is not None:
            val = v.text
        grid[(row, col)] = val
        max_c = max(max_c, col)
        max_r = max(max_r, row)
    rows = []
    for r in range(1, max_r + 1):
        rows.append([grid.get((r, c), "") for c in range(1, max_c + 1)])
    return rows


def workbook_sheets(z: zipfile.ZipFile) -> dict[str, str]:
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rid_to_target = {}
    for rel in rels:
        rid_to_target[rel.get("Id")] = rel.get("Target")
    ns_r = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
    out = {}
    for sh in wb.findall("m:sheets/m:sheet", NS):
        name = sh.get("name")
        rid = sh.get(ns_r)
        target = rid_to_target[rid]
        if not target.startswith("xl/"):
            target = "xl/" + target.lstrip("/")
        out[name] = target
    return out


def rows_to_objects(rows: list[list[str]]) -> list[dict]:
    # title row, then header, then data
    header_idx = None
    for i, row in enumerate(rows[:5]):
        joined = "|".join(row).upper()
        if "KEY" in joined and "ADAPTER" in joined:
            header_idx = i
            break
        if "HTML TIER" in joined and "HTML FEATURE" in joined:
            header_idx = i
            break
    if header_idx is None:
        raise SystemExit("header row not found")
    headers = [h.strip() for h in rows[header_idx]]
    # unique-ify empty trailing headers
    seen = {}
    clean = []
    for h in headers:
        key = h or "COL"
        n = seen.get(key, 0)
        seen[key] = n + 1
        clean.append(key if n == 0 else f"{key}_{n}")
    objs = []
    for row in rows[header_idx + 1 :]:
        if not any(cell.strip() for cell in row):
            continue
        obj = {}
        for k, v in zip(clean, row):
            if k:
                obj[k] = v.strip() if isinstance(v, str) else v
        objs.append(obj)
    return objs


def camel(key: str) -> str:
    parts = re.split(r"[^A-Za-z0-9]+", key.strip())
    if not parts:
        return key
    first = parts[0].lower()
    rest = "".join(p[:1].upper() + p[1:].lower() for p in parts[1:] if p)
    return first + rest


def slim_registry(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        key = r.get("KEY") or ""
        if not key:
            continue
        out.append(
            {
                "key": key,
                "desk": r.get("DESK") or "",
                "workbookFunction": r.get("WORKBOOK FUNCTION") or "",
                "htmlTier": (r.get("HTML TIER") or "").lower(),
                "htmlFeature": r.get("HTML FEATURE") or "",
                "dataset": r.get("DATASET") or "",
                "embeddedRows": r.get("EMBEDDED ROWS") or "",
                "adapter": (r.get("ADAPTER") or "").lower(),
                "source": r.get("SOURCE") or "",
                "sourceUrls": r.get("SOURCE URLS") or "",
                "domains": r.get("DOMAINS") or "",
                "access": r.get("ACCESS") or "",
                "sourceStatus": r.get("SOURCE STATUS") or "",
                "backendRoute": r.get("BACKEND ROUTE") or "",
                "implementationState": r.get("IMPLEMENTATION STATE") or "",
                "coverageFrom": r.get("COVERAGE FROM") or "",
                "coverageThrough": r.get("COVERAGE THROUGH") or "",
                "exhaustive": str(r.get("EXHAUSTIVE") or "").strip().upper() in ("TRUE", "YES", "1"),
                "credentialAction": r.get("CREDENTIAL / ACTION") or "",
                "notes": r.get("NOTES") or "",
                "primaryFeedUrl": r.get("PRIMARY FEED URL") or "",
                "method": (r.get("METHOD") or "GET").upper() or "GET",
                "format": (r.get("FORMAT") or "").upper(),
                "auth": (r.get("AUTH") or "none").lower() or "none",
                "refreshMinutes": int(float(r["REFRESH MINUTES"])) if str(r.get("REFRESH MINUTES") or "").replace(".", "", 1).isdigit() else 360,
                "openLiveFallback": r.get("OPEN LIVE FALLBACK") or "",
                "directFeedCheck": r.get("DIRECT-FEED CHECK") or "",
                "endpointCount": r.get("ENDPOINT COUNT") or "",
            }
        )
    return out


def slim_features(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        feat = r.get("HTML FEATURE") or ""
        if not feat:
            continue
        keys = [k.strip() for k in re.split(r"[,\n;]+", r.get("REGISTRY KEY(S)") or "") if k.strip()]
        out.append(
            {
                "htmlTier": (r.get("HTML TIER") or "").lower(),
                "bucket": r.get("BUCKET") or "",
                "htmlFeature": feat,
                "dataset": r.get("DATASET") or "",
                "embeddedRows": r.get("EMBEDDED ROWS") or "",
                "registryKeys": keys,
                "workbookFunctions": r.get("WORKBOOK FUNCTION(S)") or "",
                "adapters": r.get("ADAPTER(S)") or "",
                "backendRoute": r.get("BACKEND ROUTE") or "",
                "mapping": r.get("MAPPING") or "",
                "feedGuarantee": r.get("FEED GUARANTEE") or "",
                "source": r.get("SOURCE") or "",
                "developerNote": r.get("DEVELOPER NOTE") or "",
            }
        )
    return out


def main() -> None:
    if not XLSM.exists():
        raise SystemExit(f"missing {XLSM}")
    OUT.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(XLSM) as z:
        shared = load_shared(z)
        sheets = workbook_sheets(z)
        reg_rows = rows_to_objects(sheet_rows(z, sheets["SOURCE REGISTRY"], shared))
        feat_rows = rows_to_objects(sheet_rows(z, sheets["HTML FEATURE MAP"], shared))
    registry = slim_registry(reg_rows)
    features = slim_features(feat_rows)
    (OUT / "source-registry.json").write_text(json.dumps(registry, indent=2, ensure_ascii=False), encoding="utf-8")
    (OUT / "html-feature-map.json").write_text(json.dumps(features, indent=2, ensure_ascii=False), encoding="utf-8")
    print("registry", len(registry), "features", len(features), "->", OUT)


if __name__ == "__main__":
    main()
