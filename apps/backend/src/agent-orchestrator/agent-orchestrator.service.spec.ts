import { Test, TestingModule } from '@nestjs/testing';
import { AgentOrchestratorService } from './agent-orchestrator.service';

describe('AgentOrchestratorService', () => {
  let service: AgentOrchestratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgentOrchestratorService],
    }).compile();

    service = module.get<AgentOrchestratorService>(AgentOrchestratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
