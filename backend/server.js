const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// In-memory data store (in production, use a database)
const products = [
  // ─────────────────── ELECTRONICS ───────────────────
  {
    id: 1,
    name: "Laptop Pro 16",
    brand: "Apple",
    category: "Electronics",
    price: 1299,
    image: "💻",
    description:
      "High-performance laptop with M3 Pro chip, 16GB unified RAM, and 512GB SSD. Perfect for professionals and creatives who demand the best.",
    features: [
      "Apple M3 Pro Chip",
      "16GB Unified RAM",
      "512GB NVMe SSD",
      "16-inch Liquid Retina XDR Display",
      "22-hour battery life",
    ],
    inStock: true,
    rating: 4.8,
    reviews: 2340,
  },
  {
    id: 2,
    name: "Smartphone Pro Max",
    brand: "Samsung",
    category: "Electronics",
    price: 999,
    image: "📱",
    description:
      "Flagship smartphone with a 200MP camera, 12GB RAM, and a massive 5000mAh battery. Experience the future of mobile photography.",
    features: [
      "200MP Triple Camera System",
      "12GB LPDDR5 RAM",
      "256GB UFS Storage",
      "6.8-inch Dynamic AMOLED 2X",
      "5000mAh battery with 65W fast charge",
    ],
    inStock: true,
    rating: 4.7,
    reviews: 4512,
  },
  {
    id: 3,
    name: "4K Smart TV 55\"",
    brand: "LG",
    category: "Electronics",
    price: 699,
    image: "📺",
    description:
      "55-inch OLED 4K Smart TV with Dolby Vision IQ and webOS. Stunning picture quality with infinite contrast and perfect blacks.",
    features: [
      "OLED 4K Display",
      "Dolby Vision IQ & Atmos",
      "120Hz refresh rate",
      "webOS with ThinQ AI",
      "4 HDMI 2.1 ports",
    ],
    inStock: true,
    rating: 4.9,
    reviews: 1876,
  },
  {
    id: 4,
    name: "iPad Pro 12.9",
    brand: "Apple",
    category: "Electronics",
    price: 1099,
    image: "📲",
    description:
      "Most powerful iPad ever with M2 chip, mini-LED display, and 5G connectivity. Your creative studio, anywhere.",
    features: [
      "Apple M2 Chip",
      "12.9-inch Liquid Retina XDR",
      "5G Connectivity",
      "Apple Pencil hover support",
      "USB-C Thunderbolt 4",
    ],
    inStock: true,
    rating: 4.8,
    reviews: 987,
  },
  {
    id: 5,
    name: "4K Monitor 27\"",
    brand: "Dell",
    category: "Electronics",
    price: 399,
    image: "🖥️",
    description:
      "27-inch 4K UHD IPS monitor with HDR600 and 99% DCI-P3 color. The ideal display for creative professionals.",
    features: [
      "27-inch 4K UHD IPS Panel",
      "HDR600 & 99% DCI-P3",
      "USB-C 90W Power Delivery",
      "60Hz with G-Sync Compatible",
      "Ultra-slim 3-sided bezels",
    ],
    inStock: true,
    rating: 4.7,
    reviews: 1453,
  },
  {
    id: 6,
    name: "Wireless Router AX6000",
    brand: "Asus",
    category: "Electronics",
    price: 299,
    image: "📡",
    description:
      "Wi-Fi 6 router with quad-core processor and AiMesh support. Supercharge your home network with blazing-fast wireless speeds.",
    features: [
      "Wi-Fi 6 (802.11ax)",
      "6000 Mbps combined speed",
      "1.8GHz quad-core processor",
      "AiMesh whole-home Wi-Fi",
      "8 external antennas",
    ],
    inStock: true,
    rating: 4.6,
    reviews: 723,
  },

  // ─────────────────── AUDIO ───────────────────
  {
    id: 7,
    name: "WH-1000XM5 Headphones",
    brand: "Sony",
    category: "Audio",
    price: 349,
    image: "🎧",
    description:
      "Industry-leading noise cancellation headphones with 30-hour battery and crystal-clear hands-free calling. The gold standard in wireless audio.",
    features: [
      "Industry-best Active Noise Cancellation",
      "30-hour battery life",
      "Bluetooth 5.2 with Multipoint",
      "LDAC Hi-Res Audio",
      "Quick charge (3 min = 3 hours)",
    ],
    inStock: true,
    rating: 4.9,
    reviews: 5621,
  },
  {
    id: 8,
    name: "AirPods Pro 2",
    brand: "Apple",
    category: "Audio",
    price: 249,
    image: "🎵",
    description:
      "Next-gen AirPods Pro with H2 chip, Adaptive Audio, and MagSafe charging. Hear everything in a whole new way.",
    features: [
      "Apple H2 Chip",
      "Adaptive Transparency",
      "Personalised Spatial Audio",
      "Up to 30 hours with case",
      "MagSafe Charging Case",
    ],
    inStock: true,
    rating: 4.8,
    reviews: 8932,
  },
  {
    id: 9,
    name: "Bluetooth Speaker Flip 6",
    brand: "JBL",
    category: "Audio",
    price: 129,
    image: "🔊",
    description:
      "Powerful portable speaker with IP67 waterproofing and 12 hours of playtime. Take your music anywhere — poolside, beach, or backcountry.",
    features: [
      "IP67 Waterproof & Dustproof",
      "12-hour battery life",
      "JBL Pro Sound",
      "PartyBoost for multi-speaker pairing",
      "USB-C charging",
    ],
    inStock: true,
    rating: 4.6,
    reviews: 3210,
  },
  {
    id: 10,
    name: "Studio Soundbar S800DB",
    brand: "Bose",
    category: "Audio",
    price: 499,
    image: "📻",
    description:
      "Premium soundbar with Dolby Atmos, True Space 3D, and ADAPTiQ room calibration. Cinema-quality sound, effortlessly.",
    features: [
      "Dolby Atmos & DTS:X",
      "True Space 3D upscaling",
      "ADAPTiQ Audio Calibration",
      "Wi-Fi & Bluetooth",
      "Works with Alexa & Google Assistant",
    ],
    inStock: true,
    rating: 4.7,
    reviews: 1045,
  },
  {
    id: 11,
    name: "Wireless Earbuds Elite 85t",
    brand: "Jabra",
    category: "Audio",
    price: 179,
    image: "🎶",
    description:
      "True wireless earbuds with adjustable ANC, 5.5 hours battery (25 total), and professional call quality. Work and play, distraction-free.",
    features: [
      "Adjustable Active Noise Cancellation",
      "5.5 hrs + 25 hrs with case",
      "6-mic call technology",
      "Bluetooth Multipoint (2 devices)",
      "IP52 Weather Sealed",
    ],
    inStock: true,
    rating: 4.5,
    reviews: 2187,
  },
  {
    id: 12,
    name: "Vinyl Record Player",
    brand: "Audio-Technica",
    category: "Audio",
    price: 149,
    image: "🎷",
    description:
      "Fully automatic belt-drive turntable with a built-in phono preamp and USB output. Rediscover your record collection in stunning detail.",
    features: [
      "Fully automatic operation",
      "AT-VM95E phono cartridge",
      "Built-in phono preamp",
      "USB output to digitise records",
      "33-1/3 & 45 RPM speeds",
    ],
    inStock: false,
    rating: 4.7,
    reviews: 876,
  },

  // ─────────────────── WEARABLES ───────────────────
  {
    id: 13,
    name: "Apple Watch Series 9",
    brand: "Apple",
    category: "Wearables",
    price: 399,
    image: "⌚",
    description:
      "The most advanced Apple Watch yet with S9 chip, Double Tap gesture, and carbon neutral design. Health + fitness, all day, all night.",
    features: [
      "S9 SiP chip",
      "Double Tap gesture control",
      "Crash & Fall Detection",
      "ECG & Blood Oxygen sensor",
      "18-hour battery (36 with Low Power)",
    ],
    inStock: true,
    rating: 4.9,
    reviews: 6734,
  },
  {
    id: 14,
    name: "Galaxy Watch 6 Classic",
    brand: "Samsung",
    category: "Wearables",
    price: 329,
    image: "🕰️",
    description:
      "Classic rotating bezel design with advanced health sensors and sleep coaching. Beautiful meets capable.",
    features: [
      "Rotating bezel navigation",
      "Advanced BioActive Sensor",
      "Sleep Coaching with snore detection",
      "Wear OS 4 + One UI Watch 6",
      "40+ hours battery",
    ],
    inStock: true,
    rating: 4.7,
    reviews: 3012,
  },
  {
    id: 15,
    name: "Fitbit Charge 6",
    brand: "Fitbit",
    category: "Wearables",
    price: 159,
    image: "💪",
    description:
      "Advanced fitness tracker with built-in GPS, Google Maps & Google Wallet. Your daily health coach on your wrist.",
    features: [
      "Built-in GPS",
      "24/7 heart rate & SpO2 monitoring",
      "Google Maps & Wallet integration",
      "40+ exercise modes",
      "7-day battery life",
    ],
    inStock: true,
    rating: 4.5,
    reviews: 2456,
  },
  {
    id: 16,
    name: "Garmin Fenix 7X",
    brand: "Garmin",
    category: "Wearables",
    price: 699,
    image: "🏃",
    description:
      "Multi-sport GPS smartwatch built for adventure. Solar charging, topographic maps, and military-grade toughness.",
    features: [
      "Solar & wired charging",
      "Topographic & ski resort maps",
      "Multi-GNSS + GPS",
      "28-day battery (solar)",
      "MIL-STD-810 tough",
    ],
    inStock: true,
    rating: 4.8,
    reviews: 1123,
  },
  {
    id: 17,
    name: "Smart Ring Oura 4",
    brand: "Oura",
    category: "Wearables",
    price: 299,
    image: "💍",
    description:
      "The world's most accurate smart ring for sleep, readiness, and health tracking. Invisible health data on your finger.",
    features: [
      "Sleep & HRV analysis",
      "Readiness score",
      "Period prediction for women",
      "8-day battery life",
      "Titanium, water-resistant 100m",
    ],
    inStock: true,
    rating: 4.6,
    reviews: 897,
  },

  // ─────────────────── CAMERAS ───────────────────
  {
    id: 18,
    name: "Sony A7 IV Mirrorless",
    brand: "Sony",
    category: "Cameras",
    price: 2499,
    image: "📷",
    description:
      "Full-frame mirrorless camera with 33MP sensor, 4K 60fps video, and real-time tracking AF. The ultimate hybrid camera for photo and video.",
    features: [
      "33MP full-frame BSI-CMOS sensor",
      "4K 60fps & 10-bit 4:2:2 video",
      "Real-time Eye & Subject Tracking",
      "5-axis in-body stabilisation",
      "Dual CFexpress Type A / SD slots",
    ],
    inStock: true,
    rating: 4.9,
    reviews: 2341,
  },
  {
    id: 19,
    name: "GoPro Hero 12",
    brand: "GoPro",
    category: "Cameras",
    price: 399,
    image: "🎥",
    description:
      "The most powerful GoPro yet — 5.3K60 video, HyperSmooth 6.0 stabilisation, and 13 new Mods. Capture every adventure.",
    features: [
      "5.3K60 & 4K120 video",
      "HyperSmooth 6.0 stabilisation",
      "Waterproof to 10m",
      "HDR photo & video",
      "Front & rear LCD screens",
    ],
    inStock: true,
    rating: 4.7,
    reviews: 4532,
  },
  {
    id: 20,
    name: "DJI Mini 4 Pro Drone",
    brand: "DJI",
    category: "Cameras",
    price: 759,
    image: "🚁",
    description:
      "Under 249g foldable drone with 4K/60fps HDR video and omnidirectional obstacle sensing. Wherever you fly, whatever you capture.",
    features: [
      "4K/60fps HDR video",
      "Omnidirectional obstacle sensing",
      "34-min max flight time",
      "Under 249g — no licence required",
      "ActiveTrack 360° subject tracking",
    ],
    inStock: true,
    rating: 4.8,
    reviews: 1678,
  },
  {
    id: 21,
    name: "Fujifilm X100VI",
    brand: "Fujifilm",
    category: "Cameras",
    price: 1599,
    image: "🎞️",
    description:
      "Compact fixed-lens camera with 40MP sensor, 6.2K video, and iconic Film Simulation modes. The photographer's everyday companion.",
    features: [
      "40.2MP X-Trans CMOS 5 HR",
      "6.2K / 4K / 1080p video",
      "20 Fujifilm Film Simulations",
      "5-axis in-body stabilisation",
      "Optical + Electronic viewfinder",
    ],
    inStock: false,
    rating: 4.9,
    reviews: 934,
  },

  // ─────────────────── GAMING ───────────────────
  {
    id: 22,
    name: "PS5 DualSense Controller",
    brand: "Sony",
    category: "Gaming",
    price: 69,
    image: "🎮",
    description:
      "Experience haptic feedback, adaptive triggers, and a built-in microphone. Feel what you play like never before.",
    features: [
      "Haptic feedback",
      "Adaptive triggers",
      "Built-in microphone & speaker",
      "USB-C charging",
      "12-hour battery life",
    ],
    inStock: true,
    rating: 4.8,
    reviews: 9812,
  },
  {
    id: 23,
    name: "Gaming Mouse G Pro X Superlight 2",
    brand: "Logitech",
    category: "Gaming",
    price: 159,
    image: "🖱️",
    description:
      "Ultra-light 60g wireless gaming mouse with HERO 25K sensor and zero-compromise performance.",
    features: [
      "HERO 25K optical sensor",
      "60g ultralight design",
      "LIGHTSPEED wireless",
      "70-hour battery",
      "5 programmable buttons",
    ],
    inStock: true,
    rating: 4.9,
    reviews: 3456,
  },
  {
    id: 24,
    name: "Mechanical Gaming Keyboard",
    brand: "Razer",
    category: "Gaming",
    price: 199,
    image: "⌨️",
    description:
      "Razer BlackWidow V4 Pro with Razer Yellow linear switches, Chroma RGB, and wireless freedom.",
    features: [
      "Razer Yellow Linear Switches",
      "Chroma RGB per-key lighting",
      "Wireless & wired modes",
      "Magnetic wrist rest included",
      "Dedicated macro keys",
    ],
    inStock: true,
    rating: 4.7,
    reviews: 2134,
  },
  {
    id: 25,
    name: "Gaming Headset Arctis Nova Pro",
    brand: "SteelSeries",
    category: "Gaming",
    price: 279,
    image: "🎙️",
    description:
      "Premium wireless gaming headset with Active Noise Cancellation, hi-fi audio, and hot-swap batteries.",
    features: [
      "Active Noise Cancellation",
      "Hi-Fi audio drivers",
      "Hot-swap battery system (∞ play)",
      "2.4GHz wireless + Bluetooth",
      "ClearCast bidirectional mic",
    ],
    inStock: true,
    rating: 4.8,
    reviews: 1876,
  },
  {
    id: 26,
    name: "Gaming Chair Titan Evo",
    brand: "Secretlab",
    category: "Gaming",
    price: 529,
    image: "🪑",
    description:
      "Award-winning ergonomic gaming chair with magnetic memory foam neck pillow and 4-way L-ADAPT lumbar support.",
    features: [
      "4-way L-ADAPT lumbar support",
      "Magnetic memory foam neck pillow",
      "Full-length backrest recline",
      "NEO™ Hybrid Leatherette",
      "Multi-tilt mechanism",
    ],
    inStock: true,
    rating: 4.9,
    reviews: 4521,
  },
  {
    id: 27,
    name: "Nintendo Switch OLED",
    brand: "Nintendo",
    category: "Gaming",
    price: 349,
    image: "🕹️",
    description:
      "Play at home or on the go with a vibrant 7-inch OLED screen, enhanced audio, and 64GB internal storage.",
    features: [
      "7-inch OLED screen",
      "Enhanced audio in handheld",
      "64GB internal storage",
      "Wide adjustable stand",
      "Wired LAN port in dock",
    ],
    inStock: true,
    rating: 4.7,
    reviews: 7653,
  },

  // ─────────────────── ACCESSORIES ───────────────────
  {
    id: 28,
    name: "MagSafe Wireless Charger",
    brand: "Apple",
    category: "Accessories",
    price: 39,
    image: "🔋",
    description:
      "Official MagSafe charger with perfect magnetic alignment and 15W fast charging for iPhone 15 series.",
    features: [
      "15W MagSafe fast charging",
      "Perfect magnetic alignment",
      "USB-C connector",
      "Works with MagSafe accessories",
      "Braided cable",
    ],
    inStock: true,
    rating: 4.5,
    reviews: 12345,
  },
  {
    id: 29,
    name: "7-in-1 USB-C Hub",
    brand: "Anker",
    category: "Accessories",
    price: 49,
    image: "🔌",
    description:
      "Compact 7-in-1 USB-C hub with 4K HDMI, 100W PD, and SD card reader. Expand your laptop's connectivity instantly.",
    features: [
      "4K@60Hz HDMI output",
      "100W Power Delivery pass-through",
      "2× USB-A 3.1 Gen 1",
      "SD & microSD card readers",
      "Compact & portable design",
    ],
    inStock: true,
    rating: 4.6,
    reviews: 5678,
  },
  {
    id: 30,
    name: "Laptop Stand Pro",
    brand: "Twelve South",
    category: "Accessories",
    price: 79,
    image: "🗂️",
    description:
      "Premium adjustable aluminium laptop stand with 6 height settings and cable management. Elevate your workspace.",
    features: [
      "6 adjustable height settings",
      "Aluminium construction",
      "Fold-flat for portability",
      "Integrated cable management",
      "Non-slip pads",
    ],
    inStock: true,
    rating: 4.7,
    reviews: 2341,
  },
  {
    id: 31,
    name: "Mechanical Pencil Kit",
    brand: "Staedtler",
    category: "Accessories",
    price: 29,
    image: "✏️",
    description:
      "Professional mechanical pencil set with 4 pencils, 0.3–0.9mm lead widths, and a premium carry case.",
    features: [
      "4 precision mechanical pencils",
      "0.3, 0.5, 0.7 & 0.9mm lead sizes",
      "Metal body with rubberised grip",
      "Retractable lead tip protection",
      "Premium aluminium carry case",
    ],
    inStock: true,
    rating: 4.4,
    reviews: 890,
  },
  {
    id: 32,
    name: "Privacy Screen Filter 15\"",
    brand: "3M",
    category: "Accessories",
    price: 59,
    image: "🛡️",
    description:
      "Easy-attach privacy filter for 15-inch laptops. Keeps your screen private from side-angle viewers in public.",
    features: [
      "Blocks side-angle views at 60°",
      "Anti-glare & anti-reflective",
      "Touch-screen compatible",
      "Reversible matte/glossy",
      "Easy attach & remove",
    ],
    inStock: false,
    rating: 4.3,
    reviews: 1567,
  },
];

