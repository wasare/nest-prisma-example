import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { enableFileLog } from './file-log.js';

async function bootstrap() {
  enableFileLog();
  const app = await NestFactory.create(AppModule);
  // Fecha a conexão com o banco corretamente quando a aplicação é encerrada.
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
