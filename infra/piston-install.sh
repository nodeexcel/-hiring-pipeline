#!/usr/bin/env bash
# Installs the four runtimes the coding round supports into a running Piston.
set -euo pipefail
URL="${PISTON_URL:-http://localhost:2000}"
for pair in "node:*" "python:*" "java:*" "gcc:*"; do
  lang="${pair%%:*}"
  ver="$(curl -fsS "$URL/api/v2/packages" | python3 -c "
import json,sys
want=sys.argv[1]
c=[p['language_version'] for p in json.load(sys.stdin) if p['language']==want]
print(sorted(c, key=lambda v:[int(x) if x.isdigit() else 0 for x in v.split('.')])[-1])" "$lang")"
  echo "Installing $lang $ver ..."
  curl -fsS -X POST "$URL/api/v2/packages" -H 'content-type: application/json' \
    -d "{\"language\":\"$lang\",\"version\":\"$ver\"}"
  echo
done
