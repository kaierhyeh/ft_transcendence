COMPOSE_FILE := srcs/docker-compose.yml
SECRETS_DIR := ./secrets
JWT_PRIVATE_KEY := $(SECRETS_DIR)/jwt_private_key.pem
JWT_PUBLIC_KEY := $(SECRETS_DIR)/jwt_public_key.pem
GAME_PRIVATE_KEY := $(SECRETS_DIR)/game_private_key.pem
GAME_PUBLIC_KEY := $(SECRETS_DIR)/game_public_key.pem

.PHONY: all up prepare gen-keys stop down clean fclean status help

# Default target
all: up

# Start all services
up: prepare
	docker compose -f $(COMPOSE_FILE) up ${OPTS} --build $(ARGS)

# Prepare environment (create directories and keys)
prepare: $(SECRETS_DIR) $(JWT_PRIVATE_KEY) $(JWT_PUBLIC_KEY) $(GAME_PRIVATE_KEY) $(GAME_PUBLIC_KEY)

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

# Generate Game private key if it doesn't exist
$(GAME_PRIVATE_KEY): $(SECRETS_DIR)
	@echo "Generating Game private key..."
	@openssl genpkey -algorithm RSA -out $(GAME_PRIVATE_KEY) -pkeyopt rsa_keygen_bits:2048

# Generate Game public key if it doesn't exist
$(GAME_PUBLIC_KEY): $(GAME_PRIVATE_KEY)
	@echo "Generating Game public key..."
	@openssl rsa -pubout -in $(GAME_PRIVATE_KEY) -out $(GAME_PUBLIC_KEY)

# Manually regenerate keys (force)
gen-keys:
	@echo "Regenerating all keys..."
	@mkdir -p $(SECRETS_DIR)
	@echo "Generating JWT keys..."
	@openssl genpkey -algorithm RSA -out $(JWT_PRIVATE_KEY) -pkeyopt rsa_keygen_bits:2048
	@openssl rsa -pubout -in $(JWT_PRIVATE_KEY) -out $(JWT_PUBLIC_KEY)
	@echo "Generating Game session keys..."
	@openssl genpkey -algorithm RSA -out $(GAME_PRIVATE_KEY) -pkeyopt rsa_keygen_bits:2048
	@openssl rsa -pubout -in $(GAME_PRIVATE_KEY) -out $(GAME_PUBLIC_KEY)
	@echo "All keys generated successfully!"
	@echo "  - JWT keys: $(JWT_PRIVATE_KEY), $(JWT_PUBLIC_KEY)"
	@echo "  - Game keys: $(GAME_PRIVATE_KEY), $(GAME_PUBLIC_KEY)"

# Generate only game keys (force)
gen-game-keys:
	@echo "Regenerating Game session keys..."
	@mkdir -p $(SECRETS_DIR)
	@openssl genpkey -algorithm RSA -out $(GAME_PRIVATE_KEY) -pkeyopt rsa_keygen_bits:2048
	@openssl rsa -pubout -in $(GAME_PRIVATE_KEY) -out $(GAME_PUBLIC_KEY)
	@echo "Game keys generated successfully!"
	@echo "  - Game keys: $(GAME_PRIVATE_KEY), $(GAME_PUBLIC_KEY)"

# Stop all running containers
stop:
	@echo "Stopping all containers..."
	@docker compose -f $(COMPOSE_FILE) stop

# Stop and remove containers/networks
down:
	@echo "Stopping and removing containers..."
	@docker compose -f $(COMPOSE_FILE) down

# Project cleanup (containers, images, volumes)
clean:
	@echo "Performing Docker cleanup for ft_transcendence project..."
	@echo "Stopping and removing project containers..."
	@docker compose -f $(COMPOSE_FILE) down --volumes --remove-orphans 2>/dev/null || true
	@echo "Removing project images..."
	@docker compose -f $(COMPOSE_FILE) down --rmi all 2>/dev/null || true
	@echo "Removing specific project volumes..."
	@docker volume rm $$(docker volume ls -q | grep -E "(ssl|game_sessions|auth_data|users|ft_transcendence)" 2>/dev/null) 2>/dev/null || true
	@echo "Removing any dangling volumes..."
	@docker volume prune -f
	@echo "Removing unused images and containers..."
	@docker system prune -f
	@echo "Project cleanup completed!"

# Complete system cleanup (use with caution)
fclean:
	@echo "⚠️  WARNING: This will remove ALL Docker data system-wide!"
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
	@echo "Full system cleanup completed!"

# # Development helpers
# dev: prepare
# 	docker compose -f $(COMPOSE_FILE) up --build

# logs:
# 	docker compose -f $(COMPOSE_FILE) logs -f

re: down up

# Show Docker status and volumes
status:
	@echo "=== Project Containers ==="
	@docker compose -f $(COMPOSE_FILE) ps
	@echo ""
	@echo "=== Project Volumes ==="
	@docker volume ls | grep -E "(ssl|game_sessions|auth_data|users|ft_transcendence)" || echo "No project volumes found"
	@echo ""
	@echo "=== Project Images ==="
	@docker images | grep -E "(frontend|backend-|api-gateway)" || echo "No project images found"

# Show help
help:
	@echo "Available targets:"
	@echo "  all       - Default target, same as 'up'"
	@echo "  up        - Start all services with build"
# 	@echo "  dev       - Start in development mode"
	@echo "  prepare   - Create directories and generate all keys"
	@echo "  gen-keys  - Force regenerate all keys (JWT + Game)"
	@echo "  gen-game-keys - Force regenerate only game session keys"
	@echo "  stop      - Stop all containers"
	@echo "  down      - Stop and remove containers"
	@echo "  re        - Stop and start containers"
	@echo "  status    - Show containers, volumes, and images status"
# 	@echo "  logs      - Show and follow logs"
	@echo "  clean     - Remove project containers, images, and volumes"
	@echo "  fclean    - ⚠️  Complete system-wide Docker cleanup (use with caution)"
	@echo "  help      - Show this help message"
