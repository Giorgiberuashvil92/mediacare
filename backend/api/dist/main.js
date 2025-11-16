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
    app.enableCors({
        origin: [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:19000',
            'http://localhost:19001',
            'http://localhost:19002',
            'exp://127.0.0.1:19000',
            'exp://127.0.0.1:19001',
            'exp://127.0.0.1:19002',
            'http://192.168.100.6:3000',
            'http://192.168.100.6:3001',
            'http://192.168.100.6:19000',
            'http://192.168.100.6:19001',
            'http://192.168.100.6:19002',
            '*',
        ],
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.use((req, res, next) => {
        console.log('📥 Incoming Request:', {
            method: req.method,
            url: req.url,
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
    const port = process.env.PORT || 4000;
    await app.listen(port);
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`📚 API Documentation: http://localhost:${port}/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map