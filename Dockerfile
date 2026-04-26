FROM node:20-alpine

# Install FFmpeg and ZMQ dependencies
RUN apk add --no-cache ffmpeg libzmq zeromq-dev make g++ python3

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npm run build

CMD ["npm", "start"]
