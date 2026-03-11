# SeamFlux CLI 实现文档

## 1. 概述

本文档定义了 SeamFlux CLI 的设计方案，参考 OKX Trade CLI 架构，为 SeamFlux 工作流平台提供命令行工具。

### 1.1 目标
- 提供统一的 CLI 入口管理 SeamFlux 工作流、执行和服务
- 支持 X-API-Key 认证
- 提供人类友好的表格输出和机器友好的 JSON 输出
- 支持配置文件管理多环境（prod/dev）

### 1.2 核心能力
| 资源 | 操作 |
|------|------|
| Workflow | list, get, search, delete, execute |
| Execution | list, run, logs, delete |
| Service | list, query, invoke |

---

## 2. 架构设计

### 2.1 目录结构

```
seamflux-cli/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── README.md
├── DESIGN.md
├── src/
│   ├── index.ts           # 入口，命令路由
│   ├── parser.ts          # CLI 参数解析
│   ├── formatter.ts       # 输出格式化
│   ├── help.ts            # 帮助文档
│   ├── api-client.ts      # HTTP API 客户端
│   ├── config/
│   │   ├── loader.ts      # 配置加载
│   │   └── toml.ts        # TOML 文件操作
│   └── commands/
│       ├── config.ts      # 配置管理
│       ├── workflow.ts    # 工作流操作
│       ├── execution.ts   # 执行操作
│       └── service.ts     # 服务操作
├── test/
│   └── *.test.ts
```

### 2.2 模块职责

| 模块 | 职责 |
|------|------|
| `parser.ts` | 使用 `node:util/parseArgs` 解析命令行参数 |
| `formatter.ts` | 提供 `printJson`, `printTable`, `printKv` 等输出工具 |
| `help.ts` | 定义 HELP_TREE，支持多级帮助（global/module/subgroup） |
| `api-client.ts` | 封装 fetch，处理 baseURL、headers、错误处理 |
| `config/loader.ts` | 加载 ~/.seamflux/config.toml，支持 profile |
| `commands/*.ts` | 各模块命令实现 |

---

## 3. CLI 规范

### 3.1 命令结构

```
seamflux [全局选项] <模块> <动作> [参数]

全局选项:
  --profile <name>   使用指定配置文件 (默认: default)
  --api-key <key>    直接指定 API Key
  --base-url <url>   指定 API 基础 URL
  --json             输出 JSON 格式
  --help, -h         显示帮助
  --version, -v      显示版本
```

### 3.2 模块设计

#### workflow 模块
```
seamflux workflow list                    # 列出我的工作流
seamflux workflow get --id <id>           # 获取指定工作流
seamflux workflow search --q <query>      # 搜索工作流
seamflux workflow delete --id <id>        # 删除工作流
seamflux workflow execute --id <id>       # 执行工作流
```

#### execution 模块
```
seamflux execution list                   # 列出执行记录
seamflux execution run --id <id>          # 运行已有执行
seamflux execution logs --id <id>         # 查看执行日志
seamflux execution delete --id <id>       # 删除执行
```

#### service 模块
```
seamflux service list                     # 列出在线服务
seamflux service query --q <query>        # 语义搜索服务
seamflux service invoke <node> <method>   # 调用服务方法
```

#### config 模块
```
seamflux config init                      # 交互式初始化配置
seamflux config show                      # 显示当前配置
seamflux config set <key> <value>         # 设置配置项
```

---

## 4. API 客户端设计

### 4.1 客户端结构

```typescript
interface SeamFluxClient {
  baseURL: string;
  apiKey: string;
  
  // Workflow APIs
  listWorkflows(scope: string, params?: object): Promise<ApiResponse>;
  getWorkflow(id: string): Promise<ApiResponse>;
  deleteWorkflow(id: string): Promise<ApiResponse>;
  executeWorkflow(id: string, config?: object): Promise<ApiResponse>;
  
  // Execution APIs
  listExecutions(): Promise<ApiResponse>;
  runExecution(id: string, config: object): Promise<ApiResponse>;
  getExecutionLogs(executionId: string, params?: object): Promise<ApiResponse>;
  deleteExecution(id: string): Promise<ApiResponse>;
  
  // Service APIs
  listServices(): Promise<ApiResponse>;
  queryServices(query: string, k?: number): Promise<ApiResponse>;
  invokeService(nodeName: string, methodName: string, params?: object): Promise<ApiResponse>;
}
```

### 4.2 错误处理

