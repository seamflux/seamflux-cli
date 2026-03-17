# Seamflux Tools Reference

## CLI Tool: `seamflux`

The `seamflux` CLI is the primary interface to the Seamflux automation platform.

### Installation
```bash
npm install -g @seamflux/cli
```

### Configuration
```bash
# Initialize configuration (run locally, not in chat)
seamflux config init

# View current config
seamflux config show
```

### Command Categories

#### Workflow Commands
```bash
seamflux workflow list [--json]
seamflux workflow get --id <workflow_id>
seamflux workflow search --q "<query>" [--scope templates] [--json]
seamflux workflow generate --requirement "<detailed requirement>"
seamflux workflow execute --id <workflow_id> [--config '{"key":"value"}']
seamflux workflow delete --id <workflow_id>
```

#### Execution Commands
```bash
seamflux execution list [--json]
seamflux execution logs --id <execution_id> [--limit N] [--json]
seamflux execution run --id <execution_id> --config '{}'
seamflux execution delete --id <execution_id>
```

#### Script Commands (Local, No API Key)
```bash
seamflux script download --slug <slug>
seamflux script list
seamflux script run <slug> [--config <file>] [--param key=value]
```

**Important**: Scripts run via `process` tool in background mode with log redirection:
```bash
mkdir -p logs/seamflux
seamflux script run <slug> > logs/seamflux/<slug>.log 2>&1
```

#### Service Commands
```bash
seamflux service list [--json]
seamflux service query --query "<description>" [--service <name>] [--json]
seamflux service invoke <service> <method> [options]
```

**Service Invoke Options**:
- `--param key=value` - Simple parameters
- `--body '{"key":"value"}'` - Nested JSON
- `--file <path>` - Parameters from file
- `--stdin` - Parameters from stdin pipe
- `--use-log <svc> <method>` - Use result from previous service call log
- `--map <src>=<dst>` - Map log field to parameter (use with --use-log)
- `--json` - JSON output

**Chain Service Calls** (use previous result as input):
```bash
# First call - result is auto-logged
seamflux service invoke binance getTicker --param symbol=BTC/USDT

# Second call - use logged result (latest entry from binance-getTicker.log)
seamflux service invoke telegram sendMessage \
  --use-log binance getTicker \
  --map price=text

# Map multiple fields
seamflux service invoke notion createPage \
  --use-log binance getTicker \
  --map symbol=properties.Symbol.title \
  --map price=properties.Price.number

# Access nested fields with dot notation
seamflux service invoke telegram sendMessage \
  --use-log binance getTicker \
  --map result.data.price=text
```

#### Connection Commands
```bash
seamflux connection list [<credential-type>]
```

#### Signer Commands

```bash
# Create signing key (default name: openclaw)
seamflux signer create
seamflux signer create my-signer

# List configured signers
seamflux signer list [--json]

# Sign transaction (multiple input methods)
seamflux signer sign <walletAddress> [transaction] [options]

# Input options (priority: stdin > file > body > use-log > positional arg > params)
seamflux signer sign 0x123... '{"type":2,"chain_id":1,...}'
seamflux signer sign 0x123... --body '{"type":2,...}'
seamflux signer sign 0x123... --file ./tx.json
echo '{...}' | seamflux signer sign 0x123... --stdin
seamflux signer sign 0x123... --param type=2 --param chain_id=1

# Build transaction from service call log (use with --use-log and --map)
seamflux signer sign 0x123... \
  --use-log chainKit getTransaction \
  --map result.data.to=to \
  --map result.data.value=value \
  --map result.data.data=data

# Use specific signer (default: openclaw)
seamflux signer sign 0x123... --name my-signer
```

**Security Notes:**
- Private keys stored in `~/.openclaw/.env` (OpenClaw global env file)
- Follows OpenClaw "never overwrite" rule - creation fails if key exists
- Public keys registered with Privy; walletId cached locally

### Common Service Patterns

#### Price Query
```bash
# 1. Discover service
seamflux service list

# 2. Find method
seamflux service query --query "get ticker" --service binance

# 3. Invoke
seamflux service invoke binance getTicker --param symbol=ETHUSDT
```

#### Send Notification
```bash
# Check connections first
seamflux connection list telegram

# Invoke with credential
seamflux service invoke telegram sendMessage \
  --param credential="My Bot" \
  --param chatId="123456" \
  --param text="Hello World"
```

## Process Tool Integration

For long-running scripts, use the `process` tool:

```json
{
  "command": "seamflux script run trading-bot > logs/seamflux/trading-bot.log 2>&1",
  "background": true
}
```

Monitor with:
```bash
read logs/seamflux/trading-bot.log
grep "ERROR" logs/seamflux/trading-bot.log
```

## Read/Grep Tools

View execution logs and script outputs:

```bash
# View log file
read logs/seamflux/<slug>.log

# Search for specific patterns
grep "order placed" logs/seamflux/<slug>.log
grep "ERROR" logs/seamflux/<slug>.log
```

## Tool Selection Guide

| Task | Primary Tool | Secondary |
|------|-------------|-----------|
| Check CLI installed | `shell` (which/where) | - |
| Run seamflux commands | `shell` | - |
| Execute long-running scripts | `process` (background) | `shell` |
| View logs | `read` | `grep` |
| Search log content | `grep` | `read` |
| Sign transaction | `shell` | - |
| Check signer config | `shell` | `read` |
