import { Test, TestingModule } from '@nestjs/testing';
import { IntelController } from './intel.controller';

describe('IntelController', () => {
  let controller: IntelController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntelController],
    }).compile();

    controller = module.get<IntelController>(IntelController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
