import { Module } from '@nestjs/common';
import { IntelService } from './intel.service';
import { IntelController } from './intel.controller';
import { RiskModule } from '../risk/risk.module'; // <-- IMPORT THIS
import { WriterModule } from '../writer/writer.module'; // <-- IMPORT THIS
import { MetricsModule } from 'src/metrics/metrics.module';

@Module({
  imports: [RiskModule, WriterModule, MetricsModule],
  providers: [IntelService],
  controllers: [IntelController],
})
export class IntelModule {}
