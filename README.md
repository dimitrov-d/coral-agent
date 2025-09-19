# Coral Agent - Solana MCP Server with Coral Protocol

A Model Context Protocol (MCP) server that integrates Solana blockchain functionality with Coral Protocol for AI agent orchestration.

## 🚀 Features

- **Solana Integration**: Fetch and analyze Solana transaction history with detailed insights
- **Coral Protocol Support**: Multi-agent AI collaboration through sessions and threads
- **Agent Discovery**: Find and connect with specialized AI agents in the Coral network
- **Thread-based Communication**: Structured messaging between agents for collaborative analysis
- **MCP Compliant**: Works with Claude Desktop and other MCP clients
- **Docker Ready**: Easy deployment with Docker and Docker Compose

## 🏗️ Architecture

Based on **Coral Protocol's official architecture** for AI agent orchestration:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Claude        │    │   MCP Server     │    │   Coral         │
│   Desktop       │◄──►│   (This App)     │◄──►│   Protocol      │
│   (MCP Client)  │    │                  │    │   Server        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Solana         │    │  Agent Network  │
                       │   Blockchain     │    │  • DeFi Agents  │
                       │   • Mainnet      │    │  • Risk Agents  │
                       │   • Devnet       │    │  • Data Agents  │
                       └──────────────────┘    └─────────────────┘
```

### **Coral Protocol Integration**

- **Sessions**: Multi-agent collaboration spaces for complex Solana analysis
- **Threads**: Focused communication channels within sessions
- **Agent Discovery**: Find agents with specific capabilities (DeFi, risk assessment, etc.)
- **Advertisement**: Publish this MCP server as a discoverable Solana expert agent

## 🐳 Docker Setup (Recommended)

### Quick Start

1. **Clone and setup**:
   ```bash
   git clone <your-repo>
   cd coral-agent
   ./setup-coral-docker.sh
   ```

2. **Configure environment**:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start services**:
   ```bash
   docker-compose up -d
   ```

### Manual Docker Setup

1. **Build the MCP server image**:
   ```bash
   npm run docker:build
   ```

2. **Start all services with Docker Compose**:
   ```bash
   npm run docker:compose:up
   ```

3. **View logs**:
   ```bash
   npm run docker:compose:logs
   ```

### Services

- **Coral Protocol Server**: `http://localhost:5555`
- **MCP Server**: `http://localhost:3000`
- **Redis** (optional): `localhost:6379`

## 🛠️ Local Development

### Prerequisites

- Node.js 18+
- npm or yarn
- TypeScript

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp env.example .env
   # Edit .env with your Solana RPC URL and other settings
   ```

3. **Start development server**:
   ```bash
   npm start
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## 🔧 Configuration

### Environment Variables

```bash
# Solana Configuration
RPC_URL=https://api.mainnet-beta.solana.com

# Coral Protocol Configuration  
CORAL_SERVER_URL=http://localhost:5555
CORAL_API_KEY=your_coral_api_key_here

# Optional: Redis Configuration
REDIS_URL=redis://localhost:6379

# Environment
NODE_ENV=development
LOG_LEVEL=info
```

### Claude Desktop Integration

Update your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "coral-agent": {
      "command": "tsx",
      "args": ["/path/to/coral-agent/src/index.ts"],
      "env": {
        "RPC_URL": "https://api.mainnet-beta.solana.com",
        "CORAL_SERVER_URL": "http://localhost:5555"
      }
    }
  }
}
```

## 📋 Available Tools

### Solana Tools

- **`fetch_solana_transactions`**: Fetch recent transaction history for a wallet
  - Input: `walletAddress` (string), `limit` (number, optional)
  - Output: Structured transaction data with amounts, addresses, and Solscan links

### Coral Protocol Tools

#### Session Management
- **`create_coral_session`**: Create a new multi-agent collaboration session
  - Input: `sessionName` (optional), `description` (optional)
  - Output: Session ID, participants, and thread information
  - Use case: Start collaborative analysis of complex Solana protocols

- **`list_coral_sessions`**: List all active Coral Protocol sessions
  - Input: None
  - Output: Array of sessions with participant and thread counts

#### Thread-based Communication
- **`create_coral_thread`**: Create a communication thread within a session
  - Input: `sessionId` (string), `participants` (array, optional)
  - Output: Thread ID and participant list
  - Use case: Focus discussion on specific analysis tasks

- **`send_coral_message`**: Send a message to a thread for agent collaboration
  - Input: `threadId` (string), `content` (any), `messageType` (optional)
  - Output: Message ID and delivery confirmation
  - Use case: Share analysis results or request specific insights

#### Agent Discovery & Networking
- **`discover_coral_agents`**: Find AI agents with specific capabilities
  - Input: `capabilities` (array, optional)
  - Output: List of available agents with their specializations
  - Use case: Find DeFi experts, risk assessment agents, or data analysts

- **`advertise_solana_agent`**: Publish this agent in the Coral network
  - Input: None
  - Output: Advertisement confirmation and agent details
  - Use case: Make Solana expertise discoverable to other agents

## 🔍 Usage Examples

### Basic Solana Analysis

```typescript
// Fetch transaction history for analysis
const walletAddress = "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK";
const result = await fetch_solana_transactions({
  walletAddress,
  limit: 100
});
```

### Multi-Agent Collaboration Workflow

```typescript
// 1. Create a collaboration session
const session = await create_coral_session({
  sessionName: "DeFi Protocol Analysis",
  description: "Collaborative analysis of Solana DeFi transaction patterns"
});

