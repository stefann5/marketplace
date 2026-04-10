import uuid

# ── LLM ──────────────────────────────────────────────
LLM_URL = "http://localhost:8889/v1/chat/completions"
LLM_MODEL = "meta-llama/Llama-3.3-70B-Instruct"
PRODUCTS_PER_CATEGORY = 8           # per seller per subcategory
TEMPERATURE = 0.9
OUTPUT_FILE = "output/products.json"

# ── Image Generation ─────────────────────────────────
IMAGE_SERVER_URL = "http://localhost:8532"
IMAGE_DIR = "output/images"
SELLER_LOGO_DIR = "output/seller_logos"
IMAGE_SIZE = 512

# ── Databases ────────────────────────────────────────
DB_HOST = "localhost"
DB_PORT = 5432
DB_USER = "postgres"
DB_PASS = "admin"
CATALOG_DB = "catalog_db"
ORDER_DB = "order_db"
SELLER_DB = "seller_db"

# ── MongoDB (analytics) ──────────────────────────────
MONGO_URI = "mongodb://localhost:27017"
MONGO_DB = "analytics_db"
MONGO_COLLECTION = "analytics_events"

# ── MinIO ────────────────────────────────────────────
MINIO_ENDPOINT = "localhost:9000"
MINIO_ACCESS_KEY = "minioadmin"
MINIO_SECRET_KEY = "minioadmin"
MINIO_BUCKET = "product-images"
MINIO_SELLER_BUCKET = "seller-documents"   # used by seller-service for logos + docs
MINIO_PUBLIC_URL = "http://localhost:9000"

# ── Buyers ───────────────────────────────────────────
BUYER_COUNT = 300  # must match the count seeded in auth-service/data.sql

# ── Reviews ──────────────────────────────────────────
REVIEWS_PER_DEPARTMENT = 50         # 40 positive / 5 neutral / 5 negative
REVIEWS_OUTPUT_FILE = "output/reviews.json"

# ── UUID helpers ─────────────────────────────────────
NAMESPACE = uuid.UUID("12345678-1234-1234-1234-123456789abc")

def seller_tenant_id(n): return f"b0000000-0000-0000-0000-{n:012d}"

def seller_profile_id(n): return f"c0000000-0000-0000-0000-{n:012d}"

def buyer_user_id(n): return f"d0000000-0000-0000-0000-{n:012d}"

def buyer_email_from_user_id(user_id):
    """Reverse of buyer_user_id — d0000000-...-000000000123  →  buyer123@marketplace.com"""
    n = int(user_id.split("-")[-1])
    return f"buyer{n}@marketplace.com"

def product_uuid(seller_n, product_name):
    return str(uuid.uuid5(NAMESPACE, f"product-{seller_n}-{product_name}"))

# ── Departments (deterministic order from CATEGORIES) ──
# Defined after CATEGORIES below.

