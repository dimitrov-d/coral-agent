#!/bin/bash

# Coral Protocol Docker Setup Script
set -e

echo "🐳 Setting up Coral Protocol with Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ Please edit .env file with your configuration"
fi

# Build and start services
echo "🏗️ Building Docker images..."
docker-compose build

echo "🚀 Starting Coral Protocol services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if Coral server is running
echo "🔍 Checking Coral Protocol server status..."
sleep 5
if curl -f http://localhost:5555/health > /dev/null 2>&1; then
    echo "✅ Coral Protocol server is running!"
    
    # Test basic API endpoints
    echo "🧪 Testing Coral Protocol API..."
    if curl -s http://localhost:5555/sessions | grep -q "\[\]"; then
        echo "✅ Sessions endpoint working"
    fi
    
    if curl -s http://localhost:5555/agents/discover | grep -q "\[\]"; then
        echo "✅ Agent discovery endpoint working"
    fi
else
    echo "⚠️ Coral Protocol server might not be ready yet. Check logs:"
    echo "   docker-compose logs coral-server"
fi

# Check if MCP server is running (if applicable)
echo "🔍 Checking MCP server status..."
if docker-compose ps mcp-server | grep -q "Up"; then
    echo "✅ MCP server is running!"
else
    echo "⚠️ MCP server might not be ready yet. Check logs:"
    echo "   docker-compose logs mcp-server"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Available services:"
echo "   - Coral Protocol Server: http://localhost:5555"
echo "   - MCP Server: http://localhost:3000"
echo "   - Redis: localhost:6379"
echo ""
echo "🔧 Useful commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop services: docker-compose down"
echo "   - Restart services: docker-compose restart"
echo "   - Update services: docker-compose pull && docker-compose up -d"
echo ""
