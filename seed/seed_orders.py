"""
Step 4: Seed orders for buyers using the products that were already loaded by seed_db.py.

What it does:
  - For each buyer (auth-service has 50 BUYERs in data.sql), simulate N "checkouts".
  - Each checkout picks a random cart of products and groups items by seller (tenant_id),
    producing one Order row per seller — exactly mirroring CheckoutService.checkout().
  - Inserts rows into order_db.orders + order_db.order_items.
  - Decrements stock and bumps purchase_count in catalog_db.products
    (mirrors ProductService.decrementStock).
  - Writes ORDER_PLACED (one per item) and optional ORDER_FULFILLED documents
    directly into MongoDB analytics_db.analytics_events
    (mirrors what analytics-service.EventConsumer would have written from RabbitMQ).

Resumability:
  - Buyers that already have orders in order_db are skipped.
  - SQL commits + Mongo inserts happen at the end of each buyer, so a Ctrl+C
    in the middle of a buyer leaves no partial state for that buyer.

Usage:
    python seed_orders.py
    python seed_orders.py --checkouts-per-buyer 8 --max-items-per-cart 5
    python seed_orders.py --fulfilled-ratio 0.7 --seed 123
"""

import argparse, json, os, random, signal, sys, uuid
from collections import defaultdict
from datetime import datetime, timedelta
from decimal import Decimal

import psycopg2
from psycopg2.extras import execute_values
from pymongo import MongoClient

from config import (
    DB_HOST, DB_PORT, DB_USER, DB_PASS, CATALOG_DB, ORDER_DB,
    MONGO_URI, MONGO_DB, MONGO_COLLECTION,
    BUYER_COUNT, buyer_user_id,
)


stop_requested = False

def handle_signal(sig, frame):
    global stop_requested
    print("\n\nCtrl+C received — finishing current buyer then stopping...\n")
    stop_requested = True

signal.signal(signal.SIGINT, handle_signal)


def db_conn(dbname):
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        dbname=dbname, user=DB_USER, password=DB_PASS,
    )


def to_money(x):
    return Decimal(str(x)).quantize(Decimal("0.01"))


def random_dt(start, end):
    delta = end - start
    return start + timedelta(seconds=random.randint(0, int(delta.total_seconds())))


def load_products():
    if not os.path.exists("output/products.json"):
        print("output/products.json not found — run generate_products.py first")
        sys.exit(1)
    with open("output/products.json") as f:
        return json.load(f)


def existing_buyer_ids(order_cur):
    """Buyer user_ids that already have at least one order — used to skip on resume."""
    order_cur.execute("SELECT DISTINCT user_id::text FROM orders")
    return {row[0] for row in order_cur.fetchall()}


def load_stock_map(catalog_cur):
    """Current stock for every product — kept in sync locally as we decrement."""
    catalog_cur.execute("SELECT id::text, stock FROM products")
    return {row[0]: row[1] for row in catalog_cur.fetchall()}


