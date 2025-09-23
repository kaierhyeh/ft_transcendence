#!/bin/sh

# Cleanup function
cleanup() {
	echo "Stopping services..."
	kill $(jobs -p)
	wait
	exit 0
}

# Signal capture
trap cleanup SIGTERM SIGINT

# Start Redis in background
redis-server --daemonize yes

# Start Node application
node src/index.js &

# Wait for background processes
wait