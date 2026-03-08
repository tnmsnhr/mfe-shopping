/**
 * host/src/api.js
 * All product + category reads now come from Firestore.
 * Cart operations remain in Firestore via Cart MFE.
 * This module is used by App.js (home page product listing).
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

// ── Products ──────────────────────────────────────────────────

export const api = {
  /**
   * Fetch all products, sorted by rating desc.
   * Category filtering is done client-side in App.js
   * (avoids needing a Firestore composite index).
   */
  getProducts: async () => {
    const snap = await getDocs(
      query(collection(db, "products"), orderBy("rating", "desc"))
    );
    return snap.docs.map((d) => d.data());
  },

  /**
   * Fetch a single product by numeric ID.
   */
  getProduct: async (id) => {
    const snap = await getDoc(doc(db, "products", String(id)));
    if (!snap.exists()) throw new Error(`Product ${id} not found`);
    return snap.data();
  },

  /**
   * Fetch category list in display order.
   * Returns ["All", "Electronics", "Audio", …]
   */
  getCategories: async () => {
    const snap = await getDocs(
      query(collection(db, "categories"), orderBy("order"))
    );
    return ["All", ...snap.docs.map((d) => d.data().name)];
  },
};
