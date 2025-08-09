import { Injectable, Logger } from '@nestjs/common';
import { ChromaClient, Collection } from 'chromadb';
import { DefaultEmbeddingFunction } from '@chroma-core/default-embed';
import { MetricsService } from 'src/metrics/metrics.service';

export interface RiskAnalysisResult {
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  summary: string;
  evidence: string[];
}

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);
  private readonly chroma: ChromaClient;
  private readonly embeddingFunction = new DefaultEmbeddingFunction();

  constructor(private readonly metricsService: MetricsService) {
    this.chroma = new ChromaClient({ path: 'http://localhost:8000' });
  }

  async analyzeRisk(runId: number): Promise<RiskAnalysisResult> {
    this.metricsService.agentInvocations.inc({ agent: 'risk_agent' });
    const agentTimer = this.metricsService.agentDuration.startTimer({
      agent: 'risk_agent',
    });
    const retrievalTimer = this.metricsService.ragRetrievalDuration.startTimer({
      agent: 'risk_agent',
    });
    this.logger.log(`Starting risk analysis for run ID: ${runId}`);

    const collection = await this.chroma.getOrCreateCollection({
      name: 'release_artifacts',
      embeddingFunction: this.embeddingFunction,
    });

    // Query for documents related to failures, errors, and vulnerabilities.
    const results = await collection.query({
      queryTexts: [
        'summary of test failures, errors, and critical vulnerabilities',
      ],
      nResults: 10, // Get up to 10 relevant chunks
      where: { runId: runId }, // Filter by the specific workflow runId
    });
    retrievalTimer();
    const evidence = results.documents[0] ?? [];
    this.logger.log(`Retrieved ${evidence.length} evidence chunks.`);

    let riskScore = 0;
    let summary = 'No significant risks detected.';
    const findings: string[] = [];

    // Simple keyword-based risk scoring
    for (const doc of evidence) {
      if (!doc) continue;

      if (doc.includes('FAILED')) {
        riskScore += 40;
        findings.push('Test failures detected.');
      }
      if (doc.includes('High severity')) {
        riskScore += 50;
        findings.push('High severity vulnerabilities found.');
      }
      if (doc.includes('Medium severity')) {
        riskScore += 20;
        findings.push('Medium severity vulnerabilities found.');
      }
    }

    // Cap the score at 100
    riskScore = Math.min(riskScore, 100);

    let riskLevel: RiskAnalysisResult['riskLevel'] = 'Low';
    if (riskScore >= 90) {
      riskLevel = 'Critical';
      summary = 'Critical risks identified. Deployment is not recommended.';
    } else if (riskScore >= 70) {
      riskLevel = 'High';
      summary = 'High risks identified. Proceed with extreme caution.';
    } else if (riskScore >= 40) {
      riskLevel = 'Medium';
      summary = 'Medium risks identified. Review required before deployment.';
    }

    // Remove duplicate findings
    const uniqueFindings = [...new Set(findings)];
    if (uniqueFindings.length > 0) {
      summary = uniqueFindings.join(' ');
    }

    this.logger.log(
      `Analysis complete. Risk score: ${riskScore} (${riskLevel})`,
    );

    const filteredEvidence = evidence.filter(
      (e): e is string => e !== null && e !== undefined,
    );

    agentTimer();

    return {
      riskScore,
      riskLevel,
      summary,
      evidence: filteredEvidence,
    };
  }
}
