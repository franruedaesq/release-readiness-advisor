import { Injectable } from '@nestjs/common';
import { Counter, Histogram, register } from 'prom-client';

@Injectable()
export class MetricsService {
  // --- Agent Metrics ---
  public readonly agentInvocations = new Counter({
    name: 'agent_invocations_total',
    help: 'Total number of agent invocations',
    labelNames: ['agent'],
  });

  public readonly agentDuration = new Histogram({
    name: 'agent_duration_seconds',
    help: 'Duration of agent execution in seconds',
    labelNames: ['agent'],
    buckets: [0.1, 0.5, 1, 2, 5, 10], // Buckets in seconds
  });

  // --- RAG Metrics ---
  public readonly ragChunksTotal = new Counter({
    name: 'rag_chunks_total',
    help: 'Total number of chunks processed and stored in RAG',
    labelNames: ['source'],
  });

  public readonly ragRetrievalDuration = new Histogram({
    name: 'rag_retrieval_latency_seconds',
    help: 'Latency of RAG retrieval in seconds',
    labelNames: ['agent'],
    buckets: [0.05, 0.1, 0.25, 0.5, 1],
  });

  // --- LLM & Quality Metrics (Placeholders) ---
  public readonly llmCost = new Counter({
    name: 'agent_llm_cost_usd_total',
    help: 'Total cost of LLM calls in USD',
    labelNames: ['agent', 'model'],
  });

  constructor() {
    // This clears the registry of any old metrics, useful for hot-reloading
    register.clear();
    // It's important to register the metrics
    register.registerMetric(this.agentInvocations);
    register.registerMetric(this.agentDuration);
    register.registerMetric(this.ragChunksTotal);
    register.registerMetric(this.ragRetrievalDuration);
    register.registerMetric(this.llmCost);
  }

  // Helper method to get all metrics for the /metrics endpoint
  async getMetrics() {
    return register.metrics();
  }
}
