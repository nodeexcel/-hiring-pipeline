#!/usr/bin/env python3
"""
Pulls MEDIUM-rated problems from the open CodeContests dataset (deepmind/code_contests) through
the Hugging Face datasets server, and writes question-bank/codecontests.json for the loader.

Why this source: it carries real Codeforces topic tags and ratings, and the original
(not auto-generated) tests, so topics are not guessed.

A problem is kept only if ALL of these hold:
  - its Codeforces rating is in the medium band and at least one tag maps to one of our topics
  - it has plain stdin/stdout tests small enough to ship
  - a reference Python 3 solution from the dataset passes every selected test in OUR sandbox
    (so the tests are consistent with our exact-output checker, and fit our time limits)

Provenance: source, licence and the original problem URL are stored with every item.
Imports land as inactive drafts; enable them in Admin > Question banks after review.

Usage:  python3 scripts/question-bank/import_codecontests.py [--target 24] [--per-topic 3]
Needs the Piston runner (infra/docker-compose.piston.yml) with the python runtime installed.
"""
import argparse, concurrent.futures as cf, hashlib, json, os, re, subprocess, sys, time, urllib.parse, urllib.request

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "question-bank", "codecontests.json")
PISTON = os.environ.get("PISTON_URL", "http://localhost:2000")
DATASET = "deepmind/code_contests"
SOURCE = "codecontests"
LICENSE = (
    "Dataset: CC BY 4.0 (DeepMind CodeContests). Problem statements originate from Codeforces; "
    "confirm their terms permit your use before enabling."
)
RATING_MIN, RATING_MAX = 1100, 1700  # "medium"
PYTHON3 = 3  # CodeContests language enum
MAX_IO_CHARS = 3000
MAX_TESTS = 10

# Codeforces tag -> our DSA topic. Tags not listed are ignored.
TAG_TO_TOPIC = {
    "math": "Math", "number theory": "Math", "combinatorics": "Math", "probabilities": "Math", "bitmasks": "Math",
    "strings": "Strings", "string suffix structures": "Strings", "hashing": "Hash maps",
    "greedy": "Greedy",
    "dp": "Dynamic programming",
    "graphs": "Graphs", "dfs and similar": "Graphs", "shortest paths": "Graphs", "dsu": "Graphs", "graph matchings": "Graphs",
    "trees": "Trees",
    "binary search": "Binary search", "ternary search": "Binary search",
    "sortings": "Sorting and searching",
    "two pointers": "Two pointers",
    "recursion": "Recursion", "divide and conquer": "Recursion",
}

STARTERS = {
    "python": "import sys\n\ndata = sys.stdin.read()\n# read the input from data and print the answer\n",
    "javascript": 'const data = require("fs").readFileSync(0, "utf8");\n// read the input from data and console.log the answer\n',
    "java": "import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    // read the input and print the answer\n  }\n}\n",
    "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  // read the input and print the answer\n  return 0;\n}\n",
}


def log(*a):
    print(*a, flush=True)


def curl_json(url, retries=4):
    """TLS goes through curl (the system trust store); never disable certificate checks."""
    last = ""
    for i in range(retries):
        p = subprocess.run(["curl", "-sS", "--max-time", "240", url], capture_output=True)
        if p.returncode == 0:
            try:
                j = json.loads(p.stdout)
                if "error" not in j:
                    return j
                last = str(j["error"])[:120]
            except json.JSONDecodeError:
                last = "invalid JSON"
        else:
            last = p.stderr.decode()[:120]
        time.sleep(2 + 3 * i)
    raise RuntimeError(f"dataset request failed: {last}")


def rows(split, length=5):
    """Yields (row, truncated_cells) page by page."""
    offset, total = 0, None
    while total is None or offset < total:
        q = urllib.parse.urlencode(
            {"dataset": DATASET, "config": "default", "split": split, "offset": offset, "length": length}
        )
        try:
            j = curl_json("https://datasets-server.huggingface.co/rows?" + q)
        except RuntimeError as e:
            log(f"  ! skipping {split} rows {offset}-{offset + length - 1}: {e}")
            if total is None:
                raise  # nothing fetched yet, so the source itself is down
            offset += length
            continue
        total = j["num_rows_total"]
        for r in j["rows"]:
            yield r["row"], set(r.get("truncated_cells") or [])
        offset += length


def sampled_rows(split, pages, stride, length=5):
    """A spread of pages across a large split, so topics vary and we do not read all of it."""
    for i in range(pages):
        q = urllib.parse.urlencode(
            {"dataset": DATASET, "config": "default", "split": split, "offset": i * stride, "length": length}
        )
        try:
            j = curl_json("https://datasets-server.huggingface.co/rows?" + q)
        except RuntimeError as e:
            log(f"  ! skipping {split} offset {i * stride}: {e}")
            continue
        for r in j["rows"]:
            yield r["row"], set(r.get("truncated_cells") or [])


def clean_title(name):
    m = re.match(r"^\d+_[A-Za-z0-9]+\.\s*(.*)$", name)
    return (m.group(1) if m else name).strip()


def topics_of(tags):
    out = []
    for t in tags or []:
        topic = TAG_TO_TOPIC.get(t.lower())
        if topic and topic not in out:
            out.append(topic)
    return out[:3]


