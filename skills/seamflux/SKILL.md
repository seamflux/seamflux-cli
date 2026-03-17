---
name: seamflux
description: >-
  Manages SeamFlux automations: find or generate workflows from requirements,
  run workflows and monitor executions, discover and invoke services, check
  connections for credential-backed service calls, and manage signing keys for
  blockchain transaction signing. Also supports downloading workflow scripts
  and running them locally with Node.js (no API key). Use when the user wants
  to build or run an automation, operate known SeamFlux-backed services such
  as OKX, Binance, Notion, Telegram, Slack, Google Sheets, or Supabase, inspect
  a run, verify a connection, run a workflow locally, choose which saved credential
  to use, or sign blockchain transactions. Cloud actions require the seamflux CLI
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

Use this skill when the user wants to **build or run an automation**, **run or monitor a workflow**, **download or run a workflow script locally** (no API key), **use a known SeamFlux-backed integration** (e.g. OKX, Binance, Notion, Telegram, Slack, Google Sheets, Supabase), **check whether a connection is set up**, or **manage signing keys and sign blockchain transactions**. This skill should also trigger for cross-service requests such as "place an order on OKX and save it to Notion" even if the user does not mention SeamFlux explicitly. Cloud commands (workflow, execution, service, connection, signer) require the `seamflux` CLI and valid API credentials; **script** commands (download, list, run) do not require credentials.

## Pre-flight Checks

Every time before running any `seamflux` command, follow these steps in order. Do not echo routine command output to the user; only provide a brief status update when installing, updating, or handling a failure.

1. **Confirm installed** — Run `which seamflux` (on Windows: `where seamflux`). If not found, install with `npm install -g @seamflux/cli` and report briefly (e.g. "Installing SeamFlux CLI…" / "Installed." or "Install failed: …").
2. **Ensure credentials** (only before **workflow / execution / service / connection / signer** commands) — Run `seamflux config show`. If it errors or shows no API key: stop, tell the user to run `seamflux config init` locally, and wait before retrying. Do not ask for, accept, or write API keys from chat. **Skip this step for `script` commands** (download, list, run); they work without API credentials.
3. **401 errors** — Do not retry. Tell the user the key may be invalid or expired and to update `~/.seamflux/config.toml` locally; do not paste credentials in chat. After they confirm, run `seamflux config show` then retry.

## When to Use This Skill

Apply this skill when the user intent matches any of the following:

- **Find or run automations** — list workflows, search by topic, get details, execute a workflow, or generate a new workflow from a natural-language requirement.
- **Download or run workflow scripts locally** — download a workflow script package by slug (no API key), list downloaded scripts, or run a script with Node.js locally.
- **Inspect or manage runs** — list executions, view logs, re-run or delete an execution.
- **Use integrations directly** — discover services by semantic search, invoke a service method (e.g. get ticker, send message, create page).
- **Verify connections** — list connected accounts, check a specific credential type, or choose the right saved credential for a service call.
- **Sign blockchain transactions** — create signing keys, list signers, or sign transactions using Privy wallet infrastructure.
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
| Create workflow from description | `workflow generate --requirement "<detailed requirement>"` — Generates complex workflow orchestrations in SeamFlux Cloud. The requirement must be detailed: specify each step, services to call, trigger conditions, stop conditions, loops, or monitoring logic. For simple single-service calls, prefer `service invoke`. Then suggest executing with `workflow execute --id <returned_id>`. |
| Run a workflow (cloud) | `workflow execute --id <id>` (optional: `--config '{"key":"value"}'`). Confirm workflow ID before running. After start, use `execution list` and `execution logs --id <exec_id>` to monitor. |
| Download workflow script (local) | `script download --slug <slug>`. No API key. Saves to `~/.seamflux/scripts/<slug>/` (source.js + config.json). |
| List downloaded scripts | `script list`. No API key. |
| Run workflow script locally | **Use background mode with log persistence.** `seamflux script run` may be long-running. Use the `process` tool in background mode, redirect logs to `logs/seamflux/<slug>.log`, and view logs with `read` or `grep`. Multiple scripts can run in parallel. Do NOT use `process poll`. |
| List or inspect executions | `execution list`; for logs use `execution logs --id <id>`. |
| Re-run an execution | `execution run --id <id> --config '{}'` (config required; use `{}` if no overrides). Confirm before running. |
| Find a service / integration | **DO NOT GUESS service names.** First run `seamflux service list` to get all available services. Then use `service query --query "<what user wants>"` (e.g. "send message", "okx order", "notion page"). If the user already named the service, narrow with `--service <name>`. |
| Call a service method | **DO NOT GUESS method names or parameters.** Before invoking, run `seamflux service query --query "<functional description>" --service <service>` to get the exact method name and required parameters. Then use `service invoke <serviceName> <method>` with params. Prefer `--param key=value` for simple args; use `--body '{"...":...}'` for nested JSON; use `--file <path>` for file input or `--stdin` when piping. Confirm service name, method, and params before invoking. |
| Check connections | `connection list` or `connection list <credential-type>` to see connected accounts. When a service call needs a `credential` parameter, use the credential type to find saved connections first. |
| Sign blockchain transactions | `signer create [name]` to create a signing key, `signer list` to view signers, `signer sign <walletAddress> [transaction]` to sign transactions. Uses P-256 keys and Privy wallet infrastructure. |

