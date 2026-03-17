# Seamflux Tools Reference

## Purpose

This file describes the local tools and command conventions the Seamflux agent should rely on. Keep command details here, not in `AGENTS.md`.

## Primary Tool

### `seamflux`

The `seamflux` CLI is the main interface to the Seamflux automation platform.

Install:

```bash
npm install -g @seamflux/cli
```

Configure locally:

```bash
seamflux config init
seamflux config show
```

Never ask the user to paste API keys into chat.

## Operating Conventions

- Prefer discovery before action: list, search, or query before execute, delete, or sign.
- Prefer `--json` when the result needs structured parsing.
- For risky operations, confirm the target ID and key parameters first.
- For long-running local scripts, capture logs under `logs/seamflux/`.
- Use local files or stdin for large payloads instead of forcing large inline JSON.

## Command Reference

### Workflow

```bash
seamflux workflow list [--json]
seamflux workflow get --id <workflow_id>
seamflux workflow search --q "<query>" [--scope templates] [--json]
seamflux workflow generate --requirement "<detailed requirement>"
seamflux workflow execute --id <workflow_id> [--config '{"key":"value"}']
seamflux workflow delete --id <workflow_id>
```

Use for discovery, generation, execution, and deletion of cloud workflows.

### Execution

```bash
seamflux execution list [--json]
seamflux execution logs --id <execution_id> [--limit N] [--json]
seamflux execution run --id <execution_id> --config '{}'
seamflux execution delete --id <execution_id>
```

Use to inspect recent runs, investigate failures, or rerun with adjusted config.

### Script

```bash
seamflux script download --slug <slug>
seamflux script list
seamflux script run <slug> [--config <file>] [--param key=value]
```

Scripts are local and can run without an API key. For longer runs, write output to a log file:

```bash
mkdir -p logs/seamflux
seamflux script run <slug> > logs/seamflux/<slug>.log 2>&1
```

### Service

```bash
seamflux service list [--json]
seamflux service query --query "<description>" [--service <name>] [--json]
seamflux service invoke <service> <method> [options]
```

Common invoke options:

- `--param key=value` for simple parameters
- `--body '{"key":"value"}'` for nested JSON
- `--file <path>` for file input
- `--stdin` for piped input
- `--use-log <svc> <method>` to reuse a previous result
- `--map <src>=<dst>` to map logged fields into new parameters
- `--json` for machine-readable output

Service call chaining example:

```bash
seamflux service invoke binance getTicker --param symbol=BTC/USDT

seamflux service invoke telegram sendMessage \
  --use-log binance getTicker \
  --map price=text
```

### Connection

```bash
seamflux connection list [<credential-type>]
```

Use before invoking services that depend on stored credentials.

### Signer

```bash
seamflux signer create
seamflux signer create my-signer
seamflux signer list [--json]
seamflux signer sign <walletAddress> [transaction] [options]
```

Common signer input patterns:

```bash
seamflux signer sign 0x123... '{"type":2,"chain_id":1,...}'
seamflux signer sign 0x123... --body '{"type":2,...}'
seamflux signer sign 0x123... --file ./tx.json
echo '{...}' | seamflux signer sign 0x123... --stdin
seamflux signer sign 0x123... --param type=2 --param chain_id=1
seamflux signer sign 0x123... --name my-signer
```

Security notes:

- Private keys are stored locally in `~/.openclaw/.env`.
- Signer creation should not overwrite an existing key.
- Treat signing as sensitive and require confirmation before use.

## Common Playbooks

### Find and run a workflow

```bash
seamflux workflow list --json
seamflux workflow get --id <workflow_id>
seamflux workflow execute --id <workflow_id>
```

### Discover and call a service

```bash
seamflux service list
seamflux service query --query "get ticker" --service binance
seamflux service invoke binance getTicker --param symbol=ETHUSDT
```

### Send a notification

```bash
seamflux connection list telegram
seamflux service invoke telegram sendMessage \
  --param credential="My Bot" \
  --param chatId="123456" \
  --param text="Hello World"
```

## Local Tool Usage

- Use shell commands to run `seamflux` operations.
- Use file reads to inspect generated logs or saved payload files.
- Use content search tools to scan logs for errors or IDs when needed.
- Prefer structured output plus parsing over brittle text scraping.

## Escalation Hints

- If auth fails, direct the user to `seamflux config init`.
- If a service method is unclear, run `service query` before guessing.
- If a script is missing, run `script list` or ask the user to download it first.
- If a signer is missing, use `signer list` or create one explicitly.
