"""
Step 4b: Mark every PURCHASED order as FULFILLED and emit the matching
ORDER_FULFILLED analytics events.

Mirrors what OrderService.fulfillOrder + EventConsumer.handleOrderFulfilled would do.
Idempotent: skips orders that are already FULFILLED, and skips analytics events whose
orderId already has an ORDER_FULFILLED document in Mongo.

Usage:
    python fulfill_orders.py
"""

import random, sys
from datetime import datetime, timedelta

import psycopg2
from pymongo import MongoClient

from config import (
    DB_HOST, DB_PORT, DB_USER, DB_PASS, ORDER_DB,
    MONGO_URI, MONGO_DB, MONGO_COLLECTION,
)


def db_conn(dbname):
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        dbname=dbname, user=DB_USER, password=DB_PASS,
    )


def fulfill_all():
    order_conn = db_conn(ORDER_DB)
    order_cur = order_conn.cursor()
    mongo = MongoClient(MONGO_URI)
    events = mongo[MONGO_DB][MONGO_COLLECTION]

    # Pull every PURCHASED order — we need created_at to anchor the fulfillment date
    order_cur.execute("""
        SELECT id::text, tenant_id::text, created_at
        FROM orders
        WHERE status = 'PURCHASED'
    """)
    pending = order_cur.fetchall()
    print(f"Found {len(pending)} PURCHASED orders to fulfill")

    if not pending:
        order_cur.close(); order_conn.close(); mongo.close()
        return

    # Skip orderIds that already have an ORDER_FULFILLED doc in Mongo
    pending_ids = [row[0] for row in pending]
    already_in_mongo = {
        doc["orderId"] for doc in events.find(
            {"eventType": "ORDER_FULFILLED", "orderId": {"$in": pending_ids}},
            {"orderId": 1, "_id": 0},
        )
    }
    if already_in_mongo:
        print(f"  ({len(already_in_mongo)} already have an ORDER_FULFILLED event in Mongo)")

    end_dt = datetime(2025, 12, 31, 23, 59, 59)

    docs = []
    for order_id, tenant_id, created_at in pending:
        if order_id in already_in_mongo:
            continue
        fulfilled_dt = created_at + timedelta(days=random.randint(1, 14))
        if fulfilled_dt > end_dt:
            fulfilled_dt = end_dt
        docs.append({
            "_class": "com.platform.analytics.model.AnalyticsEvent",
            "tenantId": tenant_id,
            "eventType": "ORDER_FULFILLED",
            "orderId": order_id,
            "timestamp": fulfilled_dt,
        })

    # Flip the SQL status
    order_cur.execute("UPDATE orders SET status = 'FULFILLED' WHERE status = 'PURCHASED'")
    flipped = order_cur.rowcount
    order_conn.commit()
    print(f"  flipped {flipped} orders to FULFILLED")

    if docs:
        events.insert_many(docs)
        print(f"  inserted {len(docs)} ORDER_FULFILLED analytics events")
    else:
        print("  no new analytics events needed")

    order_cur.close()
    order_conn.close()
    mongo.close()
    print("\nDone!")


if __name__ == "__main__":
    fulfill_all()
