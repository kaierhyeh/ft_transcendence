COMPOSE_FILE := srcs/docker-compose.yml
PROJECT_NAME := ft_transcendence

.PHONY: help up up-d up_separately stop down del-vol re clean fclean secrets

# Default target
all: up

# Generate secrets (JWT keys and client credentials)
secrets:
	@echo "Generating secrets..."
	@sh tools/generate-secrets.sh

# Start all services
up: secrets
	docker compose -f $(COMPOSE_FILE) up ${OPTS} --build $(ARGS)

up-d: secrets
	docker compose -f $(COMPOSE_FILE) up -d ${OPTS} --build $(ARGS)

# Build and start services one by one (avoids memory issues)
up_separately: secrets
	@echo "🔨 Building services separately to avoid memory issues..."
	@echo "📦 1/6 Building backend-users..."
	@docker compose -f $(COMPOSE_FILE) build backend-users
	@echo "📦 2/6 Building backend-game..."
	@docker compose -f $(COMPOSE_FILE) build backend-game
	@echo "📦 3/6 Building backend-chat..."
	@docker compose -f $(COMPOSE_FILE) build backend-chat
	@echo "📦 4/6 Building backend-auth..."
	@docker compose -f $(COMPOSE_FILE) build backend-auth
	@echo "📦 5/6 Building api-gateway..."
	@docker compose -f $(COMPOSE_FILE) build api-gateway
	@echo "📦 6/6 Building frontend..."
	@docker compose -f $(COMPOSE_FILE) build frontend
	@echo "✅ All services built successfully!"
	@echo "🚀 Starting all services..."
	@docker compose -f $(COMPOSE_FILE) up -d

# Stop all running containers
stop:
	@echo "Stopping all containers..."
	@docker compose -f $(COMPOSE_FILE) stop

# Stop and remove containers/networks (keeps volumes)
down:
	@echo "Stopping and removing containers..."
	@docker compose -f $(COMPOSE_FILE) down

# Clean only project volumes
del-vol:
	@echo "Removing project volumes..."
	@docker compose -f $(COMPOSE_FILE) down -v

# Soft cleanup (generated secrets, project volumes)
sclean: del-vol clear-generated-secrets

# Project cleanup (containers, images, volumes, orphans, secrets)
clean: clear-generated-secrets
	@echo "Performing project cleanup..."
	@docker compose -f $(COMPOSE_FILE) down -v --rmi all --remove-orphans
	

# Complete system cleanup (use with caution - removes ALL Docker data)
fclean: clear-generated-secrets
	@docker stop $$(docker ps -aq) 2>/dev/null || true
	@docker rm $$(docker ps -aq) 2>/dev/null || true
	@docker rmi $$(docker images -aq) 2>/dev/null || true
	@docker volume prune -af
	@docker system prune --all --force --volumes
	

clear-generated-secrets:
	@echo "Removing generated secrets..."
	@rm -f ./secrets/*.pem
	@rm -f ./secrets/*service-client.env

# Restart services
re: down up

# Store all build output
build-log:
	docker compose -f $(COMPOSE_FILE) build | tee build.log

# Store only warnings
build-warnings:
	docker compose -f $(COMPOSE_FILE) build | grep -i warning | tee warnings.log

# Show help
help:
	@echo "Usage: make [target] [OPTS=\"...\"] [ARGS=\"...\"]"
	@echo ""
	@echo "Available targets:"
	@echo "  all                        - Default target, same as 'up'"
	@echo "  secrets                    - Generate JWT keys and client credentials"
	@echo "  up                         - Start all services with build (foreground). Supports OPTS/ARGS"
	@echo "  up-d                       - Start all services in detached mode (background)"
	@echo "  up_separately              - Build services one-by-one, start in detached mode (avoids memory issues)"
	@echo "  stop                       - Stop all containers"
	@echo "  down                       - Stop and remove containers (keeps volumes)"
	@echo "  del-vol                    - Remove containers and project volumes"
	@echo "  sclean                     - Soft cleanup (del-vol + clear-generated-secrets)"
	@echo "  clean                      - Project cleanup (containers, images, volumes, secrets)"
	@echo "  fclean                     - Complete Docker cleanup (USE WITH CAUTION)"
	@echo "  clear-generated-secrets    - Remove generated secrets files"
	@echo "  re                         - Restart services (down + up)"
	@echo "  help                       - Show this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make up-d                  # build and run in background"
	@echo "  make up ARGS=\"service1\"    # pass args to compose"
