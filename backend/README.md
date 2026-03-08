# Backend API Service

RESTful API service for the microfrontend e-commerce application.

## Features

- Product management endpoints
- Cart management endpoints
- CORS enabled for cross-origin requests
- Session-based cart storage (in-memory)

## API Endpoints

### Products

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID

### Cart

- `GET /api/cart` - Get cart items
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update` - Update cart item quantity
- `DELETE /api/cart/remove/:productId` - Remove item from cart
- `DELETE /api/cart/clear` - Clear cart
- `GET /api/cart/summary` - Get cart summary (totals)

### Health

- `GET /health` - Health check endpoint

## Usage

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

## Session Management

The API uses session IDs passed via the `X-Session-ID` header. If not provided, it defaults to "default".

In production, you should:
- Use proper session management (JWT, cookies, etc.)
- Store cart data in a database or Redis
- Implement user authentication

## Port

Default port: 3003

Change via environment variable: `PORT=3003`
