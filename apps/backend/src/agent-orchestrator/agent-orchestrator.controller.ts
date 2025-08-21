import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { IntelService } from '../intel/intel.service';
import { MetricsService } from 'src/metrics/metrics.service';

// DTO to validate the incoming request body
class RunAnalysisDto {
  task: string;
  model: string;
}

@Controller('api/v2/analysis')
export class AgentOrchestratorController {
  private readonly logger = new Logger(AgentOrchestratorController.name);

  constructor(
    private readonly intelService: IntelService,
    private readonly agentOrchestratorService: AgentOrchestratorService,
    private readonly metricsService: MetricsService,
  ) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async runV2Analysis(
    @Body() body: RunAnalysisDto,
  ): Promise<{ report: string }> {
    const endTimer = this.metricsService.agentDuration.startTimer({
      agent: 'intel_orchestrator',
    });
    this.metricsService.agentInvocations.inc({ agent: 'intel_orchestrator' });
    const { task, model } = body;

    const ingestionResult = await this.intelService.runIngestion();
    if (!ingestionResult.success) {
      endTimer();
      return { report: `# Ingestion Failed\n\n${ingestionResult.message}` };
    }
    if (typeof ingestionResult.runId !== 'number') {
      return {
        report: `# Ingestion Failed\n\nMissing runId from ingestion result.`,
      };
    }
    this.logger.log(`Ingestion complete for runId: ${ingestionResult.runId}`);

    const report = await this.agentOrchestratorService.invoke(
      ingestionResult.runId,
      task, // Pass the task
      model, // Pass the model
    );
    endTimer();
    return { report };
  }
}
