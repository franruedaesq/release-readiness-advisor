import { Test, TestingModule } from '@nestjs/testing';
import { IntelService } from './intel.service';

describe('IntelService', () => {
  let service: IntelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IntelService],
    }).compile();

    service = module.get<IntelService>(IntelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
