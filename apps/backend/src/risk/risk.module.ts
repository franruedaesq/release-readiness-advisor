import { Module } from '@nestjs/common';
import { RiskService } from './risk.service';
import { MetricsModule } from 'src/metrics/metrics.module';

@Module({
  imports: [MetricsModule],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}
