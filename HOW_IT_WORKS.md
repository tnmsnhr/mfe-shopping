# 🔍 ShopZone — How It All Works Together

A deep-dive technical analysis of how 8 microfrontends communicate, share state, route, and coordinate in production.

---

## Table of Contents

1. [Big Picture — What Happens When You Open the App](#1-big-picture)
2. [Module Federation — The Wiring Layer](#2-module-federation)
3. [Routing — How URLs Are Handled](#3-routing)
4. [Shared Singletons — One React, One Firebase](#4-shared-singletons)
5. [Authentication Flow — Login Across Every MFE](#5-authentication-flow)
6. [Real-time State — Cart Badge, Wishlist, Orders](#6-real-time-state)
7. [Cross-MFE Communication Patterns](#7-cross-mfe-communication)
8. [The Bootstrap Pattern — Why index.js Has One Line](#8-the-bootstrap-pattern)
9. [Nested Remotes — Navigation Loads Search and Auth](#9-nested-remotes)
10. [Data Flow Walkthrough — Add to Cart End-to-End](#10-data-flow-walkthrough)
11. [URL-Driven State — Category Filtering](#11-url-driven-state)
12. [Standalone Mode — Running Without the Host](#12-standalone-mode)
13. [Shared UI Theme — Consistent Look Across MFEs](#13-shared-ui-theme)
14. [Production Considerations](#14-production-considerations)
15. [Error Handling — What Happens When a Module Fails](#15-error-handling)

---

## 1. Big Picture

When you open `http://localhost:3000`, this is the sequence of events:

```
Browser → HOST (port 3000)
           │
           ├─ downloads host's main.js
           ├─ main.js initialises the Module Federation shared scope
           │   └─ loads: react, react-dom, react-router-dom, firebase,
           │              @mui/material, @emotion/react, @emotion/styled
           │              (all as SINGLETONS — loaded once, shared by all)
           │
           ├─ React renders <App>
           │   └─ <ThemeProvider> wraps everything (MUI theme, pink primary)
           │       └─ <BrowserRouter> wraps routing
           │
           ├─ React.lazy(() => import("navigation/Navigation")) triggers:
           │   └─ Browser fetches http://localhost:3004/remoteEntry.js
           │       └─ navRemote container negotiates shared scope with host
           │           ├─ Navigation.js renders <AppBar>
           │           ├─ lazy-loads searchRemote/Search → port 3005
           │           └─ lazy-loads authRemote/UserMenu → port 3006
           │
           └─ <Routes> renders the current page component:
               / → Home (inline in host)
               │    └─ product grid renders → React.lazy → productDetails/ProductCard (port 3001)
               │         └─ SAME remoteEntry.js as ProductDetails — no extra request
               /product/:id → React.lazy → productDetails/ProductDetails (port 3001)
               /cart        → React.lazy → cart (port 3002)
               /orders      → React.lazy → ordersRemote (port 3007)
               /admin       → React.lazy → adminRemote (port 3008)
               /login       → React.lazy → authRemote (port 3006)
```

Key insight: **The host downloads remote code on demand**, not all upfront. If you go straight to `/cart`, the product-details bundle is never downloaded.

Another key insight: **One `remoteEntry.js` can expose multiple modules.** The product-details MFE exposes both `./ProductDetails` (the PDP page) and `./ProductCard` (the home-page card). The host fetches `remoteEntry.js` from port 3001 exactly once — both modules are served from that single manifest.

---

## 2. Module Federation

### What it does

Module Federation (Webpack 5) lets separately-built apps share JavaScript modules at runtime — without bundling them together at build time.

### How remotes are declared

**Host (`webpack.config.js`)**:
```js
remotes: {
  navigation:    "navRemote@http://localhost:3004/remoteEntry.js",
  productDetails:"productDetails@http://localhost:3001/remoteEntry.js",
  cart:          "cart@http://localhost:3002/remoteEntry.js",
  searchRemote:  "searchRemote@http://localhost:3005/remoteEntry.js",
  authRemote:    "authRemote@http://localhost:3006/remoteEntry.js",
  ordersRemote:  "ordersRemote@http://localhost:3007/remoteEntry.js",
  adminRemote:   "adminRemote@http://localhost:3008/remoteEntry.js",
}
```

**Each remote (`webpack.config.js`)**:
```js
name: "navRemote",          // ← must match the alias used by host
filename: "remoteEntry.js", // ← the manifest file the host fetches
exposes: {
  "./Navigation": "./src/Navigation",  // ← what other apps can import
}
```

A single remote can expose **multiple modules** from the same `remoteEntry.js`. The product-details MFE does exactly this:

```js
// product-details/webpack.config.js
name: "productDetails",
filename: "remoteEntry.js",
exposes: {
  "./ProductDetails": "./src/ProductDetails",  // full PDP page
  "./ProductCard":    "./src/ProductCard",     // reusable card for home grid
}
```

The host consumes both from the same origin (port 3001):

```js
// host/src/App.js
const ProductDetails = React.lazy(() => import("productDetails/ProductDetails"));
const ProductCard    = React.lazy(() => import("productDetails/ProductCard"));
//                                                    ↑ same remote — one remoteEntry.js fetch
```

This is the key advantage: **one server, one manifest, multiple exposed components**. The browser fetches `remoteEntry.js` once; after that each component's chunk is fetched on demand separately.

### The `remoteEntry.js` file

This is a small manifest (a few KB) that tells the consumer:
- What modules this remote exposes
- What shared packages it needs
- Where to download the actual code chunks

```
Host fetches productDetails@http://localhost:3001/remoteEntry.js
  → Browser learns: "productDetails exposes ./ProductDetails AND ./ProductCard"
  → When import("productDetails/ProductCard") is called on the Home page:
      Browser fetches http://localhost:3001/src_ProductCard_js.js
  → When import("productDetails/ProductDetails") is called on /product/:id:
      Browser fetches http://localhost:3001/src_ProductDetails_js.js
      Both loaded from port 3001 — remoteEntry.js fetched only ONCE
```

### Critical: dev server must restart to pick up new `exposes` entries

Webpack-dev-server reads `webpack.config.js` **once at startup** and holds the module manifest in memory. Adding a new entry to `exposes` while the server is running has no effect — the in-memory `remoteEntry.js` still only knows about the old entries.

```
Error: Module "./ProductCard" does not exist in container.
                    ↑
  Fix: restart the product-details dev server so webpack
       recompiles with the new exposes entry.
       cd product-details && npm start
```

After restart, you'll see both entries compiled:
```
Module Federation: Exposes
  ./ProductDetails → ./src/ProductDetails
  ./ProductCard    → ./src/ProductCard    ← new
```

### Why `publicPath` must be an absolute URL for remotes

```js
// navigation/webpack.config.js
output: {
  publicPath: "http://localhost:3004/",  // ← ABSOLUTE, not "/"
}
```

When Webpack chunks the Navigation bundle, it generates lazy chunks like `src_Navigation_js.js`. Without an absolute `publicPath`, the host would try to load these from `http://localhost:3000/src_Navigation_js.js` (its own origin) — causing a 404.

With an absolute publicPath, Webpack embeds `http://localhost:3004/` as the base URL for all chunks, so the host correctly fetches them from port 3004.

The host uses `publicPath: "/"` (relative) because its chunks live on the same server.

---

## 3. Routing

### Single Router, Owned by Host

There is **exactly one** `<BrowserRouter>` in the entire application — inside `host/src/App.js`:

```jsx
// host/src/App.js
function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>                          {/* ← Only router */}
        <Navigation />                         {/* navRemote — always mounted */}
        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/product/:id" element={<ProductDetailsWrapper />} />
          <Route path="/cart"        element={<Cart />} />
          <Route path="/orders"      element={<Orders />} />
          <Route path="/admin"       element={<AdminPortal />} />
          <Route path="/login"       element={<Login />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
```

All remote components consume this router via the shared `react-router-dom` singleton:

```jsx
// navigation/src/Navigation.js — a remote MFE using the host's router
import { Link, useNavigate } from "react-router-dom";
// Works because react-router-dom is a SHARED SINGLETON
// The host provided the <BrowserRouter> context that Navigation reads from
```

```jsx
// product-details/src/ProductDetails.js
const navigate = useNavigate(); // reads host's BrowserRouter context
navigate("/cart");              // navigates within the HOST's router
```

### How `productId` gets into ProductDetails

```
URL: /product/42
                 ↓ host Route extracts param
<Route path="/product/:id" element={<ProductDetailsWrapper />} />
                                          ↓
const ProductDetailsWrapper = () => {
  const { id } = useParams();           // reads ":id" from host's router
  return <ProductDetails productId={id} />;  // passes as prop to remote
};
```

ProductDetails itself receives `productId` as a **prop** — it doesn't read the URL directly. This makes it reusable: in standalone mode it's given `productId="1"` hardcoded.

### `historyApiFallback` — Why Page Reloads Work

```js
// host/webpack.config.js
devServer: {
  historyApiFallback: {
    index: "/",
    disableDotRule: true,
  },
}
```

Without this, reloading `http://localhost:3000/product/42` would ask the dev server for a file at `/product/42` — which doesn't exist → 404.

With `historyApiFallback`, the dev server returns `index.html` for any 404 path. The browser receives the HTML, loads `main.js`, React Router parses `/product/42`, and renders the right component. All routes are "virtual" — they exist only in JavaScript.

---

## 4. Shared Singletons

### The Problem Without Singletons

Imagine React was loaded twice:
- Host loads React 18.2.0
- Navigation loads its own React 18.2.0

Now `useState` in Navigation reads from a different React instance than the host. Context (`ThemeProvider`, `BrowserRouter`, etc.) would be invisible across the boundary. You'd get cryptic errors like _"Hooks can only be called inside a function component"_.

### The Solution — Singleton Shared Scope

```js
// host/webpack.config.js (eager: true for the host, which initialises scope)
shared: {
  react:              { singleton: true, requiredVersion: "^18.2.0", eager: true },
  "react-dom":        { singleton: true, requiredVersion: "^18.2.0", eager: true },
  "react-router-dom": { singleton: true, requiredVersion: "^6.20.0", eager: true },
  firebase:           { singleton: true, requiredVersion: "^10.7.0",  eager: true },
  "@mui/material":    { singleton: true, requiredVersion: "^5.15.6",  eager: true },
  "@emotion/react":   { singleton: true, requiredVersion: "^11.11.4", eager: true },
  "@emotion/styled":  { singleton: true, requiredVersion: "^11.11.0", eager: true },
}

// navigation/webpack.config.js (eager: false for remotes)
shared: {
  react: { singleton: true, requiredVersion: "^18.2.0", eager: false },
  // ... same packages
}
```

**`singleton: true`** — Only one copy of this package exists at runtime. If Navigation tries to load its own React, Module Federation says "you already have React — use the host's copy."

**`eager: true` (host only)** — The host loads these packages synchronously before any module runs. Remotes use `eager: false` so they wait for the host to provide the shared scope.

**Result**: Every MFE shares the same React instance, the same `BrowserRouter` context, the same Firebase app, and the same MUI theme engine.

### Firebase Singleton — One App, All MFEs

Every `firebase.js` file contains this guard:

```js
// host/src/firebase.js (and in every other MFE)
import { initializeApp, getApps, getApp } from "firebase/app";

const app = getApps().length === 0
  ? initializeApp(firebaseConfig)   // First call: create app
  : getApp();                       // Subsequent calls: reuse existing app

export const auth = getAuth(app);
export const db   = getFirestore(app);
```

Because `firebase` is a shared singleton, the first MFE to load (the host) calls `initializeApp`. Every subsequent MFE gets the same `app` instance via `getApp()`. There is **one** Auth session and **one** Firestore connection shared by all 8 MFEs.

---

## 5. Authentication Flow

### Firebase Auth as the Single Source of Truth

Authentication state is NOT passed between MFEs via props or events. Instead, every MFE that needs auth subscribes to Firebase's `onAuthStateChanged` listener independently:

```js
// navigation/src/Navigation.js
useEffect(() => {
  const authUnsub = onAuthStateChanged(auth, (user) => {
    // user is non-null when signed in, null when signed out
    if (!user) { setCartCount(0); return; }
    // subscribe to cart items for the signed-in user
  });
  return () => authUnsub();
}, []);

// auth/src/UserMenu.js — same pattern
useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const profile = await ensureProfile(firebaseUser); // fetch from Firestore
      setUser({ ...profile, role: profile.role });
    } else {
      setUser(null);
    }
  });
  return unsub;
}, []);
```

Because `firebase` is a shared singleton, all these listeners observe the **same** Firebase Auth state. When a user logs in via the Login MFE:

```
User clicks "Sign In" in Login MFE
  → Firebase Authentication validates credentials
  → Firebase updates the global Auth state
  → ALL onAuthStateChanged listeners fire simultaneously:
      ✓ Navigation updates cart count (subscribes to user's cart)
      ✓ UserMenu shows avatar and display name
      ✓ Cart shows user's items
      ✓ Orders shows user's order history
      ✓ Home shows wishlist state
```

This is **push-based** — no polling, no events, no global Redux store.

### Login Redirect

When unauthenticated users try to access a protected page:

```jsx
// cart/src/Cart.js
if (!authUser) {
  return (
    <Button onClick={() => navigate("/login", { state: { from: "/cart" } })}>
      Sign In
    </Button>
  );
}
```

The Cart MFE uses `useNavigate()` from the shared `react-router-dom` to push `/login` onto the host's router history. It passes `{ from: "/cart" }` in router state so the Login MFE can redirect back after sign-in.

```jsx
// auth/src/Login.js
const location = useLocation();
const from = location.state?.from || "/";
// After successful login:
navigate(from); // ← redirects back to /cart
```

### Role-Based Access (Admin)

Admin access is controlled by the `role` field in Firestore, **not** by client-side flags:

```
/users/{uid}
  role: "admin"   ← set in Firestore Console OR auto-assigned for demo admin users
```

```jsx
// auth/src/UserMenu.js
const profile = await getDoc(doc(db, "users", firebaseUser.uid));
const isAdmin = profile.data()?.role === "admin";
// Only renders Admin Portal link if isAdmin is true
```

```jsx
// admin/src/Admin.js
const snap = await getDoc(doc(db, "users", user.uid));
setIsAdmin(snap.exists() && snap.data().role === "admin");
// Shows "Access Denied" screen if not admin
```

The admin check happens server-side (Firestore read) — a user cannot fake admin access by manipulating client state.

### Role Preservation — Never Downgraded on Login

A critical detail in `auth/src/api.js`: **the `role` field is never overwritten** when an existing user signs in. The `saveProfile()` function uses the following priority chain:

```
Priority:  existing Firestore role  →  extra.role (new accounts only)  →  "user"
```

```js
// auth/src/api.js — saveProfile()
const existingSnap = await getDoc(ref);
const existingRole = existingSnap.exists() ? existingSnap.data().role : null;

const profileData = {
  // ...
  // Preserves role set in Firebase Console; only falls back to default for new docs
  role: existingRole || extra.role || "user",
};
```

**Why this matters:** Without this guard, every login would call `setDoc(..., { role: "user" }, { merge: true })` and silently reset any `"admin"` role you assigned in the Firebase Console. With the guard:

| Scenario | Result |
|---|---|
| Existing user logs in (any method) | Existing Firestore `role` is preserved unchanged |
| Demo user signs in for the first time | `role` from `DEMO_USERS` registry is used (e.g. `"admin"` for `john.doe`) |
| Brand-new Google / email user | Defaults to `"user"` |

To promote any user to admin, simply update their document in the Firebase Console:

```
Firestore → users → {uid} → role: "admin"
```

The change takes effect on the user's **next** page load (the `onAuthStateChanged` listener re-reads the Firestore profile).

---

## 6. Real-Time State

### How the Cart Badge Works

The cart badge in Navigation is the clearest example of real-time cross-MFE state. No events are fired, no context is passed between Navigation and Cart:

```
User adds item in ProductDetails MFE (port 3001):
  → writes to Firestore: /carts/{uid}/items/{productId}

Navigation MFE (port 3004) has an onSnapshot listener on the same path:
  → Firestore pushes the change to Navigation's listener
  → setCartCount(total) re-renders the badge
  → No communication between ProductDetails and Navigation code!
```

```js
// navigation/src/Navigation.js
cartUnsub = onSnapshot(
  collection(db, "carts", user.uid, "items"),
  (snap) => {
    const total = snap.docs.reduce((s, d) => s + (d.data().quantity || 0), 0);
    setCartCount(total);   // ← re-renders badge automatically
  }
);
```

### Real-Time Order Status

When an admin updates an order status:

```
Admin MFE writes to Firestore:
  await updateDoc(doc(db, "orders", orderId), { status: "shipped" })

Orders MFE has onSnapshot on the orders collection:
  onSnapshot(query(collection(db, "orders"), where("userId", "==", uid)))
  → receives the updated document instantly
  → setOrders(docs) re-renders the order card with new status
  → The MUI Stepper advances to the "Shipped" step automatically
```

The latency is typically **< 200ms** on a good connection — it appears instant.

### Wishlist Sync Across Home and ProductDetails

Both the Home page and the ProductDetails MFE maintain their own wishlist state via `onSnapshot`. When you toggle a wishlist item in either place, Firestore propagates the change and both components update:

```
Home page: onSnapshot(/wishlists/{uid}/items) → fills Set<productId>
ProductDetails: independent onSnapshot on the same path
Both listen to the same Firestore path → both re-render on change
```

---

## 7. Cross-MFE Communication Patterns

This app uses **three patterns** for cross-MFE communication, ordered from most to least common:

### Pattern 1: Firebase as Message Bus (90% of cases)

One MFE writes to Firestore → Firestore notifies all listening MFEs.

```
ProductDetails writes  →  /carts/{uid}/items/{pid}
Navigation reads       →  /carts/{uid}/items         (badge count)
Cart reads             →  /carts/{uid}/items         (full list)
```

No direct connection between ProductDetails, Navigation, and Cart. Firebase is the hub.

### Pattern 2: Props via Host (for data that needs routing context)

The host extracts URL parameters and passes them as props to remote components:

```jsx
// host/src/App.js
const ProductDetailsWrapper = () => {
  const { id } = useParams();               // host reads URL
  return <ProductDetails productId={id} />; // passes to remote as prop
};
```

The remote (`ProductDetails`) is completely decoupled from URL handling — it just receives a `productId` prop.

### Pattern 3: React Router Navigation (for page transitions)

Any MFE can navigate the host's router because `react-router-dom` is a singleton:

```jsx
// cart/src/Cart.js — navigates after checkout
navigate("/orders");

// product-details/src/ProductDetails.js — navigates via breadcrumb click
navigate(`/?category=${product.category}`);

// auth/src/Login.js — navigates to "from" location after login
navigate(location.state?.from || "/");
```

All calls go through the **same** `BrowserRouter` instance — the one defined in `host/src/App.js`.

### What's NOT Used

| Pattern | Status | Why |
|---|---|---|
| Custom DOM events (`window.dispatchEvent`) | ❌ Not used | Firebase serves the same purpose, more reliably |
| Shared Redux/Zustand store | ❌ Not used | Firebase is the store |
| `postMessage` (iframe communication) | ❌ Not used | MFEs are same-page JS, not iframes |
| Shared `localStorage` | ❌ Not used | Firebase handles persistence |
| React Context across MFE boundaries | ❌ Not used | Only works within same React tree segment |

---

## 8. The Bootstrap Pattern

### The Problem

Every MFE's `src/index.js` contains exactly one line:

```js
// cart/src/index.js
import("./bootstrap");
```

Why not just put all the code here?

### The Root Cause

When Webpack processes an MFE's entry file, it starts loading **synchronously**. If `index.js` directly imports React components:

```js
// WRONG — causes "Shared module is not available for eager consumption"
import React from "react";           // sync import
import ReactDOM from "react-dom";    // sync import
import Cart from "./Cart";           // sync import — Cart imports React too
ReactDOM.createRoot(...).render(...);
```

Webpack begins executing before the Module Federation shared scope is initialised — before it knows that `react` should come from the host's bundle, not the remote's local copy. This causes the fatal error:

```
Uncaught Error: Shared module is not available for eager consumption
```

### The Fix — Async Boundary

```js
// index.js — creates an async chunk boundary
import("./bootstrap");   // dynamic import = asynchronous

// bootstrap.js — runs AFTER shared scope is ready
import React from "react";
import ReactDOM from "react-dom/client";
import Cart from "./Cart";
ReactDOM.createRoot(document.getElementById("root")).render(<Cart />);
```

The `import()` call is a **Promise** — Webpack must fetch the `bootstrap` chunk asynchronously. By the time it resolves, the Module Federation shared scope has been negotiated with the host, and React is available from the shared pool.

**Visualised:**

```
index.js executes:
  import("./bootstrap")  ← async, returns Promise
       ↓
  MF shared scope initialises (React, Router, Firebase negotiated)
       ↓
  bootstrap.js chunk downloads and executes
       ↓
  ReactDOM.createRoot renders the app
  (React is now guaranteed to be the shared singleton)
```

---

## 9. Nested Remotes

Navigation is itself a remote consumed by the host, but it also consumes two other remotes:

```
HOST (consumer)
  └─ navRemote/Navigation (remote)
       ├─ searchRemote/Search (nested remote)
       └─ authRemote/UserMenu (nested remote)
```

```js
// navigation/webpack.config.js
remotes: {
  searchRemote: "searchRemote@http://localhost:3005/remoteEntry.js",
  authRemote:   "authRemote@http://localhost:3006/remoteEntry.js",
}
```

```jsx
// navigation/src/Navigation.js
const Search   = React.lazy(() => import("searchRemote/Search"));
const UserMenu = React.lazy(() => import("authRemote/UserMenu"));
```

When the host loads Navigation, Navigation in turn loads Search and UserMenu. The host doesn't know or care about Search or UserMenu — they're an implementation detail of Navigation.

**Shared scope flows through:** Host initialises the shared scope → Navigation negotiates with it → Search and UserMenu receive the same shared React/Firebase/MUI instances through Navigation's scope.

### Graceful Degradation with Suspense

Each nested remote is wrapped in `<React.Suspense>` with a meaningful fallback:

```jsx
// navigation/src/Navigation.js
<React.Suspense fallback={<SearchFallback />}>  {/* skeleton bar */}
  <Search />
</React.Suspense>

<React.Suspense fallback={<Typography>Loading…</Typography>}>
  <UserMenu />
</React.Suspense>
```

If Search MFE (port 3005) is down, Navigation shows the placeholder search bar and continues working. The app degrades gracefully instead of crashing.

---

## 10. Data Flow Walkthrough — Add to Cart End-to-End

Here is the complete journey when a signed-in user clicks "Add to Bag" on a product:

```
1. USER ACTION
   User is on http://localhost:3000/product/42
   Clicks "Add to Bag"

2. HOST ROUTER
   Host matched /product/:id → extracted id="42"
   Passed productId="42" as prop to ProductDetails MFE

3. PRODUCTDETAILS MFE (port 3001, running inside host's page)
   handleAddToCart() fires:
   
   a. Calls ensureCartDoc(uid, email)
      → writes /carts/{uid} parent document (for Firestore Console visibility)
   
   b. Checks if item already in cart:
      const snap = await getDoc(cartItemRef(uid, productId))
   
   c. Item not in cart → creates new document:
      await setDoc(cartItemRef(uid, productId), {
        productId: 42,
        name: "Sony WH-1000XM5",
        price: 279,
        quantity: 1,
        addedAt: serverTimestamp(),
        ...
      })
   
   d. Shows success Snackbar: "Added to bag! ✓"

4. FIRESTORE (cloud)
   /carts/{uid}/items/42 document created
   Firestore immediately notifies all active onSnapshot listeners
   for this path

5. NAVIGATION MFE (port 3004, always visible)
   Its onSnapshot listener on collection(db, "carts", uid, "items") fires:
   
   const total = snap.docs.reduce((s, d) => s + d.data().quantity, 0)
   setCartCount(total)  // e.g., was 2, now 3
   
   → Badge on 🛍️ icon re-renders: shows "3"
   → No communication between ProductDetails and Navigation JS code

6. CART MFE (port 3002, not currently on screen)
   Its onSnapshot is also active (if it was ever mounted)
   Would also receive the update if mounted
   Next time user navigates to /cart, the item appears immediately
```

Total time from click to badge update: **~150–300ms** (Firestore round-trip).

---

## 11. URL-Driven State — Category Filtering

Category filtering is implemented using URL query parameters — not component state. This means:
- The URL is bookmarkable: `http://localhost:3000/?category=Audio`
- Sharing the link gives the same filtered view
- Browser back/forward works correctly

### How it works

```jsx
// host/src/App.js — Home component
const [searchParams, setSearchParams] = useSearchParams();
const initialCategory = searchParams.get("category") || "All";
const [activeCategory, setActiveCategory] = useState(initialCategory);

const handleCategoryClick = (cat) => {
  setActiveCategory(cat);
  cat === "All"
    ? setSearchParams({})                   // → URL becomes /?
    : setSearchParams({ category: cat });   // → URL becomes /?category=Audio
};
```

### Breadcrumb → Category navigation in ProductDetails

ProductDetails reads the product's category from Firestore and renders a clickable breadcrumb:

```jsx
// product-details/src/ProductDetails.js
<Breadcrumbs>
  <Link component="button" onClick={() => navigate("/")}>Home</Link>
  <Link component="button"
    onClick={() => navigate(`/?category=${product.category}`)}>
    {product.category}   {/* e.g., "Audio" */}
  </Link>
  <Typography>{product.name}</Typography>
</Breadcrumbs>
```

Clicking "Audio" calls `navigate("/?category=Audio")` via the shared react-router-dom. The host's router updates, Home's `useSearchParams()` picks up `category=Audio`, and the tab auto-selects "Audio".

---

## 12. Standalone Mode

Every MFE can run independently without the host. This is useful for:
- **Isolated development** — work on Cart without starting all 8 MFEs
- **Testing** — write tests against the MFE in isolation
- **Debugging** — narrow down if a bug is in the MFE or the integration

### How standalone works

When you visit `http://localhost:3002` (Cart directly):

1. Cart's own webpack dev server serves `index.html`
2. `src/index.js` has `import("./bootstrap")` — the async boundary
3. `src/bootstrap.js` provides its **own** `<BrowserRouter>` and renders Cart

```jsx
// cart/src/bootstrap.js
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <div style={{ background: "#fff3cd", ... }}>
        📦 Standalone Mode — Cart MFE · port 3002
      </div>
      <Cart />
    </BrowserRouter>
  </React.StrictMode>
);
```

In standalone, Cart provides its own router context so `useNavigate` works. It still connects to Firebase — cart items are real and persist.

### The difference between standalone and hosted

| Aspect | Standalone | Inside Host |
|---|---|---|
| BrowserRouter | From `bootstrap.js` | From `host/src/App.js` |
| Navigation bar | Not present | navRemote renders it |
| `productId` prop (ProductDetails) | Hardcoded `"1"` | Extracted from URL param |
| Firebase | Same connection | Same connection |
| MUI Theme | From local `theme.js` | Host's ThemeProvider |

---

## 13. Shared UI Theme

### The Problem

MUI's `ThemeProvider` uses React Context. Context only propagates **down** the React component tree — it does not cross module boundaries on its own.

Two failure modes existed before the current solution:

1. **Each MFE had its own `ThemeProvider`** → nested providers override each other; tiny colour/spacing differences creep in between modules.
2. **`shared/theme.js` imported `createTheme` from `@mui/material/styles`** → webpack could not resolve `@mui/material` from `shared/` (no `node_modules` there), causing a build error.

### The Solution — Centralised Config, Local `createTheme`

The architecture has two layers:

```
shared/theme.js          ← pure JS object — the single source of truth
                            NO MUI imports; just palette, typography, shape, component overrides

each MFE's src/theme.js  ← imports themeConfig from shared/ and calls createTheme() locally
                            createTheme resolves from each MFE's own node_modules ✓
```

**`shared/theme.js`** — exports a plain configuration object:

```js
// shared/theme.js — no MUI import, safe to cross module boundaries
const themeConfig = {
  palette: {
    primary:    { main: "#ff3f6c", ... },   // Myntra-pink
    secondary:  { main: "#282c3f", ... },
    // ...
  },
  typography: { fontFamily: '"Inter", sans-serif', ... },
  shape:      { borderRadius: 4 },
  components: { MuiButton: { ... }, MuiCard: { ... }, ... },
};
export default themeConfig;
```

**Each MFE's `src/theme.js`** — imports the config and calls `createTheme` locally:

```js
// navigation/src/theme.js  (and every other MFE — same pattern)
import { createTheme } from "@mui/material/styles";  // resolved from navigation/node_modules
import themeConfig from "../../shared/theme";         // plain JS object — no resolution issue

const theme = createTheme(themeConfig);
export default theme;
```

### How ThemeProvider Is Applied

```
┌─ Host App (port 3000) ──────────────────────────────────────┐
│  <ThemeProvider theme={theme}>          ← ONE provider       │
│    <CssBaseline />                                           │
│    <BrowserRouter>                                           │
│      <Navigation />   ← remote, but shares same MUI Context │
│      <Routes>                                                │
│        <ProductDetails />  ← remote, inherits Context        │
│        <Cart />            ← remote, inherits Context        │
│        <Orders />          ← remote, inherits Context        │
│        <Admin />           ← remote, inherits Context        │
│      </Routes>                                               │
│    </BrowserRouter>                                          │
│  </ThemeProvider>                                            │
└──────────────────────────────────────────────────────────────┘
```

MFE **components** (`Navigation.js`, `Cart.js`, etc.) do **not** contain their own `ThemeProvider`. They rely entirely on the host's provider. This works because all MFEs share the **same React singleton** — there is only one React Context instance, so `ThemeProvider` set at the host level is visible inside every remote component.

### Standalone Mode — Each MFE Applies Its Own ThemeProvider

When an MFE runs independently (e.g. `navigation` on port 3004 during development), the host's `ThemeProvider` does not exist. Each MFE's `bootstrap.js` handles this:

```jsx
// navigation/src/bootstrap.js  (same pattern in all MFE bootstrap files)
import theme from "./theme";   // local createTheme(themeConfig)
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const App = () => (
  <ThemeProvider theme={theme}>   {/* ← only active in standalone mode */}
    <CssBaseline />
    <BrowserRouter>
      <Navigation />
    </BrowserRouter>
  </ThemeProvider>
);
```

### Decision Flow

```
Is MFE loaded by the host?
  YES → host's <ThemeProvider> is active → MFE component needs no ThemeProvider
  NO  (standalone dev) → bootstrap.js wraps component in its own <ThemeProvider>
```

### Changing the Theme Globally

Edit **one file only**:

```
shared/theme.js   ← change any palette colour, font, border-radius, component override
```

All 8 MFEs pick it up automatically on their next build — no need to touch individual `src/theme.js` files because those just call `createTheme(themeConfig)` and pass the imported object through.

---

## 14. Production Considerations

### What changes for production

| Concern | Development | Production |
|---|---|---|
| Remote URLs | `http://localhost:300X/remoteEntry.js` | CDN/server URLs (e.g., `https://nav.shopzone.com/remoteEntry.js`) |
| `publicPath` | `http://localhost:300X/` | Absolute CDN path per MFE |
| `historyApiFallback` | webpack-dev-server option | Web server rewrite rule (nginx, Apache, CloudFront) |
| CORS headers | Dev server sets `Access-Control-Allow-Origin: *` | Configure per-MFE server/CDN |
| Firestore Security Rules | `allow read, write: if true` (test) | Proper auth-gated rules |
| Firebase config | Embedded in source | Use environment variables |
| MFE deployment | Local ports | Independent CI/CD per MFE |

### Independent Deployability

Each MFE is a self-contained webpack build. In production:

```
Team A deploys Navigation v2.1 → uploads to https://cdn.shopzone.com/nav/remoteEntry.js
  → Host at https://shopzone.com fetches new remoteEntry.js on next user visit
  → Users get the new Navigation without any host redeployment
  → Product Details, Cart, etc. are unaffected
```

This is the core value of microfrontends: **deploy one module without touching others**.

### Version Negotiation

If Navigation requires React `^18.2.0` and the host has `18.3.0`, Module Federation's `singleton: true` ensures only the **higher version** is used (the one already loaded). If versions are incompatible, Webpack prints a warning but continues — the more common version wins.

### Error Boundaries

In production, wrap each remote in an Error Boundary:

```jsx
// production pattern (not yet implemented)
<ErrorBoundary fallback={<NavFallback />}>
  <React.Suspense fallback={<NavSkeleton />}>
    <Navigation />
  </React.Suspense>
</ErrorBoundary>
```

If Navigation's server is down, the Error Boundary catches the network error and shows a fallback, keeping the rest of the app working.

### Summary of Data Flows

```
┌─────────────────────────────────────────────────────────────┐
│                    FIREBASE (Cloud)                          │
│                                                             │
│  Auth state ──────────────────────────────────────────────► │
│                                                             │
│  /products     ← Host reads (seed + display)                │
│  /categories   ← Host reads (category tabs)                 │
│  /users/{uid}  ← UserMenu reads (role, avatar)              │
│                  Admin reads (role check)                   │
│  /carts/{uid}  ← ProductDetails writes (add to cart)       │
│    /items      ← Navigation reads (badge count)             │
│                ← Cart reads (items list + checkout)         │
│  /wishlists    ← Home reads (heart icons)                  │
│    /items      ← ProductDetails writes/reads (toggle)       │
│  /orders       ← Cart writes (on checkout)                  │
│                ← Orders reads (user's history)              │
│                ← Admin reads (ALL orders)                   │
│                ← Admin writes (status updates)              │
└─────────────────────────────────────────────────────────────┘
         ▲ All MFEs communicate THROUGH Firestore,
           not directly with each other.
```

---

---

## 15. Error Handling

### The Problem Without Error Boundaries

When a remote MFE (e.g. ProductDetails on port 3001) fails to load, `React.lazy()` returns a rejected Promise. `React.Suspense` is designed only for the **loading** state — it does not catch errors. Without an `ErrorBoundary`, the thrown error bubbles all the way up to the React root, which has no choice but to **unmount the entire app**:

```
User visits /product/42 — port 3001 is down:

React.lazy() → fetch http://localhost:3001/remoteEntry.js → FAILS
                              ↓
       Promise rejects → React throws ChunkLoadError
                              ↓
       React.Suspense re-throws it (Suspense ≠ error handler)
                              ↓
       Error bubbles up the tree… no ErrorBoundary found
                              ↓
       React unmounts the ENTIRE APP  ← white screen of death
       Navigation gone. Footer gone. No way to navigate back.
```

### The Solution — `RemoteErrorBoundary`

An `ErrorBoundary` is a **class component** (React hooks cannot catch errors) with two special lifecycle methods:

```
getDerivedStateFromError(error)  — called synchronously when a child throws
                                   → updates state to show the fallback UI

componentDidCatch(error, info)   — called after the error is caught
                                   → ideal for logging to Sentry / Datadog
```

In `host/src/App.js`:

```jsx
class RemoteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retryKey: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };   // triggers fallback UI
  }

  componentDidCatch(error, info) {
    console.error(`[ShopZone] Remote MFE failed — ${this.props.name}`,
      error.message, info.componentStack);
    // In production: Sentry.captureException(error, { extra: info })
  }

  handleRetry = () => {
    // Increment retryKey → forces React to completely re-mount children
    this.setState(s => ({ hasError: false, error: null, retryKey: s.retryKey + 1 }));
  };

  render() {
    if (!this.state.hasError) {
      // key={retryKey} ensures a fresh mount after retry
      return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
    }
    // ... renders the error card UI
  }
}
```

### Every Remote is Wrapped in Both Layers

`React.Suspense` and `ErrorBoundary` serve different purposes and must both be present:

```
┌─────────────────────────────────────────────────────────────┐
│  RemoteErrorBoundary  ← catches load failures & render bugs │
│  └─ React.Suspense   ← shows skeleton while bundle fetches  │
│     └─ React.lazy(() => import("productDetails/…"))         │
│        └─ <ProductDetails productId={id} />                 │
└─────────────────────────────────────────────────────────────┘
```

In code, this is the `RemoteWrapper` helper:

```jsx
const RemoteWrapper = ({ name, fallbackLabel, fallbackPath, children }) => (
  <RemoteErrorBoundary name={name} fallbackLabel={fallbackLabel} fallbackPath={fallbackPath}>
    <React.Suspense fallback={<Box>Loading {name}…</Box>}>
      {children}
    </React.Suspense>
  </RemoteErrorBoundary>
);

// Used on every route:
<Route path="/product/:id" element={<ProductDetailsWrapper />} />
<Route path="/cart"        element={<RemoteWrapper name="Cart"><Cart /></RemoteWrapper>} />
<Route path="/orders"      element={<RemoteWrapper name="Orders"><Orders /></RemoteWrapper>} />
// ...etc
```

### The Five Error Scenarios

#### Scenario 1 — Server is completely down (port not running)

| | |
|---|---|
| **Error type** | `ChunkLoadError` / `Failed to fetch` |
| **Caught by** | `RemoteErrorBoundary.getDerivedStateFromError()` |
| **User sees** | Error card with a dev-mode hint showing which `npm run start:X` command to run |
| **Rest of app** | ✅ Navigation, Home, Cart, Orders all work normally — only the failed route shows the error card |

```
Before fix:  entire app → white screen
After fix:   /product/42 → error card | nav ✅ | home ✅ | cart ✅
```

#### Scenario 2 — User retries after server comes back

The **"Try Again"** button increments `retryKey` in state. Because the `<React.Fragment key={retryKey}>` wrapper changes its `key` prop, React completely **unmounts and remounts** all children from scratch. `React.lazy()` fires a fresh network request — this time the server is up, so it succeeds and the component renders normally.

```
User: [Try Again]
  → retryKey: 0 → 1
  → React destroys old children (the error state is cleared)
  → React.lazy() fires a new fetch to http://localhost:3001/remoteEntry.js
  → Fetch succeeds → ProductDetails renders
```

#### Scenario 3 — Module loads but crashes during render (JS bug)

If ProductDetails loads successfully but throws a JavaScript error during rendering (e.g. accessing `.name` on `undefined`), the same `RemoteErrorBoundary` catches it:

```jsx
// example bug in ProductDetails.js
const name = product.specs.dimensions.weight; // TypeError: Cannot read 'dimensions'
```

```
Component throws during render()
  → getDerivedStateFromError() catches it
  → componentDidCatch() logs: TypeError + full component stack trace
  → Error card renders with the raw error message (visible in dev mode)
  → The rest of the app continues working
```

In development, the raw error message is shown in an amber code block. In production (`NODE_ENV === "production"`), only the generic message is shown — the actual error goes to your logging service.

#### Scenario 4 — Shared component (ProductCard) fails on the Home page

`ProductCard` is a **shared component exposed from the product-details MFE** (port 3001). It is rendered inside the Home page product grid — not inside a route-level boundary. This means its error isolation is different.

```
Home page grid uses React.lazy() for ProductCard:

const ProductCard = React.lazy(() => import("productDetails/ProductCard"));

// Inside Home's product grid:
<React.Suspense fallback={<SkeletonCards />}>
  {displayed.map(p => <ProductCard key={p.id} ... />)}
</React.Suspense>
```

| State | What user sees |
|---|---|
| Module loading (first visit) | Skeleton shimmer cards — same UX as data loading |
| Module loaded (cached) | Real cards — all subsequent renders are synchronous |
| Port 3001 down | Skeleton cards stay visible permanently (Suspense stays in loading state) OR error card if an ErrorBoundary wraps the Suspense |
| Port 3001 down AND user visits `/product/:id` | Error card on the PDP route — the same `remoteEntry.js` fetch fails for both modules |

**Why this differs from page-level remotes:**

Page-level remotes (`ProductDetails`, `Cart`, etc.) are only loaded when the user navigates to that route. `ProductCard` is loaded on the **Home page** — the landing page. If port 3001 is completely down, the home page will show skeleton cards until the Suspense times out.

The safest pattern is to also wrap the Suspense boundary in an `ErrorBoundary`:

```jsx
// Defensive pattern — wraps both the load wait AND load failure
<RemoteErrorBoundary name="Product Cards" fallbackLabel="Refresh" fallbackPath="/">
  <React.Suspense fallback={<SkeletonGrid />}>
    {displayed.map(p => <ProductCard key={p.id} ... />)}
  </React.Suspense>
</RemoteErrorBoundary>
```

This degrades gracefully: if port 3001 never comes up, the user sees an error card instead of endless skeletons, with a "Try Again" button.

#### Scenario 5 — New `exposes` entry added but dev server not restarted

This is a **development-only failure mode** that produces a very specific error:

```
Error: Module "./ProductCard" does not exist in container.
```

**Root cause:** Webpack-dev-server reads `webpack.config.js` **once at startup** and holds the module manifest (`remoteEntry.js`) in memory. If you add a new entry to `exposes` while the server is running, the in-memory manifest still only knows about the old entries — no hot-reload occurs for config changes, only for source files.

```
Timeline of the failure:

1. product-details server starts → compiles → exposes only ./ProductDetails
2. Developer adds "./ProductCard" to exposes in webpack.config.js
3. HMR fires for the source change... but webpack.config.js is NOT watched by HMR
4. In-memory remoteEntry.js still shows: { exposes: ["./ProductDetails"] }
5. Host tries: import("productDetails/ProductCard")
6. Remote container checks its manifest → "ProductCard" not found
7. Error thrown: Module "./ProductCard" does not exist in container
```

**Fix:** Restart the product-details dev server:
```bash
# Stop the running server (Ctrl+C), then:
cd product-details && npm start

# Or restart just product-details while keeping other MFEs running:
npm run start:product
```

After restart, webpack recompiles from the config file and the new expose entry is registered:
```
Module Federation: Exposes
  ./ProductDetails → ./src/ProductDetails
  ./ProductCard    → ./src/ProductCard    ← now registered
```

This error **cannot happen in production** — production builds are compiled once from the final config, so the manifest always reflects the current `exposes` entries.

### Navigation Has Its Own Isolated Boundary

The Navigation bar (always mounted, always visible) has its own separate `ErrorBoundary`:

```jsx
// host/src/App.js
<RemoteErrorBoundary name="Navigation" fallbackLabel="Home" fallbackPath="/">
  <React.Suspense fallback={<Box sx={{ height: 64, bgcolor: "secondary.main" }} />}>
    <Navigation />
  </React.Suspense>
</RemoteErrorBoundary>
```

This is intentional isolation. If the Navigation MFE (port 3004) fails:
- **Without isolation:** App crashes → white screen
- **With isolation:** A slim dark bar (the `Suspense` fallback height placeholder) shows instead of the navbar. The page content still renders. Users can still navigate using footer links or by typing URLs.

### What Each State Looks Like to the User

```
┌──────────────────────────────────────┬─────────────────────────────────────────────┐
│ State                                │ What user sees                              │
├──────────────────────────────────────┼─────────────────────────────────────────────┤
│ Normal (module loads)                │ Component renders — nothing unusual         │
│ Loading page-level remote (~1s)      │ "Loading Product Details…" text             │
│ Loading ProductCard (first visit)    │ Skeleton shimmer cards (same as data load)  │
│ ProductCard cached (all later visits)│ Cards render instantly — no Suspense needed │
│ Port down (page-level remote)        │ ⚠️ Error card with Try Again + Go Home     │
│ Port down (ProductCard / port 3001)  │ Skeleton cards or error card (see §15)      │
│ Module loads but JS crashes          │ ⚠️ Error card with raw message (dev only)  │
│ After retry (server came back)       │ Component renders normally                  │
│ Navigation fails (port 3004 down)    │ Dark placeholder bar, rest of page works    │
│ New expose not in restarted server   │ "Module does not exist in container" error  │
└──────────────────────────────────────┴─────────────────────────────────────────────┘
```

### Lifecycle of a Failed Remote Load

```
Time 0ms:   User navigates to /product/42
Time 0ms:   React.lazy() triggers — Promise is "pending"
Time 0ms:   React.Suspense activates — renders "Loading Product Details…"
Time 50ms:  Browser fetches http://localhost:3001/remoteEntry.js
Time 50ms:  Connection refused → fetch() throws a TypeError
Time 50ms:  React.lazy()'s Promise rejects with ChunkLoadError
Time 51ms:  React.Suspense sees rejection — re-throws the error upward
Time 51ms:  RemoteErrorBoundary.getDerivedStateFromError() intercepts it
            → { hasError: true, error: ChunkLoadError }
Time 51ms:  componentDidCatch() logs to console
Time 52ms:  ErrorBoundary re-renders with the error card UI
Time 52ms:  ⚠️ Card is visible. Navigation ✅. Footer ✅. App alive.
```

### Production Upgrade Path

In a real production system, replace the `console.error` in `componentDidCatch` with a proper error reporting service:

```js
componentDidCatch(error, info) {
  // Sentry
  Sentry.captureException(error, {
    extra: { componentStack: info.componentStack },
    tags: { mfe: this.props.name },
  });

  // Or Datadog RUM
  datadogRum.addError(error, { mfe: this.props.name });
}
```

This gives you an alert every time a remote MFE fails to load in production — letting you catch deployment issues before users report them.

---

*This document reflects the exact code in this repository. File references:*
- *`host/src/App.js` — routing, Home page, wishlist, `RemoteErrorBoundary`, `RemoteWrapper`, lazy `ProductCard`*
- *`host/webpack.config.js` — remote declarations, shared singletons*
- *`navigation/src/Navigation.js` — cart badge, nested remotes*
- *`navigation/webpack.config.js` — nested remote declarations*
- *`cart/src/Cart.js` — checkout, Firestore cart writes*
- *`product-details/src/ProductDetails.js` — PDP: add to cart/wishlist*
- *`product-details/src/ProductCard.js` — shared card component (exposed from same remote as ProductDetails)*
- *`product-details/webpack.config.js` — exposes both `./ProductDetails` and `./ProductCard`*
- *`auth/src/UserMenu.js` — auth state, role check, logout*
- *`orders/src/Orders.js` — real-time order tracking*
- *`admin/src/Admin.js` — admin guard, status updates*
- *`*/src/firebase.js` — singleton init pattern*
- *`*/src/index.js` — bootstrap pattern (one line)*
