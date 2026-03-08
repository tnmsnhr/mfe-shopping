#!/bin/bash

# Script to start all microfrontend services
# Usage: ./start-all.sh

echo "Starting Microfrontend Services..."
echo ""

# Start host application in background
echo "Starting Host Application (port 3000)..."
cd host && npm start &
HOST_PID=$!

# Wait a bit for host to start
sleep 3

# Start product-details module in background
echo "Starting Product Details Module (port 3001)..."
cd ../product-details && npm start &
PRODUCT_PID=$!

# Wait a bit for product-details to start
sleep 3

# Start cart module in background
echo "Starting Cart Module (port 3002)..."
cd ../cart && npm start &
CART_PID=$!

echo ""
echo "All services are starting..."
echo "Host: http://localhost:3000"
echo "Product Details: http://localhost:3001"
echo "Cart: http://localhost:3002"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user interrupt
trap "kill $HOST_PID $PRODUCT_PID $CART_PID; exit" INT TERM

wait
