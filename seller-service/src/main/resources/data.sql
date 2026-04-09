-- =============================================
-- SELLER PROFILES (20)
-- profile_id pattern: c0000000-0000-0000-0000-00000000XXXX
-- user_id pattern:    a0000000-0000-0000-0000-00000000XXXX  (matches auth-service)
-- tenant_id pattern:  b0000000-0000-0000-0000-00000000XXXX  (matches auth-service)
-- =============================================

INSERT INTO seller_profiles (id, user_id, tenant_id, company_name, description, slug, contact_phone, contact_email, contact_address, logo_url, status, created_at, updated_at) VALUES
('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 'TechVault Electronics', 'Your one-stop shop for the latest consumer electronics, from TVs and cameras to headphones and smart home devices.', 'techvault-electronics',
 '+1-555-100-0001', 'contact@techvault.com', '742 Innovation Blvd, San Jose, CA 95134', NULL, 'ACTIVE', '2025-01-01 00:00:00', '2025-01-01 00:00:00'),

('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',
 'HomeNest Living', 'Curated home furnishings, kitchen essentials, and decor to make every room feel like home.', 'homenest-living',
 '+1-555-100-0002', 'hello@homenest.com', '88 Comfort Lane, Portland, OR 97201', NULL, 'ACTIVE', '2025-01-02 00:00:00', '2025-01-02 00:00:00'),

('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003',
 'SportsPeak Outfitters', 'Premium sports gear, fitness equipment, and outdoor essentials for athletes and adventurers.', 'sportspeak-outfitters',
 '+1-555-100-0003', 'info@sportspeak.com', '350 Summit Drive, Denver, CO 80202', NULL, 'ACTIVE', '2025-01-03 00:00:00', '2025-01-03 00:00:00'),

('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004',
 'PageTurner Books', 'Independent bookseller offering fiction, non-fiction, textbooks, and rare finds for every reader.', 'pageturner-books',
 '+1-555-100-0004', 'orders@pageturner.com', '12 Library Square, Boston, MA 02108', NULL, 'ACTIVE', '2025-01-04 00:00:00', '2025-01-04 00:00:00'),

('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005',
 'GlowUp Beauty', 'Skincare, makeup, fragrances, and personal care products from trusted and indie brands.', 'glowup-beauty',
 '+1-555-100-0005', 'support@glowup.com', '200 Rose Avenue, Los Angeles, CA 90028', NULL, 'ACTIVE', '2025-01-05 00:00:00', '2025-01-05 00:00:00'),

('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000006',
 'TinyWonders Kids', 'Everything for babies, toddlers, and kids — from clothing and toys to nursery furniture.', 'tinywonders-kids',
 '+1-555-100-0006', 'care@tinywonders.com', '55 Playtime Road, Austin, TX 73301', NULL, 'ACTIVE', '2025-01-06 00:00:00', '2025-01-06 00:00:00'),

('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000007',
 'AutoDrive Parts', 'Quality automotive parts, accessories, and car care products for every make and model.', 'autodrive-parts',
 '+1-555-100-0007', 'sales@autodrive.com', '900 Motorway Circle, Detroit, MI 48201', NULL, 'ACTIVE', '2025-01-07 00:00:00', '2025-01-07 00:00:00'),

('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000008',
 'FreshBite Market', 'Gourmet foods, organic snacks, specialty ingredients, and beverages delivered to your door.', 'freshbite-market',
 '+1-555-100-0008', 'hello@freshbite.com', '15 Harvest Street, Chicago, IL 60601', NULL, 'ACTIVE', '2025-01-08 00:00:00', '2025-01-08 00:00:00'),

('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000009',
 'PawPals Pet Supply', 'Trusted pet supplies, food, toys, and accessories for dogs, cats, fish, birds, and small animals.', 'pawpals-pet-supply',
 '+1-555-100-0009', 'woof@pawpals.com', '77 Tail Wag Lane, Seattle, WA 98101', NULL, 'ACTIVE', '2025-01-09 00:00:00', '2025-01-09 00:00:00'),

('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000010',
 'PixelPlay Gaming', 'Video games, consoles, and gaming accessories for PlayStation, Xbox, Nintendo, and PC gamers.', 'pixelplay-gaming',
 '+1-555-100-0010', 'support@pixelplay.com', '400 Arcade Avenue, Irvine, CA 92602', NULL, 'ACTIVE', '2025-01-10 00:00:00', '2025-01-10 00:00:00'),

('c0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000011',
 'ThreadCraft Fashion', 'Trendy and classic clothing, outerwear, and activewear for men, women, and kids.', 'threadcraft-fashion',
 '+1-555-100-0011', 'style@threadcraft.com', '60 Fashion Row, New York, NY 10001', NULL, 'ACTIVE', '2025-01-11 00:00:00', '2025-01-11 00:00:00'),

('c0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000012',
 'GreenThumb Gardens', 'Plants, seeds, gardening tools, outdoor furniture, and everything to transform your yard.', 'greenthumb-gardens',
 '+1-555-100-0012', 'grow@greenthumb.com', '22 Blossom Way, Savannah, GA 31401', NULL, 'ACTIVE', '2025-01-12 00:00:00', '2025-01-12 00:00:00'),

('c0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000013',
 'BuildRight Tools', 'Professional and DIY power tools, hand tools, hardware, and home improvement supplies.', 'buildright-tools',
 '+1-555-100-0013', 'help@buildright.com', '180 Workshop Blvd, Milwaukee, WI 53201', NULL, 'ACTIVE', '2025-01-13 00:00:00', '2025-01-13 00:00:00'),

