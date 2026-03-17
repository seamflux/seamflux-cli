---
name: seamflux
description: >-
  Use this skill for SeamFlux workflow discovery and execution, execution
  inspection, service discovery and invocation, connection checks, local script
  download and run flows, and signer management for blockchain transactions.
  Cloud actions require the seamflux CLI and valid credentials. Script
  download/list/run can work without API credentials.
license: MIT
metadata:
  author: seamflux
  version: "1.0.0"
  homepage: "https://app.seamflux.ai"
  agent:
    emoji: "⚡"
    requires:
      bins: ["seamflux"]
    install:
      - id: npm
        kind: node
        package: "@seamflux/cli"
        bins: ["seamflux"]
        label: "Install SeamFlux CLI (npm)"
---

# SeamFlux Skill

Use this skill when the user wants to work with SeamFlux workflows, executions, services, connections, local workflow scripts, or blockchain signing.

Typical triggers:

- "List my workflows"
- "Run this workflow"
- "Check the last execution logs"
- "Get a Binance price and send it to Telegram"
- "Is my Notion connection configured?"
- "Run the workflow locally"
- "Create a signer" or "sign this transaction"

Do not use this skill for unrelated coding tasks or non-SeamFlux APIs unless the request clearly maps to a SeamFlux-backed service.

## Pre-flight

Before using `seamflux`:

1. Confirm the CLI is installed with `which seamflux` or `where seamflux`.
2. Install it with `npm install -g @seamflux/cli` if missing.
3. Before cloud actions, run `seamflux config show`.
4. If credentials are missing or invalid, stop and tell the user to run `seamflux config init` locally.

Skip the credential check for `script download`, `script list`, and `script run`.

Never ask the user to paste API keys into chat.

## Intent Mapping

Choose the command family that best matches the request:

- `workflow`: discover, inspect, generate, execute, or delete cloud workflows
- `execution`: inspect, rerun, or delete workflow runs
- `script`: download, list, or run workflow scripts locally
- `service`: discover and invoke integration methods
- `connection`: inspect stored credentials for integrations
- `signer`: create, list, or use signing keys

## Default Flow

1. Identify whether the user wants a workflow, execution, script, service, connection, or signer action.
2. If the target is unclear, discover first.
3. Confirm destructive, costly, or sensitive actions before running them.
4. Execute the command.
5. Verify the result and summarize the important ID or status.

## Discovery Rules

- Never guess workflow IDs.
- Never guess service names.
- Never guess method names or required parameters.
- Prefer `--json` when the result needs structured parsing.

For services:

1. Run `seamflux service list` first.
2. Then run `seamflux service query --query "<goal>" [--service <name>]`.
3. Only invoke after the exact service and method are clear.

## Confirmation Rules

Always confirm before:

- `workflow execute`
- `workflow delete`
- `execution run`
- `execution delete`
- `service invoke`
- `signer sign`

Also confirm when an action is financially sensitive, irreversible, or likely to consume credits.

## Command Cheatsheet

### Workflow

```bash
seamflux workflow list [--json]
seamflux workflow get --id <workflow_id>
seamflux workflow search --q "<query>" [--scope templates] [--json]
seamflux workflow generate --requirement "<detailed requirement>"
seamflux workflow execute --id <workflow_id> [--config '{"key":"value"}']
seamflux workflow delete --id <workflow_id>
```

Use `workflow generate` for multi-step automations. The requirement should describe steps, services, trigger conditions, stop conditions, and any loop or monitoring behavior.

### Execution

```bash
seamflux execution list [--json]
seamflux execution logs --id <execution_id> [--limit N] [--json]
seamflux execution run --id <execution_id> --config '{}'
seamflux execution delete --id <execution_id>
```

Use for run inspection, retries, and cleanup.

### Script

```bash
seamflux script download --slug <slug>
seamflux script list
seamflux script run <slug> [--config <file>] [--param key=value]
```

Scripts run locally and do not require API credentials. For long-running scripts, run them in the background and write logs to `logs/seamflux/<slug>.log`.

### Service

```bash
seamflux service list [--json]
seamflux service query --query "<description>" [--service <name>] [--json]
seamflux service invoke <service> <method> [options]
```

Common invoke options:

- `--param key=value`
- `--body '{"key":"value"}'`
- `--file <path>`
- `--stdin`
- `--use-log <svc> <method>`
- `--map <src>=<dst>`
- `--json`

### Connection

```bash
seamflux connection list [<credential-type>]
```

Use when a service call depends on a stored credential or the user asks whether an integration is configured.

### Signer

```bash
seamflux signer create
seamflux signer create my-signer
seamflux signer list [--json]
seamflux signer sign <walletAddress> [transaction] [options]
```

Signer notes:

- Private keys are stored locally in `~/.openclaw/.env`.
- Creation should not overwrite an existing signer key.
- Signing is sensitive and always needs confirmation.

## High-Value Flows

### Execute and monitor a workflow

```bash
seamflux workflow list --json
seamflux workflow get --id <workflow_id>
seamflux workflow execute --id <workflow_id>
seamflux execution logs --id <execution_id>
```

### Run a workflow locally

```bash
seamflux script download --slug <slug>
mkdir -p logs/seamflux
seamflux script run <slug> > logs/seamflux/<slug>.log 2>&1
```

### Discover and invoke a service

```bash
seamflux service list
seamflux service query --query "get ticker" --service binance
seamflux service invoke binance getTicker --param symbol=BTC/USDT
```

### Use a credential-backed service

```bash
seamflux connection list telegram
seamflux service invoke telegram sendMessage \
  --param credential="My Bot" \
  --param text="Hello"
```

### Create and use a signer

```bash
seamflux signer create
seamflux signer list --json
seamflux signer sign 0x123... --file ./transaction.json
```

## Capability Hints

These are hints for narrowing service discovery. Always confirm exact service and method via `service list` and `service query`.

- Centralized exchange actions: `binance`, `okx`, `bybit`, `gate`, `bitget`, `coinbase`
- Messaging and notifications: `telegram`, `slack`, `discord`, `sendMail`
- Docs and data sinks: `notion`, `google-sheets`, `supabase`, `gmail`
- On-chain operations: `chainKit`
- Charts and analysis: `quickChart`, `ai`, `marketData`

## Edge Cases

- Workflow not found: use `workflow list` or `workflow search` to resolve the ID.
- Script not found: use `script download --slug <slug>` first.
- Auth failure or 401: do not retry until the user updates credentials locally.
- `execution run` requires `--config`; use `'{}'` if there are no overrides.
- Multiple matching credentials: ask the user which connection name to use.
- Existing signer: show `signer list`; do not overwrite the existing key.
- Missing private key: recreate the signer before attempting to sign.

## Communication Guidelines

- Speak in natural language, not raw flag names, unless the user wants exact commands.
- Summarize command results instead of dumping routine output.
- Include IDs, statuses, and next steps after successful actions.
- If something fails, state the likely cause and the clearest recovery step.