def pick_tests(row):
    """Public tests first (they are the examples), then private ones; small, plain, de-duplicated."""
    tests, seen = [], set()
    for key in ("public_tests", "private_tests"):
        t = row.get(key) or {}
        for i, o in zip(t.get("input", []), t.get("output", [])):
            if not isinstance(i, str) or not isinstance(o, str):
                continue
            if not i.strip() or not o.strip() or len(i) > MAX_IO_CHARS or len(o) > MAX_IO_CHARS:
                continue
            if i in seen:
                continue
            seen.add(i)
            tests.append({"input": i, "expected_output": o.strip()})
    return tests[:MAX_TESTS]


def norm(s):
    return "\n".join(l.rstrip() for l in s.replace("\r\n", "\n").strip().split("\n"))


def run_python(source, stdin):
    body = json.dumps({"language": "python", "version": "*", "files": [{"name": "main.py", "content": source}],
                       "stdin": stdin, "run_timeout": 3000, "compile_timeout": 10000}).encode()
    req = urllib.request.Request(PISTON + "/api/v2/execute", data=body, method="POST", headers={"content-type": "application/json"})
    try:
        r = json.loads(urllib.request.urlopen(req, timeout=40).read())["run"]
    except Exception:
        return None
    return r["stdout"] if r.get("code") == 0 else None


def reference_passes(solutions, tests):
    """True if some Python 3 reference solution reproduces every expected output exactly."""
    cands = [s for lang, s in zip(solutions.get("language", []), solutions.get("solution", [])) if lang == PYTHON3]
    cands = sorted(cands, key=len)[:4]
    for src in cands:
        with cf.ThreadPoolExecutor(max_workers=5) as ex:
            outs = list(ex.map(lambda t: run_python(src, t["input"]), tests))
        if all(o is not None and norm(o) == norm(t["expected_output"]) for o, t in zip(outs, tests)):
            return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", type=int, default=24, help="stop after this many verified problems")
    ap.add_argument("--per-topic", type=int, default=3, help="max problems per primary topic")
    ap.add_argument("--max-scan", type=int, default=400, help="max dataset rows to examine")
    ap.add_argument("--train-pages", type=int, default=0, help="also sample this many pages of the large train split")
    ap.add_argument("--train-stride", type=int, default=200, help="row distance between sampled train pages")
    a = ap.parse_args()

    try:
        urllib.request.urlopen(PISTON + "/api/v2/runtimes", timeout=5).read()
    except Exception:
        sys.exit("Piston is not reachable: start infra/docker-compose.piston.yml first.")

    kept, per_topic, scanned = [], {}, 0
    if os.path.exists(OUT):  # resume: keep what an earlier run already verified
        with open(OUT) as f:
            kept = json.load(f)
        for k in kept:
            per_topic[k["topics"][0]] = per_topic.get(k["topics"][0], 0) + 1
        log(f"resuming with {len(kept)} already verified problems")
    done_ids = {k["external_id"] for k in kept}

    def save():
        os.makedirs(os.path.dirname(OUT), exist_ok=True)
        with open(OUT + ".tmp", "w") as f:
            json.dump(kept, f, indent=2, ensure_ascii=False)
        os.replace(OUT + ".tmp", OUT)  # atomic: a crash never leaves a half-written file

    stats = {"rating": 0, "no_topic": 0, "no_tests": 0, "topic_full": 0, "truncated": 0, "failed_verify": 0, "ok": 0}
    sources = [("valid", rows("valid")), ("test", rows("test"))]
    if a.train_pages:
        sources.append(("train", sampled_rows("train", a.train_pages, a.train_stride)))
    for split, source in sources:
        for row, trunc in source:
            scanned += 1
            if scanned > a.max_scan or len(kept) >= a.target:
                break
            if row["name"] in done_ids:
                continue
            rating = row.get("cf_rating") or 0
            if not (RATING_MIN <= rating <= RATING_MAX):
                stats["rating"] += 1
                continue
            topics = topics_of(row.get("cf_tags"))
            if not topics:
                stats["no_topic"] += 1
                continue
            if trunc & {"public_tests", "private_tests", "solutions", "description"}:
                stats["truncated"] += 1
                continue
            topics.sort(key=lambda t: per_topic.get(t, 0))  # lead with the least-covered topic
            if per_topic.get(topics[0], 0) >= a.per_topic:
                stats["topic_full"] += 1
                continue
            tests = pick_tests(row)
            if len(tests) < 3 or row.get("input_file") or row.get("output_file"):
                stats["no_tests"] += 1
                continue
            if not reference_passes(row.get("solutions") or {}, tests):
                stats["failed_verify"] += 1
                log(f"  x {row['name'][:48]:48} reference solution did not reproduce the tests")
                continue

            stats["ok"] += 1
            per_topic[topics[0]] = per_topic.get(topics[0], 0) + 1
            cid, idx = row.get("cf_contest_id"), row.get("cf_index")
            kept.append({
                "title": clean_title(row["name"]),
                "difficulty": "medium",
                "topics": topics,
                "statement": row["description"].strip(),
                "tests": tests,
                "visible": 1,
                "starter_code": STARTERS,
                "external_id": row["name"],
                "source": SOURCE,
                "license": LICENSE,
                "source_url": f"https://codeforces.com/contest/{cid}/problem/{idx}" if cid and idx else None,
                "cf_rating": rating,
            })
            save()
            log(f"  + {clean_title(row['name'])[:40]:40} rating={rating} topics={topics} tests={len(tests)}  ({len(kept)}/{a.target})")
        if scanned > a.max_scan or len(kept) >= a.target:
            break

    save()
    log(f"\nscanned {scanned} rows; kept {len(kept)}; reasons skipped: {stats}")
    log("per primary topic:", per_topic)
    log("wrote", os.path.normpath(OUT))


if __name__ == "__main__":
    main()
