# Base stage
FROM node:22-alpine AS base
# Ensure compatibility with native Node.js addons and Prisma on Alpine
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package*.json ./

# Development stage
FROM base AS development
# Install all dependencies including dev
RUN npm install
# Copy the rest of the application
COPY . .
# Generate Prisma Client
RUN npx prisma generate
# Expose the application port
EXPOSE 3000
# Run the application in watch mode
CMD ["npm", "run", "start:dev"]

# Build stage
FROM development AS builder
# Build the NestJS application
RUN npm run build

# Production stage
FROM base AS production
ENV NODE_ENV=production
# Install only production dependencies
RUN npm ci --omit=dev
# Copy Prisma generated client
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# Copy built application and prisma schema
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# Expose the application port
EXPOSE 3000
# Start the production application
CMD ["node", "dist/main"]