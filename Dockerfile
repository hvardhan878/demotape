FROM node:20-slim

# Python, Chromium, and required system dependencies
RUN apt-get update && apt-get install -y \
  python3 \
  python3-pip \
  chromium \
  ffmpeg \
  xvfb \
  x11-utils \
  fonts-liberation \
  libgbm1 \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libasound2 \
  libpangocairo-1.0-0 \
  libpango-1.0-0 \
  libcairo2 \
  && rm -rf /var/lib/apt/lists/*

# Install Playwright Python (sync API) and install Chromium browser binary
RUN pip3 install playwright --break-system-packages
RUN playwright install chromium --with-deps

# Pre-install the renderer shell Next.js app
WORKDIR /app
COPY demo-renderer/ .
RUN npm install

EXPOSE 3100