// In-memory cart storage (keyed by session/user ID)
// In production, use a database or Redis
const carts = {};

// Helper function to get or create cart
const getCart = (sessionId) => {
  if (!carts[sessionId]) {
    carts[sessionId] = [];
  }
  return carts[sessionId];
};

// ==================== PRODUCT ROUTES ====================

// Get all products (optionally filtered by ?category=Electronics)
app.get("/api/products", (req, res) => {
  const { category } = req.query;
  const data = category
    ? products.filter((p) => p.category.toLowerCase() === category.toLowerCase())
    : products;
  res.json({ success: true, data });
});

// Get all distinct categories
app.get("/api/categories", (req, res) => {
  const categories = ["All", ...new Set(products.map((p) => p.category))];
  res.json({ success: true, data: categories });
});

// Get product by ID
app.get("/api/products/:id", (req, res) => {
  const productId = parseInt(req.params.id);
  const product = products.find((p) => p.id === productId);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  res.json({
    success: true,
    data: product,
  });
});

// ==================== CART ROUTES ====================

// Get cart items
app.get("/api/cart", (req, res) => {
  const sessionId = req.headers["x-session-id"] || "default";
  const cart = getCart(sessionId);

  // Enrich cart items with full product data
  const enrichedCart = cart.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return {
      ...item,
      product: product || null,
    };
  });

  res.json({
    success: true,
    data: enrichedCart,
  });
});