('c0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000014',
 'SoundWave Music', 'Musical instruments, studio equipment, vinyl records, and accessories for musicians of all levels.', 'soundwave-music',
 '+1-555-100-0014', 'info@soundwave.com', '99 Melody Lane, Nashville, TN 37201', NULL, 'ACTIVE', '2025-01-14 00:00:00', '2025-01-14 00:00:00'),

('c0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000015',
 'SparkleStone Jewellers', 'Handcrafted and designer jewellery, luxury watches, and sunglasses for every occasion.', 'sparklestone-jewellers',
 '+1-555-100-0015', 'shine@sparklestone.com', '5 Diamond Court, Miami, FL 33101', NULL, 'ACTIVE', '2025-01-15 00:00:00', '2025-01-15 00:00:00'),

('c0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000016',
 'ByteBox Computers', 'Laptops, desktops, components, peripherals, and networking gear for professionals and enthusiasts.', 'bytebox-computers',
 '+1-555-100-0016', 'tech@bytebox.com', '512 Silicon Street, San Francisco, CA 94102', NULL, 'ACTIVE', '2025-01-16 00:00:00', '2025-01-16 00:00:00'),

('c0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000017',
 'WanderLux Travel', 'Luggage, travel accessories, backpacks, and comfort essentials for every journey.', 'wanderlux-travel',
 '+1-555-100-0017', 'travel@wanderlux.com', '300 Departure Drive, Orlando, FL 32801', NULL, 'ACTIVE', '2025-01-17 00:00:00', '2025-01-17 00:00:00'),

('c0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000018',
 'DeskMate Office', 'Office supplies, school essentials, desk accessories, and presentation materials for productive workspaces.', 'deskmate-office',
 '+1-555-100-0018', 'orders@deskmate.com', '45 Cubicle Crescent, Minneapolis, MN 55401', NULL, 'ACTIVE', '2025-01-18 00:00:00', '2025-01-18 00:00:00'),

('c0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000019',
 'CineVault Entertainment', 'Blu-rays, DVDs, streaming devices, projectors, and movie memorabilia for film lovers.', 'cinevault-entertainment',
 '+1-555-100-0019', 'watch@cinevault.com', '8 Studio Lot Way, Burbank, CA 91501', NULL, 'ACTIVE', '2025-01-19 00:00:00', '2025-01-19 00:00:00'),

('c0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000020',
 'CraftHaven Hobbies', 'Art supplies, sewing kits, model building, candle making, and creative hobby materials.', 'crafthaven-hobbies',
 '+1-555-100-0020', 'create@crafthaven.com', '33 Artisan Circle, Asheville, NC 28801', NULL, 'ACTIVE', '2025-01-20 00:00:00', '2025-01-20 00:00:00')

ON CONFLICT (id) DO NOTHING;


-- =============================================
-- SELLER THEMES (default theme for each seller)
-- =============================================

INSERT INTO seller_themes (seller_id, preset, primary_color, font_family, border_radius, banner_url, logo_url) VALUES
('c0000000-0000-0000-0000-000000000001', 'nora', 'amber', NULL, NULL, NULL, NULL),
('c0000000-0000-0000-0000-000000000002', 'aura', 'blue', NULL, NULL, NULL, NULL),
('c0000000-0000-0000-0000-000000000003', 'material', 'green', NULL, NULL, NULL, NULL),
('c0000000-0000-0000-0000-000000000004', 'lara', 'indigo', NULL, NULL, NULL, NULL),
('c0000000-0000-0000-0000-000000000005', 'aura', 'purple', NULL, NULL, NULL, NULL),
('c0000000-0000-0000-0000-000000000006', 'material', 'red', NULL, NULL, NULL, NULL),
('c0000000-0000-0000-0000-000000000007', 'lara', 'teal', NULL, NULL, NULL, NULL),
('c0000000-0000-0000-0000-000000000008', 'aura', 'orange', NULL, NULL, NULL, NULL),
('c0000000-0000-0000-0000-000000000009', 'material', 'cyan', NULL, NULL, NULL, NULL),
('c0000000-0000-0000-0000-000000000010', 'lara', 'pink', NULL, NULL, NULL, NULL),
('c0000000-0000-0000-0000-000000000011', 'material', 'emerald', NULL, NULL, NULL, NULL),
('c0000000-0000-0000-0000-000000000012', 'aura', 'violet', NULL, NULL, NULL, NULL),
('c0000000-0000-0000-0000-000000000013', 'nora', 'amber', NULL, NULL, NULL, NULL),
('c0000000-0000-0000-0000-000000000014', 'lara', 'blue', NULL, NULL, NULL, NULL),
('c0000000-0000-0000-0000-000000000015', 'material', 'green', NULL, NULL, NULL, NULL),
('c0000000-0000-0000-0000-000000000016', 'aura', 'indigo', NULL, NULL, NULL, NULL),
('c0000000-0000-0000-0000-000000000017', 'aura', 'purple', NULL, NULL, NULL, NULL),
('c0000000-0000-0000-0000-000000000018', 'lara', 'red', NULL, NULL, NULL, NULL),
('c0000000-0000-0000-0000-000000000019', 'nora', 'teal', NULL, NULL, NULL, NULL),
('c0000000-0000-0000-0000-000000000020', 'lara', 'violet', NULL, NULL, NULL, NULL)
ON CONFLICT (seller_id) DO NOTHING;
