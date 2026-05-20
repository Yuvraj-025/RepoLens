import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Use Helmet for security headers
  app.use(helmet());
  
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? 'https://your-vercel-domain.com' : '*',
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(3001);
}
bootstrap();
