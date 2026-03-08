# 🛍️ ShopZone — Microfrontend E-Commerce App

A production-style e-commerce application built with **React + Webpack Module Federation**.  
Every UI section is an independent, deployable microfrontend that composes seamlessly into a single app.

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (User)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  HOST  (port 3000)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Navigation MFE  (port 3004)               │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │         Search MFE  (port 3005)              │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Route /            → Home page (in Host)                   │
│  Route /product/:id → ProductDetails MFE  (port 3001)       │
│  Route /cart        → Cart MFE  (port 3002)                 │
└──────────────────────────────┬──────────────────────────────┘
                               │  REST API
┌──────────────────────────────▼──────────────────────────────┐
│                  Backend  (port 3003)                       │
│            Express.js  ·  In-memory data store              │
└─────────────────────────────────────────────────────────────┘
```

### Module Federation wiring

| Consumer | Loads remotes |
|---|---|
| **Host** | `navRemote`, `productDetails`, `cart`, `searchRemote` |
| **Navigation** | `searchRemote` ← nested remote |

---

## 📦 Modules at a Glance

| Module | Port | Container name | Exposes | Standalone URL |
|---|---|---|---|---|
| **Host** | 3000 | `host` | *(shell)* | http://localhost:3000 |
| **ProductDetails** | 3001 | `productDetails` | `./ProductDetails` | http://localhost:3001 |
| **Cart** | 3002 | `cart` | `./Cart` | http://localhost:3002 |
| **Backend API** | 3003 | *(Node)* | REST endpoints | http://localhost:3003/api |
| **Navigation** | 3004 | `navRemote` | `./Navigation` | http://localhost:3004 |
| **Search** | 3005 | `searchRemote` | `./Search` | http://localhost:3005 |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 |
| Module Federation | Webpack 5 |
| Routing | React Router DOM v6 |
| Styling | Plain CSS with CSS custom properties |
| Backend | Node.js + Express |
| Data store | In-memory (easily swappable for a DB) |
| Build tool | Webpack 5 + Babel |

---

## ✅ Prerequisites

Make sure you have the following installed:

| Tool | Version |
|---|---|
| **Node.js** | 18+ (LTS recommended) |
| **npm** | 9+ |

Check your versions:
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

Installs dependencies for every module in one command:

```bash
npm run install:all
```

<details>
<summary>Or install each module individually</summary>

```bash
cd host           && npm install && cd ..
cd product-details && npm install && cd ..
cd cart           && npm install && cd ..
cd navigation     && npm install && cd ..
cd search         && npm install && cd ..
cd backend        && npm install && cd ..
```
</details>

---

## ▶️ Running the App

You need **6 terminals** (or run them in the background). Start them in this order so remotes are available before the host tries to load them.

### Recommended start order

```bash
# Terminal 1 — Backend API
npm run start:backend

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
| `npm run start:backend` | Start Express API (port 3003) |
| `npm run start:host` | Start host shell (port 3000) |
| `npm run start:product` | Start ProductDetails MFE (port 3001) |
| `npm run start:cart` | Start Cart MFE (port 3002) |
| `npm run start:navigation` | Start Navigation MFE (port 3004) |
| `npm run start:search` | Start Search MFE (port 3005) |
| `npm run build:all` | Production build for all MFEs |

---

## 🔬 Running Modules in Standalone Mode

Every MFE is independently runnable — no host required.

| URL | What you'll see |
|---|---|
| http://localhost:3001 | Product detail page for product #1 |
| http://localhost:3002 | Cart page |
| http://localhost:3004 | Navigation bar |
| http://localhost:3005 | Search with full product lookup |

> The standalone pages show a "Standalone Mode" banner so you know they're running independently.

---

## 🌐 Backend API Reference

Base URL: `http://localhost:3003`

### Products

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products` | All products |
| `GET` | `/api/products?category=Audio` | Filter by category |
| `GET` | `/api/products/:id` | Single product |
| `GET` | `/api/categories` | All category names |

### Cart

Session is tracked via the `X-Session-ID` request header (auto-generated and stored in `localStorage`).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/cart` | Get cart items |
| `POST` | `/api/cart/add` | Add item `{ productId, quantity }` |
| `PUT` | `/api/cart/update` | Update quantity `{ productId, quantity }` |
| `DELETE` | `/api/cart/remove/:productId` | Remove item |
| `DELETE` | `/api/cart/clear` | Clear entire cart |
| `GET` | `/api/cart/summary` | Subtotal, tax, total |

---

## 🗂️ Project Structure

```
mfe/
├── host/                  # Shell app — home page + routing
│   ├── src/
│   │   ├── App.js         # Routes + Home component
│   │   ├── App.css
│   │   ├── api.js         # HTTP client for backend
│   │   └── index.js       # React entry (eager shared modules)
│   └── webpack.config.js  # Declares all remotes
│
├── navigation/            # Top nav bar MFE
│   ├── src/
│   │   ├── Navigation.js  # Navbar + lazy-loads Search
│   │   └── api.js         # Cart count helper
│   └── webpack.config.js  # Exposes ./Navigation, declares searchRemote
│
├── search/                # Myntra-style search MFE
│   ├── src/
│   │   ├── Search.js      # Search bar + dropdown results
│   │   └── api.js         # Products fetch
│   └── webpack.config.js  # Exposes ./Search
│
├── product-details/       # Product detail page MFE
│   ├── src/
│   │   ├── ProductDetails.js
│   │   └── api.js
│   └── webpack.config.js  # Exposes ./ProductDetails
│
├── cart/                  # Shopping cart MFE
│   ├── src/
│   │   ├── Cart.js
│   │   └── api.js
│   └── webpack.config.js  # Exposes ./Cart
│
├── backend/               # Express REST API
│   └── server.js          # Products + cart endpoints
│
└── package.json           # Root scripts
```

---

## 🔑 Key Concepts

### Bootstrap pattern
Each MFE's `src/index.js` contains only:
```js
import("./bootstrap");
```
The async `import()` creates a chunk boundary that lets Webpack initialise the **shared module scope** (React, React Router) before any components run. Without this, you get the `Shared module is not available for eager consumption` error.

### Shared modules
React, ReactDOM, and React Router are declared `singleton: true` so all MFEs share **one instance** — avoiding the "multiple React" problem. The Host marks them `eager: true`; remotes use `eager: false`.

### Nested remotes
Navigation (a remote itself) loads Search as its own nested remote — demonstrating that Module Federation remotes can consume other remotes.

### Category-aware routing
Clicking a category breadcrumb in ProductDetails navigates to `/?category=Audio`. The Home component reads `useSearchParams()` and pre-selects the right tab.

---

## 🐛 Troubleshooting

| Problem | Fix |
|---|---|
| `Shared module is not available for eager consumption` | Ensure `index.js` only does `import("./bootstrap")` — not a direct import |
| `fn is not a function` loading a remote | The MFE container name conflicts with a browser global (e.g., `window.navigation`). Rename the container. |
| Remote chunks loading from wrong origin | Set an absolute `publicPath` (e.g., `http://localhost:3001/`) in the remote's webpack config |
| Page reloads on sub-routes return 404 | Add `historyApiFallback: { index: "/" }` to `devServer` in webpack config |
| Cart badge not updating | The remote dispatches a `cartUpdated` custom event — make sure the listener is registered in the same window |
| Module not found at startup | Start remotes **before** the host. Wait for `compiled successfully` in each terminal. |

---

## 📄 Licence

MIT
