#!/bin/bash
# Test script to run dev server and check deployment

echo "🔍 Checking local changes..."
git status

echo ""
echo "📝 Recent commits:"
git log --oneline -3

echo ""
echo "🚀 Starting dev server on port 5173..."
echo "Visit: http://localhost:5173"
npm run dev
