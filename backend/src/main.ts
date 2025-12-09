
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS agar frontend bisa akses
  app.enableCors({
    origin: ['http://localhost:5173', 'http://aset.trinitimedia.com'], // Sesuaikan dengan URL frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strip properti yang tidak ada di DTO
    transform: true, // Transform payload ke instance DTO
  }));

  // Prefix API
  app.setGlobalPrefix('api');

  await app.listen(3001);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
