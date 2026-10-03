# -*- coding: utf-8 -*-
"""Jednorazowy fix: polski cudzysłów zamykający musi być ”, nie ASCII "."""
import pathlib
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

root = pathlib.Path(__file__).resolve().parents[1] / "backend"
pattern = re.compile('(„[^"„\\n]*)"')
for path in sorted(root.rglob("*.py")):
    text = path.read_text(encoding="utf-8")
    fixed = pattern.sub("\\1”", text)
    if fixed != text:
        path.write_text(fixed, encoding="utf-8", newline="")
        print("FIXED", path.relative_to(root.parent))
