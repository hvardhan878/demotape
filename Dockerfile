FROM node:22-bookworm-slim

# Chrome Headless Shell system deps + ffmpeg
RUN apt-get update && apt-get install -y \
  libnss3 \
  libdbus-1-3 \
  libatk1.0-0 \
  libgbm-dev \
  libasound2 \
  libxrandr2 \
  libxkbcommon-dev \
  libxfixes3 \
  libxcomposite1 \
  libxdamage1 \
  libatk-bridge2.0-0 \
  libpango-1.0-0 \
  libcairo2 \
  libcups2 \
  fonts-liberation \
  fonts-noto-color-emoji \
  ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY demo-renderer/ .
RUN npm install

# Download Chrome Headless Shell into the image layer so it is cached
RUN npx puppeteer browsers install chrome-headless-shell

EXPOSE 3100
