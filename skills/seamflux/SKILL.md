---
name: seamflux
description: >-
  Manages SeamFlux automations: find or generate workflows from requirements,
  run workflows and monitor executions, discover and invoke services, and check
  connections for credential-backed service calls. Also supports downloading
  workflow scripts and running them locally with Node.js (no API key). Use when
  the user wants to build or run an automation, operate known SeamFlux-backed
  services such as OKX, Binance, Notion, Telegram, Slack, Google Sheets, or
  Supabase, inspect a run, verify a connection, run a workflow locally, or
  choose which saved credential to use. Cloud actions require the seamflux CLI
  and API credentials; script download/list/run do not.
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

# SeamFlux CLI

Use this skill when the user wants to **build or run an automation**, **run or monitor a workflow**, **download or run a workflow script locally** (no API key), **use a known SeamFlux-backed integration** (e.g. OKX, Binance, Notion, Telegram, Slack, Google Sheets, Supabase), or **check whether a connection is set up**. This skill should also trigger for cross-service requests such as "place an order on OKX and save it to Notion" even if the user does not mention SeamFlux explicitly. Cloud commands (workflow, execution, service, connection) require the `seamflux` CLI and valid API credentials; **script** commands (download, list, run) do not require credentials.

## Pre-flight Checks

Every time before running any `seamflux` command, follow these steps in order. Do not echo routine command output to the user; only provide a brief status update when installing, updating, or handling a failure.

1. **Confirm installed** — Run `which seamflux` (on Windows: `where seamflux`). If not found, install with `npm install -g @seamflux/cli` and report briefly (e.g. "Installing SeamFlux CLI…" / "Installed." or "Install failed: …").
2. **Ensure credentials** (only before **workflow / execution / service / connection** commands) — Run `seamflux config show`. If it errors or shows no API key: stop, tell the user to run `seamflux config init` locally, and wait before retrying. Do not ask for, accept, or write API keys from chat. **Skip this step for `script` commands** (download, list, run); they work without API credentials.
3. **401 errors** — Do not retry. Tell the user the key may be invalid or expired and to update `~/.seamflux/config.toml` locally; do not paste credentials in chat. After they confirm, run `seamflux config show` then retry.

## When to Use This Skill

Apply this skill when the user intent matches any of the following:

- **Find or run automations** — list workflows, search by topic, get details, execute a workflow, or generate a new workflow from a natural-language requirement.
- **Download or run workflow scripts locally** — download a workflow script package by slug (no API key), list downloaded scripts, or run a script with Node.js locally.
- **Inspect or manage runs** — list executions, view logs, re-run or delete an execution.
- **Use integrations directly** — discover services by semantic search, invoke a service method (e.g. get ticker, send message, create page).
- **Verify connections** — list connected accounts, check a specific credential type, or choose the right saved credential for a service call.
- **Cross-service user goals** — the user describes an outcome across known services, such as "place an order on OKX and save the result to Notion", "send a Telegram alert after a Binance action", or "write data to Google Sheets or Supabase".

Do **not** use this skill for general coding, unsupported third-party APIs, or requests that do not match SeamFlux workflows, executions, connections, or known SeamFlux service families.

## Natural-Language Trigger Examples

These user requests should usually trigger this skill even if the user does not say "SeamFlux":

- "Place an order on OKX and save the result to Notion."
- "Get the BTC price from Binance and send it to Telegram."
- "Create an automation that writes trade data to Google Sheets."
- "Send a Slack message after a market event."
- "Store workflow output in Supabase."

## Core User Intents and How to Fulfill Them

| User intent | What to do |
|-------------|------------|
| List or find workflows | `workflow list` (my workflows) or `workflow search --q "<query>"` (templates / search). Use search when the user describes a topic (e.g. "trading bot") and no ID is given. |
| Get workflow details | `workflow get --id <id>`. If no ID: use `workflow list` or `workflow search --q "..."` first. |
| Create workflow from description | `workflow generate --requirement "<user requirement>"`. Then suggest executing with `workflow execute --id <returned_id>`. |
| Run a workflow (cloud) | `workflow execute --id <id>` (optional: `--config '{"key":"value"}'`). Confirm workflow ID before running. After start, use `execution list` and `execution logs --id <exec_id>` to monitor. |
| Download workflow script (local) | `script download --slug <slug>`. No API key. Saves to `~/.seamflux/scripts/<slug>/` (source.js + config.json). |
| List downloaded scripts | `script list`. No API key. |
| Run workflow script locally | `script run <slug>` or `script run <path>`. No API key. Use `--config <path>` to override config; pass `--key=value` for script args. Prefer this when the user wants to run locally or avoid cloud. |
| List or inspect executions | `execution list`; for logs use `execution logs --id <id>`. |
| Re-run an execution | `execution run --id <id> --config '{}'` (config required; use `{}` if no overrides). Confirm before running. |
| Find a service / integration | `service query --query "<what user wants>"` (e.g. "send message", "okx order", "notion page"). Use `service list` to see all. If the user already named the service, narrow with `--service <name>`. |
| Call a service method | `service invoke <serviceName> <method>` with params. Prefer `--param key=value` for simple args; use `--body '{"...":...}'` for nested JSON; use `--file <path>` for file input or `--stdin` when piping. Confirm service name, method, and params before invoking. |
| Check connections | `connection list` or `connection list <credential-type>` to see connected accounts. When a service call needs a `credential` parameter, use the credential type to find saved connections first. |

