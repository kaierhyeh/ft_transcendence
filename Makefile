COMPOSE_FILE := srcs/docker-compose.yml
PROJECT_NAME := ft_transcendence

.PHONY: all up up-d stop down del-vol clean fclean re help secrets

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

# Project cleanup (containers, images, volumes)
clean:
	@echo "Performing project cleanup..."
	@docker compose -f $(COMPOSE_FILE) down -v --rmi all --remove-orphans

# Complete system cleanup (use with caution - removes ALL Docker data)
fclean:
	@docker stop $$(docker ps -aq) 2>/dev/null || true
	@docker rm $$(docker ps -aq) 2>/dev/null || true
	@docker rmi $$(docker images -aq) 2>/dev/null || true
	@docker volume prune -af
	@docker system prune --all --force --volumes

# Restart services
re: down up

# Show help
help:
	@echo "Available targets:"
	@echo "  all       - Default target, same as 'up'"
	@echo "  up        - Start all services with build"
	@echo "  up-d      - Start all services in detached mode"
	@echo "  stop      - Stop all containers"
	@echo "  down      - Stop and remove containers (keeps volumes)"
	@echo "  re        - Restart services (down + up)"
	@echo "  del-vol   - Remove containers and volumes"
	@echo "  clean     - Remove containers, images, and volumes"
	@echo "  fclean    - Complete Docker cleanup (USE WITH CAUTION)"
	@echo "  help      - Show this help message"
