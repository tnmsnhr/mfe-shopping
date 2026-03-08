# 🛍️ ShopZone — Microfrontend E-Commerce App

A production-style e-commerce application built with **React + Webpack Module Federation** and **Firebase** as the cloud backend.  
Every UI section is an independent, deployable microfrontend that composes seamlessly into a single app — with zero Express server required.

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (User)                           │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                    HOST  (port 3000)                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Navigation MFE  (port 3004)                   │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │            Search MFE  (port 3005)                   │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Route /             → Home page (in Host)                      │
│  Route /product/:id  → ProductDetails MFE  (port 3001)          │
│  Route /cart         → Cart MFE  (port 3002)                    │
│  Route /orders       → Orders MFE  (port 3007)                  │
│  Route /admin        → Admin MFE  (port 3008)                   │
│  Route /login        → Auth MFE  (port 3006)                    │
└──────────────────────────────┬──────────────────────────────────┘
                               │  Firebase SDK (direct)
┌──────────────────────────────▼──────────────────────────────────┐
│                    Firebase (Cloud)  ☁️                          │
│                                                                 │
│  Authentication  →  Email / Password + Google Sign-In           │
│                                                                 │
│  Firestore                                                      │
│   /products/{id}               ← product catalogue (32 items)  │
│   /categories/{slug}           ← 6 categories                  │
│   /users/{uid}                 ← user profiles + roles          │
│   /carts/{uid}/items/{pid}     ← per-user cart (real-time)     │
│   /wishlists/{uid}/items/{pid} ← per-user wishlist             │
│   /orders/{orderId}            ← order history + status         │
└─────────────────────────────────────────────────────────────────┘
```

### Module Federation wiring

| Consumer | Loads remotes |
|---|---|
| **Host** | `navRemote`, `productDetails`, `cart`, `searchRemote`, `authRemote`, `ordersRemote`, `adminRemote` |
| **Navigation** | `searchRemote` ← nested remote |

---

## 📦 Modules at a Glance

| Module | Port | Container name | Exposes | Standalone URL |
|---|---|---|---|---|
| **Host** | 3000 | `host` | *(shell)* | http://localhost:3000 |
| **ProductDetails** | 3001 | `productDetails` | `./ProductDetails` | http://localhost:3001 |
| **Cart** | 3002 | `cart` | `./Cart` | http://localhost:3002 |
| **Navigation** | 3004 | `navRemote` | `./Navigation` | http://localhost:3004 |
| **Search** | 3005 | `searchRemote` | `./Search` | http://localhost:3005 |
| **Auth** | 3006 | `authRemote` | `./Login`, `./UserMenu` | http://localhost:3006 |
| **Orders** | 3007 | `ordersRemote` | `./Orders` | http://localhost:3007 |
| **Admin** | 3008 | `adminRemote` | `./Admin` | http://localhost:3008 |

> ℹ️ There is **no local backend server**. All data is served directly from Firebase/Firestore.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 |
| UI Component Library | **Material UI (MUI) v5** |
| Module Federation | Webpack 5 |
| Routing | React Router DOM v6 |
| Styling | MUI `sx` props + shared `theme.js` (Emotion under the hood) |
| Authentication | Firebase Authentication (Email/Password + Google) |
| Database | Cloud Firestore (real-time NoSQL) |
| Build tool | Webpack 5 + Babel |

---

## ☁️ Firebase Setup (Required before first run)

### 1 — Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project named **`mfe-shopping`**
2. Register a **Web app** inside the project

### 2 — Enable Authentication

1. Firebase Console → **Authentication** → **Sign-in method**
2. Enable **Email / Password**
3. Enable **Google**

### 3 — Create Firestore Database

1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in test mode** (or use the rules below)
3. Pick any region and confirm

### 4 — Set Firestore Security Rules

Paste these rules in **Firestore → Rules** tab and click **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Products & categories — public read, no write from client
    match /products/{id}    { allow read: if true; allow write: if false; }
    match /categories/{id}  { allow read: if true; allow write: if false; }

    // User profiles — owner only
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // Cart — owner only
    match /carts/{uid}/{rest=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // Wishlist — owner only
    match /wishlists/{uid}/{rest=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // Orders — owner can read their own; any authenticated user can write (checkout)
    // Admin reads all orders via a broad allow (tighten in production with custom claims)
    match /orders/{orderId} {
      allow read:  if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

> 💡 **For development / testing** you can use `allow read, write: if true;` to skip auth checks.

### 5 — Firebase config (already in code)

The Firebase config is already embedded in every `src/firebase.js` file. No `.env` file is needed for local development.

---

## ✅ Prerequisites

| Tool | Version |
|---|---|
| **Node.js** | 18+ (LTS recommended) |
| **npm** | 9+ |

```bash
node --version   # v18.x.x or higher
npm --version    # 9.x.x or higher
```

---

## 🚀 Setup & Installation

### 1 — Clone the repository

```bash
git clone <your-repo-url> mfe
cd mfe
```

### 2 — Install all dependencies

```bash
npm run install:all
```

> If you see peer-dependency warnings, add `--legacy-peer-deps` (MUI + React 18 occasionally triggers this):
> ```bash
> for dir in host product-details cart navigation search auth orders admin; do
>   (cd $dir && npm install --legacy-peer-deps)
> done
> ```

<details>
<summary>Or install each module individually</summary>

```bash
cd host            && npm install --legacy-peer-deps && cd ..
cd product-details && npm install --legacy-peer-deps && cd ..
cd cart            && npm install --legacy-peer-deps && cd ..
cd navigation      && npm install --legacy-peer-deps && cd ..
cd search          && npm install --legacy-peer-deps && cd ..
cd auth            && npm install --legacy-peer-deps && cd ..
cd orders          && npm install --legacy-peer-deps && cd ..
cd admin           && npm install --legacy-peer-deps && cd ..
```
</details>

---

## ▶️ Running the App

### Option A — One command (recommended)

```bash
bash start-all.sh
```

Starts all 8 MFEs in the background and prints a status summary. Then open **http://localhost:3000** 🎉

### Option B — Individual terminals

Start them in this order (remotes before host):

```bash
# Terminal 1 — Auth MFE
npm run start:auth

