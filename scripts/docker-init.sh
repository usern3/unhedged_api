#!/bin/bash
# Docker initialization script for Unhedged API
# This script sets up the Docker environment for local development

set -e

echo "=========================================="
echo "  Unhedged API - Docker Initialization"
echo "=========================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found"
    echo "📋 Creating .env from .env.docker template..."
    cp .env.docker .env
    echo "✅ .env file created"
    echo ""
    echo "🔧 IMPORTANT: Edit .env and configure:"
    echo "   - ADMIN_M2M_TOKEN"
    echo "   - PLATFORM_ADMIN_PARTY"
    echo ""
    read -p "Press Enter to continue after configuring .env..."
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Build and start services
echo "🏗️  Building Docker images..."
docker-compose build

echo ""
echo "🚀 Starting services..."
docker-compose up -d postgres redis

echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose exec -T postgres pg_isready -U unhedged > /dev/null 2>&1; do
    echo "   Waiting for PostgreSQL..."
    sleep 2
done
echo "✅ PostgreSQL is ready"

echo ""
echo "⏳ Waiting for Redis to be ready..."
until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    echo "   Waiting for Redis..."
    sleep 2
done
echo "✅ Redis is ready"

echo ""
echo "📦 Running Prisma migrations..."
docker-compose run --rm api npx prisma migrate deploy

echo ""
echo "🌱 Generating Prisma Client..."
docker-compose run --rm api npx prisma generate

echo ""
echo "=========================================="
echo "  ✨ Initialization Complete!"
echo "=========================================="
echo ""
echo "Available commands:"
echo "  • Start all services:    docker-compose up -d"
echo "  • View logs:            docker-compose logs -f"
echo "  • Stop all services:     docker-compose down"
echo "  • Reset database:        docker-compose down -v"
echo ""
echo "Services:"
echo "  • API:        http://localhost:3000"
echo "  • API Docs:   http://localhost:3000/docs"
echo "  • PostgreSQL: localhost:5432"
echo "  • Redis:      localhost:6379"
echo ""
echo "To start the API and Indexer:"
echo "  docker-compose up -d api indexer"
echo ""