## Default Operating Flow

1. **Credential check** — Run `seamflux config show` before any workflow/execution/service/connection command. If not configured, stop and guide to `seamflux config init`. **Omit for script** (download/list/run).
2. **Identify intent** — Map the user's goal to one of: workflow (list/get/search/delete/execute/generate), execution (list/run/logs/delete), **script** (download/list/run — local, no API key), service (list/query/invoke), or connection (list).
3. **Read first when ambiguous** — If the user did not give an ID or exact name, run a read or search (e.g. `workflow search`, `service query`) before any write.
4. **Confirm before writes** — For delete, execute, run, or service invoke: confirm the target (workflow ID, execution ID, service+method+params) once with the user before executing.
5. **Verify after writes** — After execute/run, suggest `execution list` and `execution logs --id <id>`. After delete, run the matching list to confirm.

## Safety and Confirmation Rules

- **Destructive actions** (workflow delete, execution delete): Always confirm the exact ID with the user before running.
- **Execute / run / invoke**: Confirm workflow ID, execution ID, or service name + method + parameters before running.
- **Do not** retry the same command after a 401; guide the user to fix credentials first.
- **Do not** overwrite an existing `~/.seamflux/config.toml`; use `config init` if the file already exists.

## Choosing Workflow vs Script vs Execution vs Service vs Connection

- **Workflow** — Multi-step automation in the cloud. Use when the user talks about "workflow", "automation", "run my bot", or "create an automation that...". Use `workflow generate` when they describe a goal and no workflow exists yet. Use `workflow execute` to run in SeamFlux cloud sandbox.
- **Script** — Local workflow script (download, list, run with Node.js). Use when they want to **download** a workflow script, **list** downloaded scripts, or **run a workflow locally** without API key. Prefer `script run <slug>` over `workflow execute` when they say "run locally", "run on my machine", or "without API".
- **Execution** — A single run of a workflow (cloud). Use when they ask about "last run", "logs", "re-run", or "execution".
- **Service** — Single integration call (e.g. get price, send message). Use when they want one action from an app (Binance, Notion, Telegram, etc.) without a full workflow.
- **Connection** — Whether an integration is connected, and which saved credential to use. Use when they ask "is X connected?", "list my connections", or when a service method requires a `credential` parameter.

## Workflow Command Examples

### List and Search Workflows

```bash
# List your workflows
seamflux workflow list

# Search templates or market by topic
seamflux workflow search --q "trading bot"
seamflux workflow search --q "notification" --scope templates

# Output as JSON
seamflux workflow list --json
seamflux workflow search --query "alert" --json
```

### Get and Run a Workflow

```bash
# Get workflow details by ID
seamflux workflow get --id wf_abc123

# Execute a workflow (creates a new execution)
seamflux workflow execute --id wf_abc123

# Execute with optional config (if supported by workflow)
seamflux workflow execute --id wf_abc123 --config '{"symbol":"BTC/USDT"}'

# After execute, use execution list and execution logs to monitor
```

### Generate and Delete Workflow

```bash
# Generate a new workflow from natural-language requirement
seamflux workflow generate --requirement "Daily fetch BTC price from Binance and send to Telegram"

# Delete a workflow (confirm with user first)
seamflux workflow delete --id wf_abc123
```

## Script Command Examples (local, no API key)

Use **script** when the user wants to run a workflow locally or avoid using API credentials.

```bash
# Download a workflow script by slug (no API key)
seamflux script download --slug my-workflow

# List downloaded scripts
seamflux script list

# Run a downloaded script (uses config.json in script dir)
seamflux script run my-workflow

# Run with custom config file
seamflux script run my-workflow --config ./prod.json

# Run with inline args passed to the script
seamflux script run my-workflow --symbol=BTCUSDT --interval=1m
```

