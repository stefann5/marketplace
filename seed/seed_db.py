"""
Step 3: Seed catalog database from generated products.json + images.
Usage:  python seed_db.py [--clean] [--images-per-product 1]

Expects:
  - output/products.json   (from generate_products.py)
  - output/images/<id>.jpg (from generate_images.py)
"""

import argparse, json, os, random, uuid
from datetime import datetime, timedelta

import psycopg2
from psycopg2.extras import execute_values
from minio import Minio

from config import (
    DB_HOST, DB_PORT, DB_USER, DB_PASS, CATALOG_DB,
    MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET, MINIO_PUBLIC_URL,
    IMAGE_DIR,
)


def db_conn():
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        dbname=CATALOG_DB, user=DB_USER, password=DB_PASS,
    )


def minio_client():
    client = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=False,
    )
    if not client.bucket_exists(MINIO_BUCKET):
        client.make_bucket(MINIO_BUCKET)
    return client


def load_products():
    with open("output/products.json") as f:
        return json.load(f)


def get_products_with_images(cur):
    """Return set of product_ids that already have at least one image in the DB."""
    cur.execute("SELECT DISTINCT product_id::text FROM product_images")
    return {row[0] for row in cur.fetchall()}


def seed(clean=False):
    products = load_products()
    print(f"Loaded {len(products)} products\n")

    conn = db_conn()
    cur = conn.cursor()
    mc = minio_client()

    if clean:
        print("Cleaning existing seed data...")
        cur.execute("DELETE FROM product_images")
        cur.execute("DELETE FROM reviews")
        cur.execute("DELETE FROM products")
        conn.commit()
        print("  done\n")

    # ── Insert products ──────────────────────────────
    print("Inserting products...")
    prod_rows = []
    for p in products:
        created = datetime(2025, 1, 1) + timedelta(hours=random.randint(0, 8760))
        prod_rows.append((
            p["id"],
            p["tenant_id"],
            p["name"],
            p["description"],
            p["price"],
            p["stock"],
            p["category_id"],
            0,      # version
            0.0,    # average_rating
            0,      # review_count
            0,      # purchase_count
            created,
            created,
        ))

    execute_values(cur, """
        INSERT INTO products
            (id, tenant_id, name, description, price, stock, category_id,
             version, average_rating, review_count, purchase_count, created_at, updated_at)
        VALUES %s
        ON CONFLICT (id) DO NOTHING
    """, prod_rows)
    conn.commit()
    print(f"  + {len(prod_rows)} products\n")

    # ── Upload images & insert product_images ────────
    # Discovers images from output/images/{product_id}_{index}.jpg
    print("Uploading images to MinIO...")
    already_have = get_products_with_images(cur)
    skipped = 0
    uploaded = 0

    for p in products:
        if p["id"] in already_have:
            skipped += 1
            continue

        # find all images for this product: {id}_0.jpg, {id}_1.jpg, ...
        img_files = []
        i = 0
        while True:
            path = os.path.join(IMAGE_DIR, f"{p['id']}_{i}.jpg")
            if os.path.exists(path):
                img_files.append((path, i))
                i += 1
            else:
                break

        if not img_files:
            print(f"  ! Missing images for: {p['name']}")
            continue

        img_rows = []
        for local_path, order in img_files:
            object_name = f"{p['id']}/{uuid.uuid4()}.jpg"
            mc.fput_object(MINIO_BUCKET, object_name, local_path, content_type="image/jpeg")
            image_url = f"{MINIO_PUBLIC_URL}/{MINIO_BUCKET}/{object_name}"
            img_rows.append((
                str(uuid.uuid4()),
                p["id"],
                image_url,
                order,
            ))

        execute_values(cur, """
            INSERT INTO product_images (id, product_id, image_url, display_order)
            VALUES %s
            ON CONFLICT (id) DO NOTHING
        """, img_rows)
        conn.commit()
        uploaded += 1

        if uploaded % 50 == 0:
            print(f"  ... {uploaded} products uploaded")

    if skipped:
        print(f"  Skipped {skipped} products (images already in DB)")
    print(f"  + {uploaded} products uploaded\n")

    cur.close()
    conn.close()
    print("Done!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--clean", action="store_true", help="Delete existing products before inserting")
    args = parser.parse_args()
    seed(args.clean)
