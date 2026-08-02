import { Injectable, Logger } from '@nestjs/common';
import { IJobScraper, RawOffer } from './scraper.interface';

@Injectable()
export class GetonboardAdapter implements IJobScraper {
  private readonly logger = new Logger(GetonboardAdapter.name);

  async search(query: string, location?: string): Promise<RawOffer[]> {
    try {
      this.logger.log(
        `Fetching real jobs from GetOnBoard API for query: ${query}`,
      );
      const offers: RawOffer[] = [];
      let currentPage = 1;
      let totalPages = 1;
      // Límite de seguridad para no abusar de la API (ej. max 5 páginas)
      const MAX_PAGES = 5;

      do {
        const url = `https://www.getonbrd.com/api/v0/search/jobs?query=${encodeURIComponent(query)}&page=${currentPage}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `GetOnBoard API failed with status ${response.status}`,
          );
        }

        const data = await response.json();

        if (data.meta && data.meta.total_pages) {
          totalPages = data.meta.total_pages;
        }

        const companyCache = new Map<string, string>();

        for (const job of data.data) {
          // Combinamos la descripción general, beneficios y funciones para más contexto
          const fullDescription = `
          ${job.attributes.description || ''}
          ${job.attributes.functions_headline ? `<br><b>${job.attributes.functions_headline}</b><br>${job.attributes.functions}` : ''}
          ${job.attributes.benefits_headline ? `<br><b>${job.attributes.benefits_headline}</b><br>${job.attributes.benefits}` : ''}
        `.trim();

          let companyName = 'Empresa Confidencial';
          const companyId = job.attributes.company?.data?.id;

          if (companyId) {
            if (companyCache.has(companyId)) {
              companyName = companyCache.get(companyId)!;
            } else {
              try {
                // Fetch company details to get the real name
                const compRes = await fetch(
                  `https://www.getonbrd.com/api/v0/companies/${companyId}`,
                );
                if (compRes.ok) {
                  const compData = await compRes.json();
                  companyName =
                    compData.data?.attributes?.name ||
                    `Company ID: ${companyId}`;
                  companyCache.set(companyId, companyName);
                }
              } catch (e) {
                companyName = `Company ID: ${companyId}`;
              }
            }
          }

          offers.push({
            externalId: job.id,
            title: job.attributes.title,
            company: companyName,
            location:
              job.attributes.countries?.join(', ') ||
              location ||
              'No especificada',
            country: job.attributes.countries?.[0] || 'No especificado', // Filtro país
            isRemote: job.attributes.remote || false,
            description: fullDescription || 'Sin descripción detallada.',
            url:
              job.links?.public_url ||
              `https://www.getonbrd.com/jobs/${job.id}`,
            salaryMin: job.attributes.min_salary || null,
            salaryMax: job.attributes.max_salary || null,
            currency: job.attributes.currency || null,
            skills: [], // GetOnBoard API no expone skills en el JSON directo de búsqueda sin relacionar tags
            seniority: job.attributes.seniority?.data?.id
              ? 'Nivel ' + job.attributes.seniority.data.id
              : 'No especificado',
            applicationsCount: job.attributes.applications_count || null,
            perks: job.attributes.perks || [],
          });
        }

        currentPage++;
      } while (currentPage <= totalPages && currentPage <= MAX_PAGES);

      this.logger.log(
        `Successfully fetched ${offers.length} jobs from GetOnBoard`,
      );
      return offers;
    } catch (error) {
      this.logger.error('Error fetching from GetOnBoard', error);
      return [];
    }
  }
}
