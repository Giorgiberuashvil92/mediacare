"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const mongoose_1 = require("@nestjs/mongoose");
const swagger_1 = require("@nestjs/swagger");
const mongoose_2 = require("mongoose");
const node_dns_1 = require("node:dns");
const path_1 = require("path");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const mongoDnsServer = process.env.MONGODB_DNS_SERVER ||
        (process.env.NODE_ENV === 'production' ? undefined : '1.1.1.1');
    if (mongoDnsServer)
        (0, node_dns_1.setServers)([mongoDnsServer]);
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useStaticAssets((0, path_1.join)(__dirname, '..', 'uploads'), {
        prefix: '/uploads/',
    });
    app.use((req, res, next) => {
        const origin = req.headers.origin;
        if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD');
            res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] ||
                'Content-Type, Authorization, Accept, Origin, X-Requested-With');
            res.setHeader('Access-Control-Max-Age', '86400');
            res.setHeader('Vary', 'Origin');
        }
        if (req.method === 'OPTIONS') {
            return res.status(204).end();
        }
        return next();
    });
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
    const port = Number(process.env.PORT) || 4001;
    const host = process.env.HOST || '0.0.0.0';
    await app.listen(port, host);
    console.log(`🚀 Server running on http://${host}:${port}`);
    console.log(`📚 API Documentation: http://${host}:${port}/docs`);
    console.log(`🌐 Accessible from network at: http://<your-ip>:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map