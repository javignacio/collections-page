from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "_site"
REQUIRED = ["index.html", "styles.css", "app.js", "collections.json", "credits.html", ".nojekyll"]
for name in REQUIRED:
    if not (ROOT / name).is_file():
        raise SystemExit(f"Missing portal file: {name}")
json.loads((ROOT / "collections.json").read_text(encoding="utf-8"))
if SITE.exists():
    shutil.rmtree(SITE)
SITE.mkdir()
for name in REQUIRED:
    shutil.copy2(ROOT / name, SITE / name)
shutil.copytree(ROOT / "assets", SITE / "assets")
print(f"Portal artifact ready: {SITE}")
