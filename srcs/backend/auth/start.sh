#!/bin/sh

# Check if npm is available
if ! command -v npm >/dev/null 2>&1; then
    echo "Error: npm is not installed"
    exit 1
fi

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check if ts-node is available
if ! npx ts-node --version >/dev/null 2>&1; then
    echo "Error: ts-node is not available"
    exit 1
fi

# Clean-up function
cleanup() {
	echo "Stopping services..."
	kill $(jobs -p) 2>/dev/null
	wait
	exit 0
}

# Signal capture
trap cleanup SIGTERM SIGINT

# Start Redis in background
redis-server --daemonize yes

# Start Node application with ts-node
npx ts-node --esm src/index.ts &

# Wait for background processes
wait