import { Injectable, Logger } from '@nestjs/common';
import { IJobScraper, RawOffer } from './scraper.interface';

@Injectable()
export class RemotiveAdapter implements IJobScraper {
  private readonly logger = new Logger(RemotiveAdapter.name);

  async search(query: string, location?: string): Promise<RawOffer[]> {
    try {
      this.logger.log('Fetching real jobs from Remotive API');

      const url = `https://remotive.com/api/remote-jobs?category=software-dev`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Remotive API failed with status ${response.status}`);
      }

      const data = await response.json();
      const offers: RawOffer[] = [];

      for (const job of data.jobs) {
        // Filtro en memoria
        const jobTitle = job.title.toLowerCase();
        if (query && !jobTitle.includes(query.toLowerCase())) {
          continue;
        }

        offers.push({
          externalId: job.id.toString(),
          title: job.title,
          company: job.company_name || 'Empresa Confidencial',
          location: job.candidate_required_location || 'Remote',
          country:
            job.candidate_required_location === 'Worldwide'
              ? 'Global'
              : job.candidate_required_location,
          isRemote: true, // Remotive solo tiene trabajos remotos
          description: job.description || 'Sin descripción',
          url: job.url,
          salaryMin: undefined, // La API a veces devuelve string en 'salary' pero no está estructurado en min/max fácilmente
          salaryMax: undefined,
          currency: undefined,
          skills: job.tags || [],
          seniority: 'No especificado',
        });
      }

      this.logger.log(
        `Successfully fetched ${offers.length} jobs from Remotive`,
      );
      return offers;
    } catch (error) {
      this.logger.error('Error fetching from Remotive', error);
      return [];
    }
  }
}
