import { Module } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { GetonboardAdapter } from './adapters/getonboard.adapter';
import { ArbeitnowAdapter } from './adapters/arbeitnow.adapter';
import { RemotiveAdapter } from './adapters/remotive.adapter';
import { ChiletrabajosAdapter } from './adapters/chiletrabajos.adapter';
import { ComputrabajoAdapter } from './adapters/computrabajo.adapter';
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
    ChiletrabajosAdapter,
    ComputrabajoAdapter,
  ],
  exports: [ScrapingService],
})
export class ScrapingModule {}
