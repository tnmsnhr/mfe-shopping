/**
 * product-details/src/api.js
 * Reads product data from Firestore.
 * Cart writes are handled directly in ProductDetails.js via the db import.
 */
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export const api = {
  /**
   * Fetch a single product by numeric/string ID.
   */
  getProduct: async (id) => {
    const snap = await getDoc(doc(db, "products", String(id)));
    if (!snap.exists()) throw new Error(`Product ${id} not found`);
    return snap.data();
  },
};