```typescript
interface ApiError {
  code: number;
  message: string;
  suggestion?: string;
}

// 统一错误转换
function toApiError(error: unknown): ApiError {
  // 处理 HTTP 错误、网络错误、API 返回错误
}
```

---

## 5. 配置管理

### 5.1 配置文件位置

```
~/.seamflux/config.toml
```

### 5.2 配置格式

```toml
default_profile = "prod"

[profiles.prod]
api_key = "sf_xxxxxxxx"
base_url = "https://app.seamflux.ai"

[profiles.dev]
api_key = "sf_yyyyyyyy"
base_url = "https://dev.seamflux.ai"
```

### 5.3 配置加载优先级

配置加载遵循**覆盖原则**，优先级从高到低：

```
1. 命令行参数:   --api-key, --base-url
2. 环境变量:     SEAMFLUX_API_KEY, SEAMFLUX_BASE_URL
3. 配置文件:     ~/.seamflux/config.toml (当前 profile)
4. 默认值:       base_url = "https://app.seamflux.ai"
```

**规则说明：**
- 高优先级的配置会完全覆盖低优先级的同名配置
- 低优先级来源的字段不会与高优先级合并
- API Key 必须通过上述方式之一提供，否则命令会报错

---

## 6. 输出格式

### 6.1 表格输出（默认）

```
seamflux workflow list

ID                    TITLE                    STATUS    CREATED
wf_abc123            My Trading Bot           active    2024-01-15
wf_def456            Alert Monitor            draft     2024-01-14
```

### 6.2 JSON 输出（--json）

```json
{
  "code": 0,
  "data": [
    { "id": "wf_abc123", "title": "My Trading Bot", "status": "active" }
  ]
}
```

### 6.3 键值输出（单条详情）

```
seamflux workflow get --id wf_abc123

ID:           wf_abc123
Title:        My Trading Bot
Status:       active
Created At:   2024-01-15T08:30:00Z
```

---

## 7. 帮助系统设计

### 7.1 多级帮助

```typescript
type HelpTree = Record<string, GroupInfo>;

interface GroupInfo {
  description: string;
  commands?: Record<string, CommandInfo>;
  subgroups?: Record<string, GroupInfo>;
}

// 支持:
// seamflux --help              # 全局帮助
// seamflux workflow --help     # 模块帮助
// seamflux service --help      # 模块帮助
```

### 7.2 帮助渲染

- 全局帮助：列出所有模块
- 模块帮助：列出该模块所有命令
- 子组帮助：列出子组命令（如需要）

---

## 8. 依赖与构建

### 8.1 核心依赖