// Add item to cart
app.post("/api/cart/add", (req, res) => {
  const sessionId = req.headers["x-session-id"] || "default";
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    return res.status(400).json({
      success: false,
      message: "Product ID is required",
    });
  }

  const product = products.find((p) => p.id === parseInt(productId));
  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  const cart = getCart(sessionId);
  const existingItem = cart.find((item) => item.productId === parseInt(productId));

  if (existingItem) {
    existingItem.quantity += parseInt(quantity);
  } else {
    cart.push({
      productId: parseInt(productId),
      quantity: parseInt(quantity),
      addedAt: new Date().toISOString(),
    });
  }

  res.json({
    success: true,
    message: "Item added to cart",
    data: cart,
  });
});

// Update cart item quantity
app.put("/api/cart/update", (req, res) => {
  const sessionId = req.headers["x-session-id"] || "default";
  const { productId, quantity } = req.body;

  if (!productId || quantity === undefined) {
    return res.status(400).json({
      success: false,
      message: "Product ID and quantity are required",
    });
  }

  const cart = getCart(sessionId);
  const item = cart.find((item) => item.productId === parseInt(productId));

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Item not found in cart",
    });
  }

  if (parseInt(quantity) <= 0) {
    // Remove item if quantity is 0 or less
    const index = cart.indexOf(item);
    cart.splice(index, 1);
  } else {
    item.quantity = parseInt(quantity);
  }

  res.json({
    success: true,
    message: "Cart updated",
    data: cart,
  });
});

