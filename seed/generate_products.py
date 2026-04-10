"""
Step 1: Generate products using a local LLM via Ollama.
Usage:  python generate_products.py [--per-category 8]
Output: output/products.json
"""

import argparse, json, os, re, signal, sys, time, requests
from config import (
    LLM_URL, LLM_MODEL, PRODUCTS_PER_CATEGORY,
    TEMPERATURE, OUTPUT_FILE, SELLERS, CATEGORIES,
    seller_tenant_id, product_uuid,
)


def build_prompt(category_name, parent_name, seller_name, seller_niche, existing_names, count):
    existing_block = "\n".join(f"  - {n}" for n in existing_names[-40:]) if existing_names else "  (none yet)"
    return f"""You are a product catalog generator for an e-commerce marketplace.

Generate exactly {count} unique products for the category "{category_name}" (under "{parent_name}").
These products are sold by "{seller_name}", a store specializing in: {seller_niche}.

Each product MUST have these fields:
- name: a specific, realistic product name. Include a realistic brand name you invent, plus model details (size, color, material, wattage, etc.)
- description: 2-3 sentences describing features, materials, and use case. Be specific.
- price: realistic USD price as a number (no currency symbol)
- stock: integer between 5 and 500

Rules:
- Every product MUST be clearly DIFFERENT — vary the use case, brand, price tier, and target audience.
- Mix budget, mid-range, and premium products.
- Invent realistic brand names (e.g. "Kensara", "Voltmix", "Aerlume", "Duracore"). Do NOT use real brand names.
- Do NOT produce generic names like "Premium Widget" or "Deluxe Item".
- Do NOT repeat or closely resemble any of these already-generated products:
{existing_block}

Respond with ONLY a JSON array. No explanation, no markdown, no code fences:
[{{"name": "...", "description": "...", "price": 29.99, "stock": 150}}]"""


def call_llm(prompt, retries=3):
    for attempt in range(retries):
        try:
            resp = requests.post(LLM_URL, json={
                "model": LLM_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": TEMPERATURE,
                "max_tokens": 4096,
            }, timeout=180)
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


def save_products(products):
    """Atomic save — writes to a temp file then renames, so Ctrl+C can't corrupt the output."""
    os.makedirs(os.path.dirname(OUTPUT_FILE) or ".", exist_ok=True)
    tmp = OUTPUT_FILE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(products, f, indent=2)
    os.replace(tmp, OUTPUT_FILE)


stop_requested = False

def handle_signal(sig, frame):
    global stop_requested
    print("\n\nCtrl+C received — finishing current category then saving...\n")
    stop_requested = True

signal.signal(signal.SIGINT, handle_signal)


def generate_all(per_category):
    global stop_requested
    all_products = []
    seen_names = set()

    # resume from existing output
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE) as f:
            all_products = json.load(f)
            seen_names = {p["name"].lower() for p in all_products}
            print(f"Resuming — {len(all_products)} products already generated")

    done_combos = {(p["seller_n"], p["category_id"]) for p in all_products}
    total_combos = sum(len(s["category_ids"]) for s in SELLERS)
    done_count = len(done_combos)

    for seller in SELLERS:
        seller_n = seller["n"]
        tenant_id = seller_tenant_id(seller_n)

        for cat_id in seller["category_ids"]:
            if stop_requested:
                break

            if (seller_n, cat_id) in done_combos:
                continue

            cat_name, parent_name = CATEGORIES[cat_id]
            done_count += 1
            print(f"[{done_count}/{total_combos}] {seller['name']} > {cat_name}")

            existing_for_cat = [p["name"] for p in all_products if p["category_id"] == cat_id]
            batch_products = []
            remaining = per_category

            while remaining > 0:
                count = min(remaining, per_category)
                prompt = build_prompt(
                    cat_name, parent_name, seller["name"], seller["niche"],
                    existing_for_cat + [p["name"] for p in batch_products],
                    count,
                )
                raw = call_llm(prompt)
                if not raw:
                    print(f"    ! LLM returned nothing, skipping rest of category")
                    break

                for item in raw:
                    name = item.get("name", "").strip()
                    if not name or name.lower() in seen_names:
                        continue
                    seen_names.add(name.lower())
                    batch_products.append({
                        "id": product_uuid(seller_n, name),
                        "name": name,
                        "description": item.get("description", ""),
                        "price": round(float(item.get("price", 9.99)), 2),
                        "stock": int(item.get("stock", 50)),
                        "category_id": cat_id,
                        "category_name": cat_name,
                        "seller_n": seller_n,
                        "seller_name": seller["name"],
                        "tenant_id": tenant_id,
                    })
                remaining -= len(raw)

            all_products.extend(batch_products)
            print(f"    + {len(batch_products)} products")
            save_products(all_products)

        if stop_requested:
            break

    print(f"\nSaved — {len(all_products)} total products in {OUTPUT_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--per-category", type=int, default=PRODUCTS_PER_CATEGORY,
                        help=f"Products per seller per subcategory (default: {PRODUCTS_PER_CATEGORY})")
    args = parser.parse_args()
    generate_all(args.per_category)
