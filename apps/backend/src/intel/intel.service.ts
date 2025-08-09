import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { ChromaClient, Collection } from 'chromadb';
import { DefaultEmbeddingFunction } from '@chroma-core/default-embed'; // Correct import based on new docs
import * as JSZip from 'jszip';
import { xml2js } from 'xml-js';
import { RiskService } from 'src/risk/risk.service';
import { WriterService } from 'src/writer/writer.service';
import { MetricsService } from 'src/metrics/metrics.service';

type Doc = { id: string; text: string; metadata: Record<string, any> };

@Injectable()
export class IntelService {
  private readonly logger = new Logger(IntelService.name);
  private readonly octokit: Octokit;
  private readonly chroma: ChromaClient;
  private readonly owner: string;
  private readonly repo: string;
  private readonly branch: string;
  private readonly embeddingFunction = new DefaultEmbeddingFunction();

  constructor(
    private readonly configService: ConfigService,
    private readonly riskService: RiskService,
    private readonly writerService: WriterService,
    private readonly metricsService: MetricsService,
  ) {
    const owner = this.configService.get<string>('GITHUB_OWNER');
    const repo = this.configService.get<string>('GITHUB_REPO');
    const branch = this.configService.get<string>('GITHUB_BRANCH', 'main'); // Provide a default value

    const githubToken = this.configService.get<string>('GITHUB_TOKEN');
    const chromaUrl = this.configService.get<string>(
      'CHROMA_URL',
      'http://localhost:8000',
    );

    if (!owner || !repo || !githubToken) {
      throw new Error('Missing required GitHub configuration in .env file');
    }

    this.owner = owner;
    this.repo = repo;
    this.branch = branch;

    this.octokit = new Octokit({ auth: githubToken });
    this.chroma = new ChromaClient({ path: chromaUrl });
  }

  //   constructor(private readonly config: ConfigService) {
  //     const token = this.require('GITHUB_TOKEN');
  //     this.owner = this.require('GITHUB_OWNER');
  //     this.repo = this.require('GITHUB_REPO');
  //     this.branch = this.config.get<string>('GITHUB_BRANCH') ?? 'main';

  //     this.octokit = new Octokit({ auth: token, userAgent: 'IntelService/1.0' });

  //     const chromaUrl =
  //       this.config.get<string>('CHROMA_URL') ?? 'http://localhost:8000';
  //     this.chroma = new ChromaClient({ path: chromaUrl });
  //   }

  async generateAnalysisReport(): Promise<string> {
    const endTimer = this.metricsService.agentDuration.startTimer({
      agent: 'intel_orchestrator',
    });
    this.metricsService.agentInvocations.inc({ agent: 'intel_orchestrator' });
    this.logger.log('Starting full analysis workflow...');
    const collection = await this.chroma.getOrCreateCollection({
      name: 'release_artifacts',
      embeddingFunction: this.embeddingFunction,
    });

    const workflowRun = await this.getLatestSuccessfulRun();
    if (!workflowRun) {
      this.logger.error('Analysis failed: No successful workflow run found.');
      return '# Analysis Failed\n\nCould not find a successful workflow run.';
    }
    this.logger.log(`Found latest workflow run ID: ${workflowRun.id}`);

    // Step 1: Ingest data (IntelAgent's job)
    const docs = await this.downloadAndProcessArtifacts(workflowRun.id);
    if (docs.length > 0) {
      this.metricsService.ragChunksTotal.inc(
        { source: 'github_artifacts' },
        docs.length,
      );
    }
    if (docs.length === 0) {
      this.logger.error('Ingestion failed: No artifacts processed.');
      return '# Analysis Failed\n\nCould not process any artifacts from the workflow run.';
    }
    await this.vectorizeAndStore(collection, docs);
    this.logger.log(`Ingestion complete for run ${workflowRun.id}.`);

    // Step 2: Analyze risk (RiskAgent's job)
    const riskResult = await this.riskService.analyzeRisk(workflowRun.id);
    this.logger.log('Risk analysis complete.');

    // Step 3: Generate report (WriterAgent's job)
    const markdownReport = this.writerService.generateReport(
      riskResult,
      workflowRun.id,
    );
    this.logger.log('Report generation complete.');
    endTimer();
    return markdownReport;
  }