def seed_orders(checkouts_per_buyer, max_items_per_cart, fulfilled_ratio, guarantee_min_buyers, seed):
    random.seed(seed)

    products = load_products()
    print(f"Loaded {len(products)} products from output/products.json")

    catalog_conn = db_conn(CATALOG_DB)
    catalog_cur = catalog_conn.cursor()
    order_conn = db_conn(ORDER_DB)
    order_cur = order_conn.cursor()
    mongo = MongoClient(MONGO_URI)
    events = mongo[MONGO_DB][MONGO_COLLECTION]

    stock_map = load_stock_map(catalog_cur)
    if not stock_map:
        print("No products in catalog_db — run seed_db.py first")
        sys.exit(1)

    # only operate on products that actually exist in the catalog
    products = [p for p in products if p["id"] in stock_map]
    print(f"  {len(products)} of those exist in catalog_db.products")

    already = existing_buyer_ids(order_cur)
    print(f"  {len(already)} buyers already have orders (will skip)\n")
    print(f"Buyers: {BUYER_COUNT}, checkouts/buyer: {checkouts_per_buyer}, "
          f"max items/cart: {max_items_per_cart}, fulfilled: {fulfilled_ratio:.0%}\n")

    start_dt = datetime(2025, 1, 1)
    end_dt   = datetime(2025, 12, 31, 23, 59, 59)

    total_checkouts = 0
    total_orders = 0
    total_items = 0

    for buyer_n in range(1, BUYER_COUNT + 1):
        if stop_requested:
            break

        user_id = buyer_user_id(buyer_n)
        if user_id in already:
            continue

        buyer_orders_sql = []          # (order_id, user_id, tenant_id, status, total, created_at)
        buyer_items_sql = []           # (item_id, order_id, product_id, qty, unit_price, category_id)
        buyer_stock_updates = {}       # product_id -> qty bought (aggregated)
        buyer_events = []              # mongo docs

        b_checkouts = 0
        b_orders = 0
        b_items = 0

        for _ in range(checkouts_per_buyer):
            # Build a cart: K random products with random quantities
            k = random.randint(1, max_items_per_cart)
            cart_pool = random.sample(products, min(k, len(products)))
            cart = []
            for p in cart_pool:
                qty = random.randint(1, 3)
                if stock_map.get(p["id"], 0) < qty:
                    continue
                stock_map[p["id"]] -= qty
                cart.append((p, qty))

            if not cart:
                continue

            # Group cart items by tenant — one Order per tenant (matches CheckoutService)
            by_tenant = defaultdict(list)
            for p, qty in cart:
                by_tenant[p["tenant_id"]].append((p, qty))

            checkout_dt = random_dt(start_dt, end_dt)
            b_checkouts += 1

            for tenant_id, items in by_tenant.items():
                order_id = str(uuid.uuid4())
                order_total = sum((to_money(p["price"]) * qty for p, qty in items), Decimal("0"))
                status = "FULFILLED" if random.random() < fulfilled_ratio else "PURCHASED"

                buyer_orders_sql.append((order_id, user_id, tenant_id, status, order_total, checkout_dt))

                for p, qty in items:
                    item_id = str(uuid.uuid4())
                    unit_price = to_money(p["price"])
                    buyer_items_sql.append((item_id, order_id, p["id"], qty, unit_price, p["category_id"]))
                    buyer_stock_updates[p["id"]] = buyer_stock_updates.get(p["id"], 0) + qty

                    buyer_events.append({
                        "_class": "com.platform.analytics.model.AnalyticsEvent",
                        "tenantId": tenant_id,
                        "eventType": "ORDER_PLACED",
                        "productId": p["id"],
                        "productName": p.get("name"),
                        "userId": user_id,
                        "orderId": order_id,
                        "quantity": qty,
                        "unitPrice": float(unit_price),
                        "orderTotal": float(order_total),
                        "categoryId": p["category_id"],
                        "timestamp": checkout_dt,
                    })

                if status == "FULFILLED":
                    fulfilled_dt = checkout_dt + timedelta(days=random.randint(1, 14))
                    if fulfilled_dt > end_dt:
                        fulfilled_dt = end_dt
                    buyer_events.append({
                        "_class": "com.platform.analytics.model.AnalyticsEvent",
                        "tenantId": tenant_id,
                        "eventType": "ORDER_FULFILLED",
                        "orderId": order_id,
                        "timestamp": fulfilled_dt,
                    })

                b_orders += 1
                b_items += len(items)

        if not buyer_orders_sql:
            # this buyer didn't manage to build any cart (unlikely unless stock is empty)
            continue

        # Persist this buyer atomically: SQL commits first, then mongo
        execute_values(order_cur, """
            INSERT INTO orders (id, user_id, tenant_id, status, total, created_at)
            VALUES %s
        """, buyer_orders_sql)

        execute_values(order_cur, """
            INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, category_id)
            VALUES %s
        """, buyer_items_sql)

        # Bump catalog: stock-- and purchase_count++ (in one bulk UPDATE)
        catalog_updates = [(qty, pid) for pid, qty in buyer_stock_updates.items()]
        execute_values(catalog_cur, """
            UPDATE products AS p
            SET stock = p.stock - v.qty,
                purchase_count = p.purchase_count + v.qty,
                updated_at = NOW(),
                version = p.version + 1
            FROM (VALUES %s) AS v(qty, pid)
            WHERE p.id = v.pid::uuid
        """, catalog_updates)

        order_conn.commit()
        catalog_conn.commit()

        if buyer_events:
            events.insert_many(buyer_events)

        total_checkouts += b_checkouts
        total_orders += b_orders
        total_items += b_items
        print(f"  buyer {buyer_n:>2}/{BUYER_COUNT}  "
              f"checkouts={b_checkouts}  orders={b_orders}  items={b_items}")

    print(f"\n{'Stopped' if stop_requested else 'Random pass done'} — "
          f"{total_checkouts} checkouts, {total_orders} orders, {total_items} items")

    # ── Guarantee pass: ensure every product has at least N unique buyers ──
    if not stop_requested and guarantee_min_buyers > 0:
        guarantee_pass(
            catalog_cur, catalog_conn, order_cur, order_conn, events,
            products, stock_map, guarantee_min_buyers, fulfilled_ratio,
            start_dt, end_dt,
        )

    catalog_cur.close()
    order_cur.close()
    catalog_conn.close()
    order_conn.close()
    mongo.close()


