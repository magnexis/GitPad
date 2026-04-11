# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV CI=true
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .

FROM base AS ci
RUN npm test
RUN npm run build

FROM node:22-bookworm-slim AS dev
WORKDIR /app
ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev:renderer", "--", "--host", "0.0.0.0", "--port", "5173"]

FROM node:22-bookworm-slim AS desktop
WORKDIR /app
ENV NODE_ENV=production
ENV ELECTRON_DISABLE_SANDBOX=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    ca-certificates \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxrender1 \
    libxshmfence1 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=base /app /app
CMD ["xvfb-run", "-a", "npm", "run", "start"]
