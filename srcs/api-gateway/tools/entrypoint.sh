#!/bin/sh

set -e

 # Validate the Nginx configuration
echo "🔍 Validating Nginx configuration..."
nginx -t

# Start Nginx
echo "🚀 Starting Nginx..."

# Start nginx
exec nginx -g "daemon off;"
