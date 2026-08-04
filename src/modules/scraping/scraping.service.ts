import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { GetonboardAdapter } from './adapters/getonboard.adapter';
import { ArbeitnowAdapter } from './adapters/arbeitnow.adapter';
import { RemotiveAdapter } from './adapters/remotive.adapter';
import { ChiletrabajosAdapter } from './adapters/chiletrabajos.adapter';
import { ComputrabajoAdapter } from './adapters/computrabajo.adapter';
import { RecommendationService } from '../recommendation/recommendation.service';

@Injectable()
export class ScrapingService {
  private readonly logger = new Logger(ScrapingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly getonboardAdapter: GetonboardAdapter,
    private readonly arbeitnowAdapter: ArbeitnowAdapter,
    private readonly remotiveAdapter: RemotiveAdapter,
    private readonly chiletrabajosAdapter: ChiletrabajosAdapter,
    private readonly computrabajoAdapter: ComputrabajoAdapter,
    private readonly recommendationService: RecommendationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async triggerDailyScrape() {
    this.logger.log('Starting daily scheduled scrape');
    // Execute asynchronously without blocking
    this.executeScrapingJob().catch((err) => this.logger.error(err));
  }

  async triggerManualScrape() {
    this.logger.log('Starting manual scrape from API');
    // Execute asynchronously without blocking the HTTP request
    this.executeScrapingJob().catch((err) => this.logger.error(err));
    return { message: 'Scraping job started in the background' };
  }

  private async executeScrapingJob() {
    // Definimos las fuentes a scrapear
    const sources = [
      {
        name: 'Getonboard',
        url: 'https://getonbrd.com',
        adapter: this.getonboardAdapter,
      },
      {
        name: 'Arbeitnow',
        url: 'https://arbeitnow.com',
        adapter: this.arbeitnowAdapter,
      },
      {
        name: 'Remotive',
        url: 'https://remotive.com',
        adapter: this.remotiveAdapter,
      },
      {
        name: 'Chiletrabajos',
        url: 'https://www.chiletrabajos.cl',
        adapter: this.chiletrabajosAdapter,
      },
      {
        name: 'Computrabajo Chile',
        url: 'https://cl.computrabajo.com',
        adapter: this.computrabajoAdapter,
      },
    ];

    for (const src of sources) {
      let source = await this.prisma.jobSource.findUnique({
        where: { name: src.name },
      });
      if (!source) {
        source = await this.prisma.jobSource.create({
          data: { name: src.name, url: src.url },
        });
      }

      const scrapingRecord = await this.prisma.scrapingJob.create({
        data: { source: source.name, status: 'RUNNING' },
      });

      try {
        const offers = await src.adapter.search('software', 'Remote');

        let added = 0;
        for (const offer of offers) {
          const existing = await this.prisma.jobOffer.findUnique({
            where: {
              sourceId_externalId: {
                sourceId: source.id,
                externalId: offer.externalId,
              },
            },
          });

          if (!existing) {
            const newOffer = await this.prisma.jobOffer.create({
              data: {
                sourceId: source.id,
                externalId: offer.externalId,
                title: offer.title,
                company: offer.company,
                location: offer.location,
                country: offer.country,
                workModel: offer.isRemote ? 'REMOTE' : 'ON_SITE',
                description: offer.description,
                url: offer.url,
                salaryMin: offer.salaryMin,
                salaryMax: offer.salaryMax,
                currency: offer.currency,
                skills: offer.skills,
                seniority: offer.seniority,
                applicationsCount: offer.applicationsCount,
                perks: offer.perks || [],
              },
            });
            added++;

            // Trigger recommendations for this new offer
            await this.recommendationService.calculateForOffer(newOffer.id);
          } else {
            // Si ya existe, actualizamos los campos por si la API ahora trae mejor data (como country o company)
            await this.prisma.jobOffer.update({
              where: { id: existing.id },
              data: {
                title: offer.title,
                company: offer.company,
                location: offer.location,
                country: offer.country,
                workModel: offer.isRemote ? 'REMOTE' : 'ON_SITE',
                description: offer.description,
                url: offer.url,
                salaryMin: offer.salaryMin,
                salaryMax: offer.salaryMax,
                currency: offer.currency,
                skills: offer.skills,
                seniority: offer.seniority,
                applicationsCount: offer.applicationsCount,
                perks: offer.perks || [],
              },
            });
          }
        }

        await this.prisma.scrapingJob.update({
          where: { id: scrapingRecord.id },
          data: {
            status: 'COMPLETED',
            itemsFound: offers.length,
            itemsAdded: added,
            finishedAt: new Date(),
          },
        });

        this.logger.log(`Job completed for ${src.name}: Added ${added} offers`);
      } catch (error: any) {
        this.logger.error(`Job failed for ${src.name}: ${error.message}`);
        await this.prisma.scrapingJob.update({
          where: { id: scrapingRecord.id },
          data: {
            status: 'FAILED',
            error: error.message,
            finishedAt: new Date(),
          },
        });
      }
    }
  }
}
