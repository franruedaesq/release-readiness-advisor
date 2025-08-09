import { Module } from '@nestjs/common';
import { RiskService } from './risk.service';
import { MetricsModule } from '../metrics/metrics.module'; // Use relative path

@Module({
  imports: [MetricsModule],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}
