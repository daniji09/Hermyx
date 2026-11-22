# Uses Node image that uses Linux Alpine image, very efficient
FROM node:24-slim

# Establishes /app as root work directory
WORKDIR /app

# Copies manifests firstly, so the are always cached and code changes don't trigger them
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY shared/package.json ./shared/

# Dependencies are installed
RUN npm install

# Code of every workspace is copied
COPY shared ./shared
COPY server ./server
COPY client ./client