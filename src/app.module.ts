import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { JobOffersModule } from './modules/job-offers/job-offers.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { ScrapingModule } from './modules/scraping/scraping.module';
import { RecommendationModule } from './modules/recommendation/recommendation.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './modules/ai/ai.module';
import * as Joi from 'joi';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { JobAlertsModule } from './modules/job-alerts/job-alerts.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_CALLBACK_URL: Joi.string().uri().required(),
        FRONTEND_URL: Joi.string().uri().required(),
      }),
    }),
    PrismaModule,
    ScheduleModule.forRoot(),
    AuthModule,
    ProfileModule,
    JobOffersModule,
    ApplicationsModule,
    ScrapingModule,
    RecommendationModule,
    AiModule,
    JobAlertsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
