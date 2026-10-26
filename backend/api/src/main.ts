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

  // CORS must run first — browser preflight from Vercel admin
  app.use((req: any, res: any, next: any) => {
    const origin = req.headers.origin as string | undefined;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD',
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        (req.headers['access-control-request-headers'] as string) ||
          'Content-Type, Authorization, Accept, Origin, X-Requested-With',
      );
      res.setHeader('Access-Control-Max-Age', '86400');
      res.setHeader('Vary', 'Origin');
    }

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    return next();
  });

  // Reflect any Origin (admin Vercel + local + mobile)
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    optionsSuccessStatus: 204,
  });

  console.log('🌐 CORS: reflecting request Origin (credentials enabled)');

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
    const origin = req.headers.origin || 'No origin';
    console.log('📥 Incoming Request:', {
      method: req.method,
      url: req.url,
      origin,
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

  const port = Number(process.env.PORT) || 4001;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log(`🚀 Server running on http://${host}:${port}`);
  console.log(`📚 API Documentation: http://${host}:${port}/docs`);
  console.log(`🌐 Accessible from network at: http://<your-ip>:${port}`);
}

bootstrap();
