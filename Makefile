DOCKER_IMAGE=pong
TS_FILE=main.ts
JS_FILE=main.js

all: $(JS_FILE) build run

$(JS_FILE):
	docker build --target builder -t pong-ts-builder .
	docker run --rm -v $(PWD):/app pong-ts-builder

build:
	docker build -t $(DOCKER_IMAGE) .

run:
	docker run --rm -p 8080:80 $(DOCKER_IMAGE)

clean:
	@echo "Cleaning Docker images..."
	@docker rmi -f pong-ts-builder

re: clean all

.PHONY: all build run clean re