def guarantee_pass(catalog_cur, catalog_conn, order_cur, order_conn, events,
                   products, stock_map, min_buyers, fulfilled_ratio, start_dt, end_dt):
    """For every product with fewer than `min_buyers` unique buyers, add one-item
    orders from random buyers who haven't bought it yet, until the quota is met."""
    print(f"\nGuarantee pass — ensuring each product has ≥{min_buyers} unique buyers...")

    # Current unique-buyer counts per product
    order_cur.execute("""
        SELECT oi.product_id::text, COUNT(DISTINCT o.user_id)
        FROM order_items oi JOIN orders o ON oi.order_id = o.id
        GROUP BY oi.product_id
    """)
    current_counts = {row[0]: row[1] for row in order_cur.fetchall()}

    all_buyer_ids = [buyer_user_id(n) for n in range(1, BUYER_COUNT + 1)]
    products_by_id = {p["id"]: p for p in products}

    underfilled = [pid for pid in products_by_id if current_counts.get(pid, 0) < min_buyers]
    print(f"  {len(underfilled)} products under quota (of {len(products_by_id)})")

    if not underfilled:
        return

    extra_orders = 0
    extra_items = 0

    for idx, pid in enumerate(underfilled):
        if stop_requested:
            break
        p = products_by_id[pid]
        existing_count = current_counts.get(pid, 0)
        needed = min_buyers - existing_count

        # Find buyers who already bought this product, exclude them
        order_cur.execute("""
            SELECT DISTINCT o.user_id::text
            FROM order_items oi JOIN orders o ON oi.order_id = o.id
            WHERE oi.product_id = %s
        """, (pid,))
        already_bought = {row[0] for row in order_cur.fetchall()}
        candidates = [b for b in all_buyer_ids if b not in already_bought]
        if not candidates:
            continue

        chosen = random.sample(candidates, min(needed, len(candidates)))

        order_rows = []
        item_rows = []
        catalog_rows = []
        event_docs = []

        for user_id in chosen:
            qty = 1
            if stock_map.get(pid, 0) < qty:
                break
            stock_map[pid] -= qty

            order_id = str(uuid.uuid4())
            unit_price = to_money(p["price"])
            checkout_dt = random_dt(start_dt, end_dt)
            status = "FULFILLED" if random.random() < fulfilled_ratio else "PURCHASED"

            order_rows.append((order_id, user_id, p["tenant_id"], status, unit_price * qty, checkout_dt))
            item_rows.append((str(uuid.uuid4()), order_id, pid, qty, unit_price, p["category_id"]))
            catalog_rows.append((qty, pid))

            event_docs.append({
                "_class": "com.platform.analytics.model.AnalyticsEvent",
                "tenantId": p["tenant_id"],
                "eventType": "ORDER_PLACED",
                "productId": pid,
                "productName": p.get("name"),
                "userId": user_id,
                "orderId": order_id,
                "quantity": qty,
                "unitPrice": float(unit_price),
                "orderTotal": float(unit_price * qty),
                "categoryId": p["category_id"],
                "timestamp": checkout_dt,
            })
            if status == "FULFILLED":
                fulfilled_dt = checkout_dt + timedelta(days=random.randint(1, 14))
                if fulfilled_dt > end_dt:
                    fulfilled_dt = end_dt
                event_docs.append({
                    "_class": "com.platform.analytics.model.AnalyticsEvent",
                    "tenantId": p["tenant_id"],
                    "eventType": "ORDER_FULFILLED",
                    "orderId": order_id,
                    "timestamp": fulfilled_dt,
                })

        if not order_rows:
            continue

        execute_values(order_cur, """
            INSERT INTO orders (id, user_id, tenant_id, status, total, created_at)
            VALUES %s
        """, order_rows)
        execute_values(order_cur, """
            INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, category_id)
            VALUES %s
        """, item_rows)
        execute_values(catalog_cur, """
            UPDATE products AS p
            SET stock = p.stock - v.qty,
                purchase_count = p.purchase_count + v.qty,
                updated_at = NOW(),
                version = p.version + 1
            FROM (VALUES %s) AS v(qty, pid)
            WHERE p.id = v.pid::uuid
        """, catalog_rows)
        order_conn.commit()
        catalog_conn.commit()
        if event_docs:
            events.insert_many(event_docs)

        extra_orders += len(order_rows)
        extra_items += len(item_rows)

        if (idx + 1) % 200 == 0:
            print(f"  ...filled {idx + 1}/{len(underfilled)}  (extra orders so far: {extra_orders})")

    print(f"  Guarantee pass done — added {extra_orders} extra orders ({extra_items} items)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkouts-per-buyer", type=int, default=20,
                        help="Number of checkouts each buyer performs (default: 20). "
                             "Each checkout produces 1+ orders depending on how many sellers are involved.")
    parser.add_argument("--max-items-per-cart", type=int, default=8,
                        help="Maximum distinct products per cart (default: 8)")
    parser.add_argument("--fulfilled-ratio", type=float, default=0.6,
                        help="Fraction of orders to mark FULFILLED (default: 0.6)")
    parser.add_argument("--guarantee-min-buyers", type=int, default=10,
                        help="After random checkouts, top up any product with fewer than this many "
                             "unique buyers by adding extra orders. 0 to disable. (default: 10)")
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed for reproducibility (default: 42)")
    args = parser.parse_args()
    seed_orders(args.checkouts_per_buyer, args.max_items_per_cart,
                args.fulfilled_ratio, args.guarantee_min_buyers, args.seed)