- **Cloud vs local:** `workflow execute --id <id>` runs in SeamFlux cloud; `script run <slug>` runs the same workflow locally with Node.js.

## Execution Command Examples

### List and View Executions

```bash
# List all executions
seamflux execution list

# Get logs for a specific execution
seamflux execution logs --id exec_xyz789

# Limit log lines
seamflux execution logs --id exec_xyz789 --limit 100

# Output as JSON
seamflux execution list --json
seamflux execution logs --id exec_xyz789 --json
```

### Re-run and Delete Execution

```bash
# Re-run an existing execution (--config required, use '{}' if no overrides)
seamflux execution run --id exec_xyz789 --config '{}'

# Re-run with config overrides
seamflux execution run --id exec_xyz789 --config '{"symbol":"ETH/USDT"}'

# Delete an execution (confirm with user first)
seamflux execution delete --id exec_xyz789
```

### Execute Workflow Then Monitor

```bash
# 1. Execute workflow
seamflux workflow execute --id wf_abc123
# Output: Execution started: exec_xyz789

# 2. List recent executions to confirm
seamflux execution list

# 3. View logs for the new execution
seamflux execution logs --id exec_xyz789
```

## Service Command Examples

### Discover Services

```bash
# List all available services
seamflux service list

# Search by description (semantic search)
seamflux service query --query "send email"

# Search within a specific service only
seamflux service query --query "get price" --service binance

# Output as JSON for scripting
seamflux service query --query "weather" --json
```

### Invoke Services

```bash
# Simple parameters (--param key=value)
seamflux service invoke binance getTicker --param symbol=BTC/USDT

# Multiple parameters
seamflux service invoke telegram sendMessage --param credential="Bot1" --param chatId="123456" --param text="Hello World"

# Nested JSON body (--body)
seamflux service invoke notion createPage --body '{"parent":{"database_id":"abc123"},"properties":{"Name":{"title":[{"text":{"content":"My Page"}}]}}}'

# Parameters from file (--file)
seamflux service invoke binance placeOrder --file ./order-params.json

# Parameters from stdin (pipe)
cat params.json | seamflux service invoke binance placeOrder --stdin

# Output as JSON
seamflux service invoke binance getTicker --param symbol=BTC/USDT --json
```

### Credential-Backed Service Calls

When a service requires a `credential` parameter:

```bash
# Step 1: Check available connections for the credential type
seamflux connection list telegram

# Output shows:
#   Name:            My Bot
#   Credential Type: telegram
#   Remark:          Production bot

# Step 2: Invoke with the connection name as credential
seamflux service invoke telegram sendMessage --param credential="My Bot" --param text="Hello"

# If multiple connections exist, the user must choose which one to use
```

## Service Capability Guide

Use this to narrow which services to look for before calling `service query --query "..."`. Map the user's goal to a capability family, then query with terms that match that family or the listed service names. The map is a hint to improve search; always confirm exact service and method via `service query` or `service list`.

| User intent / capability | Likely services (service names) | Example query |
|--------------------------|------------------------------|---------------|
| CEX spot/futures, exchange API | binance, okx, backpack, bybit, gate, bitget, coinbase | `service query --query "binance ticker"` or `"cex order"` |
| DEX perpetuals | hyperliquid, based, lighter, paradex, aster, grvt, ethereal, nado | `service query --query "perpetual"` or service name |
| DeFi swap/liquidity | o1exchange, liquidityHub | `service query --query "swap"` |
| Sui DeFi / swap / lending | bluefin, cetus, sevenK, momentum, scallop, alphaLend, navi | `service query --query "sui swap"` or `"lending"` |
| Notifications, social, messaging | sendMail, telegram, discord, twitter | `service query --query "send message"` or `"telegram"` |
| On-chain data or operations | chainKit | `service query --query "onchain"` or `"chainKit"` |
| Charts | quickChart | `service query --query "chart"` |
| Prediction / forecasting | polymarket, opinion | `service query --query "prediction"` |
| AI analysis | ai | `service query --query "ai analysis"` |
| Market data (aggregated) | marketData | `service query --query "market data"` |
| Office, docs, DB, collaboration | notion, gmail, google-sheets, slack, supabase | `service query --query "notion"` or `"slack"` |
| Webhook, human-in-the-loop | base, humanInTheLoop | `service query --query "webhook"` or `"human"` |
| NFT market | opensea | `service query --query "nft"` or `"opensea"` |

