FROM node:22-bookworm-slim

# Chrome Headless Shell dependencies (required by Remotion)
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
  && rm -rf /var/lib/apt/lists/*

# Pre-install the renderer shell (Remotion project)
WORKDIR /app
COPY demo-renderer/ .
RUN npm install

# Download Chrome Headless Shell used by Remotion (cached in the image layer)
RUN ./node_modules/.bin/remotion browser ensure

EXPOSE 3100
