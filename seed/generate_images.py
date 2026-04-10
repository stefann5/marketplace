"""
Step 2: Generate product images by calling the remote image server.
Run this locally — the heavy model runs on the GPU server (image_server.py).

Usage:  python generate_images.py [--images-per-product 3] [--limit 0]
"""

import argparse, json, os, signal, sys, requests
from config import IMAGE_SERVER_URL, IMAGE_DIR, IMAGE_SIZE

stop_requested = False

def handle_signal(sig, frame):
    global stop_requested
    print("\n\nCtrl+C received — stopping after current image...\n")
    stop_requested = True

signal.signal(signal.SIGINT, handle_signal)


ANGLE_PROMPTS = [
    "front view, centered product shot, studio lighting, white background",
    "angled three-quarter view, studio lighting, white background",
    "close-up detail shot showing texture and material, studio lighting, white background",
    "side profile view, studio lighting, white background",
    "lifestyle context shot, natural setting, soft lighting",
]


def image_prompt(product_name, category_name, parent_name, angle_index):
    angle = ANGLE_PROMPTS[angle_index % len(ANGLE_PROMPTS)]
    return (
        f"Product photography of {product_name}, "
        f"{category_name}, {parent_name} product, "
        f"{angle}, "
        f"e-commerce product photo, high quality, sharp focus, "
        f"no text, no watermark"
    )


def check_server():
    try:
        r = requests.get(f"{IMAGE_SERVER_URL}/health", timeout=5)
        info = r.json()
        print(f"Image server OK — model: {info.get('model', '?')}")
        return True
    except Exception as e:
        print(f"Cannot reach image server at {IMAGE_SERVER_URL}: {e}")
        print("Start it on your GPU server:  python image_server.py --model stabilityai/sdxl-turbo")
        return False


def generate_image(prompt):
    resp = requests.post(f"{IMAGE_SERVER_URL}/generate", json={
        "prompt": prompt,
        "width": IMAGE_SIZE,
        "height": IMAGE_SIZE,
    }, timeout=120)
    resp.raise_for_status()
    return resp.content


def image_path(product_id, index):
    """product_id_0.jpg, product_id_1.jpg, ..."""
    return os.path.join(IMAGE_DIR, f"{product_id}_{index}.jpg")


def count_existing(product_id, images_per_product):
    """How many of the expected images already exist."""
    return sum(1 for i in range(images_per_product) if os.path.exists(image_path(product_id, i)))


def generate_all(images_per_product, limit):
    if not check_server():
        sys.exit(1)

    with open("output/products.json") as f:
        products = json.load(f)

    if limit:
        products = products[:limit]

    os.makedirs(IMAGE_DIR, exist_ok=True)

    # figure out total work
    work = []
    for p in products:
        for i in range(images_per_product):
            if not os.path.exists(image_path(p["id"], i)):
                work.append((p, i))

    skipped = len(products) * images_per_product - len(work)
    if skipped:
        print(f"Skipping {skipped} images that already exist")
    if not work:
        print("All images already generated")
        return

    total = len(work)
    for idx, (product, img_index) in enumerate(work):
        if stop_requested:
            break

        prompt = image_prompt(product["name"], product["category_name"],
                              product.get("parent_name", ""), img_index)
        print(f"[{idx+1}/{total}] {product['name']} (image {img_index+1}/{images_per_product})")

        try:
            img_bytes = generate_image(prompt)
            tmp_path = image_path(product["id"], img_index) + ".tmp"
            final_path = image_path(product["id"], img_index)
            with open(tmp_path, "wb") as f:
                f.write(img_bytes)
            os.replace(tmp_path, final_path)
        except Exception as e:
            print(f"  ! Failed: {e}")
            continue

    done = total - sum(1 for p, i in work if not os.path.exists(image_path(p["id"], i)))
    print(f"\n{'Stopped' if stop_requested else 'Done'} — {done}/{total} images in {IMAGE_DIR}/")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--images-per-product", type=int, default=1, help="Number of images per product (default: 1)")
    parser.add_argument("--limit", type=int, default=0, help="Max products to process (0 = all)")
    args = parser.parse_args()
    generate_all(args.images_per_product, args.limit)
