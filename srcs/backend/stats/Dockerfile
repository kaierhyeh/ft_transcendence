FROM node:20-alpine

RUN apk add --no-cache sqlite curl

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD [ "npm", "start" ]