# ── Categories (id → name, parent_name) ──────────────
# Only subcategories — products get assigned to these
CATEGORIES = {
    26: ("Televisions", "Electronics"),
    27: ("Cameras & Photography", "Electronics"),
    28: ("Headphones & Earbuds", "Electronics"),
    29: ("Speakers & Audio", "Electronics"),
    30: ("Wearable Technology", "Electronics"),
    31: ("Home Audio & Theater", "Electronics"),
    32: ("Drones & Accessories", "Electronics"),
    33: ("Laptops", "Computers & Accessories"),
    34: ("Desktop Computers", "Computers & Accessories"),
    35: ("Monitors & Displays", "Computers & Accessories"),
    36: ("Computer Components", "Computers & Accessories"),
    37: ("Networking & Wi-Fi", "Computers & Accessories"),
    38: ("Printers & Scanners", "Computers & Accessories"),
    39: ("Storage & Drives", "Computers & Accessories"),
    40: ("Keyboards & Mice", "Computers & Accessories"),
    41: ("Smartphones", "Smartphones & Tablets"),
    42: ("Tablets", "Smartphones & Tablets"),
    43: ("Phone Cases & Screen Protectors", "Smartphones & Tablets"),
    44: ("Chargers & Cables", "Smartphones & Tablets"),
    45: ("Smartwatches & Bands", "Smartphones & Tablets"),
    46: ("Men's Clothing", "Clothing & Apparel"),
    47: ("Women's Clothing", "Clothing & Apparel"),
    48: ("Kids' Clothing", "Clothing & Apparel"),
    49: ("Activewear", "Clothing & Apparel"),
    50: ("Outerwear & Jackets", "Clothing & Apparel"),
    51: ("Underwear & Sleepwear", "Clothing & Apparel"),
    52: ("Costumes & Accessories", "Clothing & Apparel"),
    53: ("Men's Shoes", "Shoes & Footwear"),
    54: ("Women's Shoes", "Shoes & Footwear"),
    55: ("Kids' Shoes", "Shoes & Footwear"),
    56: ("Athletic & Running Shoes", "Shoes & Footwear"),
    57: ("Boots", "Shoes & Footwear"),
    58: ("Sandals & Slippers", "Shoes & Footwear"),
    59: ("Necklaces & Pendants", "Jewellery & Watches"),
    60: ("Rings", "Jewellery & Watches"),
    61: ("Earrings", "Jewellery & Watches"),
    62: ("Bracelets & Bangles", "Jewellery & Watches"),
    63: ("Men's Watches", "Jewellery & Watches"),
    64: ("Women's Watches", "Jewellery & Watches"),
    65: ("Sunglasses", "Jewellery & Watches"),
    66: ("Vitamins & Supplements", "Health & Personal Care"),
    67: ("Medical Supplies & Equipment", "Health & Personal Care"),
    68: ("Oral Care", "Health & Personal Care"),
    69: ("Shaving & Hair Removal", "Health & Personal Care"),
    70: ("Massage & Relaxation", "Health & Personal Care"),
    71: ("First Aid", "Health & Personal Care"),
    72: ("Skincare", "Beauty & Skincare"),
    73: ("Makeup & Cosmetics", "Beauty & Skincare"),
    74: ("Hair Care", "Beauty & Skincare"),
    75: ("Fragrances & Perfumes", "Beauty & Skincare"),
    76: ("Bath & Body", "Beauty & Skincare"),
    77: ("Nail Care", "Beauty & Skincare"),
    78: ("Cookware & Bakeware", "Home & Kitchen"),
    79: ("Kitchen Appliances", "Home & Kitchen"),
    80: ("Dining & Tableware", "Home & Kitchen"),
    81: ("Home Decor", "Home & Kitchen"),
    82: ("Bedding & Linens", "Home & Kitchen"),
    83: ("Cleaning Supplies", "Home & Kitchen"),
    84: ("Lighting & Lamps", "Home & Kitchen"),
    85: ("Storage & Organization", "Home & Kitchen"),
    86: ("Living Room Furniture", "Furniture"),
    87: ("Bedroom Furniture", "Furniture"),
    88: ("Office Furniture", "Furniture"),
    89: ("Dining Room Furniture", "Furniture"),
    90: ("Outdoor Furniture", "Furniture"),
    91: ("Shelving & Bookcases", "Furniture"),
    92: ("Plants & Seeds", "Garden & Outdoors"),
    93: ("Lawn Mowers & Tractors", "Garden & Outdoors"),
    94: ("Grills & Outdoor Cooking", "Garden & Outdoors"),
    95: ("Gardening Tools", "Garden & Outdoors"),
    96: ("Outdoor Lighting", "Garden & Outdoors"),
    97: ("Pools & Hot Tubs", "Garden & Outdoors"),
    98: ("Exercise & Fitness Equipment", "Sports & Fitness"),
    99: ("Cycling", "Sports & Fitness"),
    100: ("Running & Jogging", "Sports & Fitness"),
    101: ("Camping & Hiking", "Sports & Fitness"),
    102: ("Team Sports", "Sports & Fitness"),
    103: ("Fishing & Hunting", "Sports & Fitness"),
    104: ("Yoga & Pilates", "Sports & Fitness"),
    105: ("Water Sports", "Sports & Fitness"),
    106: ("Action Figures & Collectibles", "Toys & Games"),
    107: ("Board Games & Card Games", "Toys & Games"),
    108: ("Puzzles", "Toys & Games"),
    109: ("Building & Construction Toys", "Toys & Games"),
    110: ("Dolls & Playsets", "Toys & Games"),
    111: ("Remote Control & Vehicles", "Toys & Games"),
    112: ("Educational Toys", "Toys & Games"),
    113: ("Diapers & Wipes", "Baby & Kids"),
    114: ("Baby Feeding", "Baby & Kids"),
    115: ("Strollers & Car Seats", "Baby & Kids"),
    116: ("Baby Clothing", "Baby & Kids"),
    117: ("Nursery Furniture", "Baby & Kids"),
    118: ("Baby Toys", "Baby & Kids"),
    119: ("Fiction", "Books & Stationery"),
    120: ("Non-Fiction", "Books & Stationery"),
    121: ("Textbooks & Education", "Books & Stationery"),
    122: ("Children's Books", "Books & Stationery"),
    123: ("Comics & Graphic Novels", "Books & Stationery"),
    124: ("Notebooks & Journals", "Books & Stationery"),
    125: ("Writing Instruments", "Books & Stationery"),
    126: ("Guitars & Basses", "Music & Instruments"),
    127: ("Keyboards & Pianos", "Music & Instruments"),
    128: ("Drums & Percussion", "Music & Instruments"),
    129: ("DJ & Studio Equipment", "Music & Instruments"),
    130: ("Vinyl Records & CDs", "Music & Instruments"),
    131: ("Sheet Music & Songbooks", "Music & Instruments"),
    132: ("Blu-ray & DVDs", "Movies, TV & Entertainment"),
    133: ("Streaming Devices", "Movies, TV & Entertainment"),
    134: ("Projectors & Screens", "Movies, TV & Entertainment"),
    135: ("Posters & Memorabilia", "Movies, TV & Entertainment"),
    136: ("PlayStation", "Video Games & Consoles"),
    137: ("Xbox", "Video Games & Consoles"),
    138: ("Nintendo", "Video Games & Consoles"),
    139: ("PC Gaming", "Video Games & Consoles"),
    140: ("Gaming Accessories", "Video Games & Consoles"),
    141: ("Retro Gaming", "Video Games & Consoles"),
    142: ("Snacks & Sweets", "Food & Beverages"),
    143: ("Coffee & Tea", "Food & Beverages"),
    144: ("Cooking Ingredients & Spices", "Food & Beverages"),
    145: ("Organic & Health Foods", "Food & Beverages"),
    146: ("Beverages & Drinks", "Food & Beverages"),
    147: ("Gourmet & Specialty Foods", "Food & Beverages"),
    148: ("Dog Supplies", "Pet Supplies"),
    149: ("Cat Supplies", "Pet Supplies"),
    150: ("Fish & Aquarium", "Pet Supplies"),
    151: ("Bird Supplies", "Pet Supplies"),
    152: ("Small Animal Supplies", "Pet Supplies"),
    153: ("Pet Food", "Pet Supplies"),
    154: ("Car Parts & Accessories", "Automotive & Motorcycle"),
    155: ("Car Electronics", "Automotive & Motorcycle"),
    156: ("Tires & Wheels", "Automotive & Motorcycle"),
    157: ("Motorcycle Parts & Gear", "Automotive & Motorcycle"),
    158: ("Car Care & Cleaning", "Automotive & Motorcycle"),
    159: ("Oils, Fluids & Lubricants", "Automotive & Motorcycle"),
    160: ("Power Tools", "Tools & Home Improvement"),
    161: ("Hand Tools", "Tools & Home Improvement"),
    162: ("Plumbing", "Tools & Home Improvement"),
    163: ("Electrical", "Tools & Home Improvement"),
    164: ("Paint & Wall Treatments", "Tools & Home Improvement"),
    165: ("Hardware & Fasteners", "Tools & Home Improvement"),
    166: ("Safety & Security", "Tools & Home Improvement"),
    167: ("Desk Accessories", "Office & School Supplies"),
    168: ("Paper & Printable Media", "Office & School Supplies"),
    169: ("Calendars & Planners", "Office & School Supplies"),
    170: ("Backpacks & Bags", "Office & School Supplies"),
    171: ("Calculators", "Office & School Supplies"),
    172: ("Presentation Supplies", "Office & School Supplies"),
    173: ("Suitcases & Carry-Ons", "Luggage & Travel"),
    174: ("Travel Backpacks", "Luggage & Travel"),
    175: ("Travel Accessories", "Luggage & Travel"),
    176: ("Packing Organizers", "Luggage & Travel"),
    177: ("Neck Pillows & Comfort", "Luggage & Travel"),
    178: ("Painting & Drawing", "Arts, Crafts & Hobbies"),
    179: ("Sewing & Knitting", "Arts, Crafts & Hobbies"),
    180: ("Scrapbooking", "Arts, Crafts & Hobbies"),
    181: ("Model Building", "Arts, Crafts & Hobbies"),
    182: ("Beading & Jewellery Making", "Arts, Crafts & Hobbies"),
    183: ("Candle & Soap Making", "Arts, Crafts & Hobbies"),
}

