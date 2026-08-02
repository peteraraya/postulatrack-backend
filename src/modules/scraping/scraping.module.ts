import { Module } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { GetonboardAdapter } from './adapters/getonboard.adapter';
import { ArbeitnowAdapter } from './adapters/arbeitnow.adapter';
import { RemotiveAdapter } from './adapters/remotive.adapter';
import { RecommendationModule } from '../recommendation/recommendation.module';
import { ScrapingController } from './scraping.controller';

@Module({
  controllers: [ScrapingController],
  imports: [RecommendationModule],
  providers: [
    ScrapingService,
    GetonboardAdapter,
    ArbeitnowAdapter,
    RemotiveAdapter,
  ],
  exports: [ScrapingService],
})
export class ScrapingModule {}
