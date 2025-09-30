#!/bin/bash
set -euo pipefail

SECRETS_DIR="./docker/secrets"
mkdir -p "$SECRETS_DIR"

echo "🔑 Generating secrets in $SECRETS_DIR..."

# ===== JWT Keypairs =====
generate_jwt_keys() {
  local name="$1"
  if [[ ! -f "$SECRETS_DIR/$name-private.pem" ]]; then
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
  local service="$1"
  local client_id="$service"
  local client_secret
  
  if [[ ! -f "$SECRETS_DIR/$service-client.env" ]]; then
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
generate_client_credentials "matchmaking-service"
generate_client_credentials "chat-service"

echo "✅ Secrets generated successfully."