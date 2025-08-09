import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IntelModule } from './intel/intel.module';
import { RiskModule } from './risk/risk.module';
import { WriterModule } from './writer/writer.module';
import { MetricsModule } from './metrics/metrics.module';
import { AgentOrchestratorModule } from './agent-orchestrator/agent-orchestrator.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    IntelModule,
    RiskModule,
    WriterModule,
    MetricsModule,
    AgentOrchestratorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
