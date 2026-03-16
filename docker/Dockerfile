FROM node:22-slim

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace root package file (no lockfile — platform deps need fresh resolution for Linux)
COPY package.json ./

# Copy all workspace package.json files for dependency resolution
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/app/package.json apps/app/
COPY apps/site/package.json apps/site/

# Install all workspace dependencies (resolves Linux-native workerd binary)
RUN npm install

# Copy everything else (.dockerignore excludes node_modules)
COPY . .
