/**
 * seedFirestore.js
 * ─────────────────────────────────────────────────────────────
 * Auto-seeds the Firestore `products` and `categories` collections
 * the first time the app loads.  Safe to call on every mount —
 * it is a no-op if data already exists.
 *
 * Firestore DATA MODEL
 * ────────────────────
 *
 * /products/{id}                       ← public read
 *   id, name, brand, category, price,
 *   mrp, discount, image, description,
 *   features[], rating, reviews,
 *   inStock, searchKeywords[], createdAt
 *
 * /categories/{slug}                   ← public read
 *   id, name, slug, emoji,
 *   productCount, order
 *
 * /users/{uid}                         ← owner read/write
 *   uid, email, displayName, photoURL,
 *   avatar, role, provider,
 *   createdAt, updatedAt
 *
 * /carts/{uid}/items/{productId}       ← owner read/write
 *   productId, name, brand, price,
 *   mrp, image, quantity, addedAt
 *
 * /wishlists/{uid}/items/{productId}   ← owner read/write
 *   productId, name, brand, price,
 *   image, category, addedAt
 *
 * /orders/{orderId}                    ← owner read, system write
 *   orderId, userId, userEmail,
 *   items[], subtotal, discount,
 *   tax, total, status,
 *   createdAt, updatedAt
 */

import {
  collection,
  doc,
  getDocs,
  writeBatch,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import { PRODUCTS, CATEGORIES } from "./seedData";

const BATCH_SIZE = 500; // Firestore max operations per batch

/** Chunk an array into groups of `size` */
const chunk = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

/**
 * Check whether products are already seeded.
 * We only fetch 1 document to keep it cheap.
 */
const isSeeded = async () => {
  const snap = await getDocs(
    query(collection(db, "products"), limit(1))
  );
  return !snap.empty;
};

/** Write products in batched commits (safe for large catalogs) */
const seedProducts = async () => {
  console.log("[ShopZone] 🌱 Seeding products →", PRODUCTS.length, "items");
  const batches = chunk(PRODUCTS, BATCH_SIZE);
  for (const group of batches) {
    const batch = writeBatch(db);
    group.forEach((p) =>
      batch.set(doc(db, "products", String(p.id)), p)
    );
    await batch.commit();
  }
  console.log("[ShopZone] ✅ Products seeded");
};

/** Write category documents */
const seedCategories = async () => {
  console.log("[ShopZone] 🌱 Seeding categories →", CATEGORIES.length, "items");
  const batch = writeBatch(db);
  CATEGORIES.forEach((cat) =>
    batch.set(doc(db, "categories", cat.slug), cat)
  );
  await batch.commit();
  console.log("[ShopZone] ✅ Categories seeded");
};

/**
 * Call this once on app mount.
 * Returns all products (from Firestore after seed, or from cache).
 */
export const seedIfEmpty = async () => {
  try {
    const alreadyDone = await isSeeded();
    if (alreadyDone) {
      console.log("[ShopZone] ℹ️  Firestore already populated — skipping seed");
      return;
    }
    await seedProducts();
    await seedCategories();
    console.log("[ShopZone] 🎉 Database ready!");
  } catch (err) {
    console.error("[ShopZone] ❌ Seed failed:", err.message);
    // Non-fatal — app can still work with local fallback data
  }
};

/**
 * Force re-seed (useful from DevTools: window.__reseedShopZone())
 */
export const forceSeed = async () => {
  await seedProducts();
  await seedCategories();
};

if (typeof window !== "undefined") {
  window.__reseedShopZone = forceSeed;
}
