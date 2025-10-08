COMPOSE_FILE := srcs/docker-compose.yml

.PHONY: all up stop down del-vol clean fclean status help secrets

# Default target
all: up

# Generate secrets (JWT keys and client credentials)
secrets:
	@echo "Generating secrets..."
	@sh tools/generate-secrets.sh

# Start all services
up: secrets
	docker compose -f $(COMPOSE_FILE) up ${OPTS} --build $(ARGS)

# Clean only Docker volumes
del-vol:
	@echo "Removing project volumes..."
	@echo "Stopping containers first..."
	@docker compose -f $(COMPOSE_FILE) down 2>/dev/null || true
	@echo "Removing specific project volumes..."
	@docker volume rm $$(docker volume ls -q | grep -E "(ssl|game_sessions|auth_data|users|ft_transcendence)" 2>/dev/null) 2>/dev/null || true
	@echo "Removing any dangling volumes..."
	@docker volume prune -f
	@echo "Volume cleanup completed!"

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

clean-srcs-volumes:
	@docker volume ls -q | grep '^srcs_' | xargs -r docker volume rm

re: down up


# Show help
help:
	@echo "Available targets:"
	@echo "  all       - Default target, same as 'up'"
	@echo "  up        - Start all services with build"
	@echo "  stop      - Stop all containers"
	@echo "  down      - Stop and remove containers"
	@echo "  re        - Stop and start containers"
	@echo "  del-vol   - Remove only project volumes (preserves containers/images)"
	@echo "  clean     - Remove project containers, images, and volumes"
	@echo "  fclean    - ⚠️  Complete system-wide Docker cleanup (use with caution)"
	@echo "  help      - Show this help message"