```json
{
  "dependencies": {
    "smol-toml": "^1.3.4"    // TOML 解析/序列化
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 8.2 构建配置

```typescript
// tsup.config.ts
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node18",
  sourcemap: true,
  clean: true,
  banner: { js: "#!/usr/bin/env node" },
});
```

---

## 9. 实现顺序

### Phase 1: 基础设施
1. `package.json` - 项目配置
2. `tsconfig.json` - TypeScript 配置
3. `tsup.config.ts` - 构建配置
4. `src/formatter.ts` - 输出格式化工具
5. `src/parser.ts` - 参数解析

### Phase 2: 配置管理
6. `src/config/toml.ts` - TOML 读写
7. `src/config/loader.ts` - 配置加载
8. `src/commands/config.ts` - 配置命令

### Phase 3: API 客户端
9. `src/api-client.ts` - HTTP 客户端封装

### Phase 4: 业务命令
10. `src/commands/workflow.ts` - 工作流命令
11. `src/commands/execution.ts` - 执行命令
12. `src/commands/service.ts` - 服务命令

### Phase 5: 入口与帮助
13. `src/help.ts` - 帮助文档
14. `src/index.ts` - 入口与路由

### Phase 6: 测试
15. `test/*.test.ts` - 单元测试

---

## 10. 与 OKX CLI 的差异

| 方面 | OKX CLI | SeamFlux CLI |
|------|---------|--------------|
| 核心库 | `@agent-tradekit/core` | 无，直接使用 fetch |
| 认证 | API Key + Secret + Passphrase | X-API-Key |
| 配置文件 | `~/.okx/config.toml` | `~/.seamflux/config.toml` |
| 业务领域 | 交易（现货、合约、期权） | 工作流、执行、服务 |
| 实时数据 | WebSocket 支持 | 仅 REST API |
| 复杂度 | 高（多模块、多子组） | 中（3个核心模块） |

---

## 11. 附录

### 5.4 环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `SEAMFLUX_API_KEY` | API 认证密钥 | `sf_live_xxxxxxxx` |
| `SEAMFLUX_BASE_URL` | API 基础 URL | `https://app.seamflux.ai` |

**使用场景：**
- **CI/CD 流水线**: 使用环境变量注入 Secret，符合 12-factor 原则
- **临时脚本**: 快速执行无需创建配置文件
- **本地开发**: 临时覆盖配置文件中的设置

```bash
# 示例：环境变量方式
export SEAMFLUX_API_KEY=sf_live_xxxxxxxx
seamflux workflow list

# 示例：一次性执行
SEAMFLUX_API_KEY=sf_live_xxxxxxxx seamflux workflow list
```

### 5.5 配置加载逻辑

```typescript
// src/config/loader.ts
export function loadConfig(options: LoadOptions): SeamFluxConfig {
  // 1. 命令行参数（最高优先级）
  if (options.apiKey) {
    return {
      apiKey: options.apiKey,
      baseURL: options.baseURL || process.env.SEAMFLUX_BASE_URL || DEFAULT_BASE_URL,
    };
  }
  
  // 2. 环境变量
  if (process.env.SEAMFLUX_API_KEY) {
    return {
      apiKey: process.env.SEAMFLUX_API_KEY,
      baseURL: process.env.SEAMFLUX_BASE_URL || DEFAULT_BASE_URL,
    };
  }
  
  // 3. 配置文件
  const profile = options.profile || 'default';
  const config = loadFromToml(profile);
  
  if (!config.apiKey) {
    throw new ConfigError(
      'API Key not found. Please provide it via:\n' +
      '  1. --api-key flag\n' +
      '  2. SEAMFLUX_API_KEY environment variable\n' +
      '  3. seamflux config init'
    );
  }
  
  return config;
}
```

---

## 12. Service 命令设计（AI 友好）

### 12.1 设计目标

AI 模型在生成 CLI 命令时，需要避免复杂的 JSON 转义和引号处理。因此 `service invoke` 命令需要支持多种参数传递方式，让 AI 能够根据参数复杂度自动选择最合适的方案。

### 12.2 命令签名

```bash
seamflux service invoke <node> <method> [options]

Arguments:
  node      服务节点名称 (如: binance, notion, telegram)
  method    方法名 (如: getTicker, sendMessage)

Options:
  -p, --param <key=value>  简单参数，可多次使用（AI 首选）
  -b, --body <json>        JSON 格式的请求体（复杂嵌套参数）
  -f, --file <path>        从 JSON 文件读取参数
  --stdin                  从 stdin 读取 JSON
```

### 12.3 AI 参数传递策略

AI 模型应根据参数复杂度自动选择传递方式：

| 参数类型 | 推荐方式 | 示例 |
|---------|---------|------|
| 简单键值对（string/number/boolean） | `-p k=v` | `-p symbol=BTC/USDT -p limit=100` |
| 嵌套对象/数组 | `--body '<json>'` | `--body '{"parent":{"id":"xxx"}}'` |
| 超大参数 | `-f file.json` | `-f ./payload.json` |
| 管道输入 | `--stdin` | `cat params.json \| seamflux ... --stdin` |

### 12.4 使用示例

#### 方式 1: 简单参数 `-p`（AI 首选）
```bash
# AI 无需处理 JSON 转义，直接拼接字符串即可
seamflux service invoke binance getTicker -p symbol=BTC/USDT -p limit=1

# 支持自动类型转换：string、number、boolean
seamflux service invoke webhook send -p enabled=true -p retries=3 -p url=https://api.example.com
```

#### 方式 2: JSON 字符串 `--body`
```bash
# 复杂嵌套参数，AI 需注意外层使用单引号包裹
seamflux service invoke notion createPage --body '{"parent":{"database_id":"xxx"},"properties":{"Name":{"title":[{"text":{"content":"Hello"}}]}}}'

# 混合使用：简单参数用 -p，复杂部分用 --body
seamflux service invoke telegram sendMessage -p chat_id=123456 --body '{"text":"Hello World","parse_mode":"Markdown"}'
```

#### 方式 3: 文件模式 `-f`（适合大参数）
```bash
# 从 JSON 文件读取参数（适合手动编辑复杂配置）
seamflux service invoke openai chat -f ./chat-config.json

# 文件内容示例（chat-config.json）
# {
#   "model": "gpt-4",
#   "messages": [
#     {"role": "system", "content": "You are a helpful assistant"},
#     {"role": "user", "content": "Hello"}
#   ],
#   "temperature": 0.7
# }

# 搭配环境变量使用
seamflux service invoke database query -f $HOME/.config/seamflux/db-query.json
```

#### 方式 4: 管道模式 `--stdin`（脚本友好）
```bash
# 基本用法：从 echo 传递
echo '{"symbol":"ETH/USDT"}' | seamflux service invoke binance getTicker --stdin

# 从其他命令输出传递
jq -n '{symbol: "BTC/USDT", limit: 10}' | seamflux service invoke binance getTicker --stdin

# 从文件管道传递（无需 -f 选项）
cat ./params.json | seamflux service invoke webhook trigger --stdin

# 链式处理：查询结果直接传递给下一个服务
seamflux workflow get --id wf_123 --json | jq '.data.config' | seamflux service invoke validator validate --stdin

# Heredoc 多行输入（适合内联脚本）
seamflux service invoke notion createPage --stdin << 'EOF'
{
  "parent": {"page_id": "xxx"},
  "properties": {
    "title": {"title": [{"text": {"content": "New Page"}}]}
  }
}
EOF
```

#### 方式 5: 互斥规则
```bash
# 以下方式是互斥的，优先级：stdin > file > body > params
# 同时使用多个方式时，只有最高优先级的生效

# 错误示例（不要这样做）：
seamflux service invoke binance getTicker --stdin -p symbol=BTC/USDT  # --stdin 优先，-p 被忽略
seamflux service invoke binance getTicker -f ./file.json --body '{}'    # -f 优先，--body 被忽略
```

### 12.5 AI 生成命令的决策逻辑

```typescript
// AI 生成命令的伪代码逻辑
function generateServiceCommand(
  node: string,
  method: string,
  params: Record<string, unknown>
): string {
  const entries = Object.entries(params);
  
  // 检查是否全是简单类型（string/number/boolean）
  const allSimple = entries.every(([_, v]) => {
    const type = typeof v;
    return type === 'string' || type === 'number' || type === 'boolean';
  });
  
  if (allSimple) {
    // 使用 -p 方式，无需处理 JSON 转义
    const flags = entries.map(([k, v]) => `-p ${k}=${v}`).join(' ');
    return `seamflux service invoke ${node} ${method} ${flags}`;
  }
  
  // 包含嵌套对象，使用 --body
  // AI 需要注意：外层用单引号包裹，内部双引号无需转义
  const json = JSON.stringify(params);
  return `seamflux service invoke ${node} ${method} --body '${json}'`;
}

// 示例输出对比
// 简单参数:
//   seamflux service invoke binance getTicker -p symbol=BTC/USDT -p limit=100
//
// 复杂参数:
//   seamflux service invoke notion createPage --body '{"parent":{"page_id":"xxx"},"properties":{"title":{"title":[{"text":{"content":"New Page"}}]}}}'
```

### 12.6 参数解析实现

```typescript
// src/commands/service.ts
import { readFile } from 'node:fs/promises';
import { stdin } from 'node:process';

interface InvokeOptions {
  params?: string[];     // -p symbol=BTC/USDT
  body?: string;         // --body '{"key":"value"}'
  file?: string;         // -f ./params.json
  stdin?: boolean;       // --stdin
  json: boolean;         // --json
}

export async function cmdServiceInvoke(
  client: SeamFluxClient,
  node: string,
  method: string,
  opts: InvokeOptions
): Promise<void> {
  const payload = await resolvePayload(opts);
  const result = await client.invokeService(node, method, payload);
  printResult(result, opts.json);
}

/**
 * 解析参数，优先级：stdin > file > body > params
 */
