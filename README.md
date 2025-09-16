# ft_transcendence

## Before Launching

### JWT Configuration

1. Ensure that `openssl` is installed on your host machine. This is required for the Makefile to generate the public and private keys used for JWT authentication.
2. Verify that a `.env` file exists in the same directory as `docker-compose.yml`, and that it defines the following environment variables:
   - `JWT_ALGORITHM`
   - `JWT_ISSUER`
   - `JWT_AUDIENCE`

   **Example:**
   ```env
   JWT_ALGORITHM=RS256
   JWT_ISSUER=ft_transcendence
   JWT_AUDIENCE=ft_transcendence_users
   ```

## How to Launch

1. **Build and start all services:**

   ```sh
   make up
   ```

   Or simply:

   ```sh
   make
   ```

   This will build and start the frontend, API gateway, and backend game service using Docker Compose.

2. **Stop all running containers:**

   ```sh
   make stop
   ```

3. **Remove all containers and networks:**

   ```sh
   make down
   ```

4. **Clean up all Docker resources (containers, images, volumes):**

   ```sh
   make fclean
   ```

## Access

- **Frontend:** [https://localhost:4443](https://localhost:4443)
- **API Gateway and backend services** are started automatically.

---

**Note:**  
- Make sure Docker and Docker Compose are installed.
- The first build may take a while as it downloads the necessary images. Subsequent builds will be faster.
