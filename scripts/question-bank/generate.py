#!/usr/bin/env python3
"""
Generates an ORIGINAL starter question bank. Nothing here is copied from any website or dataset.

Correctness strategy (so a reviewer is not the only safeguard):
  - quantitative / data interpretation / number series / coding / direction / ordering:
    parametrised templates, the answer is COMPUTED, never typed.
  - syllogisms: every conclusion is checked by enumerating all models over a small universe.
  - verbal / blood relation: hand written, unambiguous standard items (these need human review).
  - coding problems: hidden tests come from a reference solution, then the generator re-runs
    the references through the real runner (Piston) when it is reachable.

Run:  python3 scripts/question-bank/generate.py
"""
import hashlib, itertools, json, math, os, random, sys
from fractions import Fraction

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "question-bank")
SEED = 20261010
rng = random.Random(SEED)
SOURCE = "generated-v1"
LICENSE = "Original content generated for this project. Human review required before activation."

questions, seen_bodies = [], set()


def ext_id(body: str) -> str:
    return hashlib.sha1(body.encode()).hexdigest()[:16]


def add(section, topic, difficulty, body, correct, distractors):
    """correct: str; distractors: list[str] (>=3). Shuffles options deterministically."""
    body = " ".join(body.split())
    assert body not in seen_bodies, f"duplicate question: {body[:60]}"
    correct = str(correct)
    distractors = [str(d) for d in dict.fromkeys(distractors) if str(d) != correct]
    assert len(distractors) >= 3, f"need 3 distractors for: {body[:60]} -> {distractors}"
    options = [correct] + distractors[:3]
    assert len(set(options)) == 4
    rng.shuffle(options)
    seen_bodies.add(body)
    questions.append({
        "section": section, "topic": topic, "difficulty": difficulty, "body": body,
        "options": options, "answer_index": options.index(correct),
        "external_id": ext_id(body), "source": SOURCE, "license": LICENSE,
    })


