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
│   /users/{uid}                 ← user profiles                 │
│   /carts/{uid}/items/{pid}     ← per-user cart (real-time)     │
│   /wishlists/{uid}/items/{pid} ← per-user wishlist             │
│   /orders/{orderId}            ← order history                 │
└─────────────────────────────────────────────────────────────────┘
```

### Module Federation wiring

| Consumer | Loads remotes |
|---|---|
| **Host** | `navRemote`, `productDetails`, `cart`, `searchRemote`, `authRemote` |
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

> ℹ️ There is **no local backend server**. All data is served directly from Firebase/Firestore.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 |
| Module Federation | Webpack 5 |
| Routing | React Router DOM v6 |
| Styling | Plain CSS with CSS custom properties |
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

    // Orders — owner read, any authenticated write (checkout)
    match /orders/{orderId} {
      allow read:  if request.auth != null && resource.data.userId == request.auth.uid;
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

<details>
<summary>Or install each module individually</summary>

```bash
cd host            && npm install && cd ..
cd product-details && npm install && cd ..
cd cart            && npm install && cd ..
cd navigation      && npm install && cd ..
cd search          && npm install && cd ..
cd auth            && npm install && cd ..
```
</details>

---

## ▶️ Running the App

### Option A — One command (recommended)

```bash
bash start-all.sh
```

Starts all 6 MFEs in the background and prints a status summary. Then open **http://localhost:3000** 🎉

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

# Terminal 6 — Host (loads everything)
npm run start:host
```

Then open **http://localhost:3000** 🎉

### All available npm scripts (root `package.json`)

| Script | Description |
|---|---|
| `npm run install:all` | Install deps for all modules |
| `npm run start:host` | Start host shell (port 3000) |
| `npm run start:product` | Start ProductDetails MFE (port 3001) |
| `npm run start:cart` | Start Cart MFE (port 3002) |
| `npm run start:navigation` | Start Navigation MFE (port 3004) |
| `npm run start:search` | Start Search MFE (port 3005) |
| `npm run start:auth` | Start Auth MFE (port 3006) |
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

> The standalone pages show a "Standalone Mode" banner so you know they're running independently.

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
  photoURL, avatar, role,
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
  tax, total, status, createdAt
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

> You can also **Sign in with Google** — a Firestore profile is created automatically.

---

## 🗂️ Project Structure

```
mfe/
├── host/                    # Shell app — home page + routing
│   └── src/
│       ├── App.js           # Routes + Home + Wishlist
│       ├── api.js           # Firestore product/category reads
│       ├── firebase.js      # Firebase initialisation
│       ├── seedData.js      # 32 products + 6 categories (seed data)
│       └── seedFirestore.js # Auto-seeds Firestore on first load
│
├── navigation/              # Top nav bar MFE
│   └── src/
│       ├── Navigation.js    # Navbar + cart badge (Firestore) + lazy Search
│       └── firebase.js
│
├── search/                  # Myntra-style search MFE
│   └── src/
│       ├── Search.js        # Live search with keyboard navigation
│       ├── api.js           # Firestore products read
│       └── firebase.js
│
├── product-details/         # Product detail page MFE
│   └── src/
│       ├── ProductDetails.js # Add to cart + wishlist (Firestore)
│       ├── api.js            # Firestore product read
│       └── firebase.js
│
├── cart/                    # Shopping cart MFE
│   └── src/
│       ├── Cart.js          # Real-time cart + checkout → /orders
│       └── firebase.js
│
├── auth/                    # Authentication MFE
│   └── src/
│       ├── Login.js         # Email/Password + Google Sign-In
│       ├── UserMenu.js      # Avatar dropdown + logout
│       ├── api.js           # Firebase Auth wrapper + demo user provisioning
│       └── firebase.js
│
├── start-all.sh             # One-command launcher
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
React, ReactDOM, React Router, and Firebase are declared `singleton: true` so all MFEs share **one instance** — avoiding duplicate initialisation and the "multiple React" problem.

### Nested remotes
Navigation (a remote itself) loads Search as its own nested remote — demonstrating that Module Federation remotes can consume other remotes.

### Auto-seed
On the very first app load, `seedFirestore.js` checks if `/products` is empty and batch-writes all 32 products + 6 categories. Subsequent loads skip the seed (checked with a single `limit(1)` query).

### Category-aware routing
Clicking a category breadcrumb in ProductDetails navigates to `/?category=Audio`. The Home component reads `useSearchParams()` and pre-selects the right tab.

---

## 🐛 Troubleshooting

| Problem | Fix |
|---|---|
| Products not loading / blank home page | Check browser console for Firestore errors. Verify Firestore is created and rules allow reads. |
| Login fails with `auth/operation-not-allowed` | Enable **Email/Password** sign-in in Firebase Console → Authentication → Sign-in method |
| Google sign-in popup blocked | Allow popups for `localhost` in your browser settings |
| Cart/wishlist not saving | Ensure the user is **signed in** — cart is tied to Firebase UID |
| `Shared module is not available for eager consumption` | Ensure `index.js` only does `import("./bootstrap")` — not a direct import |
| `fn is not a function` loading a remote | The MFE container name conflicts with a browser global (e.g., `window.navigation`). Rename the container. |
| Remote chunks loading from wrong origin | Set an absolute `publicPath` (e.g., `http://localhost:3001/`) in the remote's webpack config |
| Page reloads on sub-routes return 404 | Add `historyApiFallback: { index: "/" }` to `devServer` in webpack config |
| Module not found at startup | Start remotes **before** the host. Wait for `compiled successfully` in each terminal. |

---

## 📄 Licence

MIT