// 2. Discover specialized agents
const agents = await discover_coral_agents({
  capabilities: ["defi_analysis", "risk_assessment", "yield_farming"]
});

// 3. Create a focused discussion thread
const thread = await create_coral_thread({
  sessionId: session.id,
  participants: ["solana-mcp-agent", "defi-expert-agent", "risk-agent"]
});

// 4. Share analysis results with other agents
await send_coral_message({
  threadId: thread.id,
  content: {
    type: "transaction_analysis",
    wallet: walletAddress,
    findings: result.transactions,
    insights: ["High volume DeFi activity", "Multiple DEX interactions"]
  },
  messageType: "request"
});

// 5. Make this agent discoverable
await advertise_solana_agent();
```

### Real-world Collaboration Scenarios

#### Scenario 1: DeFi Risk Assessment
```typescript
// Create session for risk analysis
const riskSession = await create_coral_session({
  sessionName: "DeFi Risk Assessment",
  description: "Multi-agent risk evaluation of Solana DeFi protocols"
});

// Find risk assessment specialists
const riskAgents = await discover_coral_agents({
  capabilities: ["risk_modeling", "smart_contract_audit", "liquidity_analysis"]
});

// Share transaction data for collaborative risk scoring
const thread = await create_coral_thread({
  sessionId: riskSession.id,
  participants: riskAgents.map(a => a.id)
});
```

#### Scenario 2: Yield Farming Optimization
```typescript
// Discover yield farming experts
const yieldAgents = await discover_coral_agents({
  capabilities: ["yield_farming", "apr_calculation", "impermanent_loss"]
});

// Create optimization discussion
const yieldThread = await create_coral_thread({
  sessionId: session.id,
  participants: yieldAgents.slice(0, 3).map(a => a.id)
});

// Request yield optimization analysis
await send_coral_message({
  threadId: yieldThread.id,
  content: {
    request: "optimize_yield_strategy",
    wallet_data: result.transactions,
    risk_tolerance: "moderate",
    time_horizon: "6_months"
  }
});
```

## 🚀 Deployment

### Production Docker Deployment

1. **Set production environment**:
   ```bash
   export NODE_ENV=production
   ```

2. **Build and deploy**:
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

3. **Monitor services**:
   ```bash
   docker-compose logs -f
   ```

### Health Checks

The application includes health checks for monitoring:

- **Coral Server**: `GET http://localhost:5555/sessions`
- **MCP Server**: `GET http://localhost:3000/health` (if enabled)

## 📊 Monitoring

View service logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f coral-server
docker-compose logs -f mcp-server
```

Check service status:
```bash
docker-compose ps
```

## 🔒 Security

- Services run as non-root users in containers
- Environment variables for sensitive configuration
- Network isolation between services
- Optional Redis for session management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

[Your License Here]

## 🆘 Troubleshooting

### Common Issues

1. **Coral server not responding**:
   ```bash
   docker-compose restart coral-server
   docker-compose logs coral-server
   ```

2. **MCP server connection issues**:
   - Check Claude Desktop configuration
   - Verify environment variables
   - Check firewall settings

3. **Solana RPC issues**:
   - Verify RPC_URL in environment
   - Check network connectivity
   - Try different RPC endpoints

### Getting Help

- Check the logs: `docker-compose logs -f`
- Verify configuration: `cat .env`
- Test Coral server: `curl http://localhost:5555/sessions`
