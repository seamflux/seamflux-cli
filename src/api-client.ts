import type { SeamFluxConfig } from "./config/loader.js";

export interface ApiResponse<T = unknown> {
  code: number;
  message?: string;
  data?: T;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: number;
  public readonly traceId?: string;

  constructor(message: string, status: number, code: number, traceId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.traceId = traceId;
  }
}

export class SeamFluxClient {
  private readonly baseURL: string;
  private readonly apiKey: string;

  constructor(config: SeamFluxConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | undefined>
  ): Promise<ApiResponse<T>> {
    const url = new URL(path, this.baseURL);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-Key": this.apiKey,
    };

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new ApiError(
        data?.message || `HTTP ${response.status}`,
        response.status,
        data?.code || -1,
        response.headers.get("x-trace-id") || undefined
      );
    }

    if (data?.code !== 0) {
      throw new ApiError(
        data?.message || "API error",
        response.status,
        data?.code || -1,
        response.headers.get("x-trace-id") || undefined
      );
    }

    return data as ApiResponse<T>;
  }

  // Workflow APIs
  async listWorkflows(params?: {
    scope?: string;
    id?: string;
    sort?: string;
    q?: string;
  }): Promise<ApiResponse> {
    return this.request("GET", "/api/workflow", undefined, {
      scope: params?.scope || "my",
      id: params?.id,
      sort: params?.sort,
      q: params?.q,
    });
  }

  async getWorkflow(id: string): Promise<ApiResponse> {
    return this.request("GET", "/api/workflow", undefined, {
      scope: "by_id",
      id,
    });
  }

  async deleteWorkflow(id: string): Promise<ApiResponse> {
    return this.request("DELETE", "/api/workflow", undefined, { id });
  }

  async executeWorkflow(id: string, config?: Record<string, unknown>): Promise<ApiResponse<{ executionId: string }>> {
    return this.request("POST", `/api/workflow/${id}/execute`, { config: config });
  }

  async generateWorkflow(requirement: string): Promise<ApiResponse> {
    return this.request("POST", "/api/workflow/generate", { requirement });
  }

  // Execution APIs
  async listExecutions(): Promise<ApiResponse> {
    return this.request("GET", "/api/execution");
  }

  async runExecution(id: string, config: Record<string, unknown>): Promise<ApiResponse> {
    return this.request("POST", `/api/execution/${id}/execute`, { config: config });
  }

  async getExecutionLogs(params: {
    executionId?: string;
    limit?: string;
    afterSeq?: string;
    since?: string;
    until?: string;
    level?: string;
    serviceName?: string;
    nodemethod?: string;
  }): Promise<ApiResponse> {
    return this.request("GET", "/api/execution/logs", undefined, {
      executionId: params.executionId,
      limit: params.limit,
      afterSeq: params.afterSeq,
      since: params.since,
      until: params.until,
      level: params.level,
      nodename: params.serviceName,
      nodemethod: params.nodemethod,
    });
  }

  async deleteExecution(id: string): Promise<ApiResponse> {
    return this.request("DELETE", "/api/execution", { id });
  }

  // Service APIs
  async listServices(): Promise<ApiResponse> {
    return this.request("GET", "/api/service/list");
  }

  async queryServices(query: string, k?: number, where?: string | Record<string, unknown>): Promise<ApiResponse> {
    const body: Record<string, unknown> = { query, k };
    if (where !== undefined) {
      body.where = where;
    }
    return this.request("POST", "/api/service/query", body);
  }

  async invokeService(
    serviceName: string,
    methodName: string,
    params?: Record<string, unknown>
  ): Promise<ApiResponse> {
    return this.request("POST", "/api/service/invoke", {
      serviceName,
      methodName,
      ...params,
    });
  }

  // Connection APIs
  async listConnections(credentialType?: string): Promise<ApiResponse> {
    return this.request("GET", "/api/connections", undefined, {
      credentialType,
    });
  }
}