- If the user's goal fits none of these, use `service query --query "<user description>"` or `service list` and pick from results.
- After narrowing, always resolve exact `service` and `method` via `service query` or docs before invoking.

## Parameter and Communication Guidelines

- **Talk in natural language** — Ask "What's the workflow ID?" or "What do you want to search for?" rather than "Enter --id" or "Enter --q". If the user already gave values, use them; do not re-ask.
- **Service invoke parameters** — Use `--param key=value` for simple types; use `--body '{"key":...}'` for nested objects/arrays (single-quote JSON in shell). For large payloads use `--file <path>` or `--stdin` when piping. Priority: stdin > file > body > params.
- **Prefer `--json` when chaining steps** — If the next step depends on parsing results, filtering matches, or selecting IDs/methods, prefer JSON output over prose tables.
- **Credential-backed service calls** — If the service parameters include `credential`, first run `seamflux connection list <type>` to inspect the user's saved credentials in SeamFlux app. If exactly one matching connection exists, use its `name` as `credential`. If multiple exist, ask the user which one to use. Pass it as `credential: "<name>"` in the invoke payload.

## Command Cheatsheet

| Area | Read | Write (confirm first) |
|------|-----|----------------------|
| **Workflow** | `workflow list`, `workflow get --id <id>`, `workflow search --q <query>` | `workflow delete --id <id>`, `workflow execute --id <id>`, `workflow generate --requirement "<text>"` |
| **Script** (local, no API key) | `script list` | `script download --slug <slug>`, `script run <slug\|path>` (no confirm needed for run) |
| **Execution** | `execution list`, `execution logs --id <id>` | `execution run --id <id> --config '{}'`, `execution delete --id <id>` |
| **Service** | `service list`, `service query --query <query> [--service <name>]` | `service invoke <service> <method>` with `--param`, `--body`, `--file`, or `--stdin` |
| **Connection** | `connection list` or `connection list <credential-type>` | — |
| **Config** | `config show` | `config init`, `config set <key> <value>` |

Global options: `--json` for JSON output; `--api-key`, `--base-url` to override config.

## High-Value Flows

- **Execute and monitor (cloud)** — `workflow search --q "..."` or `workflow list` → choose ID → `workflow execute --id <id>` → `execution list` → `execution logs --id <exec_id>`.
- **Run workflow locally** — `script download --slug <slug>` → `script run <slug>`. Use when the user wants to run without API or in a local environment.
- **Generate and run** — `workflow generate --requirement "..."` → then `workflow execute --id <id>` and monitor with execution logs.
- **One-off integration call** — `service query --query "..."` → `service invoke <service> <method>` with appropriate params. For targeted searches, use `service query --query "get price" --service binance` to search only within a specific service.
- **Cross-service outcome** — If the user says something like "place an order on OKX and save to Notion", first use the Service Capability Guide to identify likely services, then use `service query` to confirm exact service/methods, and only then decide whether this should stay a direct service call or become a generated workflow.
- **Credential-backed service call** — If the params require `credential`, run `connection list <type>` first → if one match exists, use its name directly → if multiple matches exist, ask the user to choose → invoke with `credential: "<name>"`. Example: `connection list telegram` returns "My Bot", then `service invoke telegram sendMessage --param credential="My Bot" --param text="Hello"`.
- **Check connection** — `connection list` or `connection list <type>` before assuming an integration is available.

## Terminology

- **Workflow** — Automation definition (cloud). **Script** — Downloaded workflow package (source.js + config.json) run locally with Node.js; no API key. **Execution** — A single run of a workflow. **Service** — External integration (service = service name, method = operation). **Connection** — Stored credential for a service.

## Critical Edge Cases

- **Workflow not found** — Resolve ID via `workflow list` or `workflow search --q "..."`.
- **Script not found (run)** — If `script run <slug>` fails with "Script not found", run `script download --slug <slug>` first. Scripts live under `~/.seamflux/scripts/<slug>/`.
- **Draft workflow** — Only active workflows can be executed; inform the user if status is draft.
- **Execution run** — Requires `--config`; use `'{}'` if no overrides.
- **Service invoke** — Use `service query` to get correct service/method names. Prefer `--param` for flat arguments and `--body` for nested JSON.
- **Credential selection** — If a required `credential` field maps to multiple saved connections of the same type, do not guess; ask the user which connection name to use.
- **No credentials** — Always run `config show` first; on failure, guide to `config init` and stop until configured.
