"""Fail if any t('...') literal key used in the app is missing from a locale."""
import json, pathlib, re, sys

locales = {name: json.loads(pathlib.Path(f"src/i18n/{name}.json").read_text(encoding="utf-8"))
           for name in ("en", "hi")}

def _lookup(tree, key):
    node = tree
    for part in key.split("."):
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]
    return node

def has(tree, key):
    # i18next plural keys are stored as `<key>_one` / `<key>_other`.
    return isinstance(_lookup(tree, key), str) or any(
        isinstance(_lookup(tree, f"{key}_{suffix}"), str)
        for suffix in ("one", "other", "zero", "two", "few", "many")
    )

# Literal keys in t('...') calls, plus keys declared in the JSON configs.
keys = set()
for path in pathlib.Path("src").rglob("*.tsx"):
    keys |= set(re.findall(r"t\('([a-zA-Z0-9_.]+)'", path.read_text(encoding="utf-8")))
for path in pathlib.Path("configs").rglob("*.json"):
    text = path.read_text(encoding="utf-8")
    for match in re.findall(r'"(?:textKey|labelKey|nameKey|descriptionKey|displayNameKey)":\s*"([^"]+)"', text):
        keys.add(match)

missing = {name: sorted(k for k in keys if not has(tree, k)) for name, tree in locales.items()}
for name, absent in missing.items():
    if absent:
        print(f"{name}: {len(absent)} missing")
        for key in absent:
            print(f"   {key}")
if any(missing.values()):
    sys.exit(1)
print(f"All {len(keys)} translation keys resolve in en and hi.")