  async runAnalysis() {
    this.logger.log('Starting analysis...');

    // Get or create collection with the embedding function
    const collection = await this.chroma.getOrCreateCollection({
      name: 'release_artifacts',
      embeddingFunction: this.embeddingFunction, // Pass the function here
    });

    const workflowRun = await this.getLatestSuccessfulRun();
    if (!workflowRun) {
      this.logger.error('Analysis failed: No successful workflow run found.');
      return;
    }
    this.logger.log(`Found latest workflow run ID: ${workflowRun.id}`);

    const docs = await this.downloadAndProcessArtifacts(workflowRun.id);
    if (docs.length === 0) {
      this.logger.error('Analysis failed: No artifacts processed.');
      return;
    }
    this.logger.log(`Processed ${docs.length} documents.`);

    await this.vectorizeAndStore(collection, docs);
    this.logger.log('Vectorization and storage complete.');
  }

  // --- Private Helpers ---

  private require(key: string): string {
    const v = this.configService.get<string>(key);
    if (!v) throw new Error(`Missing required config: ${key}`);
    return v;
  }

  private async getLatestSuccessfulRun() {
    // This logic is solid, no changes needed
    const { data } = await this.octokit.actions.listWorkflowRunsForRepo({
      owner: this.owner,
      repo: this.repo,
      branch: this.branch,
      status: 'completed',
      per_page: 20,
    });
    return data.workflow_runs.find((r) => r.conclusion === 'success') ?? null;
  }

  private async downloadAndProcessArtifacts(runId: number): Promise<Doc[]> {
    // This logic is also solid, no changes needed
    const { data } = await this.octokit.actions.listWorkflowRunArtifacts({
      owner: this.owner,
      repo: this.repo,
      run_id: runId,
    });

    const artifact = data.artifacts.find((a) => a.name === 'build-reports');
    if (!artifact) return [];

    const resp = await this.octokit.actions.downloadArtifact({
      owner: this.owner,
      repo: this.repo,
      artifact_id: artifact.id,
      archive_format: 'zip',
    });

    const zip = await JSZip.loadAsync(resp.data as ArrayBuffer);
    const docs: Doc[] = [];

    for (const fileName in zip.files) {
      const file = zip.files[fileName];
      if (fileName.endsWith('junit.xml')) {
        const xml = await file.async('string');
        docs.push({
          id: `junit_${runId}_${fileName}`,
          text: this.summarizeJUnit(xml),
          metadata: { source: fileName, runId, type: 'junit' },
        });
      } else if (fileName.endsWith('security-report.json')) {
        const json = JSON.parse(await file.async('string'));
        docs.push({
          id: `security_${runId}_${fileName}`,
          text: this.summarizeSecurity(json),
          metadata: { source: fileName, runId, type: 'security' },
        });
      }
    }
    return docs;
  }

  private summarizeJUnit(xml: string): string {
    const parsed = xml2js(xml, { compact: true }) as any;

    const suitesRaw = parsed?.testsuites?.testsuite ?? parsed?.testsuite ?? [];

    const suites = Array.isArray(suitesRaw) ? suitesRaw : [suitesRaw];

    let summary = `Test Report Summary\n`;
    for (const s of suites) {
      const a = s?._attributes ?? {};
      const suiteName = a.name ?? 'unknown';
      const tests = Number(a.tests ?? 0);
      const failures = Number(a.failures ?? 0);
      const errors = Number(a.errors ?? 0);
      summary += `Suite: ${suiteName} | tests: ${tests} | failures: ${failures} | errors: ${errors}\n`;

      const tcs = s?.testcase
        ? Array.isArray(s.testcase)
          ? s.testcase
          : [s.testcase]
        : [];

      for (const tc of tcs) {
        if (tc?.failure || tc?.error) {
          const name = tc?._attributes?.name ?? 'unknown';
          const fail = tc?.failure?._cdata ?? tc?.failure?._text ?? '';
          const err = tc?.error?._cdata ?? tc?.error?._text ?? '';
          summary += `  - FAILED: ${name} ${fail || err ? `| ${fail || err}` : ''}\n`;
        }
      }
    }
    return summary.trim();
  }

  private summarizeSecurity(report: any): string {
    // This logic is solid, no changes needed
    let summary = 'Security Report Summary:\n';
    summary += `High: ${report.summary.high}, Medium: ${report.summary.medium}\n`;
    for (const v of report.vulnerabilities) {
      summary += `  - ${v.severity}: ${v.id} in ${v.package}\n`;
    }
    return summary;
  }

  private async vectorizeAndStore(collection: Collection, documents: Doc[]) {
    if (documents.length === 0) return;

    // The new API uses `upsert` and doesn't need an embedding function passed here
    // because it was already defined on the collection.
    await collection.upsert({
      ids: documents.map((d) => d.id),
      documents: documents.map((d) => d.text),
      metadatas: documents.map((d) => d.metadata),
    });
  }
}
