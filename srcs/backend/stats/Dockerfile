FROM node:20-alpine3.21

RUN apk add --no-cache sqlite curl

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD [ "npm", "start" ]