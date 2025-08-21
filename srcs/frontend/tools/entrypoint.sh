#!/bin/sh
set -e  # Exit on error

# Function to generate one SSL certificate
generate_ssl_cert() {
    subject="/C=FR/ST=IDF/L=Paris/O=42/OU=42ft_transcendence/CN=localhost"

    if [ -f "$KEYS_DIR/ssl.key" ] && [ -f "$CERTS_DIR/ssl.crt" ]; then
        echo "ℹ️ SSL cert already exists, skipping generation."
        return 0
    fi

    mkdir -p "$KEYS_DIR" "$CERTS_DIR"

    echo "📃 Generating SSL certificate..."
    
    openssl req -newkey rsa:2048 \
        -keyout "${KEYS_DIR}/ssl.key" \
        -x509 -days 90 \
        -out "${CERTS_DIR}/ssl.crt" \
        -nodes \
        -subj "$subject"

    chmod 600 "${KEYS_DIR}/ssl.key"
    chmod 644 "${CERTS_DIR}/ssl.crt"

    echo "✅ SSL certificate generated successfully."
}

# Main function
main() {
    generate_ssl_cert

    # Validate the Nginx configuration
    echo "🔍 Validating Nginx configuration..."
    nginx -t

    # Start Nginx
    echo "🚀 Starting Nginx..."
    exec nginx -g 'daemon off;'
}

main  # Run the script
