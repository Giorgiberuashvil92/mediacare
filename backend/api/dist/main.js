"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const mongoose_1 = require("@nestjs/mongoose");
const swagger_1 = require("@nestjs/swagger");
const mongoose_2 = require("mongoose");
const path_1 = require("path");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useStaticAssets((0, path_1.join)(__dirname, '..', 'uploads'), {
        prefix: '/uploads/',
    });
    const corsOrigins = process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
        : ['*'];
    const corsConfig = {
        origin: corsOrigins.includes('*') ? true : corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'Accept',
            'Origin',
            'X-Requested-With',
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Headers',
            'Access-Control-Allow-Methods',
        ],
        exposedHeaders: ['Content-Length', 'Content-Type'],
        preflightContinue: false,
        optionsSuccessStatus: 204,
    };
    console.log('🌐 CORS Configuration:', {
        origins: corsOrigins.includes('*') ? 'All origins allowed' : corsOrigins,
        methods: corsConfig.methods,
        allowedHeaders: corsConfig.allowedHeaders,
    });
    app.enableCors(corsConfig);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.use((req, res, next) => {
        const origin = req.headers.origin || 'No origin';
        console.log('📥 Incoming Request:', {
            method: req.method,
            url: req.url,
            origin,
            headers: req.headers.authorization ? 'Bearer token present' : 'No token',
        });
        if (req.method === 'OPTIONS') {
            console.log('🔄 Preflight OPTIONS request detected:', {
                origin,
                'access-control-request-method': req.headers['access-control-request-method'],
                'access-control-request-headers': req.headers['access-control-request-headers'],
            });
        }
        next();
    });
    app.use((err, req, res, next) => {
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
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Medicare API')
        .setDescription('Medicare App Backend API')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('docs', app, document);
    const connection = app.get((0, mongoose_1.getConnectionToken)());
    console.log(`🗄️  MongoDB connected: ${connection.readyState === mongoose_2.ConnectionStates.connected ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`📊 Database: ${connection.db?.databaseName || 'medicare'}`);
    const port = process.env.PORT || 4000;
    const host = process.env.HOST || '0.0.0.0';
    await app.listen(port, host);
    console.log(`🚀 Server running on http://${host}:${port}`);
    console.log(`📚 API Documentation: http://${host}:${port}/docs`);
    console.log(`🌐 Accessible from network at: http://<your-ip>:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map