"""
Step 5b: Assign generated reviews to real (buyer, product) pairs.

Pipeline:
  1. Load output/reviews.json (department -> list of reviews from generate_reviews.py).
  2. For every product in catalog_db, find all buyers who actually purchased it
     (joins order_db.orders + order_db.order_items).
  3. EVERY such buyer gets a review — picked from the product's department pool with
     the natural pool distribution (the pool itself is already 80/10/10).
  4. Inserts into catalog_db.reviews. Skips rows already present
     (UNIQUE(product_id, user_id) constraint = idempotent).
  5. Recomputes products.review_count + products.average_rating in one bulk UPDATE.

Usage:
    python seed_reviews.py
    python seed_reviews.py --seed 7
"""

import argparse, json, os, random, sys, uuid
from collections import defaultdict
from datetime import datetime, timedelta

import psycopg2
from psycopg2.extras import execute_values

from config import (
    DB_HOST, DB_PORT, DB_USER, DB_PASS, CATALOG_DB, ORDER_DB,
    REVIEWS_OUTPUT_FILE,
    department_for_category, buyer_email_from_user_id,
)


def db_conn(dbname):
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        dbname=dbname, user=DB_USER, password=DB_PASS,
    )


def load_review_pools():
    if not os.path.exists(REVIEWS_OUTPUT_FILE):
        print(f"{REVIEWS_OUTPUT_FILE} not found — run generate_reviews.py first")
        sys.exit(1)
    with open(REVIEWS_OUTPUT_FILE) as f:
        pools = json.load(f)
    print(f"Loaded review pools: {len(pools)} departments, "
          f"{sum(len(v) for v in pools.values())} total reviews")
    return pools


def load_products(catalog_cur):
    """All products with their category_id."""
    catalog_cur.execute("SELECT id::text, category_id FROM products")
    return [{"id": row[0], "category_id": row[1]} for row in catalog_cur.fetchall()]


def load_buyers_per_product(order_cur):
    """For every (product, buyer) pair that has at least one order item, return the
    earliest purchase date — used to anchor the review's created_at after that date."""
    print("Querying purchase history (this may take a moment)...")
    order_cur.execute("""
        SELECT oi.product_id::text, o.user_id::text, MIN(o.created_at)
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        GROUP BY oi.product_id, o.user_id
    """)
    by_product = defaultdict(list)
    for product_id, user_id, first_purchase in order_cur.fetchall():
        by_product[product_id].append((user_id, first_purchase))
    print(f"  {sum(len(v) for v in by_product.values())} (product, buyer) pairs "
          f"across {len(by_product)} products")
    return by_product


def load_existing_reviews(catalog_cur):
    """(product_id, user_id) pairs that already exist in reviews — to skip on rerun."""
    catalog_cur.execute("SELECT product_id::text, user_id::text FROM reviews")
    return {(row[0], row[1]) for row in catalog_cur.fetchall()}


def random_review_dt(first_purchase, end_dt):
    """Random review timestamp at least 1 day after the purchase."""
    earliest = first_purchase + timedelta(days=1)
    if earliest >= end_dt:
        return end_dt
    delta = end_dt - earliest
    return earliest + timedelta(seconds=random.randint(0, int(delta.total_seconds())))


def seed_reviews(seed):
    random.seed(seed)
    pools = load_review_pools()

    catalog_conn = db_conn(CATALOG_DB)
    catalog_cur = catalog_conn.cursor()
    order_conn = db_conn(ORDER_DB)
    order_cur = order_conn.cursor()

    products = load_products(catalog_cur)
    print(f"Loaded {len(products)} products from catalog_db")

    buyers_per_product = load_buyers_per_product(order_cur)
    existing = load_existing_reviews(catalog_cur)
    print(f"  {len(existing)} reviews already exist (will skip)\n")

    end_dt = datetime(2025, 12, 31, 23, 59, 59)

    review_rows = []
    skipped_no_pool = 0
    skipped_no_buyers = 0
    inserted_total = 0

    for idx, p in enumerate(products, 1):
        pid = p["id"]
        dept = department_for_category(p["category_id"]) if p["category_id"] else None
        pool = pools.get(dept) if dept else None
        if not pool:
            skipped_no_pool += 1
            continue

        buyers = buyers_per_product.get(pid, [])
        if not buyers:
            skipped_no_buyers += 1
            continue

        for user_id, first_purchase in buyers:
            if (pid, user_id) in existing:
                continue
            review = random.choice(pool)
            review_dt = random_review_dt(first_purchase, end_dt)
            review_rows.append((
                str(uuid.uuid4()),
                pid,
                user_id,
                buyer_email_from_user_id(user_id),
                review["rating"],
                review["comment"],
                review_dt,
                review_dt,
            ))

        # Flush in chunks to keep memory bounded
        if len(review_rows) >= 5000:
            execute_values(catalog_cur, """
                INSERT INTO reviews
                    (id, product_id, user_id, buyer_name, rating, comment, created_at, updated_at)
                VALUES %s
                ON CONFLICT (product_id, user_id) DO NOTHING
            """, review_rows)
            catalog_conn.commit()
            inserted_total += len(review_rows)
            review_rows = []
            print(f"  ...processed {idx}/{len(products)} products  "
                  f"(reviews inserted so far: {inserted_total})")

    if review_rows:
        execute_values(catalog_cur, """
            INSERT INTO reviews
                (id, product_id, user_id, buyer_name, rating, comment, created_at, updated_at)
            VALUES %s
            ON CONFLICT (product_id, user_id) DO NOTHING
        """, review_rows)
        catalog_conn.commit()
        inserted_total += len(review_rows)

    print(f"\nInserted ~{inserted_total} reviews")
    if skipped_no_pool:
        print(f"  ({skipped_no_pool} products skipped — no review pool for their department)")
    if skipped_no_buyers:
        print(f"  ({skipped_no_buyers} products skipped — no buyers; run seed_orders.py first)")

    # ── Recompute review_count + average_rating on every product ──
    print("\nRecomputing products.review_count and products.average_rating...")
    catalog_cur.execute("""
        UPDATE products p
        SET review_count   = COALESCE(sub.cnt, 0),
            average_rating = COALESCE(sub.avg_rating, 0),
            updated_at     = NOW(),
            version        = p.version + 1
        FROM (
            SELECT product_id,
                   COUNT(*) AS cnt,
                   ROUND(AVG(rating)::numeric, 1) AS avg_rating
            FROM reviews
            GROUP BY product_id
        ) sub
        WHERE p.id = sub.product_id
    """)
    updated = catalog_cur.rowcount
    catalog_conn.commit()
    print(f"  updated {updated} products")

    catalog_cur.close()
    order_cur.close()
    catalog_conn.close()
    order_conn.close()
    print("\nDone!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed for reproducibility (default: 42)")
    args = parser.parse_args()
    seed_reviews(args.seed)