# Terminal 2 — Search MFE  (loaded by Navigation)
npm run start:search

# Terminal 3 — Navigation MFE  (loaded by Host)
npm run start:navigation

# Terminal 4 — ProductDetails MFE
npm run start:product

# Terminal 5 — Cart MFE
npm run start:cart

# Terminal 6 — Orders MFE
npm run start:orders

# Terminal 7 — Admin MFE
npm run start:admin

# Terminal 8 — Host (loads everything)
npm run start:host
```

Then open **http://localhost:3000** 🎉

### All available npm scripts (root `package.json`)

| Script | Description |
|---|---|
| `npm run install:all` | Install deps for all 8 modules |
| `npm run start:host` | Start host shell (port 3000) |
| `npm run start:product` | Start ProductDetails MFE (port 3001) |
| `npm run start:cart` | Start Cart MFE (port 3002) |
| `npm run start:navigation` | Start Navigation MFE (port 3004) |
| `npm run start:search` | Start Search MFE (port 3005) |
| `npm run start:auth` | Start Auth MFE (port 3006) |
| `npm run start:orders` | Start Orders MFE (port 3007) |
| `npm run start:admin` | Start Admin MFE (port 3008) |
| `npm run start:all` | Start all via `start-all.sh` |
| `npm run build:all` | Production build for all MFEs |

---

## 🔬 Running Modules in Standalone Mode

Every MFE is independently runnable — no host required.

| URL | What you'll see |
|---|---|
| http://localhost:3001 | Product detail page (product #1) |
| http://localhost:3002 | Cart page |
| http://localhost:3004 | Navigation bar |
| http://localhost:3005 | Search bar with live product lookup |
| http://localhost:3006 | Login page |
| http://localhost:3007 | Order history page |
| http://localhost:3008 | Admin order management portal |

> The standalone pages show a yellow "Standalone Mode" banner so you know they're running independently.

---

## 📦 Orders MFE

Accessible at `/orders` (or standalone at `http://localhost:3007`).

**Features:**
- Requires sign-in — shows auth gate if not logged in
- **Orders list** — cards showing order number, date, item previews, total, and a live delivery progress bar
- **Filter tabs** — All / Confirmed / Packed / Shipped / Delivered / Delayed / Cancelled
- **Order detail view** — click any card to see:
  - Visual delivery timeline (Confirmed → Packed → Shipped → Delivered)
  - Full item table (image, name, brand, qty, unit price, line total)
  - Price breakdown (subtotal, discount, tax, total paid)
  - Status history (updated by admin)
- **Real-time** — uses Firestore `onSnapshot`, so status changes made by admin appear instantly without a refresh

---

## 🛠️ Admin MFE

Accessible at `/admin` (or standalone at `http://localhost:3008`).  
Only users with `role: "admin"` in Firestore can use the portal.

**Features:**
- **Stats dashboard** — Total orders · Total revenue · Active orders · Orders today
- **Filter strip** — filter by any status with live counts
- **Search** — by order ID, customer email, or product name
- **Sort** — newest / oldest / highest value / lowest value
- **Order rows** (collapsed by default, click to expand):
  - *Collapsed:* order ID, customer email, item count + emoji preview, total, status badge, quick-action buttons
  - *Expanded:* full item table, price summary, status history, all status buttons
