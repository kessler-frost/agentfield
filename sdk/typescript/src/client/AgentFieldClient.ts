import axios, { AxiosInstance } from 'axios';
import type { AgentConfig, HealthStatus } from '../types/agent.js';

export class AgentFieldClient {
  private readonly http: AxiosInstance;
  private readonly config: AgentConfig;

  constructor(config: AgentConfig) {
    const baseURL = (config.agentFieldUrl ?? 'http://localhost:8080').replace(/\/$/, '');
    this.http = axios.create({ baseURL });
    this.config = config;
  }

  async register(payload: any) {
    await this.http.post('/api/v1/nodes/register', payload);
  }

  async heartbeat(status: 'starting' | 'ready' | 'degraded' | 'offline' = 'ready'): Promise<HealthStatus> {
    const nodeId = this.config.nodeId;
    const res = await this.http.post(`/api/v1/nodes/${nodeId}/heartbeat`, {
      status,
      timestamp: new Date().toISOString()
    });
    return res.data as HealthStatus;
  }

  async execute<T = any>(
    target: string,
    input: any,
    metadata?: {
      runId?: string;
      parentExecutionId?: string;
      sessionId?: string;
      actorId?: string;
    }
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (metadata?.runId) headers['X-Run-ID'] = metadata.runId;
    if (metadata?.parentExecutionId) headers['X-Parent-Execution-ID'] = metadata.parentExecutionId;
    if (metadata?.sessionId) headers['X-Session-ID'] = metadata.sessionId;
    if (metadata?.actorId) headers['X-Actor-ID'] = metadata.actorId;

    const res = await this.http.post(
      `/api/v1/execute/${target}`,
      {
        input
      },
      { headers }
    );
    return (res.data?.result as T) ?? res.data;
  }

  async publishWorkflowEvent(event: {
    executionId: string;
    runId: string;
    workflowId?: string;
    reasonerId: string;
    agentNodeId: string;
    status: 'running' | 'succeeded' | 'failed';
    parentExecutionId?: string;
    parentWorkflowId?: string;
    inputData?: Record<string, any>;
    result?: any;
    error?: string;
    durationMs?: number;
  }) {
    const payload = {
      execution_id: event.executionId,
      workflow_id: event.workflowId ?? event.runId,
      run_id: event.runId,
      reasoner_id: event.reasonerId,
      type: event.reasonerId,
      agent_node_id: event.agentNodeId,
      status: event.status,
      parent_execution_id: event.parentExecutionId,
      parent_workflow_id: event.parentWorkflowId ?? event.workflowId ?? event.runId,
      input_data: event.inputData ?? {},
      result: event.result,
      error: event.error,
      duration_ms: event.durationMs
    };

    await this.http.post('/api/v1/workflow/executions/events', payload).catch(() => {
      // Best-effort; avoid throwing to keep agent execution resilient
    });
  }
}
