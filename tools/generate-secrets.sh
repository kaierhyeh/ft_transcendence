#!/bin/sh
set -eu

SECRETS_DIR="./secrets"
mkdir -p "$SECRETS_DIR"

echo "🔑 Generating secrets in $SECRETS_DIR..."

# ===== JWT Keypairs =====
generate_jwt_keys() {
  name="$1"
  if [ ! -f "$SECRETS_DIR/$name-private.pem" ]; then
    echo "Generating RSA keypair for $name..."
    openssl genrsa -out "$SECRETS_DIR/$name-private.pem" 2048
    openssl rsa -in "$SECRETS_DIR/$name-private.pem" -pubout -out "$SECRETS_DIR/$name-public.pem"
  fi
}

generate_jwt_keys "user-session"
generate_jwt_keys "game-session"
generate_jwt_keys "internal-access"

# ===== Internal Client Credentials =====
generate_client_credentials() {
  service="$1"
  client_id="$service"
  
  if [ ! -f "$SECRETS_DIR/$service-client.env" ]; then
    client_secret=$(openssl rand -base64 32)
    echo "Generating client credentials for $service..."
    cat > "$SECRETS_DIR/$service-client.env" <<EOF
CLIENT_ID=$client_id
CLIENT_SECRET=$client_secret
EOF
  fi
}

generate_client_credentials "users-service"
generate_client_credentials "game-service"
generate_client_credentials "chat-service"
generate_client_credentials "stats-service"
generate_client_credentials "presence-service"

echo "✅ Secrets generated successfully."