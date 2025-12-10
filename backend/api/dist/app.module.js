"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const mongoose_1 = require("@nestjs/mongoose");
const throttler_1 = require("@nestjs/throttler");
const admin_module_1 = require("./admin/admin.module");
const advisors_module_1 = require("./advisors/advisors.module");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const appointments_module_1 = require("./appointments/appointments.module");
const auth_module_1 = require("./auth/auth.module");
const cloudinary_module_1 = require("./cloudinary/cloudinary.module");
const doctors_module_1 = require("./doctors/doctors.module");
const profile_module_1 = require("./profile/profile.module");
const shop_module_1 = require("./shop/shop.module");
const specializations_module_1 = require("./specializations/specializations.module");
const terms_module_1 = require("./terms/terms.module");
const upload_module_1 = require("./upload/upload.module");
const moduleImports = [
    config_1.ConfigModule.forRoot({
        isGlobal: true,
    }),
    mongoose_1.MongooseModule.forRoot('mongodb+srv://gioberuashvili:Berobero12!@cluster0.g31ptrc.mongodb.net/?appName=Cluster0'),
    jwt_1.JwtModule.registerAsync({
        global: true,
        useFactory: () => ({
            secret: process.env.JWT_SECRET || 'your-secret-key',
            signOptions: { expiresIn: '24h' },
        }),
    }),
    throttler_1.ThrottlerModule.forRoot([
        {
            ttl: 60000,
            limit: 10,
        },
    ]),
    auth_module_1.AuthModule,
    upload_module_1.UploadModule,
    cloudinary_module_1.CloudinaryModule,
    profile_module_1.ProfileModule,
    doctors_module_1.DoctorsModule,
    specializations_module_1.SpecializationsModule,
    terms_module_1.TermsModule,
    appointments_module_1.AppointmentsModule,
    admin_module_1.AdminModule,
    shop_module_1.ShopModule,
    advisors_module_1.AdvisorsModule,
];
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: moduleImports,
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map