- **Status transitions** — guided workflow buttons follow the logical order:
  - `Confirmed → [Pack] [Cancel]`
  - `Packed → [Ship] [Cancel]`
  - `Shipped → [Deliver] [Delay] [Cancel]`
  - `Delayed → [Ship] [Deliver] [Cancel]`
  - In the expanded view, **any** status can be set directly
- **Status history** — every change is appended to `statusHistory[]` in Firestore
- **Toast notifications** — confirmation after every status update
- **Access control** — non-admin users see an "Access Denied" screen

### How to grant admin access

1. Firebase Console → **Firestore** → `users` collection
2. Open the user document (match by email)
3. Edit the `role` field: change `"user"` → `"admin"`
4. Save, then sign out and back in

The **🛠️ Admin Portal** link will appear at the top of the user dropdown menu.

---

## 🗄️ Firestore Data Model

All data is stored in Cloud Firestore. The `products` and `categories` collections are **auto-seeded** on the very first app load.

```
/products/{id}                     ← auto-seeded (32 docs)
  id, name, brand, category,
  price, mrp, discount,
  image, description, features[],
  rating, reviews, inStock,
  searchKeywords[], createdAt

/categories/{slug}                 ← auto-seeded (6 docs)
  id, name, slug, emoji,
  productCount, order

/users/{uid}                       ← created on first sign-in
  uid, email, displayName,
  photoURL, avatar, role,          ← role: "user" | "admin"
  provider, createdAt, updatedAt

/carts/{uid}                       ← created on first cart add
  cartId, userId, userEmail,
  createdAt, updatedAt
  /items/{productId}               ← subcollection
    productId, name, brand,
    price, mrp, image, category,
    quantity, addedAt

/wishlists/{uid}                   ← created on first wishlist add
  userId, createdAt
  /items/{productId}               ← subcollection
    productId, name, brand,
    price, mrp, image, category,
    addedAt

/orders/{orderId}                  ← created on checkout
  orderId, userId, userEmail,
  items[], subtotal, discount,
  tax, total,
  status,                          ← confirmed | packed | shipped | delivered | delayed | cancelled
  statusHistory[],                 ← audit trail: [{ status, at }]
  statusUpdatedAt, createdAt
```

---

## 👤 Demo Accounts

The following accounts are **auto-created in Firebase** on first login (no manual setup needed):

| Username | Password | Display Name | Role |
|---|---|---|---|
| `john.doe` | `pass123` | John Doe | Admin |
| `jane.smith` | `pass123` | Jane Smith | User |
| `sarah.wilson` | `secure456` | Sarah Wilson | User |
| `mike.chen` | `secure456` | Mike Chen | User |
| `emma.davis` | `pass123` | Emma Davis | User |
| `demo` | `demo` | Demo User | User |

> After first login, manually set `role: "admin"` in Firestore for any account you want to use as admin.  
> You can also **Sign in with Google** — a Firestore profile is created automatically.

---

## 🗂️ Project Structure

```
mfe/
├── host/                    # Shell app — home page + routing
│   └── src/
│       ├── App.js           # Routes + Home + Wishlist (MUI Grid/Card)
│       ├── theme.js         # ★ Shared MUI theme (pink primary, Inter font)
│       ├── api.js           # Firestore product/category reads
│       ├── firebase.js      # Firebase initialisation
│       ├── seedData.js      # 32 products + 6 categories (seed data)
│       └── seedFirestore.js # Auto-seeds Firestore on first load
│
├── navigation/              # Top nav bar MFE  (port 3004)
│   └── src/
│       ├── Navigation.js    # MUI AppBar + cart badge (Firestore) + lazy Search
│       ├── theme.js         # Copy of shared MUI theme
│       └── firebase.js
│
├── search/                  # Myntra-style search MFE  (port 3005)
│   └── src/
│       ├── Search.js        # MUI-based live search with keyboard navigation
│       ├── theme.js         # Copy of shared MUI theme
│       ├── api.js           # Firestore products read
│       └── firebase.js
│
├── product-details/         # Product detail page MFE  (port 3001)
│   └── src/
│       ├── ProductDetails.js # MUI layout — add to cart + wishlist (Firestore)
│       ├── theme.js          # Copy of shared MUI theme
│       ├── api.js            # Firestore product read
│       └── firebase.js
│
├── cart/                    # Shopping cart MFE  (port 3002)
│   └── src/
│       ├── Cart.js          # MUI Table + Stepper — real-time cart + checkout
│       ├── theme.js         # Copy of shared MUI theme
│       └── firebase.js
│
├── auth/                    # Authentication MFE  (port 3006)
│   └── src/
│       ├── Login.js         # MUI TextField/Button — Email/Password + Google
│       ├── UserMenu.js      # MUI Menu/Avatar — dropdown + admin link + logout
│       ├── theme.js         # Copy of shared MUI theme
│       ├── api.js           # Firebase Auth wrapper + demo user provisioning
│       └── firebase.js
│
├── orders/                  # Order history MFE  (port 3007)
│   └── src/
│       ├── Orders.js        # MUI Stepper/Cards — order list + detail view
│       ├── theme.js         # Copy of shared MUI theme
│       └── firebase.js
│
├── admin/                   # Admin portal MFE  (port 3008)
│   └── src/
│       ├── Admin.js         # MUI Table/Dialog/Snackbar — order management
│       ├── theme.js         # Copy of shared MUI theme
│       └── firebase.js
│
├── start-all.sh             # One-command launcher (all 8 MFEs)
└── package.json             # Root scripts
```

