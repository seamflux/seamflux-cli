# SeamFlux CLI

[![npm version](https://img.shields.io/npm/v/@seamflux/cli.svg)](https://www.npmjs.com/package/@seamflux/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Command line tool for [SeamFlux](https://seamflux.ai) - a workflow automation platform.

## Installation

```bash
npm install -g @seamflux/cli
```

Or use directly with npx:

```bash
npx @seamflux/cli <command>
```

Or add as a skill for AI agents:

```bash
npx skills add seamflux/seamflux-cli
```

## Quick Start

1. **Initialize configuration:**
   ```bash
   seamflux config init
   ```

2. **List your workflows:**
   ```bash
   seamflux workflow list
   ```

3. **Execute a workflow:**
   ```bash
   seamflux workflow execute --id <workflow-id>
   ```

4. **Invoke a service:**
   ```bash
   seamflux service invoke binance getTicker -p symbol=BTC/USDT
   ```

## Usage

```
seamflux [options] <module> <command> [args...]
```

### Global Options

| Option | Description |
|--------|-------------|
| `--profile <name>` | Use specified profile from config |
| `--api-key <key>` | Specify API key directly (or use `SEAMFLUX_API_KEY` env) |
| `--base-url <url>` | Specify API base URL (default: https://app.seamflux.ai) |
| `--json` | Output raw JSON |
| `--help, -h` | Show help |
| `--version, -v` | Show version |

## Commands

### Workflow Management

Manage your workflows.

| Command | Description |
|---------|-------------|
| `seamflux workflow list` | List all your workflows |
| `seamflux workflow get --id <id>` | Get workflow details |
| `seamflux workflow search --q <query> [--scope templates\|market]` | Search workflows |
| `seamflux workflow delete --id <id>` | Delete a workflow |
| `seamflux workflow execute --id <id> [--config '<json>']` | Execute a workflow |
| `seamflux workflow generate --requirement '<desc>'` | Generate workflow using AI |

### Execution Management

Manage workflow executions.

| Command | Description |
|---------|-------------|
| `seamflux execution list` | List execution records |
| `seamflux execution run --id <id> --config '<json>'` | Run an existing execution with config |
| `seamflux execution logs [--id <id>] [--limit <n>] [--service <name>] [--method <method>]` | View execution logs |
| `seamflux execution delete --id <id>` | Delete an execution |

### Script Management (local run, no API key)

Download workflow scripts and run them locally with Node.js. Does not require API credentials.

| Command | Description |
|---------|-------------|
| `seamflux script download --slug <slug> [--output <dir>]` | Download workflow script package (cli.js + workflow.code.js + config.json) by slug |
| `seamflux script list [--dir <dir>]` | List downloaded scripts |
| `seamflux script run <slug\|path> [--config <path>] [--key=value ...]` | Run a downloaded script locally; script auto-loads config.json or use `--config`; extra args passed to the script |

- **Cloud vs local:** Use `workflow execute` to run in SeamFlux cloud sandbox; use `script run` to run the same workflow locally.
- Scripts are stored under `~/.seamflux/scripts/<slug>/` by default.

### Service Management

Discover and invoke services.

| Command | Description |
|---------|-------------|
| `seamflux service list` | List all available services |
| `seamflux service query --query <query> [--service <name>] [--k <n>]` | Search services by description |
| `seamflux service invoke <service> <method> [options]` | Invoke a service method |

### Connection Management

Manage your connections (credentials).

| Command | Description |
|---------|-------------|
| `seamflux connection list [credential-type]` | List all connections, or show details for a specific type |

### Configuration

Manage CLI configuration.

| Command | Description |
|---------|-------------|
| `seamflux config init [--lang zh]` | Initialize configuration interactively |
| `seamflux config show` | Show current configuration |
| `seamflux config set <key> <value>` | Set a configuration value |
| `seamflux config use <profile-name>` | Switch to a profile |

## Service Invocation

### Standard Syntax

```bash
# List all methods of a service
seamflux service query --query "*" --service binance

# Invoke a service method
seamflux service invoke binance getTicker -p symbol=BTC/USDT
```

### Invoke Options

| Option | Description |
|--------|-------------|
| `-p, --param <k=v>` | Simple parameters (can be used multiple times) |
| `-b, --body '<json>'` | JSON request body |
| `-f, --file <path>` | Read parameters from JSON file |
| `--stdin` | Read parameters from STDIN (pipe) |

## Configuration

Configuration is stored in `~/.seamflux/config.toml`:

```toml
default_profile = "prod"

[profiles.prod]
api_key = "sf_xxxxxxxx"
base_url = "https://app.seamflux.ai"
```

### Configuration Priority

1. Command line flags: `--api-key`, `--base-url`
2. Environment variables: `SEAMFLUX_API_KEY`, `SEAMFLUX_BASE_URL`
3. Configuration file: `~/.seamflux/config.toml`
4. Default values

### Environment Variables

```bash
export SEAMFLUX_API_KEY=sf_live_xxxxxxxx
export SEAMFLUX_BASE_URL=https://app.seamflux.ai
```

## Output Formats

**Table (default):**
```bash
seamflux workflow list
# ID                    TITLE              STATUS    CREATED
# wf_abc123            My Workflow        active    2024-01-15
```

**JSON:**
```bash
seamflux workflow list --json
# {"code": 0, "data": [{"id": "wf_abc123", ...}]}
```

## Examples

```bash
# Workflow management
seamflux workflow list
seamflux workflow get --id wf_abc123
seamflux workflow search --q "email automation"
seamflux workflow execute --id wf_abc123 --config '{"to":"user@example.com"}'

# Execution management
seamflux execution list
seamflux execution logs --id exec_xxx --limit 50
seamflux execution run --id exec_xxx --config '{"param":"value"}'

# Local script (no API key)
seamflux script download --slug my-workflow
seamflux script list
seamflux script run my-workflow
seamflux script run my-workflow --config ./prod.json --symbol=BTCUSDT

# Service invocation
seamflux service list
seamflux service query --query "send email"
seamflux service invoke binance getTicker -p symbol=BTC/USDT

# Connection management
seamflux connection list
seamflux connection list notion

# Configuration
seamflux config init
seamflux config show
seamflux config set default_profile prod
seamflux config use prod
```
## Agent install

 curl -fsSL https://raw.githubusercontent.com/seamflux/seamflux-cli/main
  /install.sh | bash

## Requirements

- Node.js >= 18

## License

MIT © [SeamFlux](https://github.com/seamflux)
