import { Test, TestingModule } from '@nestjs/testing';
import { AgentOrchestratorController } from './agent-orchestrator.controller';

describe('AgentOrchestratorController', () => {
  let controller: AgentOrchestratorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentOrchestratorController],
    }).compile();

    controller = module.get<AgentOrchestratorController>(AgentOrchestratorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
