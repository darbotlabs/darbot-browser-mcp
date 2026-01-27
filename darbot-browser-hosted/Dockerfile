# Darbot Browser MCP - On-Premises Hosted Edition
# Multi-stage Docker build with MSAL auth and dev tunnel support

# Build stage
FROM node:23-bookworm-slim AS builder

# Set working directory
WORKDIR /build

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev dependencies for build)
ENV NODE_ENV=development
RUN npm ci --include=dev

# Copy source code
COPY src/ ./src/
COPY cli.js ./
COPY index.js ./
COPY index.d.ts ./
COPY config.d.ts ./

# Build TypeScript
RUN npm run build

# Production stage
FROM node:23-bookworm-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    libu2f-udev \
    libvulkan1 \
    dumb-init \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install VS Code CLI for dev tunnel support
RUN curl -Lk 'https://code.visualstudio.com/sha/download?build=stable&os=cli-alpine-x64' --output /tmp/vscode_cli.tar.gz \
    && tar -xf /tmp/vscode_cli.tar.gz -C /usr/local/bin \
    && rm /tmp/vscode_cli.tar.gz \
    && chmod +x /usr/local/bin/code

# Create app user
RUN groupadd --gid 1001 app && \
    useradd --uid 1001 --gid app --shell /bin/bash --create-home app

# Set working directory
WORKDIR /app

# Copy root package files (has playwright dependency)
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies first (to get playwright)
ENV NODE_ENV=development
RUN npm ci

# Install Playwright browsers BEFORE pruning dev dependencies
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install chromium --with-deps

# Copy built files from builder
COPY --from=builder /build/lib ./lib
COPY --from=builder /build/cli.js ./
COPY --from=builder /build/index.js ./
COPY --from=builder /build/index.d.ts ./
COPY --from=builder /build/config.d.ts ./

# Copy hosted-specific files
COPY darbot-browser-hosted/src/ ./hosted/
COPY darbot-browser-hosted/scripts/ ./scripts/

# Now prune dev dependencies for production
RUN npm prune --omit=dev

# Create data directories
RUN mkdir -p /app/data/sessions /app/data/logs /app/data/screenshots /app/data/tunnel && \
    chown -R app:app /app /ms-playwright

# Switch to app user
USER app

# Environment variables
ENV NODE_ENV=production \
    PORT=8080 \
    WEBSITES_PORT=8080 \
    HOST=0.0.0.0 \
    BROWSER=chromium \
    HEADLESS=true \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start command
CMD ["node", "cli.js", "--headless", "--browser", "chromium", "--no-sandbox", "--host", "0.0.0.0", "--port", "8080", "--output-dir", "/app/data"]
