import { Module } from '@nestjs/common';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { AgentOrchestratorController } from './agent-orchestrator.controller';
import { IntelModule } from 'src/intel/intel.module';
import { MetricsModule } from 'src/metrics/metrics.module';

@Module({
  imports: [IntelModule, MetricsModule],
  providers: [AgentOrchestratorService],
  controllers: [AgentOrchestratorController],
})
export class AgentOrchestratorModule {}
