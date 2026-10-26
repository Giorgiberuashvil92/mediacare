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

  // CORS: always allow admin Vercel; merge with CORS_ORIGINS (or reflect all if *)
  const DEFAULT_CORS_ORIGINS = [
    'https://mediacareadmin.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  const envCorsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];
  const allowAllOrigins =
    envCorsOrigins.length === 0 || envCorsOrigins.includes('*');
  const allowedOrigins = [
    ...new Set([
      ...DEFAULT_CORS_ORIGINS,
      ...envCorsOrigins.filter((o) => o !== '*'),
    ]),
  ];

  const corsConfig = {
    origin: allowAllOrigins
      ? true
      : (
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void,
        ) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(null, false);
          }
        },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  console.log('🌐 CORS Configuration:', {
    origins: allowAllOrigins ? 'All origins reflected' : allowedOrigins,
  });

  app.enableCors(corsConfig);

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

    // Log CORS headers for preflight requests
    if (req.method === 'OPTIONS') {
      console.log('🔄 Preflight OPTIONS request detected:', {
        origin,
        'access-control-request-method':
          req.headers['access-control-request-method'],
        'access-control-request-headers':
          req.headers['access-control-request-headers'],
      });
    }

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

  const port = process.env.PORT || 4001;
  const host = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces for mobile access
  await app.listen(port, host);
  console.log(`🚀 Server running on http://${host}:${port}`);
  console.log(`📚 API Documentation: http://${host}:${port}/docs`);
  console.log(`🌐 Accessible from network at: http://<your-ip>:${port}`);
}

bootstrap();
