# ADES (AI Development Experience System) - Production Dockerfile
# Multi-stage build for optimized production deployment

# Build stage
FROM golang:1.22-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev sqlite-dev

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o gait .

# Production stage
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    sqlite \
    tzdata \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S ades && \
    adduser -u 1001 -S ades -G ades

# Set working directory
WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /app/gait .

# Copy static files
COPY --from=builder /app/static ./static
COPY --from=builder /app/templates ./templates

# Create data directory
RUN mkdir -p /app/data && \
    chown -R ades:ades /app

# Switch to non-root user
USER ades

# Expose ports
EXPOSE 8080 8081 8082 8083

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Environment variables
ENV GAIT_PORT=8080
ENV GAIT_DATA_DIR=/app/data
ENV GAIT_CONFIG_PATH=/app/data/ades-config.json
ENV GAIT_LOG_LEVEL=info
ENV GAIT_ENABLE_METRICS=true

# Default command
CMD ["./gait", "-port", "8080"] 