// Remove item from cart
app.delete("/api/cart/remove/:productId", (req, res) => {
  const sessionId = req.headers["x-session-id"] || "default";
  const productId = parseInt(req.params.productId);

  const cart = getCart(sessionId);
  const index = cart.findIndex((item) => item.productId === productId);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Item not found in cart",
    });
  }

  cart.splice(index, 1);

  res.json({
    success: true,
    message: "Item removed from cart",
    data: cart,
  });
});

// Clear cart
app.delete("/api/cart/clear", (req, res) => {
  const sessionId = req.headers["x-session-id"] || "default";
  carts[sessionId] = [];

  res.json({
    success: true,
    message: "Cart cleared",
    data: [],
  });
});

// Get cart summary (total items, total price)
app.get("/api/cart/summary", (req, res) => {
  const sessionId = req.headers["x-session-id"] || "default";
  const cart = getCart(sessionId);

  let totalItems = 0;
  let subtotal = 0;

  cart.forEach((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (product) {
      totalItems += item.quantity;
      subtotal += product.price * item.quantity;
    }
  });

  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;

  res.json({
    success: true,
    data: {
      totalItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
    },
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend API server running on http://localhost:${PORT}`);
  console.log(`📦 Products API: http://localhost:${PORT}/api/products`);
  console.log(`🛒 Cart API: http://localhost:${PORT}/api/cart`);
});
