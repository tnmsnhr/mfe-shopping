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
               / → Home (inline in host — no remote needed)
               /product/:id → React.lazy → productDetails (port 3001)
               /cart        → React.lazy → cart (port 3002)
               /orders      → React.lazy → ordersRemote (port 3007)
               /admin       → React.lazy → adminRemote (port 3008)
               /login       → React.lazy → authRemote (port 3006)
```

Key insight: **The host downloads remote code on demand**, not all upfront. If you go straight to `/cart`, the product-details bundle is never downloaded.

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

### The `remoteEntry.js` file

This is a small manifest (a few KB) that tells the consumer:
- What modules this remote exposes
- What shared packages it needs
- Where to download the actual code chunks

```
Host fetches navRemote@http://localhost:3004/remoteEntry.js
  → Browser learns: "navRemote exposes ./Navigation"
  → When import("navigation/Navigation") is called:
      Browser fetches http://localhost:3004/src_Navigation_js.js
      (loaded from port 3004, not 3000 — this is why publicPath matters)
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
  role: "admin"   ← set manually in Firestore Console
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

MUI's `ThemeProvider` uses React Context. React Context only crosses component tree boundaries when there's a single shared Context object. Since all MFEs share the **same React instance** (singleton), they also share the same React Context.

However, if each MFE creates its own `ThemeProvider`, the inner `ThemeProvider` overrides the outer one. The result would be MFEs with inconsistent themes.

### The Solution

A single `theme.js` file is **physically copied** into every MFE's `src/` directory:

```
host/src/theme.js              ← source of truth
navigation/src/theme.js        ← identical copy
search/src/theme.js            ← identical copy
product-details/src/theme.js   ← identical copy
cart/src/theme.js              ← identical copy
auth/src/theme.js              ← identical copy
orders/src/theme.js            ← identical copy
admin/src/theme.js             ← identical copy
```

Each MFE imports its local copy, but because `@mui/material` is a singleton, `createTheme` produces a theme object that is compatible across all MFEs. Every `ThemeProvider` in every MFE uses the same pink primary colour, Inter font, and component overrides.

When you want to change the primary colour globally, edit ONE file (`host/src/theme.js`) and copy it to the others.

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

*This document reflects the exact code in this repository. File references:*
- *`host/src/App.js` — routing, Home page, wishlist*
- *`host/webpack.config.js` — remote declarations, shared singletons*
- *`navigation/src/Navigation.js` — cart badge, nested remotes*
- *`navigation/webpack.config.js` — nested remote declarations*
- *`cart/src/Cart.js` — checkout, Firestore cart writes*
- *`product-details/src/ProductDetails.js` — add to cart/wishlist*
- *`auth/src/UserMenu.js` — auth state, role check, logout*
- *`orders/src/Orders.js` — real-time order tracking*
- *`admin/src/Admin.js` — admin guard, status updates*
- *`*/src/firebase.js` — singleton init pattern*
- *`*/src/index.js` — bootstrap pattern (one line)*
