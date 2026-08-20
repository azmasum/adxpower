#!/bin/bash
set -e

echo "=== Installing dependencies ==="
npm install

echo "=== Generating Prisma Client ==="
cd server
npx prisma generate

echo "=== Building NestJS ==="
npx nest build

echo "=== Running migrations ==="
npx prisma migrate deploy

echo "=== Starting server ==="
node dist/main.js
