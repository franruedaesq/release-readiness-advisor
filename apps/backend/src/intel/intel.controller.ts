import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { IntelService } from './intel.service';

@Controller('api/analysis')
export class IntelController {
  constructor(private readonly intelService: IntelService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async runAnalysis(): Promise<{ report: string }> {
    const markdownReport = await this.intelService.generateAnalysisReport();
    return { report: markdownReport };
  }
}
