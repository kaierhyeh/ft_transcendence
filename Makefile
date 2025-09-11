COMPOSE_FILE := srcs/docker-compose.yml
SECRETS_DIR := ./secrets
JWT_PRIVATE_KEY := $(SECRETS_DIR)/jwt_private_key.pem
JWT_PUBLIC_KEY := $(SECRETS_DIR)/jwt_public_key.pem

.PHONY: all up prepare gen-keys stop down fclean

# Default target
all: up

# Start all services
up: prepare
	docker compose -f $(COMPOSE_FILE) up ${OPTS} --build $(ARGS)

# Prepare environment (create directories and keys)
prepare: $(SECRETS_DIR) $(JWT_PRIVATE_KEY) $(JWT_PUBLIC_KEY)

# Create secrets directory if it doesn't exist
$(SECRETS_DIR):
	@echo "Creating secrets directory..."
	@mkdir -p $(SECRETS_DIR)

# Generate JWT private key if it doesn't exist
$(JWT_PRIVATE_KEY): $(SECRETS_DIR)
	@echo "Generating JWT private key..."
	@openssl genpkey -algorithm RSA -out $(JWT_PRIVATE_KEY) -pkeyopt rsa_keygen_bits:2048

# Generate JWT public key if it doesn't exist
$(JWT_PUBLIC_KEY): $(JWT_PRIVATE_KEY)
	@echo "Generating JWT public key..."
	@openssl rsa -pubout -in $(JWT_PRIVATE_KEY) -out $(JWT_PUBLIC_KEY)

# Manually regenerate keys (force)
gen-keys:
	@echo "Regenerating JWT keys..."
	@mkdir -p $(SECRETS_DIR)
	@openssl genpkey -algorithm RSA -out $(JWT_PRIVATE_KEY) -pkeyopt rsa_keygen_bits:2048
	@openssl rsa -pubout -in $(JWT_PRIVATE_KEY) -out $(JWT_PUBLIC_KEY)
	@echo "JWT keys generated successfully!"

# Stop all running containers
stop:
	@echo "Stopping all containers..."
	@docker compose -f $(COMPOSE_FILE) stop

# Stop and remove containers/networks
down:
	@echo "Stopping and removing containers..."
	@docker compose -f $(COMPOSE_FILE) down

# Complete cleanup (containers, images, volumes)
fclean:
	@echo "Performing complete Docker cleanup..."
	@echo "Stopping all containers..."
	@docker stop $$(docker ps -aq) 2>/dev/null || true
	@echo "Removing all containers..."
	@docker rm $$(docker ps -aq) 2>/dev/null || true
	@echo "Removing all images..."
	@docker rmi $$(docker images -aq) 2>/dev/null || true
	@echo "Removing all volumes..."
	@docker volume prune -f
	@echo "Removing all unused containers..."
	@docker container prune -f
	@echo "Performing system cleanup..."
	@docker system prune --all --force --volumes
	@echo "Cleanup completed!"

# # Development helpers
# dev: prepare
# 	docker compose -f $(COMPOSE_FILE) up --build

# logs:
# 	docker compose -f $(COMPOSE_FILE) logs -f

re: down up

# Show help
help:
	@echo "Available targets:"
	@echo "  all       - Default target, same as 'up'"
	@echo "  up        - Start all services with build"
# 	@echo "  dev       - Start in development mode"
	@echo "  prepare   - Create directories and generate JWT keys"
	@echo "  gen-keys  - Force regenerate JWT keys"
	@echo "  stop      - Stop all containers"
	@echo "  down      - Stop and remove containers"
	@echo "  re        - Stop and start containers"
# 	@echo "  logs      - Show and follow logs"
	@echo "  fclean    - Complete Docker cleanup"
	@echo "  help      - Show this help message"
