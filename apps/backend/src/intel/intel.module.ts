import { Module } from '@nestjs/common';
import { IntelService } from './intel.service';
import { IntelController } from './intel.controller';
import { MetricsModule } from 'src/metrics/metrics.module';
import { RiskModule } from 'src/risk/risk.module';
import { WriterModule } from 'src/writer/writer.module';

@Module({
  imports: [RiskModule, WriterModule, MetricsModule],
  providers: [IntelService],
  controllers: [IntelController],
  exports: [IntelService],
})
export class IntelModule {}
