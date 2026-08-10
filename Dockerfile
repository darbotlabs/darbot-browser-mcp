# syntax=docker/dockerfile:1.7
#
# Multi-stage Dockerfile for darbot-browser-mcp (v2.1.4)
#
# NOTE on base image choice:
# We use node:26.2.0-bookworm-slim for both stages because Playwright's
# Chromium binary requires glibc and a
# selection of system libraries that are not present (or are non-trivially
# patched in) on Alpine. bookworm-slim is the smallest practical base on
# which Playwright's bundled browsers work reliably.

ARG PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# ----------------------------------------------------------------------
# Base — shared layer with production node_modules and playwright deps
# ----------------------------------------------------------------------
FROM node:26.2.0-bookworm-slim AS base

ARG PLAYWRIGHT_BROWSERS_PATH
ENV PLAYWRIGHT_BROWSERS_PATH=${PLAYWRIGHT_BROWSERS_PATH} \
    NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

WORKDIR /app

RUN --mount=type=cache,target=/root/.npm,sharing=locked,id=npm-cache \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    npm ci --omit=dev && \
    npx -y playwright-core install-deps chromium

# ----------------------------------------------------------------------
# Builder — installs dev deps and compiles TypeScript
# ----------------------------------------------------------------------
FROM base AS builder

ENV NODE_ENV=development

RUN --mount=type=cache,target=/root/.npm,sharing=locked,id=npm-cache \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    npm ci

COPY *.json *.js *.ts ./
COPY src ./src
RUN npm run build

# ----------------------------------------------------------------------
# Browser — downloads chromium binary (cacheable independent layer)
# ----------------------------------------------------------------------
FROM base AS browser

RUN npx -y playwright-core install --no-shell chromium

# ----------------------------------------------------------------------
# Runtime — minimal slim image, non-root, with healthcheck
# ----------------------------------------------------------------------
FROM node:26.2.0-bookworm-slim AS runtime

ARG PLAYWRIGHT_BROWSERS_PATH
ARG USERNAME=node

ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=${PLAYWRIGHT_BROWSERS_PATH} \
    DARBOT_SESSION_STATE_DIR=/app/data/sessions \
    PORT=8931 \
    HOST=0.0.0.0 \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

WORKDIR /app

# Bring in production node_modules and playwright system deps from base
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /usr/lib /usr/lib
COPY --from=base /usr/share /usr/share

# Bring in playwright browsers
COPY --from=browser --chown=${USERNAME}:${USERNAME} ${PLAYWRIGHT_BROWSERS_PATH} ${PLAYWRIGHT_BROWSERS_PATH}

# Bring in compiled sources + manifests
COPY --chown=${USERNAME}:${USERNAME} cli.js index.js index.d.ts config.d.ts package.json ./
COPY --from=builder --chown=${USERNAME}:${USERNAME} /app/lib ./lib

RUN mkdir -p /app/data/sessions \
    && chown -R ${USERNAME}:${USERNAME} /app

USER ${USERNAME}

EXPOSE 8931

# Health check pings the /health endpoint provided by src/health.ts
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>{if(r.status!==200)process.exit(1)}).catch(()=>process.exit(1))"

# CLI args after the entrypoint are forwarded to cli.js (e.g. --port, --headless)
ENTRYPOINT ["node", "cli.js", "--headless", "--browser", "chromium", "--no-sandbox", "--viewport-size", "1920,1080", "--output-dir", "/app/data"]
CMD ["--port", "8931"]
