import type {
  AgentDiscovery,
  HealthResponse,
  Page,
  QueryExplain,
  QueryRequest,
  QueryResult,
  UModelElement,
  WorkspaceMetadata,
  WriteResult,
} from './types'

const workspace: WorkspaceMetadata = {
  id: 'demo',
  name: 'UnifiedModel MCP 测试 Demo',
  description: '跨服务、指标与日志的统一语义模型交互演示。',
  labels: { environment: 'demo', source: 'github-pages' },
  paths: { root: '/demo' },
  status: 'active',
  resource_version: 1,
  created_at: '2026-07-15T00:00:00Z',
  updated_at: '2026-07-15T00:00:00Z',
}

const umodel: UModelElement[] = [
  {
    kind: 'entity_set',
    domain: 'service',
    name: 'service.app',
    version: 'v1',
    spec: { display_name: '应用服务', fields: ['name', 'owner', 'status', 'language'] },
  },
  {
    kind: 'entity_set',
    domain: 'infra',
    name: 'infra.host',
    version: 'v1',
    spec: { display_name: '计算节点', fields: ['hostname', 'region', 'cpu_usage'] },
  },
  {
    kind: 'metric_set',
    domain: 'observability',
    name: 'service.metrics',
    version: 'v1',
    spec: { display_name: '服务指标', measures: ['request_rate', 'error_rate', 'p95_latency'] },
  },
  {
    kind: 'log_set',
    domain: 'observability',
    name: 'service.logs',
    version: 'v1',
    spec: { display_name: '服务日志', fields: ['timestamp', 'level', 'trace_id', 'message'] },
  },
  {
    kind: 'storage',
    domain: 'observability',
    name: 'prometheus',
    version: 'v1',
    spec: { display_name: 'Prometheus', provider: 'prometheus' },
  },
  {
    kind: 'data_link',
    domain: 'service',
    name: 'service_to_metrics',
    version: 'v1',
    spec: {
      src: { domain: 'service', kind: 'entity_set', name: 'service.app' },
      dest: { domain: 'observability', kind: 'metric_set', name: 'service.metrics' },
    },
  },
  {
    kind: 'data_link',
    domain: 'service',
    name: 'service_to_logs',
    version: 'v1',
    spec: {
      src: { domain: 'service', kind: 'entity_set', name: 'service.app' },
      dest: { domain: 'observability', kind: 'log_set', name: 'service.logs' },
    },
  },
  {
    kind: 'storage_link',
    domain: 'observability',
    name: 'metrics_to_prometheus',
    version: 'v1',
    spec: {
      src: { domain: 'observability', kind: 'metric_set', name: 'service.metrics' },
      dest: { domain: 'observability', kind: 'storage', name: 'prometheus' },
    },
  },
]

const services = [
  entity('checkout-api', '结算服务', 'commerce', 'healthy', 'Go'),
  entity('order-api', '订单服务', 'commerce', 'healthy', 'Java'),
  entity('payment-api', '支付服务', 'fintech', 'warning', 'Go'),
  entity('inventory-api', '库存服务', 'supply-chain', 'healthy', 'Python'),
  entity('recommendation-api', '推荐服务', 'growth', 'healthy', 'Python'),
]

const topology = [
  edge(services[0], 'calls', services[1], 42),
  edge(services[0], 'calls', services[2], 76),
  edge(services[1], 'calls', services[3], 31),
  edge(services[0], 'calls', services[4], 28),
  edge(services[4], 'reads_from', services[3], 19),
]

const health: HealthResponse = {
  status: 'ok',
  graphstore: {
    provider: 'static-demo',
    status: 'ok',
    message: 'Interactive GitHub Pages demonstration data',
  },
}

function entity(id: string, name: string, owner: string, status: string, language: string) {
  return {
    __domain__: 'service',
    __entity_type__: 'service.app',
    __entity_id__: id,
    id,
    name,
    owner,
    status,
    language,
  }
}

function edge(src: Record<string, unknown>, relationType: string, dest: Record<string, unknown>, latency: number) {
  return {
    src,
    relation: { __relation_type__: relationType, latency_ms: latency },
    dest,
  }
}

function queryResult(payload: QueryRequest): QueryResult {
  const query = payload.query || ''
  if (query.includes('.umodel')) {
    return {
      columns: ['kind', 'domain', 'name', 'version', 'spec'],
      rows: umodel.map((element) => ({ ...element })),
      page: { limit: payload.limit ?? 1000 },
      explain: explainFor('.umodel'),
    }
  }
  if (query.includes('.topo')) {
    return {
      columns: ['src', 'relation', 'dest'],
      rows: topology,
      page: { limit: payload.limit ?? 100 },
      explain: explainFor('.topo'),
    }
  }
  if (query.includes('.entity')) {
    return {
      columns: Object.keys(services[0]),
      rows: services,
      page: { limit: payload.limit ?? 100 },
      explain: explainFor('.entity'),
    }
  }
  return {
    columns: ['service', 'request_rate', 'error_rate', 'p95_latency_ms'],
    rows: services.map((service, index) => ({
      service: service.name,
      request_rate: 1280 - index * 137,
      error_rate: Number((0.7 + index * 0.35).toFixed(2)),
      p95_latency_ms: 84 + index * 19,
    })),
    page: { limit: payload.limit ?? 100 },
    explain: explainFor('.entity'),
  }
}

function explainFor(source: QueryExplain['source']): QueryExplain {
  return {
    source,
    provider: 'static-demo',
    storage_provider: 'bundled-json',
    operators: ['scan', 'filter', 'limit'],
    limit: 100,
  }
}

const discovery: AgentDiscovery = {
  workspace: 'demo',
  tools: [
    {
      name: 'query_umodel',
      description: '查询统一语义模型中的对象、实体与拓扑关系',
      enabled: true,
      input_schema: { type: 'object', properties: { query: { type: 'string' } } },
    },
  ],
  resources: [
    {
      uri: 'umodel://demo/schema',
      name: 'Demo schema',
      kind: 'umodel',
      description: 'GitHub Pages 演示工作区的模型结构',
      mime_type: 'application/json',
      read_only: true,
    },
  ],
}

export async function staticDemoResponse<T>(path: string, method: string, body: unknown): Promise<T> {
  await Promise.resolve()
  let result: unknown

  if (path === '/healthz') {
    result = health
  } else if (path.startsWith('/api/v1/workspaces?')) {
    result = { items: [workspace] } satisfies Page<WorkspaceMetadata>
  } else if (path === '/api/v1/workspaces/demo' && method === 'GET') {
    result = workspace
  } else if (path.includes('/query/demo/execute')) {
    result = queryResult((body || { query: '' }) as QueryRequest)
  } else if (path.includes('/query/demo/explain')) {
    result = explainFor('.entity')
  } else if (path.includes('/agent/demo/discover')) {
    result = discovery
  } else if (path.includes('/resources:read')) {
    result = { uri: 'umodel://demo/schema', mime_type: 'application/json', content: umodel }
  } else if (path.includes('/tools:execute')) {
    result = { name: 'query_umodel', ok: true, output: queryResult({ query: '.umodel' }) }
  } else if (path.includes('/validate')) {
    result = { valid: true }
  } else if (method === 'POST' || method === 'DELETE' || method === 'PUT') {
    result = { accepted: 1, failed: 0 } satisfies WriteResult
  } else {
    throw new Error(`Static demo has no response for ${method} ${path}`)
  }

  return result as T
}