## Default Operating Flow

1. **Credential check** — Run `seamflux config show` before any workflow/execution/service/connection command. If not configured, stop and guide to `seamflux config init`. **Omit for script** (download/list/run).
2. **Identify intent** — Map the user's goal to one of: workflow (list/get/search/delete/execute/generate), execution (list/run/logs/delete), **script** (download/list/run — local, no API key), service (list/query/invoke), connection (list), or signer (create/list/sign).
3. **Read first when ambiguous** — If the user did not give an ID or exact name, run a read or search (e.g. `workflow search`, `service query`) before any write.
   - **For services**: Always run `seamflux service list` first to get all available service names. **NEVER guess service names** (e.g., don't assume "binance" exists without checking the list first).
   - **For methods**: Always run `seamflux service query --query "<functional description>" --service <service>` first to get the exact method name and parameters. **NEVER guess method names or their parameters**.
4. **Confirm before writes** — For delete, execute, run, or service invoke: confirm the target (workflow ID, execution ID, service+method+params) once with the user before executing.
5. **Verify after writes** — After execute/run, suggest `execution list` and `execution logs --id <id>`. After delete, run the matching list to confirm.

## Safety and Confirmation Rules

- **Destructive actions** (workflow delete, execution delete): Always confirm the exact ID with the user before running.
- **Execute / run / invoke**: Confirm workflow ID, execution ID, or service name + method + parameters before running.
- **Do not** retry the same command after a 401; guide the user to fix credentials first.
- **Do not** overwrite an existing `~/.seamflux/config.toml`; use `config init` if the file already exists.

## Choosing Workflow vs Script vs Execution vs Service vs Connection

- **Workflow** — Multi-step automation in the cloud, including orchestrated tasks, loops, monitoring mechanisms, and conditional logic. Use when the user talks about "workflow", "automation", "run my bot", "monitor and alert", "when X happens do Y", or "create an automation that...". Use `workflow generate --requirement "..."` when they describe a multi-step goal and no workflow exists yet; the requirement must detail each step, services involved, trigger/stop conditions. Use `workflow execute` to run in SeamFlux cloud sandbox.
- **Script** — Local workflow script (download, list, run with Node.js). Use when they want to **download** a workflow script, **list** downloaded scripts, or **run a workflow locally** without API key. Prefer `script run <slug>` over `workflow execute` when they say "run locally", "run on my machine", or "without API". Scripts may run for extended periods; always launch in background mode with persistent logging.
- **Execution** — A single run of a workflow (cloud). Use when they ask about "last run", "logs", "re-run", or "execution".
- **Service** — Single integration call (e.g. get price, send message). Use when they want one action from an app (Binance, Notion, Telegram, etc.) without a full workflow. **Always run `service list` first to discover available services, and `service query` to get exact method names.**
- **Connection** — Whether an integration is connected, and which saved credential to use. Use when they ask "is X connected?", "list my connections", or when a service method requires a `credential` parameter.
- **Signer** — Create and manage signing keys for blockchain transaction signing. Use when they want to create a signer, list signers, or sign a transaction. Uses P-256 elliptic curve keys and Privy wallet infrastructure.

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

`workflow generate` creates complex workflow orchestrations in SeamFlux Cloud. Use for multi-step automations, loops, monitoring, and conditional logic. The `--requirement` parameter must be detailed and explicit:

- **Each step** — What actions to perform and in what order
- **Services to call** — Which integrations to use (check `service list` first)
- **Trigger conditions** — When to start (e.g., "when BTC price > $90,000", "every 15 minutes")
- **Stop conditions** — When to halt (e.g., "after 10 iterations", "when target reached")
- **Data flow** — How data passes between steps

**Example — Complex monitoring + trading workflow:**

```bash
# Monitor Binance BTC spot price and trade on OKX with notification
seamflux workflow generate --requirement "Monitor Binance BTC spot 15-minute kline. When MA (moving average) is greater than 90000, place a market order on OKX to buy 0.01 BTC. After the order succeeds, send a notification via Telegram with order details. Repeat this monitoring loop until manually stopped."
```

This generates a cloud workflow that:
1. Periodically fetches Binance BTC 15m kline data
2. Calculates MA and checks if > 90000
3. If triggered, invokes OKX service to place market buy order (0.01 BTC)
4. On success, invokes Telegram service to send notification
5. Continues monitoring (loop until stopped)

```bash
# Delete a workflow (confirm with user first)
seamflux workflow delete --id wf_abc123
```

## Script Command Examples (local, no API key)

Use **script** when the user wants to run a workflow locally or avoid using API credentials.

### Download and List Scripts

```bash
# Download a workflow script by slug (no API key)
seamflux script download --slug my-workflow

# List downloaded scripts
seamflux script list
```

### Run Scripts (Background Mode Required)

`seamflux script run` may execute long-running automation tasks (monitoring, trading bots, loops). **Always use the `process` tool in background mode** and persist logs to disk. Do NOT use `process poll`.

**Log file location:** `logs/seamflux/<slug>.log` (create the directory if needed)

```bash
# Step 1: Create logs directory
mkdir -p logs/seamflux

# Step 2: Run script in background with log redirection (via process tool)
# The process tool launches: seamflux script run my-workflow > logs/seamflux/my-workflow.log 2>&1

# Step 3: View logs in real-time
read logs/seamflux/my-workflow.log

# Step 4: Search for specific events in logs
grep "ERROR" logs/seamflux/my-workflow.log
grep "order placed" logs/seamflux/my-workflow.log
```

**Running Multiple Scripts in Parallel:**

Multiple scripts can run simultaneously. Each gets its own log file:

```bash
# Background process 1: Trading bot for BTC
seamflux script run trading-bot-btc > logs/seamflux/trading-bot-btc.log 2>&1 &

# Background process 2: Trading bot for ETH
seamflux script run trading-bot-eth > logs/seamflux/trading-bot-eth.log 2>&1 &

# Background process 3: Price monitor
seamflux script run price-monitor > logs/seamflux/price-monitor.log 2>&1 &
```

**Run with custom config or inline args:**

```bash
# Run with custom config file (background mode)
seamflux script run my-workflow --config ./prod.json > logs/seamflux/my-workflow.log 2>&1 &

# Run with inline args passed to the script (background mode)
seamflux script run my-workflow --symbol=BTCUSDT --interval=1m > logs/seamflux/my-workflow.log 2>&1 &
```

- **Cloud vs local:** `workflow execute --id <id>` runs in SeamFlux cloud; `script run <slug>` runs the same workflow locally with Node.js.
- **Background execution:** Scripts run indefinitely until stopped or encountering an error. Use `process` tool's terminate capability to stop a running script when needed.

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

## Signer Command Examples

Use **signer** to create signing keys and sign blockchain transactions. Signers use P-256 elliptic curve keys and integrate with Privy wallet infrastructure.

### Create and List Signers

```bash
# Create a new signing key with default name "openclaw"
seamflux signer create

# Create a signer with custom name
seamflux signer create my-signer

# List all configured signers
seamflux signer list

# Output as JSON
seamflux signer list --json
```

**Security notes:**
- Private keys are stored locally in `~/.openclaw/.env` (OpenClaw global env file), never uploaded to servers
- Follows OpenClaw's "never overwrite existing values" rule — creation fails if key already exists
- To replace a signer, remove the existing key from environment first, then recreate

### Sign Transactions

The `signer sign` command supports multiple input methods for transaction data (priority: stdin > file > body > use-log > positional arg > params):

```bash
# Method 1: Direct JSON string as positional argument
seamflux signer sign 0x123... '{"type":2,"chain_id":1,"to":"0x456...","value":"0x1000"}'

# Method 2: Using --body for JSON string
seamflux signer sign 0x123... --body '{"type":2,"chain_id":1,"to":"0x456...","value":"0x1000"}'

# Method 3: From JSON file
seamflux signer sign 0x123... --file ./transaction.json

# Method 4: From stdin (pipe)
echo '{"type":2,"chain_id":1,...}' | seamflux signer sign 0x123... --stdin
cat transaction.json | seamflux signer sign 0x123... --stdin

# Method 5: Using --param for individual fields
seamflux signer sign 0x123... \
  --param type=2 \
  --param chain_id=1 \
  --param to=0x456... \
  --param value=1000000000000000000 \
  --param data=0x

# Method 6: Build transaction from service invoke log (chain service calls to signing)
# First, call a service that returns transaction data
seamflux service invoke chainKit buildTransaction --param from=0x123... --param to=0x456... --param value=1000

# Then sign using the logged result
seamflux signer sign 0x123... \
  --use-log chainKit buildTransaction \
  --map result.data.to=to \
  --map result.data.value=value \
  --map result.data.data=data \
  --map result.data.gas_limit=gas_limit

# Use a specific signer (default is "openclaw")
seamflux signer sign 0x123... '{"type":2,...}' --name my-signer
```

**Transaction format:**
```json
{
  "type": 2,
  "chain_id": 1,
  "nonce": "0x0",
  "max_priority_fee_per_gas": "0x...",
  "max_fee_per_gas": "0x...",
  "gas_limit": "0x...",
  "to": "0x...",
  "value": "0x...",
  "data": "0x..."
}
```

**Notes:**
- The wallet address must be registered with Privy; the command automatically fetches the walletId if not cached
- The signed transaction can be broadcast to the blockchain using the appropriate RPC endpoint

## Service Command Examples

### Discover Services

**Rule: Never guess service names. Always use `service list` to get available services first.**

```bash
# Step 1: List all available services (NEVER guess service names)
seamflux service list

# Search by description (semantic search)
seamflux service query --query "send email"

# Search within a specific service only
seamflux service query --query "get price" --service binance

# Output as JSON for scripting
seamflux service query --query "weather" --json
```

### Invoke Services

**Rule: Never guess method names or parameters. Always use `service query --query "..." --service <service>` first.**

```bash
# Step 1: Query to get exact method name and parameters
seamflux service query --query "get ticker price" --service binance

# Step 2: Invoke with the exact method name from query results
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

### Chain Service Calls Using Log Data

When you need to use the result of one service call as input to another, use `--use-log` and `--map`:

```bash
# Step 1: First service call (result is automatically logged)
seamflux service invoke binance getTicker --param symbol=BTC/USDT

# Step 2: Use the logged result in another service call
# --use-log: Specify which service-method log to read (latest entry)
# --map: Map fields from log to target parameters (source=target)

# Example: Send price via Telegram
seamflux service invoke telegram sendMessage \
  --use-log binance getTicker \
  --map price=text

# Multiple field mappings
seamflux service invoke notion createPage \
  --use-log binance getTicker \
  --map symbol=properties.Symbol.title \
  --map price=properties.Price.number

# Nested field access (use dot notation)
seamflux service invoke telegram sendMessage \
  --use-log binance getTicker \
  --map result.data.price=text
```

**How it works:**
1. Every `service invoke` automatically saves the result to `~/.seamflux/logs/service-invoke/{service}-{method}.log`
2. `--use-log <service> <method>` reads the latest entry from that log file
3. `--map <source>=<target>` extracts a field from the log and maps it to a parameter
4. Field paths support dot notation for nested values (e.g., `result.data.price`)

**Error handling:**
- If the log file doesn't exist, the command will suggest running the source service first
- If a mapped field is not found, the command lists all available fields in the log
- This makes it easy for agents to debug and correct field names

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
- **Service names** — **DO NOT GUESS.** Always run `seamflux service list` first to get the actual available service names.
- **Method names and parameters** — **DO NOT GUESS.** Always run `seamflux service query --query "<functional description>" --service <service>` first to get exact method names and required parameters.
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
| **Signer** | `signer list` | `signer create [name]`, `signer sign <walletAddress> [transaction]` |
| **Config** | `config show` | `config init`, `config set <key> <value>` |

Global options: `--json` for JSON output; `--api-key`, `--base-url` to override config.

## 日志数据与后续操作

日志是重要的数据来源，可用于监控执行状态、调试问题以及获取结果进行后续操作。

### Service 命令日志

`service invoke` 命令的调用结果会被记录到执行日志中，可以通过以下方式查看和利用：

```bash
# 调用服务并获取结果
seamflux service invoke binance getTicker --param symbol=BTC/USDT

# 结果包含在 execution logs 中，可用于后续操作
seamflux execution logs --id <exec_id>
```

**从日志中提取数据进行链式操作：**

```bash
# 示例：获取价格后发送通知
# 1. 调用服务获取数据
seamflux service invoke binance getTicker --param symbol=BTC/USDT --json

# 2. 从 execution logs 获取结果并用于下一个服务调用
seamflux execution logs --id <exec_id> --json | jq -r '.price'

# 3. 将提取的数据用于后续 service invoke 调用
seamflux service invoke telegram sendMessage --param text="BTC价格: <price>"
```

### Script 执行日志

`script run` 命令产生的日志保存到本地文件，可作为数据源进行实时分析和后续处理：

```bash
# 脚本日志位置
logs/seamflux/<slug>.log

# 实时查看日志
read logs/seamflux/my-workflow.log

# 从日志中提取特定数据用于后续操作
grep "price:" logs/seamflux/trading-bot.log | tail -1
grep "order_id:" logs/seamflux/trading-bot.log | tail -1

# 结合 jq 提取结构化数据
cat logs/seamflux/my-workflow.log | jq -s '.[] | select(.type == "trade")'
```

**日志作为数据的特点：**
- **实时性**：Script 日志实时写入，可随时读取最新状态
- **可追溯性**：Execution 日志保存完整的调用历史和返回结果
- **可解析性**：使用 `--json` 输出便于程序化解析和处理
- **持久化**：本地脚本日志持久保存，云端执行日志可在平台查看

### 基于日志数据的自动化流程

```bash
# 场景：监控脚本输出并根据结果执行操作
# 1. 启动监控脚本（后台模式）
seamflux script run price-monitor > logs/seamflux/price-monitor.log 2>&1 &

# 2. 定期检查日志中的价格信号
grep "ALERT: price above" logs/seamflux/price-monitor.log

# 3. 当条件满足时，从日志提取数据并调用服务
# 提取订单 ID 查询详情
ORDER_ID=$(grep "order_placed" logs/seamflux/trading-bot.log | tail -1 | jq -r '.orderId')
seamflux service invoke binance getOrder --param orderId="$ORDER_ID"

# 4. 执行结果再次进入日志，形成数据闭环
seamflux execution logs --id <exec_id>
```

## High-Value Flows

- **Execute and monitor (cloud)** — `workflow search --q "..."` or `workflow list` → choose ID → `workflow execute --id <id>` → `execution list` → `execution logs --id <exec_id>`.
- **Run workflow locally** — `script download --slug <slug>` → create `logs/seamflux/` directory → run `seamflux script run <slug>` via `process` tool in background mode with log redirection to `logs/seamflux/<slug>.log` → use `read` or `grep` to monitor logs. Do NOT use `process poll`. Multiple scripts can run in parallel.
- **Generate and run** — `workflow generate --requirement "<detailed requirement>"` → then `workflow execute --id <id>` and monitor with execution logs. The requirement must explicitly describe: each step, services to call, trigger conditions (when to start/act), stop conditions, and any loops or monitoring logic.
- **One-off integration call** — 
  1. `seamflux service list` to get available services (**don't guess**)
  2. `seamflux service query --query "..." --service <service>` to get exact method name and parameters (**don't guess**)
  3. `seamflux service invoke <service> <method>` with appropriate params
- **Cross-service outcome** — If the user says something like "place an order on OKX and save to Notion", first use the Service Capability Guide to identify likely services, then use `service query` to confirm exact service/methods, and only then decide whether this should stay a direct service call or become a generated workflow.
- **Credential-backed service call** — If the params require `credential`, run `connection list <type>` first → if one match exists, use its name directly → if multiple matches exist, ask the user to choose → invoke with `credential: "<name>"`. Example: `connection list telegram` returns "My Bot", then `service invoke telegram sendMessage --param credential="My Bot" --param text="Hello"`.
- **Check connection** — `connection list` or `connection list <type>` before assuming an integration is available.
- **Create signer and sign transaction** — `signer create [name]` to generate P-256 key pair (private key saved to `~/.openclaw/.env`, public key registered with server) → `signer list` to verify → `signer sign <walletAddress> [transaction]` with appropriate transaction data. If signer already exists, creation will fail; user must remove the existing key first.

## Terminology

- **Workflow** — Automation definition (cloud). **Script** — Downloaded workflow package (source.js + config.json) run locally with Node.js; no API key. **Execution** — A single run of a workflow. **Service** — External integration (service = service name, method = operation). **Connection** — Stored credential for a service. **Signer** — P-256 signing key pair for blockchain transaction signing (private key stored locally, public key registered with Privy).

## Critical Edge Cases

- **Workflow not found** — Resolve ID via `workflow list` or `workflow search --q "..."`.
- **Script not found (run)** — If `script run <slug>` fails with "Script not found", run `script download --slug <slug>` first. Scripts live under `~/.seamflux/scripts/<slug>/`.
- **Long-running scripts** — Always launch via `process` tool in background mode with log redirection to `logs/seamflux/<slug>.log`. Use `read` or `grep` to inspect logs. Do NOT use `process poll`.
- **Parallel script execution** — Multiple scripts can run simultaneously. Each script should have its own log file (e.g., `logs/seamflux/script-a.log`, `logs/seamflux/script-b.log`).
- **Draft workflow** — Only active workflows can be executed; inform the user if status is draft.
- **Execution run** — Requires `--config`; use `'{}'` if no overrides.
- **Service invoke** — **DO NOT GUESS.** Use `seamflux service list` to get service names, then `seamflux service query --query "<functional description>" --service <service>` to get exact method names and parameters. Prefer `--param` for flat arguments and `--body` for nested JSON.
- **Credential selection** — If a required `credential` field maps to multiple saved connections of the same type, do not guess; ask the user which connection name to use.
- **Signer already exists** — If `signer create` fails because the signer already exists, inform the user and show `signer list`. To replace, they must manually remove the existing key from `~/.openclaw/.env` first, then recreate.
- **Missing private key** — If `signer sign` fails with "Private key not found", the signer was not created or the env file was modified. Run `signer create <name>` first.
- **No credentials** — Always run `config show` first; on failure, guide to `config init` and stop until configured.