# Top-level department names, in stable order of first appearance in CATEGORIES.
# Used by generate_reviews.py and seed_reviews.py to bucket reviews.
def _build_departments():
    seen = []
    for _name, parent in CATEGORIES.values():
        if parent not in seen:
            seen.append(parent)
    return seen

DEPARTMENTS = _build_departments()

def department_for_category(cat_id):
    return CATEGORIES[cat_id][1]

# ── Sellers & their category assignments ─────────────
SELLERS = [
    {
        "n": 1,
        "name": "TechVault Electronics",
        "niche": "TVs, cameras, audio, smart home, smartphones, tablets",
        "category_ids": [26, 27, 28, 29, 30, 31, 32, 41, 42, 43, 44, 45],
    },
    {
        "n": 2,
        "name": "HomeNest Living",
        "niche": "Furniture, kitchen, home decor, cleaning",
        "category_ids": [78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91],
    },
    {
        "n": 3,
        "name": "SportsPeak Outfitters",
        "niche": "Sports, fitness, outdoors",
        "category_ids": [98, 99, 100, 101, 102, 103, 104, 105],
    },
    {
        "n": 4,
        "name": "PageTurner Books",
        "niche": "Books, stationery",
        "category_ids": [119, 120, 121, 122, 123, 124, 125],
    },
    {
        "n": 5,
        "name": "GlowUp Beauty",
        "niche": "Skincare, makeup, fragrances, health & personal care",
        "category_ids": [66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77],
    },
    {
        "n": 6,
        "name": "TinyWonders Kids",
        "niche": "Baby, kids, toys",
        "category_ids": [106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118],
    },
    {
        "n": 7,
        "name": "AutoDrive Parts",
        "niche": "Automotive parts & accessories",
        "category_ids": [154, 155, 156, 157, 158, 159],
    },
    {
        "n": 8,
        "name": "FreshBite Market",
        "niche": "Food, beverages, gourmet",
        "category_ids": [142, 143, 144, 145, 146, 147],
    },
    {
        "n": 9,
        "name": "PawPals Pet Supply",
        "niche": "Pet supplies",
        "category_ids": [148, 149, 150, 151, 152, 153],
    },
    {
        "n": 10,
        "name": "PixelPlay Gaming",
        "niche": "Video games & consoles",
        "category_ids": [136, 137, 138, 139, 140, 141],
    },
    {
        "n": 11,
        "name": "ThreadCraft Fashion",
        "niche": "Clothing & shoes",
        "category_ids": [46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58],
    },
    {
        "n": 12,
        "name": "GreenThumb Gardens",
        "niche": "Garden & outdoors",
        "category_ids": [92, 93, 94, 95, 96, 97],
    },
    {
        "n": 13,
        "name": "BuildRight Tools",
        "niche": "Tools & home improvement",
        "category_ids": [160, 161, 162, 163, 164, 165, 166],
    },
    {
        "n": 14,
        "name": "SoundWave Music",
        "niche": "Instruments & music",
        "category_ids": [126, 127, 128, 129, 130, 131],
    },
    {
        "n": 15,
        "name": "SparkleStone Jewellers",
        "niche": "Jewellery & watches",
        "category_ids": [59, 60, 61, 62, 63, 64, 65],
    },
    {
        "n": 16,
        "name": "ByteBox Computers",
        "niche": "Computers & components",
        "category_ids": [33, 34, 35, 36, 37, 38, 39, 40],
    },
    {
        "n": 17,
        "name": "WanderLux Travel",
        "niche": "Luggage & travel",
        "category_ids": [173, 174, 175, 176, 177],
    },
    {
        "n": 18,
        "name": "DeskMate Office",
        "niche": "Office & school supplies",
        "category_ids": [167, 168, 169, 170, 171, 172],
    },
    {
        "n": 19,
        "name": "CineVault Entertainment",
        "niche": "Movies & entertainment",
        "category_ids": [132, 133, 134, 135],
    },
    {
        "n": 20,
        "name": "CraftHaven Hobbies",
        "niche": "Arts, crafts & hobbies",
        "category_ids": [178, 179, 180, 181, 182, 183],
    },
]
