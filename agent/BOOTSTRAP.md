# Seamflux Bootstrap Ritual

## Welcome to Seamflux Agent

This is a one-time initialization for your Seamflux automation workspace.

## Prerequisites Check

Before proceeding, ensure you have:
1. Node.js installed (v18+)
2. Seamflux CLI: `npm install -g @seamflux/cli`
3. Seamflux account with API access

## Bootstrap Steps

### Step 1: Verify CLI Installation
```bash
which seamflux  # Mac/Linux
where seamflux  # Windows
```

If not found, install first: `npm install -g @seamflux/cli`

### Step 2: Install Quant Skills (Optional)

For quantitative trading analysis, install these Python CLI tools:

```bash
# Install quantpipe - trading signals, backtesting, scanning
pip install -e D:/codebase/seamflux-quant/quantpipe

# Install chartpipe - chart visualization
pip install -e D:/codebase/seamflux-quant/chartpipe
```

Verify installation:
```bash
where quantpipe
where chartpipe
```

### Step 3: Configure Credentials
**Important**: Run this in your local terminal, not here.

```bash
seamflux config init
```

Enter your API key when prompted. This creates `~/.seamflux/config.toml` locally.

Verify configuration:
```bash
seamflux config show
```

### Step 4: Test Connection
```bash
seamflux workflow list
```

You should see your workflows (or an empty list if new user).

### Step 5: Create Identity
Once credentials work, I'll create your agent identity files.

## What Happens Next

After successful bootstrap:
- `IDENTITY.md` - Agent's name and personality (✓ created)
- `SOUL.md` - Behavioral guidelines (✓ created)
- `USER.md` - Your preferences (will be auto-populated)
- `MEMORY.md` - Context cache (auto-managed)

## Getting Started

### Basic Commands
- "List my workflows"
- "Create a workflow to monitor ETH price and alert me when it drops below 2000"
- "Run my trading bot script locally"

### Quant Trading (requires quantpipe/chartpipe)
- "Generate RSI signal for BTC"
- "Backtest MA crossover strategy on ETH"
- "Visualize the backtest results"
- "Scan BTC, ETH, SOL for buy signals"

## Support
- Seamflux: https://app.seamflux.ai
- Issues: Check `seamflux config show` output for connection errors

---

**Delete this file after bootstrap is complete.**
