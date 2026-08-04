import { Injectable, Logger } from '@nestjs/common';
import { IJobScraper, RawOffer } from './scraper.interface';
import * as cheerio from 'cheerio';

@Injectable()
export class ComputrabajoAdapter implements IJobScraper {
  private readonly logger = new Logger(ComputrabajoAdapter.name);

  async search(query: string, location?: string): Promise<RawOffer[]> {
    try {
      this.logger.log(`Fetching jobs from Computrabajo (query: ${query})`);
      const offers: RawOffer[] = [];

      // e.g. https://cl.computrabajo.com/trabajo-de-programador
      const formattedQuery = query.toLowerCase().replace(/\s+/g, '-');
      let currentUrl: string | null = `https://cl.computrabajo.com/trabajo-de-${formattedQuery}`;

      const MAX_PAGES = 3;
      let pagesFetched = 0;

      while (currentUrl && pagesFetched < MAX_PAGES) {
        const response = await fetch(currentUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        if (!response.ok) {
          throw new Error(`Computrabajo HTTP status ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const articles = $('article');
        if (articles.length === 0) {
          break; // Stop if no jobs found or blocked
        }

        articles.each((i, el) => {
          try {
            const titleEl = $(el).find('h2 a.js-o-link');
            const title = titleEl.text().trim();
            let jobUrl = titleEl.attr('href');

            if (!title || !jobUrl) return;

            if (jobUrl.startsWith('/')) {
              jobUrl = `https://cl.computrabajo.com${jobUrl}`;
            }

            // Extract ID from URL (the alphanumeric part before #)
            // e.g. /ofertas-de-trabajo/oferta-de-trabajo-de-...-8038F70C2C36435A61373E686DCF3405#lc=ListOffers...
            let externalId = jobUrl.split('#')[0].split('-').pop();
            if (!externalId) externalId = Math.random().toString(36).substring(7);

            const companyEl = $(el).find('a.fc_base.t_ellipsis');
            const company = companyEl.text().trim() || 'Confidencial';

            const locationEl = $(el).find('p.fs16.fc_base.mt5 span');
            const jobLocation = locationEl.text().trim() || 'Chile';

            // Check if it's remote
            const remoteEl = $(el).find('span:contains("remoto"), span:contains("Remoto")');
            const isRemote = remoteEl.length > 0 || title.toLowerCase().includes('remoto');

            offers.push({
              externalId,
              title,
              company,
              location: jobLocation,
              country: 'Chile',
              isRemote: isRemote,
              description: 'Ver detalles en el enlace (Computrabajo).',
              url: jobUrl,
              skills: [],
              seniority: 'No especificado',
            });
          } catch (itemErr) {
            // Ignore
          }
        });

        pagesFetched++;
        
        // Find next page
        const nextUrlEl = $('a:contains("Siguiente")');
        if (nextUrlEl.length > 0) {
          let nextHref = nextUrlEl.attr('href');
          if (nextHref && nextHref.startsWith('/')) {
             currentUrl = `https://cl.computrabajo.com${nextHref}`;
          } else {
             currentUrl = null;
          }
        } else {
          currentUrl = null;
        }
      }

      this.logger.log(
        `Successfully fetched ${offers.length} jobs from Computrabajo`,
      );
      return offers;
    } catch (error) {
      this.logger.error('Error fetching from Computrabajo', error);
      return [];
    }
  }
}
