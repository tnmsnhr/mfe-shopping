/**
 * search/src/api.js
 * Reads all products from Firestore for live search.
 */
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";

export const api = {
  getProducts: async () => {
    const snap = await getDocs(
      query(collection(db, "products"), orderBy("rating", "desc"))
    );
    return snap.docs.map((d) => d.data());
  },
};
