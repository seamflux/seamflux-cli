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

## Commands

### Workflow Management

| Command | Description |
|---------|-------------|
| `seamflux workflow list` | List all your workflows |
| `seamflux workflow get --id <id>` | Get workflow details |
| `seamflux workflow search --query <query>` | Search workflows |
| `seamflux workflow delete --id <id>` | Delete a workflow |
| `seamflux workflow execute --id <id>` | Execute a workflow |

### Execution Management

| Command | Description |
|---------|-------------|
| `seamflux execution list` | List execution records |
| `seamflux execution run --id <id>` | Run an existing execution |
| `seamflux execution logs --id <id>` | View execution logs |
| `seamflux execution delete --id <id>` | Delete an execution |

### Service Management

| Command | Description |
|---------|-------------|
| `seamflux service list` | List online services |
| `seamflux service query --query <query>` | Semantic search services |
| `seamflux service invoke <service> <method>` | Invoke a service method |

### Configuration

| Command | Description |
|---------|-------------|
| `seamflux config init` | Initialize configuration interactively |
| `seamflux config show` | Show current configuration |
| `seamflux config set <key> <value>` | Set a configuration value |

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

## Global Options

| Option | Description |
|--------|-------------|
| `--profile <name>` | Use specified profile (default: default) |
| `--api-key <key>` | Specify API key directly |
| `--base-url <url>` | Specify API base URL |
| `--json` | Output in JSON format |
| `--help, -h` | Show help |
| `--version, -v` | Show version |

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

## Service Invoke Examples

Simple parameters:
```bash
seamflux service invoke binance getTicker -p symbol=BTC/USDT -p limit=100
```

JSON body:
```bash
seamflux service invoke notion createPage --body '{"parent":{"page_id":"xxx"}}'
```

From file:
```bash
seamflux service invoke openai chat -f ./chat-config.json
```

From stdin:
```bash
cat params.json | seamflux service invoke webhook trigger --stdin
```

## Requirements

- Node.js >= 18

## License

MIT © [SeamFlux](https://github.com/seamflux)
