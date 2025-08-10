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
  ) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async runV2Analysis(
    @Body() body: RunAnalysisDto,
  ): Promise<{ report: string }> {
    const { task, model } = body;

    const ingestionResult = await this.intelService.runIngestion();
    if (!ingestionResult.success) {
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
    return { report };
  }
}
