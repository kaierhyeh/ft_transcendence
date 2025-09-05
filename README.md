# ft_transcendence

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
   make del
   ```

## Access

- **Frontend:** [https://localhost:4443](https://localhost:4443)
- **API Gateway and backend services** are started automatically.

---

**Note:**  
- Make sure Docker and Docker Compose are installed.
- The first build may take a while as it downloads the necessary images. Subsequent builds will be faster.