async function resolvePayload(opts: InvokeOptions): Promise<Record<string, unknown>> {
  // 1. 管道模式 --stdin（最高优先级）
  if (opts.stdin) {
    const input = await readStdin();
    if (!input.trim()) {
      throw new Error('STDIN is empty. Please provide JSON data via pipe.');
    }
    return JSON.parse(input);
  }

  // 2. 文件模式 -f
  if (opts.file) {
    try {
      const content = await readFile(opts.file, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${opts.file}`);
      }
      throw new Error(`Failed to parse JSON file: ${(err as Error).message}`);
    }
  }

  // 3. JSON 字符串 --body
  if (opts.body) {
    try {
      return JSON.parse(opts.body);
    } catch (err) {
      throw new Error(`Invalid JSON in --body: ${(err as Error).message}`);
    }
  }

  // 4. 简单参数 -p（最低优先级）
  if (opts.params && opts.params.length > 0) {
    const payload: Record<string, unknown> = {};
    for (const p of opts.params) {
      const eqIdx = p.indexOf('=');
      if (eqIdx === -1) {
        throw new Error(`Invalid param format: ${p}. Expected: key=value`);
      }
      const key = p.slice(0, eqIdx);
      const value = p.slice(eqIdx + 1);
      payload[key] = parseTypedValue(value);
    }
    return payload;
  }

  // 空参数
  return {};
}

/**
 * 从 STDIN 读取数据
 */
function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (stdin.isTTY) {
      reject(new Error('No data provided via STDIN. Use --stdin with piped data, or use -p/-b/-f options.'));
      return;
    }

    let data = '';
    stdin.setEncoding('utf-8');
    stdin.on('data', chunk => data += chunk);
    stdin.on('end', () => resolve(data));
    stdin.on('error', reject);
  });
}

/**
 * 自动类型转换：将字符串值转换为适当类型
 */
function parseTypedValue(v: string): unknown {
  // boolean
  if (v === 'true') return true;
  if (v === 'false') return false;
  
  // null
  if (v === 'null') return null;
  
  // integer
  if (/^-?\d+$/.test(v)) {
    const n = parseInt(v, 10);
    if (!isNaN(n)) return n;
  }
  
  // float
  if (/^-?\d+\.\d+$/.test(v)) {
    const n = parseFloat(v);
    if (!isNaN(n)) return n;
  }
  
  // string (default)
  return v;
}
```

### 12.7 各模式适用场景

| 模式 | 选项 | 适用场景 | 优先级 |
|------|------|---------|--------|
| 管道 | `--stdin` | 脚本链式调用、动态生成参数 | 1（最高） |
| 文件 | `-f <path>` | 复杂配置、重复执行、手动编辑 | 2 |
| JSON | `--body '<json>'` | AI 生成的嵌套参数 | 3 |
| 参数 | `-p k=v` | AI 生成的简单参数（首选） | 4 |

**使用建议：**
- **AI 模型**：优先使用 `-p` 传递简单参数；遇到嵌套对象时使用 `--body` 并确保外层用单引号
- **Shell 脚本**：使用 `--stdin` 实现管道链式操作
- **手动操作**：使用 `-f` 从配置文件读取，方便复用和版本控制

### 12.8 对比：不同方式的 AI 友好度

| 维度 | `-p k=v` | `--body '<json>'` |
|------|----------|-------------------|
| 生成难度 | ⭐⭐⭐⭐⭐ 极低 | ⭐⭐⭐ 中等 |
| 引号处理 | 无需处理 | 外层单引号，内层双引号 |
| 错误率 | 低 | 中等（易忘记引号） |
| 可读性 | 高 | 中（长 JSON 难读） |
| 灵活性 | 适合简单参数 | 适合复杂嵌套 |
| AI 推荐度 | ⭐⭐⭐⭐⭐ 首选 | ⭐⭐⭐ 备选 |

### 12.9 Schema 查询（可选增强）

为了让 AI 更智能地生成命令，建议实现 Schema 查询：

```bash
# 查询服务方法的参数定义
seamflux service schema <node> <method>
```

**示例:**
```bash
$ seamflux service schema binance getTicker

{
  "node": "binance",
  "method": "getTicker",
  "params": {
    "symbol": { "type": "string", "required": true },
    "limit": { "type": "number", "default": 100, "required": false }
  }
}
```

AI 可以利用 Schema 信息：
1. 自动填充必填参数
2. 选择合适的传递方式（简单参数用 `-p`，嵌套对象用 `--body`）
3. 参数类型校验

---

### 13.1 API 端点汇总

| 资源 | 方法 | 端点 | CLI 命令 |
|------|------|------|----------|
| Workflow | GET | /api/workflow?scope=my | workflow list |
| Workflow | GET | /api/workflow?scope=by_id&id={id} | workflow get |
| Workflow | GET | /api/workflow?scope=templates&q={q} | workflow search |
| Workflow | DELETE | /api/workflow?id={id} | workflow delete |
| Workflow | POST | /api/workflow/{id}/execute | workflow execute |
| Execution | GET | /api/execution | execution list |
| Execution | POST | /api/execution/{id}/execute | execution run |
| Execution | GET | /api/execution/logs?executionId={id} | execution logs |
| Execution | DELETE | /api/execution | execution delete |
| Service | GET | /api/service/list | service list |
| Service | POST | /api/service/query | service query |
| Service | POST | /api/service/invoke/{node}/{method} | service invoke |

### 11.2 响应格式

所有 API 返回统一格式：
```json
{
  "code": 0,
  "message": "...",
  "data": { ... }
}
```

- `code === 0` 表示成功
- `code !== 0` 表示失败，message 包含错误信息