def near_ints(ans, lo=1):
    """Plausible wrong integers around ans: off-by-step, off-by-10%, doubled/halved."""
    step = max(1, round(abs(ans) * 0.1))
    c = [ans + step, ans - step, ans + 2 * step, ans - 2 * step, ans * 2, ans // 2 if ans % 2 == 0 else ans + 1, ans + 5, ans - 5, ans + 10]
    out = []
    for x in c:
        if x != ans and x >= lo and x not in out:
            out.append(x)
    return out


# ------------------------------------------------------------------ QUANTITATIVE (30)
def q_percent_of():
    for N, p in [(rng.choice([240, 360, 480, 600, 840]), rng.choice([15, 25, 35, 45])), (rng.choice([150, 250, 350, 450]), rng.choice([12, 24, 36, 48]))]:
        ans = N * p // 100
        assert N * p % 100 == 0
        add("Quantitative", "Percentages", "easy", f"What is {p}% of {N}?", ans, near_ints(ans))


def q_successive_change():
    for P, a, b in [(1000, 20, 10), (2500, 10, 20)]:
        final = Fraction(P) * (100 + a) / 100 * (100 - b) / 100
        assert final.denominator == 1
        ans = int(final)
        add("Quantitative", "Percentages", "medium",
            f"The price of an article is Rs. {P}. It is first increased by {a}% and then decreased by {b}%. What is the final price in Rs.?",
            ans, [P, ans + P // 20, ans - P // 20, P + P * (a - b) // 100 if P + P * (a - b) // 100 != ans else ans + 17])


def q_ratio():
    for total, (a, b, c) in [(rng.choice([1200, 1800]), (2, 3, 5)), (rng.choice([2400, 3000]), (1, 2, 3))]:
        s = a + b + c
        assert total % s == 0
        ans = total // s * b
        add("Quantitative", "Ratio and proportion", "easy",
            f"Rs. {total} is divided among three people in the ratio {a}:{b}:{c}. What is the share of the second person in Rs.?",
            ans, [total // s * a, total // s * c, total // 2, ans + total // 20])


def q_average():
    for n, avg, removed in [(6, 24, 34), (8, 15, 36)]:
        total = n * avg
        rest = total - removed
        assert rest % (n - 1) == 0
        ans = rest // (n - 1)
        add("Quantitative", "Averages", "medium",
            f"The average of {n} numbers is {avg}. When one number, {removed}, is removed, what is the average of the remaining numbers?",
            ans, [avg, ans + 1, ans - 1, ans + 2])


def q_avg_speed():
    for (s1, t1), (s2, t2) in [((40, 3), (60, 2)), ((30, 4), (50, 4))]:
        d = s1 * t1 + s2 * t2
        assert d % (t1 + t2) == 0
        ans = d // (t1 + t2)
        add("Quantitative", "Speed, distance and time", "medium",
            f"A vehicle travels at {s1} km/h for {t1} hours and then at {s2} km/h for {t2} hours. What is its average speed for the whole journey in km/h?",
            ans, [(s1 + s2) // 2 if (s1 + s2) // 2 != ans else ans + 3, ans + 2, ans - 2, ans + 4])


def q_work():
    for x, y in [(12, 24), (10, 15)]:
        assert (x * y) % (x + y) == 0
        ans = x * y // (x + y)
        add("Quantitative", "Time and work", "medium",
            f"A can finish a job in {x} days and B can finish it in {y} days. Working together, in how many days will they finish it?",
            ans, [(x + y) // 2, ans + 1, ans + 2, ans - 1])


def q_profit():
    for cp, sp in [(800, 1000), (1250, 1500)]:
        pct = (sp - cp) * 100 // cp
        assert (sp - cp) * 100 % cp == 0
        add("Quantitative", "Profit and loss", "easy",
            f"An item bought for Rs. {cp} is sold for Rs. {sp}. What is the profit percentage?",
            f"{pct}%", [f"{pct + 5}%", f"{pct - 5}%", f"{pct + 10}%", f"{(sp - cp) * 100 // sp}%" if (sp - cp) * 100 // sp != pct else f"{pct + 15}%"])


def q_simple_interest():
    for P, r, t in [(5000, 8, 3), (12000, 5, 2)]:
        ans = P * r * t // 100
        add("Quantitative", "Simple interest", "easy",
            f"What is the simple interest on Rs. {P} at {r}% per annum for {t} years, in Rs.?",
            ans, [P * r // 100, ans + P // 50, ans - P // 100, ans * 2])


def q_compound_interest():
    for P, r in [(10000, 10), (20000, 5)]:
        amt = Fraction(P) * (100 + r) ** 2 / 100 ** 2
        assert amt.denominator == 1
        ci = int(amt) - P
        si = P * r * 2 // 100
        add("Quantitative", "Compound interest", "medium",
            f"What is the compound interest on Rs. {P} at {r}% per annum, compounded annually, for 2 years, in Rs.?",
            ci, [si, ci + P // 100, ci - P // 200 if ci - P // 200 != si else ci + 7, ci + P // 40])


def q_ages():
    for s, d in [(46, 6), (58, 8)]:
        assert (s + d) % 2 == 0
        ans = (s + d) // 2
        add("Quantitative", "Ages", "easy",
            f"The sum of the ages of two siblings is {s} years and the difference between their ages is {d} years. What is the age of the elder sibling?",
            ans, [ans - d // 2, ans + 2, ans - 2, s - ans + 3])


def q_lcm():
    for a, b, c in [(4, 6, 10), (6, 8, 12)]:
        ans = math.lcm(a, b, c)
        add("Quantitative", "Number system", "easy",
            f"What is the smallest number that is exactly divisible by {a}, {b} and {c}?",
            ans, [a * b * c if a * b * c != ans else ans + 12, ans * 2, ans // 2 if ans % 2 == 0 else ans + 2, ans + a])


def q_sum_series():
    for n in (15, 20):
        ans = n * (n + 1) // 2
        add("Quantitative", "Series sums", "easy",
            f"What is the sum of the first {n} natural numbers?", ans, [ans + n, ans - n, n * n, ans + 10])
    # sum of first n odd numbers is n^2: keep a distinct third family below


def q_probability():
    for r, b in [(5, 3), (4, 8)]:
        f = Fraction(r, r + b)
        wrong = [Fraction(r, b), Fraction(b, r + b), Fraction(r + 1, r + b + 1)]
        add("Quantitative", "Probability", "medium",
            f"A bag holds {r} red balls and {b} blue balls. One ball is drawn at random. What is the probability that it is red?",
            f"{f.numerator}/{f.denominator}", [f"{w.numerator}/{w.denominator}" for w in wrong if w != f] + [f"1/{r + b}"])


def q_combinations():
    for n in (6, 8):
        ans = math.comb(n, 2)
        add("Quantitative", "Permutations and combinations", "medium",
            f"In how many ways can a committee of 2 people be chosen from a group of {n} people?",
            ans, [n * (n - 1), n * 2, ans + n, ans - 1])


def q_arrangements():
    for n in (4, 5):
        ans = math.factorial(n)
        add("Quantitative", "Permutations and combinations", "easy",
            f"In how many different ways can {n} people stand in a row?", ans, [n * n, ans // 2, ans + n, ans * 2])


def q_odd_sum():
    for n in (12, 25):
        ans = n * n
        add("Quantitative", "Series sums", "easy",
            f"What is the sum of the first {n} odd natural numbers?", ans, [n * (n + 1), n * n + n, n * 2, ans - n])


# ------------------------------------------------------------------ LOGICAL REASONING (30)
def l_series():
    items = []
    # arithmetic
    for first, step in [(7, 5), (100, -9)]:
        s = [first + i * step for i in range(6)]
        items.append((s, "easy"))
    # geometric
    for first, ratio in [(3, 2), (2, 3)]:
        s = [first * ratio ** i for i in range(6)]
        items.append((s, "medium"))
    # squares plus constant
    for c in (2, 5):
        s = [i * i + c for i in range(1, 7)]
        items.append((s, "medium"))
    # increasing differences
    for first in (4, 10):
        s, d, v = [], 2, first
        for _ in range(6):
            s.append(v)
            v += d
            d += 2
        items.append((s, "medium"))
    # alternating add / multiply: +3, x2 pattern
    s, v = [], 3
    for i in range(6):
        s.append(v)
        v = v + 3 if i % 2 == 0 else v * 2
    items.append((s, "hard"))
    # fibonacci-like
    a, b = 2, 3
    s = [a, b]
    while len(s) < 6:
        s.append(s[-1] + s[-2])
    items.append((s, "hard"))
    assert len(items) == 10
    for s, diff in items:
        shown, ans = s[:5], s[5]
        add("Logical reasoning", "Number series", diff,
            f"What comes next in the series: {', '.join(map(str, shown))}, ?", ans, near_ints(ans, lo=-10 ** 6))


def l_coding():
    def shift(word, k):
        return "".join(chr((ord(c) - 65 + k) % 26 + 65) for c in word)
    for k, src, query in [(1, "CAT", "DOG"), (2, "SUN", "MOON"), (3, "BAG", "FIRE")]:
        ans = shift(query, k)
        wrongs = [shift(query, k + 1), shift(query, k - 1), shift(query, k + 2), query[::-1]]
        add("Logical reasoning", "Coding and decoding", "easy",
            f"In a certain code, every letter of a word is replaced by the letter {k} place{'s' if k > 1 else ''} after it in the alphabet, so {src} is written as {shift(src, k)}. How is {query} written in this code?",
            ans, wrongs)
    for word in ("DEAR", "FACE"):
        ans = sum(ord(c) - 64 for c in word)
        add("Logical reasoning", "Coding and decoding", "medium",
            f"If A=1, B=2, C=3 and so on up to Z=26, what is the sum of the values of the letters in the word {word}?",
            ans, near_ints(ans))


def l_direction():
    def final(moves):
        x = y = 0
        dx, dy = 0, 1  # facing north
        for turn, dist in moves:
            if turn == "R":
                dx, dy = dy, -dx
            elif turn == "L":
                dx, dy = -dy, dx
            x += dx * dist
            y += dy * dist
        return x, y
    names = {(0, 1): "north", (0, -1): "south", (1, 0): "east", (-1, 0): "west"}
    cases = [
        ([("S", 5), ("R", 3), ("R", 5)], "dist"),
        ([("S", 8), ("L", 6), ("L", 8)], "dist"),
        ([("S", 4), ("R", 3)], "hyp"),
        ([("S", 12), ("L", 5)], "hyp"),
        ([("S", 10), ("R", 10), ("R", 10), ("R", 10)], "dist"),
    ]
    for moves, kind in cases:
        x, y = final(moves)
        steps = []
        for i, (turn, dist) in enumerate(moves):
            if i == 0:
                steps.append(f"walks {dist} km north")
            else:
                steps.append(f"turns {'right' if turn == 'R' else 'left'} and walks {dist} km")
        text = "A man starts from a point and " + ", then ".join(steps) + ". "
        d = math.hypot(x, y)
        assert abs(d - round(d)) < 1e-9, (moves, d)
        ans = round(d)
        add("Logical reasoning", "Direction sense", "medium",
            text + "How far is he from the starting point, in km?", ans, near_ints(ans) + [ans + 1, ans + 3])


def l_ranking():
    for l, r in [(7, 12), (15, 9), (4, 20)]:
        ans = l + r - 1
        add("Logical reasoning", "Ranking and order", "easy",
            f"In a row of people, Ravi is {l}th from the left end and {r}th from the right end. How many people are there in the row?",
            ans, [l + r, l + r + 1, l + r - 2, abs(l - r) + 1])
    for pos_top, n in [(9, 40), (14, 35)]:
        ans = n - pos_top + 1
        add("Logical reasoning", "Ranking and order", "easy",
            f"In a class of {n} students, Meena ranks {pos_top}th from the top. What is her rank from the bottom?",
            ans, [n - pos_top, n - pos_top + 2, pos_top, n + pos_top])


def l_syllogism():
    """Enumerate every assignment of sets A,B,C over a 4-element universe."""
    U = range(4)
    subsets = [frozenset(c) for r in range(5) for c in itertools.combinations(U, r)]

    def holds(stmt, m):
        kind, x, y = stmt
        X, Y = m[x], m[y]
        if kind == "all":
            return X <= Y
        if kind == "no":
            return not (X & Y)
        if kind == "some":
            return bool(X & Y)
        if kind == "some_not":
            return bool(X - Y)
        raise ValueError(kind)

    def text(stmt):
        kind, x, y = stmt
        return {"all": f"All {x} are {y}", "no": f"No {x} are {y}", "some": f"Some {x} are {y}", "some_not": f"Some {x} are not {y}"}[kind]

    def follows(premises, concl):
        ok = False
        for sa, sb, sc in itertools.product(subsets, repeat=3):
            m = {"A": sa, "B": sb, "C": sc}
            if all(holds(p, m) for p in premises):
                ok = True
                if not holds(concl, m):
                    return False
        return ok  # vacuous (inconsistent premises) is not used here

    sets = [
        ([("all", "cats", "pets"), ("all", "pets", "animals")], [("all", "cats", "animals"), ("some", "animals", "cats"), ("all", "animals", "cats")]),
        ([("all", "pens", "tools"), ("no", "tools", "toys")], [("no", "pens", "toys"), ("some", "pens", "toys"), ("all", "toys", "pens")]),
        ([("some", "doctors", "writers"), ("all", "writers", "readers")], [("some", "doctors", "readers"), ("all", "doctors", "readers"), ("no", "doctors", "readers")]),
        ([("some", "students", "athletes"), ("no", "athletes", "teachers")], [("some_not", "students", "teachers"), ("some", "students", "teachers"), ("all", "students", "athletes")]),
        ([("no", "birds", "fish"), ("all", "sparrows", "birds")], [("no", "sparrows", "fish"), ("some", "sparrows", "fish"), ("all", "fish", "sparrows")]),
    ]
    for premises, concls in sets:
        # build a generic model with names mapped to A,B,C in order of first appearance
        names = []
        for k, x, y in premises + concls:
            for n in (x, y):
                if n not in names:
                    names.append(n)
        assert len(names) == 3, names
        mp = dict(zip(names, "ABC"))
        conv = lambda s: (s[0], mp[s[1]], mp[s[2]])
        flags = [follows([conv(p) for p in premises], conv(c)) for c in concls]
        valid = [text(c) for c, f in zip(concls, flags) if f]
        invalid = [text(c) for c, f in zip(concls, flags) if not f]
        assert len(valid) >= 1, (premises, flags)
        # one correct conclusion asked; ensure exactly one valid among the three
        assert len(valid) == 1, (premises, valid)
        stmt = ". ".join(text(p) for p in premises) + "."
        add("Logical reasoning", "Syllogisms", "medium",
            f"Statements: {stmt} Taking the statements as true, which one conclusion definitely follows?",
            valid[0], invalid + ["None of these follows"])


def l_blood():
    items = [
        ("Pointing to a man, Riya says, \"He is the son of my mother's only brother.\" How is the man related to Riya?", "Cousin", ["Brother", "Uncle", "Nephew"]),
        ("A is the sister of B. B is the father of C. How is A related to C?", "Aunt", ["Mother", "Grandmother", "Sister"]),
        ("Pointing to a photograph, Arun says, \"She is the daughter of my father's only son.\" How is the girl related to Arun?", "Daughter", ["Sister", "Niece", "Cousin"]),
        ("P is the brother of Q. Q is the mother of R. How is P related to R?", "Maternal uncle", ["Father", "Grandfather", "Paternal uncle"]),
        ("Neha's mother is the only daughter of Karan's mother. How is Karan related to Neha?", "Maternal uncle", ["Father", "Cousin", "Brother"]),
    ]
    for body, ans, wr in items:
        add("Logical reasoning", "Blood relations", "medium", body, ans, wr)


# ------------------------------------------------------------------ VERBAL (30, hand written)
def verbal():
    V = "Verbal ability"
    syn = [("abundant", "plentiful", ["rare", "tiny", "hidden"]), ("candid", "frank", ["secretive", "clumsy", "angry"]),
           ("diligent", "hardworking", ["careless", "sleepy", "boastful"]), ("obsolete", "outdated", ["modern", "popular", "fragile"]),
           ("reluctant", "unwilling", ["eager", "tired", "nervous"]), ("meticulous", "very careful", ["rude", "quick", "forgetful"]),
           ("frugal", "thrifty", ["wasteful", "wealthy", "greedy"]), ("lucid", "clear", ["confusing", "heavy", "silent"])]
    for w, a, wr in syn:
        add(V, "Synonyms", "easy", f"Choose the word closest in meaning to \"{w}\".", a, wr)
    ant = [("expand", "contract", ["extend", "grow", "inflate"]), ("ancient", "modern", ["old", "historic", "antique"]),
           ("scarce", "plentiful", ["rare", "limited", "meagre"]), ("transparent", "opaque", ["clear", "thin", "glassy"]),
           ("generous", "stingy", ["kind", "wealthy", "polite"]), ("victory", "defeat", ["triumph", "success", "conquest"])]
    for w, a, wr in ant:
        add(V, "Antonyms", "easy", f"Choose the word opposite in meaning to \"{w}\".", a, wr)
    grammar = [
        ("Everyone in the room ___ waiting for the result.", "is", ["are", "were", "have been"]),
        ("She has been working at this company ___ 2019.", "since", ["for", "from", "during"]),
        ("If I ___ you, I would apologise at once.", "were", ["am", "was", "will be"]),
        ("Each of the students ___ a laptop.", "has", ["have", "are having", "having"]),
        ("She is afraid ___ the dark.", "of", ["from", "with", "at"]),
        ("I look forward to ___ you next week.", "meeting", ["meet", "have met", "met"]),
        ("She is taller ___ her sister.", "than", ["then", "from", "as"]),
        ("Hardly had we left the house ___ it began to rain.", "when", ["as", "while", "that"]),
        ("The committee ___ its decision yesterday.", "announced", ["announce", "announcing", "has announce"]),
        ("My brother, along with his friends, ___ coming to the party.", "is", ["are", "were", "have been"]),
    ]
    for body, a, wr in grammar:
        add(V, "Grammar and usage", "medium", f"Fill in the blank: {body}", a, wr)
    ana = [("Doctor is to hospital as teacher is to ___.", "school", ["student", "book", "exam"]),
           ("Pen is to write as knife is to ___.", "cut", ["sharp", "kitchen", "steel"]),
           ("Bird is to nest as bee is to ___.", "hive", ["honey", "flower", "sting"])]
    for body, a, wr in ana:
        add(V, "Analogies", "easy", f"Complete the analogy: {body}", a, wr)
    odd = [("Mercury, Venus, Moon, Mars", "Moon", ["Mercury", "Venus", "Mars"]),
           ("Oxygen, Nitrogen, Carbon, Granite", "Granite", ["Oxygen", "Nitrogen", "Carbon"]),
           ("Triangle, Square, Circle, Cube", "Cube", ["Triangle", "Square", "Circle"])]
    for items, a, wr in odd:
        add(V, "Odd one out", "easy", f"Which one does not belong with the others: {items}?", a, wr)


# ------------------------------------------------------------------ DATA INTERPRETATION (30)
def data_interp():
    D = "Data interpretation"
    months = ["Jan", "Feb", "Mar", "Apr"]

    def table(vals):
        return ", ".join(f"{m}: {v}" for m, v in zip(months, vals))

    def series():
        while True:
            vals = [rng.choice(range(80, 321, 10)) for _ in range(4)]
            if len(set(vals)) == 4:
                return vals

    kinds = ["total", "pct_change", "avg", "diff_max_min", "share", "ratio"]
    for kind in kinds:
        for _ in range(5):
            for attempt in range(200):
                v = series()
                prod = rng.choice(["laptops", "phones", "tablets", "printers"])
                head = f"Units of {prod} sold by a store: {table(v)}."
                if kind == "total":
                    ans = sum(v)
                    add(D, "Tables and totals", "easy", head + " What is the total number of units sold in the four months?", ans, near_ints(ans))
                elif kind == "avg":
                    if sum(v) % 4:
                        continue
                    ans = sum(v) // 4
                    add(D, "Averages from data", "easy", head + " What is the average monthly sales?", ans, near_ints(ans))
                elif kind == "diff_max_min":
                    ans = max(v) - min(v)
                    add(D, "Comparisons", "easy", head + " What is the difference between the highest and the lowest monthly sales?", ans, near_ints(ans))
                elif kind == "pct_change":
                    a, b = v[0], v[1]
                    if (b - a) * 100 % a:
                        continue
                    p = (b - a) * 100 // a
                    word = "increase" if p > 0 else "decrease"
                    ans = f"{abs(p)}%"
                    add(D, "Percentage change", "medium", head + f" What is the percentage {word} in sales from Jan to Feb?",
                        ans, [f"{abs(p) + 5}%", f"{max(abs(p) - 5, 1)}%", f"{abs(p) + 10}%"] + [f"{abs(p) * 2}%"])
                elif kind == "share":
                    tot = sum(v)
                    if v[2] * 100 % tot:
                        continue
                    p = v[2] * 100 // tot
                    add(D, "Percentage share", "medium", head + " What percentage of the four-month total was sold in March?",
                        f"{p}%", [f"{p + 5}%", f"{max(p - 5, 1)}%", f"{p + 10}%", f"{p * 2}%"])
                elif kind == "ratio":
                    g = math.gcd(v[3], v[0])
                    ans = f"{v[3] // g}:{v[0] // g}"
                    wrong = [f"{v[0] // g}:{v[3] // g}", f"{v[1] // math.gcd(v[1], v[0])}:{v[0] // math.gcd(v[1], v[0])}", f"{v[2] // math.gcd(v[2], v[3])}:{v[3] // math.gcd(v[2], v[3])}"]
                    if ans in wrong or len(set(wrong)) < 3:
                        continue
                    add(D, "Ratios from data", "medium", head + " What is the ratio of April sales to January sales in its simplest form?", ans, wrong)
                break
            else:
                raise RuntimeError(f"could not build {kind}")


# ------------------------------------------------------------------ build aptitude
for fn in (q_percent_of, q_successive_change, q_ratio, q_average, q_avg_speed, q_work, q_profit, q_simple_interest,
           q_compound_interest, q_ages, q_lcm, q_sum_series, q_probability, q_combinations, q_arrangements, q_odd_sum):
    fn()
for fn in (l_series, l_coding, l_direction, l_ranking, l_syllogism, l_blood):
    fn()
verbal()
data_interp()

by_section = {}
for q in questions:
    by_section.setdefault(q["section"], []).append(q)
print("aptitude:", {k: len(v) for k, v in by_section.items()}, "total", len(questions))
for q in questions:  # structural invariants, applied to every item
    assert 0 <= q["answer_index"] < 4 and len(set(q["options"])) == 4
    assert q["options"][q["answer_index"]] and q["body"].strip()

# ------------------------------------------------------------------ CODING PROBLEMS
def ref_even_sum(inp):
    d = inp.split(); n = int(d[0]); return str(sum(x for x in map(int, d[1:1 + n]) if x % 2 == 0))

def ref_palindrome(inp):
    s = inp.strip(); return "YES" if s == s[::-1] else "NO"

def ref_pair_sum(inp):
    d = inp.split(); n, t = int(d[0]), int(d[1]); a = list(map(int, d[2:2 + n]))
    seen = set()
    for x in a:
        if t - x in seen: return "YES"
        seen.add(x)
    return "NO"

def ref_brackets(inp):
    pairs = {")": "(", "]": "[", "}": "{"}; st = []
    for c in inp.strip():
        if c in "([{": st.append(c)
        elif not st or st.pop() != pairs[c]: return "NO"
    return "YES" if not st else "NO"

def ref_mode(inp):
    d = inp.split(); n = int(d[0]); a = list(map(int, d[1:1 + n])); cnt = {}
    for x in a: cnt[x] = cnt.get(x, 0) + 1
    best = max(cnt.values()); return str(min(k for k, v in cnt.items() if v == best))

def ref_longest_ones(inp):
    best = cur = 0
    for c in inp.strip():
        cur = cur + 1 if c == "1" else 0; best = max(best, cur)
    return str(best)

def arr_case(r, n, lo, hi, extra=""):
    a = [r.randint(lo, hi) for _ in range(n)]
    return f"{n}{extra}\n{' '.join(map(str, a))}"

STARTERS = {
    "python": "import sys\n\ndata = sys.stdin.read()\n# read the input from data and print the answer\n",
    "javascript": "const data = require(\"fs\").readFileSync(0, \"utf8\");\n// read the input from data and console.log the answer\n",
    "java": "import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    // read the input and print the answer\n  }\n}\n",
    "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  // read the input and print the answer\n  return 0;\n}\n",
}
prng = random.Random(SEED + 1)
problems = []

def problem(title, difficulty, statement, ref, inputs, topics=()):
    tests = [{"input": i, "expected_output": ref(i)} for i in inputs]
    assert len({t["input"] for t in tests}) == len(tests), f"duplicate inputs in {title}"
    problems.append({"title": title, "difficulty": difficulty, "topics": list(topics), "statement": statement, "tests": tests, "visible": 1,
                     "starter_code": STARTERS, "external_id": ext_id(title), "source": SOURCE, "license": LICENSE})
    return ref

refs = {}
refs["Sum of even numbers"] = problem("Sum of even numbers", "easy",
    "Read an integer n, then n space-separated integers on the next line. Print the sum of the even numbers (0 if there are none).\n\nInput: n, then n integers.\nOutput: one integer.",
    ref_even_sum, ["5\n1 2 3 4 5", "3\n2 4 6", "4\n1 3 5 7", "1\n10", "6\n-2 -4 1 0 8 9", "1\n7", "2\n-8 8"] + [arr_case(prng, prng.randint(5, 30), -50, 50) for _ in range(3)], topics=["Arrays", "Math"])
refs["Palindrome check"] = problem("Palindrome check", "easy",
    "Read a string s of lowercase letters. Print YES if it reads the same forwards and backwards, otherwise NO.\n\nInput: one line with s (1 to 100 characters).\nOutput: YES or NO.",
    ref_palindrome, ["level", "hello", "a", "abba", "abca", "racecar", "ab", "noon", "palindrome", "zz"], topics=["Strings", "Two pointers"])
refs["Pair with target sum"] = problem("Pair with target sum", "medium",
    "Given n integers and a target t, print YES if two different positions hold numbers that add up to t, otherwise NO.\n\nInput: first line n and t; second line n integers.\nOutput: YES or NO.",
    ref_pair_sum, ["5 9\n2 7 11 15 1", "4 10\n1 2 3 4", "2 6\n3 3", "1 4\n2", "6 0\n-3 1 3 5 -1 8", "3 20\n10 5 7", "5 8\n4 1 2 3 5"] + [f"{n} {prng.randint(-20, 60)}\n" + " ".join(str(prng.randint(-20, 40)) for _ in range(n)) for n in (8, 10, 12)], topics=["Arrays", "Hash maps"])
refs["Balanced brackets"] = problem("Balanced brackets", "medium",
    "Read a string made only of the characters ( ) [ ] { }. Print YES if every bracket is closed by the matching type in the correct order, otherwise NO.\n\nInput: one line with the string (1 to 1000 characters).\nOutput: YES or NO.",
    ref_brackets, ["()", "([]{})", "([)]", "(((", "}{", "{[()]}", "(()", "[]{}()", "(]", "((()))[[]]{}"], topics=["Stacks", "Strings"])
refs["Most frequent number"] = problem("Most frequent number", "medium",
    "Given n integers, print the value that appears most often. If several values tie, print the smallest of them.\n\nInput: first line n; second line n integers.\nOutput: one integer.",
    ref_mode, ["6\n1 2 2 3 3 4", "1\n5", "5\n7 7 7 1 1", "4\n4 3 2 1", "7\n-1 -1 2 2 3 3 0", "3\n9 9 8"] + [arr_case(prng, prng.randint(8, 40), 1, 6) for _ in range(4)], topics=["Arrays", "Hash maps"])
refs["Longest run of ones"] = problem("Longest run of ones", "easy",
    "Read a binary string made of 0 and 1. Print the length of the longest block of consecutive 1s (0 if there is none).\n\nInput: one line with the string (1 to 1000 characters).\nOutput: one integer.",
    ref_longest_ones, ["11011101", "0000", "1", "1111", "0101010", "1001110011", "0", "111000111111", "10", "01111110"], topics=["Strings", "Arrays"])
print("coding problems:", len(problems), "tests:", sum(len(p["tests"]) for p in problems))

# ------------------------------------------------------------------ TAKE-HOME TASKS
tasks = [
    {"title": "REST API for a booking system", "source": SOURCE,
     "brief": "Build a small REST API (any language) for booking time slots. Support creating slots, listing free slots, booking a slot and cancelling a booking. A slot cannot be double booked. Persist data, validate input, and return clear error codes.\n\nDeliver a README with run instructions, your design decisions, and at least 6 automated tests. We will discuss it in a short walkthrough call.",
     "rubric": ["Correctness", "Data modelling", "Error handling", "Testing", "Documentation"]},
    {"title": "Command line log analyser", "source": SOURCE,
     "brief": "Write a command line tool that reads a web server access log and prints the top 10 requested paths, the error rate (5xx) and the 95th percentile response time. Handle malformed lines without crashing and process a 500 MB file without loading it all into memory.\n\nInclude a small sample log, tests, and a README explaining your approach and its complexity.",
     "rubric": ["Correctness", "Performance and memory", "Robustness", "Testing", "Documentation"]},
    {"title": "Rate limiter library", "source": SOURCE,
     "brief": "Implement a reusable rate limiter library (token bucket or sliding window) with a clean interface that can limit by an arbitrary key. It must be safe under concurrent use and should be easy to swap its storage between memory and an external store.\n\nProvide tests that cover concurrency and the time boundary, and a README with usage examples and trade-offs.",
     "rubric": ["Correctness", "API design", "Concurrency safety", "Testing", "Documentation"]},
    {"title": "Interactive data table", "source": SOURCE,
     "brief": "Build a web page that loads a JSON list of at least 200 records and shows them in a table with sorting, text filtering and pagination. It must be keyboard accessible and stay responsive with 5,000 records.\n\nUse any framework. Include component or unit tests and a README describing your choices and how you checked accessibility.",
     "rubric": ["Correctness", "Code quality", "Accessibility", "Performance", "Testing"]},
]

# ------------------------------------------------------------------ verify coding problems against the real runner
def runner_check():
    import urllib.request
    url = os.environ.get("PISTON_URL", "http://localhost:2000")
    try:
        urllib.request.urlopen(url + "/api/v2/runtimes", timeout=4).read()
    except Exception:
        print("runner: not reachable, skipped end-to-end check of the reference solutions")
        return
    import inspect
    bad = 0
    for p in problems:
        # Re-run the python reference through the sandbox, as a candidate's code would run.
        src = (
            "import sys\n" + inspect.getsource(refs[p["title"]]) +
            "\nprint(%s(sys.stdin.read()))\n" % refs[p["title"]].__name__
        )
        for t in p["tests"]:
            req = urllib.request.Request(url + "/api/v2/execute", method="POST",
                data=json.dumps({"language": "python", "version": "*", "files": [{"name": "main.py", "content": src}], "stdin": t["input"]}).encode(),
                headers={"content-type": "application/json"})
            out = json.loads(urllib.request.urlopen(req, timeout=30).read())["run"]["stdout"].strip()
            if out != t["expected_output"].strip():
                bad += 1
                print("MISMATCH", p["title"], repr(t["input"][:40]), out, t["expected_output"])
    print("runner: verified", sum(len(p["tests"]) for p in problems), "tests through the sandbox,", bad, "mismatches")
    assert bad == 0

runner_check()

os.makedirs(OUT, exist_ok=True)
for name, data in (("aptitude.json", questions), ("coding.json", problems), ("tasks.json", tasks)):
    with open(os.path.join(OUT, name), "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
print("wrote", OUT)
