import { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  GitBranch,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import './financeCase.css'

interface CaseStep {
  title: string
  goal: string
  query: string
  output: string
  finding: string
  tone: 'danger' | 'warning' | 'success' | 'info'
}

const steps: CaseStep[] = [
  {
    title: '定位故障服务',
    goal: '从平台域中搜索所有状态异常的核心服务。',
    query: ".entity with(domain='platform', name='platform.service', query='degraded') | project display_name, status, owner, sla_tier",
    output: 'payment-gateway  |  degraded  |  payments-backend  |  platinum',
    finding: '支付网关处于 degraded，且违反最高等级 Platinum SLO。',
    tone: 'danger',
  },
  {
    title: '读取可观测信号',
    goal: '通过对象关联自动生成指标与日志查询计划。',
    query: ".entity_set ... | entity-call get_metrics('platform', 'platform.service.metrics', 'latency_p99_ms', step='30s')",
    output: 'P99: 2,150ms  ·  SLO: 800ms  ·  Error rate: 14.8%  ·  Circuit breaker: OPEN',
    finding: '延迟达到阈值的 2.7 倍，错误日志指向下游超时与重试耗尽。',
    tone: 'danger',
  },
  {
    title: '查看上游调用方',
    goal: '沿拓扑反向查询谁在调用 payment-gateway。',
    query: ".topo | graph-call getNeighborNodes('full', 1, [payment-gateway]) | with(__relation_type__='calls')",
    output: 'checkout-service  ──calls──▶  payment-gateway\norder-service     ──calls──▶  payment-gateway',
    finding: '主要流量来自 checkout-service 和 order-service。',
    tone: 'info',
  },
  {
    title: '检查配置变更',
    goal: '关联上游服务最近生效的配置变更。',
    query: ".entity with(domain='platform', name='platform.config_change', query='checkout') | project display_name, change_detail, applied_at",
    output: 'checkout-retry-increase  |  max_retries: 2 → 5, timeout: 500 → 2000ms  |  T-24h',
    finding: '重试次数增加 2.5 倍，具备重试风暴的必要条件。',
    tone: 'warning',
  },
  {
    title: '排除近期部署',
    goal: '验证最显眼的近期部署是否真正改变业务行为。',
    query: ".entity with(domain='platform', name='platform.deployment', query='payment') | project display_name, change_summary, deployed_at",
    output: 'payment-gw v3.2.1  |  Minor: updated logging format  |  T-12h',
    finding: '部署只修改日志格式，是红鲱鱼，不是根因。',
    tone: 'success',
  },
  {
    title: '确认流量放大',
    goal: '跨域查询促销活动及其实际流量。',
    query: ".entity with(domain='business', name='business.promotion', query='active') | project display_name, traffic_multiplier, expected_peak_qps, actual_peak_qps",
    output: 'Flash Sale  |  3.5×  |  expected 12,000 QPS  |  actual 38,000 QPS',
    finding: '促销使基础流量放大 3.5 倍，并与重试配置叠加。',
    tone: 'warning',
  },
  {
    title: '评估影响并执行 Runbook',
    goal: '量化业务影响，加载结构化排障协议并生成受控操作。',
    query: ".umodel with(kind='runbook_set', name='platform.service.ops')",
    output: 'Standard Purchase Flow: 3.2% timeout\nSubscription Renewal: 1.8% timeout\nRecommended tool: rollback_config_change',
    finding: 'Runbook 建议回滚 checkout 重试配置；风险中等，需要人工确认。',
    tone: 'success',
  },
]

export function FinanceCasePage() {
  const [activeStep, setActiveStep] = useState(0)
  const step = steps[activeStep]

  return (
    <div className="finance-case-page">
      <header className="finance-case-hero">
        <div className="finance-case-hero-copy">
          <div className="finance-case-eyebrow"><Sparkles size={14} /> 金融支付 · AI Agent 故障排查案例</div>
          <h1>支付网关 P99 延迟 SLO 违规</h1>
          <p>展示 UModel 如何把服务、配置、促销活动、业务流程和 Runbook 组织成可查询的对象图，并引导 Agent 从告警走到可执行结论。</p>
          <div className="finance-case-tags">
            <span><Database size={14} /> 95 个实体</span>
            <span><GitBranch size={14} /> 126 条关系</span>
            <span><Bot size={14} /> 1 个 Runbook</span>
          </div>
        </div>
        <div className="finance-case-alert">
          <div className="finance-alert-head"><AlertTriangle size={18} /> INC-0042</div>
          <strong>payment-gateway</strong>
          <div className="finance-alert-metric"><span>P99 延迟</span><b>2,150 ms</b></div>
          <div className="finance-alert-bar"><i /></div>
          <div className="finance-alert-foot"><span>SLO 800 ms</span><span>Platinum</span></div>
        </div>
      </header>

      <section className="finance-case-summary">
        <div><Clock3 /><span>事件时间</span><strong>02:17</strong></div>
        <ArrowRight className="finance-summary-arrow" />
        <div><RotateCcw /><span>重试配置</span><strong>2 → 5</strong></div>
        <ArrowRight className="finance-summary-arrow" />
        <div><TrendingUp /><span>促销流量</span><strong>3.5×</strong></div>
        <ArrowRight className="finance-summary-arrow" />
        <div className="danger"><AlertTriangle /><span>有效负载</span><strong>8.75×</strong></div>
      </section>

      <section className="finance-case-workbench">
        <aside className="finance-case-steps">
          <div className="finance-case-section-title">排查步骤 <span>{activeStep + 1} / {steps.length}</span></div>
          {steps.map((item, index) => (
            <button key={item.title} className={index === activeStep ? 'active' : ''} onClick={() => setActiveStep(index)}>
              <span className={`finance-step-index ${item.tone}`}>{index < activeStep ? <CheckCircle2 size={15} /> : index + 1}</span>
              <span><strong>{item.title}</strong><small>{item.goal}</small></span>
              <ChevronRight size={15} />
            </button>
          ))}
        </aside>

        <article className="finance-case-output">
          <div className="finance-case-output-head">
            <div><span>STEP {activeStep + 1}</span><h2>{step.title}</h2></div>
            <span className={`finance-result-pill ${step.tone}`}>已完成</span>
          </div>
          <p className="finance-step-goal">{step.goal}</p>
          <div className="finance-output-block">
            <div className="finance-output-label"><TerminalIcon /> UModel 查询</div>
            <code>{step.query}</code>
          </div>
          <div className="finance-output-block result">
            <div className="finance-output-label"><Database size={14} /> 查询产出</div>
            <pre>{step.output}</pre>
          </div>
          <div className={`finance-finding ${step.tone}`}>
            <ShieldCheck size={18} />
            <div><span>本步结论</span><strong>{step.finding}</strong></div>
          </div>
          <div className="finance-output-actions">
            <button disabled={activeStep === 0} onClick={() => setActiveStep((value) => Math.max(0, value - 1))}>上一步</button>
            <button className="primary" disabled={activeStep === steps.length - 1} onClick={() => setActiveStep((value) => Math.min(steps.length - 1, value + 1))}>下一步 <ArrowRight size={14} /></button>
          </div>
        </article>
      </section>

      <section className="finance-case-conclusion">
        <div className="finance-conclusion-icon"><Bot size={24} /></div>
        <div className="finance-conclusion-main">
          <span>Agent 最终诊断</span>
          <h2>上游重试放大 × 促销流量，导致支付网关 8.75 倍级联过载</h2>
          <p>4,000 基础 QPS × 3.5 促销倍数 × (5 / 2) 重试变化 = 35,000 QPS</p>
        </div>
        <div className="finance-recommendation">
          <span>推荐操作</span>
          <strong>rollback_config_change</strong>
          <small>风险：中等 · 需要人工确认 · 预计 2–3 分钟生效</small>
        </div>
      </section>
    </div>
  )
}

function TerminalIcon() {
  return <span className="finance-terminal-icon">›_</span>
}