---

## 🔑 Key Concepts

### Bootstrap pattern
Each MFE's `src/index.js` contains only:
```js
import("./bootstrap");
```
The async `import()` creates a chunk boundary that lets Webpack initialise the **shared module scope** (React, React Router, Firebase) before any component runs. Without this you get `Shared module is not available for eager consumption`.

### Shared modules
React, ReactDOM, React Router, Firebase, **`@mui/material`**, **`@emotion/react`**, and **`@emotion/styled`** are all declared `singleton: true` so every MFE shares **one instance** — avoiding duplicate React/Emotion contexts and the "multiple React" problem that would break MUI's `ThemeProvider`.

### Nested remotes
Navigation (a remote itself) loads Search as its own nested remote — demonstrating that Module Federation remotes can consume other remotes.

### Auto-seed
On the very first app load, `seedFirestore.js` checks if `/products` is empty and batch-writes all 32 products + 6 categories. Subsequent loads skip the seed (checked with a single `limit(1)` query).

### Category-aware routing
Clicking a category breadcrumb in ProductDetails navigates to `/?category=Audio`. The Home component reads `useSearchParams()` and pre-selects the right tab.

### Shared MUI theme
A single `src/theme.js` file (Myntra-pink `#ff3f6c` primary, Inter font, MUI component overrides) is copied into every MFE. Combined with the `singleton` shared config, this guarantees a consistent look across all microfrontends even when they are consumed by the host.

### Real-time updates
Cart badge, cart page, and order history all use Firestore `onSnapshot` listeners. When an admin changes an order status, the customer's Orders page updates **instantly** — no polling or page refresh needed.

### Role-based access
The `role` field in `/users/{uid}` controls admin access. The Admin MFE checks this field on load — non-admins see an Access Denied screen with exact instructions for how to elevate access in Firestore.

---

## 🐛 Troubleshooting

| Problem | Fix |
|---|---|
| Products not loading / blank home page | Check browser console for Firestore errors. Verify Firestore is created and rules allow reads. |
| Login fails with `auth/operation-not-allowed` | Enable **Email/Password** sign-in in Firebase Console → Authentication → Sign-in method |
| Google sign-in popup blocked | Allow popups for `localhost` in your browser settings |
| Cart/wishlist not saving | Ensure the user is **signed in** — cart is tied to Firebase UID |
| Admin Portal not visible in dropdown | Set `role: "admin"` in Firestore → `users/{uid}`, then sign out and back in |
| Admin Portal shows "Access Denied" | Same as above — Firestore role field must be `"admin"` |
| Orders not appearing in Admin portal | Check Firestore rules allow admin to read all orders (see rules section above) |
| `Shared module is not available for eager consumption` | Ensure `index.js` only does `import("./bootstrap")` — not a direct import |
| `fn is not a function` loading a remote | The MFE container name conflicts with a browser global (e.g., `window.navigation`). Rename the container. |
| Remote chunks loading from wrong origin | Set an absolute `publicPath` (e.g., `http://localhost:3001/`) in the remote's webpack config |
| Page reloads on sub-routes return 404 | Add `historyApiFallback: { index: "/" }` to `devServer` in webpack config |
| Module not found at startup | Start remotes **before** the host. Wait for `compiled successfully` in each terminal. |
| MUI styles not applying / theme mismatch | Ensure `@mui/material`, `@emotion/react`, and `@emotion/styled` are all `singleton: true` in **every** `webpack.config.js` shared block |
| MUI icons missing | Run `npm install @mui/icons-material` inside the affected MFE directory |

---

## 📄 Licence

MIT
