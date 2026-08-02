import { Injectable, Logger } from '@nestjs/common';
import { IJobScraper, RawOffer } from './scraper.interface';

@Injectable()
export class ArbeitnowAdapter implements IJobScraper {
  private readonly logger = new Logger(ArbeitnowAdapter.name);

  async search(query: string, location?: string): Promise<RawOffer[]> {
    try {
      this.logger.log('Fetching real jobs from Arbeitnow API');
      const offers: RawOffer[] = [];

      // Arbeitnow API uses cursor-based/link pagination in 'links.next'
      let currentUrl: string | null = `https://arbeitnow.com/api/job-board-api`;
      let pagesFetched = 0;
      const MAX_PAGES = 5;

      while (currentUrl && pagesFetched < MAX_PAGES) {
        const response: any = await fetch(currentUrl);

        if (!response.ok) {
          throw new Error(
            `Arbeitnow API failed with status ${response.status}`,
          );
        }

        const data: any = await response.json();
        pagesFetched++;

        for (const job of data.data) {
          // Simple in-memory filtering if query is provided
          const jobTitle = job.title.toLowerCase();
          if (query && !jobTitle.includes(query.toLowerCase())) {
            continue;
          }

          offers.push({
            externalId: job.slug,
            title: job.title,
            company: job.company_name,
            location: job.location || 'Remote',
            country: 'Germany', // Arbeitnow es principalmente de Alemania
            isRemote: job.remote || false,
            description: job.description || 'Sin descripción detallada.',
            url: job.url,
            salaryMin: undefined, // Arbeitnow doesn't provide salary in this endpoint
            salaryMax: undefined,
            currency: undefined,
            skills: job.tags || [],
            seniority: 'No especificado',
          });
        }

        currentUrl = data.links?.next || null;
      }

      this.logger.log(
        `Successfully fetched ${offers.length} jobs from Arbeitnow`,
      );
      return offers;
    } catch (error) {
      this.logger.error('Error fetching from Arbeitnow', error);
      return [];
    }
  }
}
