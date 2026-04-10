"""
Step 5a: Generate a pool of product reviews per top-level department using the LLM.

For each of the 25 departments we ask the LLM for REVIEWS_PER_DEPARTMENT reviews,
stratified into:
  - 80% positive (rating 4 or 5)
  - 10% neutral  (rating 3)
  - 10% negative (rating 1 or 2)

Reviews are written to be GENERIC across the department — they never mention specific
brand or product names — so seed_reviews.py can pick any of them for any product whose
category falls under that department.

Resumable (skips departments already in output/reviews.json) and Ctrl+C safe.

Usage:
    python generate_reviews.py
    python generate_reviews.py --per-department 80
"""

import argparse, json, os, re, signal, sys, time, requests

from config import (
    LLM_URL, LLM_MODEL, TEMPERATURE,
    REVIEWS_PER_DEPARTMENT, REVIEWS_OUTPUT_FILE,
    DEPARTMENTS,
)


stop_requested = False

def handle_signal(sig, frame):
    global stop_requested
    print("\n\nCtrl+C received — finishing current department then saving...\n")
    stop_requested = True

signal.signal(signal.SIGINT, handle_signal)


def build_prompt(department, n_positive, n_neutral, n_negative):
    total = n_positive + n_neutral + n_negative
    return f"""You are generating product reviews for an e-commerce marketplace.

Generate exactly {total} unique reviews for products in the "{department}" department.
Reviews must be GENERIC enough to apply to many different products in this department.
Do NOT mention any specific brand name, product name, or model number.

Sentiment breakdown (write them in this order):
- {n_positive} POSITIVE reviews — genuinely happy buyers, rating 4 or 5
- {n_neutral} NEUTRAL reviews — mixed feelings or "it's okay", rating 3
- {n_negative} NEGATIVE reviews — disappointed buyers, rating 1 or 2

Each review:
- 1 to 3 sentences, casual conversational tone
- vary length, vocabulary, and what is praised or criticized
- realistic things real shoppers mention: quality, value, shipping speed, packaging,
  fit/sizing, durability, instructions, customer service, expectations vs reality
- do NOT start every review the same way

Respond with ONLY a JSON array, no markdown, no code fences, no explanation:
[{{"sentiment": "positive", "rating": 5, "comment": "..."}}, ...]"""


def call_llm(prompt, retries=3):
    for attempt in range(retries):
        try:
            resp = requests.post(LLM_URL, json={
                "model": LLM_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": TEMPERATURE,
                "max_tokens": 6000,
            }, timeout=240)
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            return parse_json_array(content)
        except Exception as e:
            print(f"    [attempt {attempt+1}/{retries}] Error: {e}")
            if attempt < retries - 1:
                time.sleep(2)
    return []


def parse_json_array(text):
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*$", "", text)
    text = text.strip()
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1:
        raise ValueError("No JSON array found in response")
    return json.loads(text[start:end+1])


def normalize(item):
    """Validate + normalize a single review dict from the LLM."""
    sentiment = (item.get("sentiment") or "").strip().lower()
    if sentiment not in ("positive", "neutral", "negative"):
        return None
    try:
        rating = int(item.get("rating"))
    except (TypeError, ValueError):
        return None
    comment = (item.get("comment") or "").strip()
    if not comment:
        return None

    # Snap rating into the right band for the sentiment
    if sentiment == "positive":
        rating = max(4, min(5, rating))
    elif sentiment == "neutral":
        rating = 3
    else:
        rating = max(1, min(2, rating))

    return {"sentiment": sentiment, "rating": rating, "comment": comment}


def save_reviews(reviews):
    """Atomic save — same pattern as generate_products.py."""
    os.makedirs(os.path.dirname(REVIEWS_OUTPUT_FILE) or ".", exist_ok=True)
    tmp = REVIEWS_OUTPUT_FILE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(reviews, f, indent=2)
    os.replace(tmp, REVIEWS_OUTPUT_FILE)


def generate_all(per_department):
    # Resume from existing file if present
    reviews = {}
    if os.path.exists(REVIEWS_OUTPUT_FILE):
        with open(REVIEWS_OUTPUT_FILE) as f:
            reviews = json.load(f)
        print(f"Resuming — {len(reviews)} departments already done")

    n_positive = max(1, int(round(per_department * 0.80)))
    n_neutral  = max(1, int(round(per_department * 0.10)))
    n_negative = max(1, per_department - n_positive - n_neutral)

    print(f"Target per department: {per_department} reviews "
          f"({n_positive} positive, {n_neutral} neutral, {n_negative} negative)\n")

    for idx, dept in enumerate(DEPARTMENTS, 1):
        if stop_requested:
            break
        if dept in reviews and len(reviews[dept]) >= per_department:
            continue

        print(f"[{idx}/{len(DEPARTMENTS)}] {dept}")

        existing = reviews.get(dept, [])
        prompt = build_prompt(dept, n_positive, n_neutral, n_negative)
        raw = call_llm(prompt)

        if not raw:
            print("    ! LLM returned nothing, skipping")
            continue

        cleaned = []
        for item in raw:
            norm = normalize(item)
            if norm:
                cleaned.append(norm)

        # If we got fewer than asked but at least some, keep them
        reviews[dept] = existing + cleaned if not existing else cleaned
        print(f"    + {len(cleaned)} reviews "
              f"(pos={sum(1 for r in cleaned if r['sentiment']=='positive')}, "
              f"neu={sum(1 for r in cleaned if r['sentiment']=='neutral')}, "
              f"neg={sum(1 for r in cleaned if r['sentiment']=='negative')})")
        save_reviews(reviews)

    total = sum(len(v) for v in reviews.values())
    print(f"\nSaved — {total} total reviews across {len(reviews)} departments "
          f"in {REVIEWS_OUTPUT_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--per-department", type=int, default=REVIEWS_PER_DEPARTMENT,
                        help=f"Reviews to generate per department (default: {REVIEWS_PER_DEPARTMENT})")
    args = parser.parse_args()
    generate_all(args.per_department)
