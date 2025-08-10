import { Injectable } from '@nestjs/common';
import { Counter, Histogram, register } from 'prom-client';
import { ChatOpenAI } from '@langchain/openai';

const MODEL_COSTS = {
  // gpt-4o: $5 input, $15 output per 1M tokens
  'gpt-4.1': { input: 2 / 1_000_000, output: 8 / 1_000_000 },
  'gpt-5': { input: 1.25 / 1_000_000, output: 10 / 1_000_000 },
  'gpt-5-mini': { input: 0.25 / 1_000_000, output: 2 / 1_000_000 },
};

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
  // --- New LLM & Quality Metrics ---
  public readonly llmPromptTokens = new Counter({
    name: 'llm_prompt_tokens_total',
    help: 'Total prompt tokens sent to LLM',
    labelNames: ['agent', 'model'],
  });
  public readonly llmCompletionTokens = new Counter({
    name: 'llm_completion_tokens_total',
    help: 'Total completion tokens received from LLM',
    labelNames: ['agent', 'model'],
  });
  public readonly llmCost = new Counter({
    name: 'agent_llm_cost_usd_total',
    help: 'Total cost of LLM calls in USD',
    labelNames: ['agent', 'model'],
  });
  public readonly ragAnswerAlignmentScore = new Histogram({
    name: 'rag_answer_alignment_score',
    help: 'LLM-as-judge score for RAG answer alignment',
    labelNames: ['model'],
    buckets: [0, 1, 2, 3, 4, 5],
  });

  constructor() {
    register.clear();
    // Register all metrics
    Object.values(this).forEach((metric) => {
      if (metric instanceof Counter || metric instanceof Histogram) {
        register.registerMetric(metric);
      }
    });
  }

  // --- Helper Methods ---

  public recordLlmUsage(
    usage: { promptTokens: number; completionTokens: number },
    agent: string,
    model: string,
  ) {
    if (!usage) return;

    this.llmPromptTokens.inc({ agent, model }, usage.promptTokens);
    this.llmCompletionTokens.inc({ agent, model }, usage.completionTokens);

    const costMapping = MODEL_COSTS[model] || MODEL_COSTS['gpt-5']; // Default to gpt-5 pricing
    const cost =
      usage.promptTokens * costMapping.input +
      usage.completionTokens * costMapping.output;
    this.llmCost.inc({ agent, model }, cost);
  }

  public async judgeAnswerAlignment(
    question: string,
    context: string,
    answer: string,
    modelName: string,
  ): Promise<void> {
    const judgeModel = new ChatOpenAI({ model: 'gpt-5' });
    const prompt = `You are an expert evaluator. Your task is to assess if the given "Answer" is well-aligned with the provided "Context" to answer the "Question".
    Score on a scale of 0 to 5, where 5 is perfectly aligned and 0 is completely misaligned.
    Return ONLY the integer score and nothing else.

    Question: ${question}
    Context: ${context}
    Answer: ${answer}`;

    try {
      const response = await judgeModel.invoke(prompt);
      const score = parseInt(response.content as string, 10);
      if (!isNaN(score) && score >= 0 && score <= 5) {
        this.ragAnswerAlignmentScore.observe({ model: modelName }, score);
      }
    } catch (error) {
      console.error('LLM-as-judge call failed:', error);
    }
  }

  async getMetrics() {
    return register.metrics();
  }
}
