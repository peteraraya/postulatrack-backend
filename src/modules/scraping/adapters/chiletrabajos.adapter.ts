import { Injectable, Logger } from '@nestjs/common';
import { IJobScraper, RawOffer } from './scraper.interface';
import * as cheerio from 'cheerio';

@Injectable()
export class ChiletrabajosAdapter implements IJobScraper {
  private readonly logger = new Logger(ChiletrabajosAdapter.name);

  async search(query: string, location?: string): Promise<RawOffer[]> {
    try {
      this.logger.log(`Fetching jobs from Chiletrabajos (query: ${query})`);
      const offers: RawOffer[] = [];

      // Chiletrabajos uses pagination (e.g., /encuentra-un-empleo?2=software&13=0, 13=30, etc.)
      const MAX_PAGES = 3; // To avoid scraping too much and getting blocked
      const itemsPerPage = 30;

      for (let page = 0; page < MAX_PAGES; page++) {
        const offset = page * itemsPerPage;
        const url = `https://www.chiletrabajos.cl/encuentra-un-empleo?2=${encodeURIComponent(query)}&13=${offset}`;
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Chiletrabajos HTTP status ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        
        const jobItems = $('.job-item');
        if (jobItems.length === 0) {
          break; // No more jobs
        }

        jobItems.each((i, el) => {
          try {
            const titleEl = $(el).find('h2.title a');
            const title = titleEl.text().trim();
            const jobUrl = titleEl.attr('href');
            
            if (!title || !jobUrl) return;
            
            // Extraer ID externo de la URL (últimos dígitos)
            const urlParts = jobUrl.split('-');
            const externalId = urlParts[urlParts.length - 1];

            // Compañía y locación
            let company = 'No especificada';
            let jobLocation = 'Chile';
            
            const metaElements = $(el).find('h3.meta');
            if (metaElements.length > 0) {
              const firstMeta = $(metaElements[0]);
              const metaText = firstMeta.text().trim(); // "Slp soluciones informáticas spa,\n Rancagua"
              const parts = metaText.split(',');
              if (parts.length >= 2) {
                company = parts[0].trim() || 'Confidencial';
                jobLocation = parts.slice(1).join(',').trim();
              } else if (parts.length === 1) {
                company = parts[0].trim() || 'Confidencial';
              }
            }

            const description = $(el).find('p.description').text().replace('Ver más', '').trim();
            
            // Determinar si es remoto leyendo el título o la ubicación
            const isRemote = title.toLowerCase().includes('remoto') || jobLocation.toLowerCase().includes('remoto');

            offers.push({
              externalId: externalId,
              title: title,
              company: company,
              location: jobLocation,
              country: 'Chile',
              isRemote: isRemote,
              description: description || 'Sin descripción detallada.',
              url: jobUrl,
              skills: [],
              seniority: 'No especificado',
            });
          } catch (itemError: any) {
            this.logger.warn(`Failed to parse a job item: ${itemError.message}`);
          }
        });
      }

      this.logger.log(`Successfully fetched ${offers.length} jobs from Chiletrabajos`);
      return offers;
    } catch (error) {
      this.logger.error('Error fetching from Chiletrabajos', error);
      return [];
    }
  }
}
