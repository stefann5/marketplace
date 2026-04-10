"""
Step 6a: Generate logo images for seller profiles via the remote image server.
Mirrors generate_images.py but operates on the SELLERS list from config.py.

One image per seller, saved as output/seller_logos/{seller_n}.jpg.
Resumable: skips files that already exist.

Usage:  python generate_seller_logos.py [--limit 0]
"""

import argparse, os, signal, sys, requests

from config import IMAGE_SERVER_URL, IMAGE_SIZE, SELLERS, SELLER_LOGO_DIR


stop_requested = False

def handle_signal(sig, frame):
    global stop_requested
    print("\n\nCtrl+C received — stopping after current logo...\n")
    stop_requested = True

signal.signal(signal.SIGINT, handle_signal)


def logo_prompt(seller):
    return (
        f"Brand logo emblem for an e-commerce store called '{seller['name']}', "
        f"specializing in {seller['niche']}. "
        f"Minimalist flat vector design, abstract geometric symbol, bold colors, "
        f"centered on plain white background, sharp clean lines, professional brand mark, "
        f"no text, no letters, no words, no watermark, no signature"
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


def logo_path(seller_n):
    return os.path.join(SELLER_LOGO_DIR, f"{seller_n}.jpg")


def generate_all(limit):
    if not check_server():
        sys.exit(1)

    os.makedirs(SELLER_LOGO_DIR, exist_ok=True)

    sellers = SELLERS[:limit] if limit else SELLERS

    work = [s for s in sellers if not os.path.exists(logo_path(s["n"]))]
    skipped = len(sellers) - len(work)
    if skipped:
        print(f"Skipping {skipped} logos that already exist")
    if not work:
        print("All seller logos already generated")
        return

    total = len(work)
    for idx, seller in enumerate(work):
        if stop_requested:
            break

        print(f"[{idx+1}/{total}] {seller['name']}")
        try:
            img_bytes = generate_image(logo_prompt(seller))
            tmp = logo_path(seller["n"]) + ".tmp"
            final = logo_path(seller["n"])
            with open(tmp, "wb") as f:
                f.write(img_bytes)
            os.replace(tmp, final)
        except Exception as e:
            print(f"  ! Failed: {e}")
            continue

    done = sum(1 for s in sellers if os.path.exists(logo_path(s["n"])))
    print(f"\n{'Stopped' if stop_requested else 'Done'} — {done}/{len(sellers)} logos in {SELLER_LOGO_DIR}/")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="Max sellers to process (0 = all)")
    args = parser.parse_args()
    generate_all(args.limit)
