import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Connection, ConnectionStates } from 'mongoose';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static files (uploaded documents)
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Enable CORS - Allow all local origins for development
  app.enableCors({
    origin: [
      'http://localhost:3000', // Next.js default
      'http://localhost:3001', // Admin panel alternative port
      'http://localhost:19000', // Expo
      'http://localhost:19001',
      'http://localhost:19002',
      'exp://127.0.0.1:19000',
      'exp://127.0.0.1:19001',
      'exp://127.0.0.1:19002',
      'http://192.168.100.6:3000',
      'http://192.168.100.6:3001', // Admin panel
      'http://192.168.100.6:19000',
      'http://192.168.100.6:19001',
      'http://192.168.100.6:19002',
    ],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Log all incoming requests for debugging
  app.use((req: any, res: any, next: any) => {
    console.log('📥 Incoming Request:', {
      method: req.method,
      url: req.url,
      headers: req.headers.authorization ? 'Bearer token present' : 'No token',
    });
    next();
  });

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('🚨 Global Error Handler:', {
      error: err,
      message: err.message,
      status: err.status,
      statusCode: err.statusCode,
      url: req.url,
      method: req.method,
      stack: err.stack,
    });
    next(err);
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Medicare API')
    .setDescription('Medicare App Backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // MongoDB connection status
  const connection = app.get<Connection>(getConnectionToken());
  console.log(
    `🗄️  MongoDB connected: ${connection.readyState === ConnectionStates.connected ? '✅ Connected' : '❌ Disconnected'}`,
  );
  console.log(`📊 Database: ${connection.db?.databaseName || 'medicare'}`);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/docs`);
}

bootstrap();
