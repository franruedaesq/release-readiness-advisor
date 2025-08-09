import { Module } from '@nestjs/common';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { AgentOrchestratorController } from './agent-orchestrator.controller';

@Module({
  providers: [AgentOrchestratorService],
  controllers: [AgentOrchestratorController]
})
export class AgentOrchestratorModule {}
