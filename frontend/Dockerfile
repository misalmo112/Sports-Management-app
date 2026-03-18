# Multi-stage Dockerfile for React/Vite Frontend
# Node 18+ with Vite dev and production build support

# Development stage
FROM node:20-alpine as development

# Set work directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies initially (will be updated on container start)
RUN npm ci

# Copy application code
COPY . .

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose Vite dev server port
EXPOSE 5173

# Use entrypoint to install deps on startup, then run command
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Builder stage for production
FROM node:20-alpine as builder

# Set work directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Build production assets
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine as production

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
