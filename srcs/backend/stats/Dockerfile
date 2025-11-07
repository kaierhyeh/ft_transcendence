FROM node:20-alpine3.21

# Install sqlite3 for debugging
RUN apk add --no-cache python3 make g++ sqlite curl

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD [ "npm", "start" ]