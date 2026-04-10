INSERT INTO categories (id, name, parent_id) VALUES

-- =============================================
-- TOP-LEVEL DEPARTMENTS (1–25)
-- =============================================
(1, 'Electronics', NULL),
(2, 'Computers & Accessories', NULL),
(3, 'Smartphones & Tablets', NULL),
(4, 'Clothing & Apparel', NULL),
(5, 'Shoes & Footwear', NULL),
(6, 'Jewellery & Watches', NULL),
(7, 'Health & Personal Care', NULL),
(8, 'Beauty & Skincare', NULL),
(9, 'Home & Kitchen', NULL),
(10, 'Furniture', NULL),
(11, 'Garden & Outdoors', NULL),
(12, 'Sports & Fitness', NULL),
(13, 'Toys & Games', NULL),
(14, 'Baby & Kids', NULL),
(15, 'Books & Stationery', NULL),
(16, 'Music & Instruments', NULL),
(17, 'Movies, TV & Entertainment', NULL),
(18, 'Video Games & Consoles', NULL),
(19, 'Food & Beverages', NULL),
(20, 'Pet Supplies', NULL),
(21, 'Automotive & Motorcycle', NULL),
(22, 'Tools & Home Improvement', NULL),
(23, 'Office & School Supplies', NULL),
(24, 'Luggage & Travel', NULL),
(25, 'Arts, Crafts & Hobbies', NULL),

-- =============================================
-- SUBCATEGORIES (26+)
-- =============================================

-- Electronics (1)
(26, 'Televisions', 1),
(27, 'Cameras & Photography', 1),
(28, 'Headphones & Earbuds', 1),
(29, 'Speakers & Audio', 1),
(30, 'Wearable Technology', 1),
(31, 'Home Audio & Theater', 1),
(32, 'Drones & Accessories', 1),

-- Computers & Accessories (2)
(33, 'Laptops', 2),
(34, 'Desktop Computers', 2),
(35, 'Monitors & Displays', 2),
(36, 'Computer Components', 2),
(37, 'Networking & Wi-Fi', 2),
(38, 'Printers & Scanners', 2),
(39, 'Storage & Drives', 2),
(40, 'Keyboards & Mice', 2),

-- Smartphones & Tablets (3)
(41, 'Smartphones', 3),
(42, 'Tablets', 3),
(43, 'Phone Cases & Screen Protectors', 3),
(44, 'Chargers & Cables', 3),
(45, 'Smartwatches & Bands', 3),

-- Clothing & Apparel (4)
(46, 'Men''s Clothing', 4),
(47, 'Women''s Clothing', 4),
(48, 'Kids'' Clothing', 4),
(49, 'Activewear', 4),
(50, 'Outerwear & Jackets', 4),
(51, 'Underwear & Sleepwear', 4),
(52, 'Costumes & Accessories', 4),

-- Shoes & Footwear (5)
(53, 'Men''s Shoes', 5),
(54, 'Women''s Shoes', 5),
(55, 'Kids'' Shoes', 5),
(56, 'Athletic & Running Shoes', 5),
(57, 'Boots', 5),
(58, 'Sandals & Slippers', 5),

-- Jewellery & Watches (6)
(59, 'Necklaces & Pendants', 6),
(60, 'Rings', 6),
(61, 'Earrings', 6),
(62, 'Bracelets & Bangles', 6),
(63, 'Men''s Watches', 6),
(64, 'Women''s Watches', 6),
(65, 'Sunglasses', 6),

-- Health & Personal Care (7)
(66, 'Vitamins & Supplements', 7),
(67, 'Medical Supplies & Equipment', 7),
(68, 'Oral Care', 7),
(69, 'Shaving & Hair Removal', 7),
(70, 'Massage & Relaxation', 7),
(71, 'First Aid', 7),

-- Beauty & Skincare (8)
(72, 'Skincare', 8),
(73, 'Makeup & Cosmetics', 8),
(74, 'Hair Care', 8),
(75, 'Fragrances & Perfumes', 8),
(76, 'Bath & Body', 8),
(77, 'Nail Care', 8),

-- Home & Kitchen (9)
(78, 'Cookware & Bakeware', 9),
(79, 'Kitchen Appliances', 9),
(80, 'Dining & Tableware', 9),
(81, 'Home Decor', 9),
(82, 'Bedding & Linens', 9),
(83, 'Cleaning Supplies', 9),
(84, 'Lighting & Lamps', 9),
(85, 'Storage & Organization', 9),

-- Furniture (10)
(86, 'Living Room Furniture', 10),
(87, 'Bedroom Furniture', 10),
(88, 'Office Furniture', 10),
(89, 'Dining Room Furniture', 10),
(90, 'Outdoor Furniture', 10),
(91, 'Shelving & Bookcases', 10),

