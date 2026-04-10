"""
Step 6b: Upload generated seller logos to MinIO and set logo_url on each seller_profile.

Mirrors what seller-service MinioService.uploadLogo + SellerService would do:
  - object key:   {profileId}/logo.jpg
  - bucket:       seller-documents (already has a public-read policy on */logo* set
                  by the seller-service on startup)
  - logo_url:     {MINIO_PUBLIC_URL}/{bucket}/{profileId}/logo.jpg

Idempotent: skips sellers whose seller_profiles.logo_url is already non-NULL.

Usage:  python seed_seller_logos.py [--clean]
"""

import argparse, os, sys

import psycopg2
from minio import Minio

from config import (
    DB_HOST, DB_PORT, DB_USER, DB_PASS, SELLER_DB,
    MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY,
    MINIO_SELLER_BUCKET, MINIO_PUBLIC_URL,
    SELLERS, SELLER_LOGO_DIR, seller_profile_id,
)


def db_conn():
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        dbname=SELLER_DB, user=DB_USER, password=DB_PASS,
    )


def minio_client():
    client = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=False,
    )
    if not client.bucket_exists(MINIO_SELLER_BUCKET):
        # Note: in normal operation seller-service creates this bucket and applies the
        # public-read policy on startup. If you're seeding before the service has run,
        # we create the bucket here — but the public-read policy will only be applied
        # the first time seller-service starts up.
        print(f"  ! Bucket {MINIO_SELLER_BUCKET} did not exist; creating it. "
              f"Logos will only be publicly readable once seller-service has started.")
        client.make_bucket(MINIO_SELLER_BUCKET)
    return client


def seed(clean):
    conn = db_conn()
    cur = conn.cursor()
    mc = minio_client()

    if clean:
        print("Clearing all existing logo_url values...")
        cur.execute("UPDATE seller_profiles SET logo_url = NULL")
        conn.commit()

    # Pull current state for all 20 sellers
    cur.execute("SELECT id::text, logo_url FROM seller_profiles")
    current = {row[0]: row[1] for row in cur.fetchall()}

    uploaded = 0
    skipped = 0
    missing = 0

    for seller in SELLERS:
        n = seller["n"]
        profile_id = seller_profile_id(n)
        local_path = os.path.join(SELLER_LOGO_DIR, f"{n}.jpg")

        if profile_id not in current:
            print(f"  ! No seller_profiles row for {seller['name']} (id={profile_id})")
            continue

        if current[profile_id]:
            skipped += 1
            continue

        if not os.path.exists(local_path):
            print(f"  ! Missing local logo for {seller['name']}: {local_path}")
            missing += 1
            continue

        object_name = f"{profile_id}/logo.jpg"
        mc.fput_object(MINIO_SELLER_BUCKET, object_name, local_path, content_type="image/jpeg")
        logo_url = f"{MINIO_PUBLIC_URL}/{MINIO_SELLER_BUCKET}/{object_name}"

        cur.execute(
            "UPDATE seller_profiles SET logo_url = %s, updated_at = NOW() WHERE id = %s",
            (logo_url, profile_id),
        )
        conn.commit()
        uploaded += 1
        print(f"  + {seller['name']} -> {logo_url}")

    cur.close()
    conn.close()

    print(f"\nDone — uploaded {uploaded}, skipped {skipped} (already had logo), missing {missing}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--clean", action="store_true",
                        help="Clear all existing logo_url values before uploading (forces re-upload)")
    args = parser.parse_args()
    seed(args.clean)
