#!/bin/bash

# Start Cloudflare Workers backend
cd cloudflare-unit-access
npm run start &
WORKER_PID=$!

# Start SvelteKit frontend
cd ..
npm run dev &
FRONTEND_PID=$!

# Kill both on exit
trap "kill $WORKER_PID $FRONTEND_PID" EXIT

wait
