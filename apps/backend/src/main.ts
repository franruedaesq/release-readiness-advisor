import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'https://release-readiness-advisor-t75bb6ntc-francisco-ruedas-projects.vercel.app',
      'http://localhost:3001',
      'https://release-readiness-advisor-ui.vercel.app',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3002);
}
bootstrap();