-- Garden & Outdoors (11)
(92, 'Plants & Seeds', 11),
(93, 'Lawn Mowers & Tractors', 11),
(94, 'Grills & Outdoor Cooking', 11),
(95, 'Gardening Tools', 11),
(96, 'Outdoor Lighting', 11),
(97, 'Pools & Hot Tubs', 11),

-- Sports & Fitness (12)
(98, 'Exercise & Fitness Equipment', 12),
(99, 'Cycling', 12),
(100, 'Running & Jogging', 12),
(101, 'Camping & Hiking', 12),
(102, 'Team Sports', 12),
(103, 'Fishing & Hunting', 12),
(104, 'Yoga & Pilates', 12),
(105, 'Water Sports', 12),

-- Toys & Games (13)
(106, 'Action Figures & Collectibles', 13),
(107, 'Board Games & Card Games', 13),
(108, 'Puzzles', 13),
(109, 'Building & Construction Toys', 13),
(110, 'Dolls & Playsets', 13),
(111, 'Remote Control & Vehicles', 13),
(112, 'Educational Toys', 13),

-- Baby & Kids (14)
(113, 'Diapers & Wipes', 14),
(114, 'Baby Feeding', 14),
(115, 'Strollers & Car Seats', 14),
(116, 'Baby Clothing', 14),
(117, 'Nursery Furniture', 14),
(118, 'Baby Toys', 14),

-- Books & Stationery (15)
(119, 'Fiction', 15),
(120, 'Non-Fiction', 15),
(121, 'Textbooks & Education', 15),
(122, 'Children''s Books', 15),
(123, 'Comics & Graphic Novels', 15),
(124, 'Notebooks & Journals', 15),
(125, 'Writing Instruments', 15),

-- Music & Instruments (16)
(126, 'Guitars & Basses', 16),
(127, 'Keyboards & Pianos', 16),
(128, 'Drums & Percussion', 16),
(129, 'DJ & Studio Equipment', 16),
(130, 'Vinyl Records & CDs', 16),
(131, 'Sheet Music & Songbooks', 16),

-- Movies, TV & Entertainment (17)
(132, 'Blu-ray & DVDs', 17),
(133, 'Streaming Devices', 17),
(134, 'Projectors & Screens', 17),
(135, 'Posters & Memorabilia', 17),

-- Video Games & Consoles (18)
(136, 'PlayStation', 18),
(137, 'Xbox', 18),
(138, 'Nintendo', 18),
(139, 'PC Gaming', 18),
(140, 'Gaming Accessories', 18),
(141, 'Retro Gaming', 18),

-- Food & Beverages (19)
(142, 'Snacks & Sweets', 19),
(143, 'Coffee & Tea', 19),
(144, 'Cooking Ingredients & Spices', 19),
(145, 'Organic & Health Foods', 19),
(146, 'Beverages & Drinks', 19),
(147, 'Gourmet & Specialty Foods', 19),

-- Pet Supplies (20)
(148, 'Dog Supplies', 20),
(149, 'Cat Supplies', 20),
(150, 'Fish & Aquarium', 20),
(151, 'Bird Supplies', 20),
(152, 'Small Animal Supplies', 20),
(153, 'Pet Food', 20),

-- Automotive & Motorcycle (21)
(154, 'Car Parts & Accessories', 21),
(155, 'Car Electronics', 21),
(156, 'Tires & Wheels', 21),
(157, 'Motorcycle Parts & Gear', 21),
(158, 'Car Care & Cleaning', 21),
(159, 'Oils, Fluids & Lubricants', 21),

-- Tools & Home Improvement (22)
(160, 'Power Tools', 22),
(161, 'Hand Tools', 22),
(162, 'Plumbing', 22),
(163, 'Electrical', 22),
(164, 'Paint & Wall Treatments', 22),
(165, 'Hardware & Fasteners', 22),
(166, 'Safety & Security', 22),

-- Office & School Supplies (23)
(167, 'Desk Accessories', 23),
(168, 'Paper & Printable Media', 23),
(169, 'Calendars & Planners', 23),
(170, 'Backpacks & Bags', 23),
(171, 'Calculators', 23),
(172, 'Presentation Supplies', 23),

-- Luggage & Travel (24)
(173, 'Suitcases & Carry-Ons', 24),
(174, 'Travel Backpacks', 24),
(175, 'Travel Accessories', 24),
(176, 'Packing Organizers', 24),
(177, 'Neck Pillows & Comfort', 24),

-- Arts, Crafts & Hobbies (25)
(178, 'Painting & Drawing', 25),
(179, 'Sewing & Knitting', 25),
(180, 'Scrapbooking', 25),
(181, 'Model Building', 25),
(182, 'Beading & Jewellery Making', 25),
(183, 'Candle & Soap Making', 25)

ON CONFLICT (id) DO NOTHING;
