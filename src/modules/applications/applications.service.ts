import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateApplicationDto,
  UpdateApplicationStatusDto,
} from './dto/application.dto';
import { ApplicationStatus } from '@prisma/client';
import * as cheerio from 'cheerio';
import { randomUUID } from 'crypto';
import { promises as dns } from 'dns';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: CreateApplicationDto) {
    // Check if the application already exists to avoid 500 Internal Server Error (Prisma Unique Constraint P2002)
    const existing = await this.prisma.application.findUnique({
      where: {
        userId_offerId: {
          userId,
          offerId: data.offerId,
        },
      },
    });

    if (existing) {
      // Si la postulación fue "Retirada", la reactivamos a "SENT".
      if (existing.status === ApplicationStatus.WITHDRAWN) {
        return this.prisma.application.update({
          where: { id: existing.id },
          data: {
            status: ApplicationStatus.SENT,
            events: {
              create: [
                { status: ApplicationStatus.SENT, notes: 'Re-application' },
              ],
            },
          },
        });
      }

      // Devolvemos la postulación existente para que el frontend no falle.
      return existing;
    }

    try {
      const application = await this.prisma.application.create({
        data: {
          userId,
          offerId: data.offerId,
          status: ApplicationStatus.SENT,
          events: {
            create: [
              { status: ApplicationStatus.SENT, notes: 'Initial application' },
            ],
          },
        },
      });
      return application;
    } catch (error) {
      // Por si la oferta (offerId) no existe o hay algún problema de llave foránea u otro error no controlado
      throw new BadRequestException(
        'No se pudo procesar la postulación. Verifica que la oferta exista.',
      );
    }
  }

  async findAll(userId: string) {
    return this.prisma.application.findMany({
      where: { userId },
      include: {
        offer: true,
        events: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getStats(userId: string) {
    const totalApplications = await this.prisma.application.count({
      where: { userId },
    });

    const statusCounts = await this.prisma.application.groupBy({
      by: ['status'],
      where: { userId },
      _count: {
        status: true,
      },
    });

    const totalOffers = await this.prisma.jobOffer.count();

    const formattedCounts = {
      SENT: 0,
      INTERVIEW: 0,
      OFFER: 0,
      REJECTED: 0,
      WITHDRAWN: 0,
    };

    statusCounts.forEach((item) => {
      formattedCounts[item.status] = item._count.status;
    });

    return {
      sent: formattedCounts.SENT,
      interviewing: formattedCounts.INTERVIEW,
      offers: formattedCounts.OFFER,
      rejected: formattedCounts.REJECTED,
      withdrawn: formattedCounts.WITHDRAWN,
    };
  }

  async updateNotes(
    id: string,
    userId: string,
    data: import('./dto/application.dto').UpdateNotesDto,
  ) {
    const application = await this.prisma.application.findFirst({
      where: { id, userId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return this.prisma.application.update({
      where: { id },
      data: {
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.contactName !== undefined && {
          contactName: data.contactName,
        }),
        ...(data.contactEmail !== undefined && {
          contactEmail: data.contactEmail,
        }),
        ...(data.contactLinkedin !== undefined && {
          contactLinkedin: data.contactLinkedin,
        }),
      },
    });
  }

  async createManual(userId: string, data: any) {
    try {
      // Buscar o crear JobSource "Manual"
      let source = await this.prisma.jobSource.findUnique({
        where: { name: 'Manual' },
      });
      if (!source) {
        source = await this.prisma.jobSource.create({
          data: { name: 'Manual', url: 'https://manual.local' },
        });
      }

      // Create a dummy JobOffer
      const offer = await this.prisma.jobOffer.create({
        data: {
          sourceId: source.id,
          externalId: `manual-${randomUUID()}`,
          title: data.title || 'Oferta Manual',
          company: data.company || 'Empresa Manual',
          location: data.location || null,
          url: data.url || '',
          description: 'Postulación ingresada manualmente por el usuario.',
          workModel: 'ON_SITE',
        },
      });

      // Create application
      return await this.prisma.application.create({
        data: {
          userId,
          offerId: offer.id,
          status: data.status || ApplicationStatus.SENT,
          events: {
            create: [
              {
                status: data.status || ApplicationStatus.SENT,
                notes: 'Manual creation',
              },
            ],
          },
        },
        include: { offer: true },
      });
    } catch (error) {
      console.error('Error creating manual application:', error);
      throw new BadRequestException(
        'No se pudo procesar la postulación manual. Verifica los datos enviados.',
      );
    }
  }

  async updateInterviewDate(id: string, userId: string, interviewDate: string) {
    const application = await this.prisma.application.findFirst({
      where: { id, userId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return this.prisma.application.update({
      where: { id },
      data: { interviewDate: new Date(interviewDate) },
    });
  }

  async getUpcomingInterviews(userId: string) {
    const now = new Date();
    return this.prisma.application.findMany({
      where: {
        userId,
        interviewDate: {
          gte: now,
        },
      },
      include: {
        offer: {
          select: { title: true, company: true },
        },
      },
      orderBy: { interviewDate: 'asc' },
    });
  }

  async extractUrl(url: string) {
    try {
      const safeUrl = await this.assertSafeExternalUrl(url);
      const response = await fetch(safeUrl, {
        signal: AbortSignal.timeout(10_000),
        redirect: 'follow',
      });
      if (!response.ok) {
        return {
          title: 'Not Found',
          company: 'Not Found',
          location: 'Not Found',
        };
      }
      const html = await response.text();
      const $ = cheerio.load(html);

      // Basic heuristic to find title, company and location
      const title =
        $('h1').first().text().trim() ||
        $('title').text().trim().split('-')[0].trim();
      const company =
        $('.company-name').first().text().trim() || 'Unknown Company';
      const location =
        $('.location').first().text().trim() || 'Remote / Unknown';

      return { title, company, location };
    } catch (error) {
      throw new BadRequestException('No se pudo procesar la URL enviada.');
    }
  }

  /**
   * Mitigación de SSRF: solo permite URLs HTTP(S) públicas.
   * Resuelve el hostname y rechaza direcciones privadas/reservadas/loopback.
   */
  private async assertSafeExternalUrl(rawUrl: string): Promise<string> {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException('La URL enviada no es válida.');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException('Solo se permiten URLs HTTP(S).');
    }
    if (parsed.username || parsed.password) {
      throw new BadRequestException('La URL no puede incluir credenciales.');
    }

    const hostname = parsed.hostname;
    const addresses = await dns.lookup(hostname, { all: true, verbatim: true });

    for (const { address } of addresses) {
      if (this.isPrivateAddress(address)) {
        throw new BadRequestException(
          'La URL apunta a una dirección no accesible públicamente.',
        );
      }
    }

    return parsed.toString();
  }

  private isPrivateAddress(ip: string): boolean {
    // IPv4-mapped IPv6 (::ffff:a.b.c.d) -> analizamos la parte IPv4
    const v4Mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (v4Mapped) {
      return this.isPrivateIpv4(v4Mapped[1]);
    }

    if (ip.includes(':')) {
      return this.isPrivateIpv6(ip);
    }

    return this.isPrivateIpv4(ip);
  }

  private isPrivateIpv4(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;

    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15
    if (a >= 224) return true; // multicast y reservado
    return false;
  }

  private isPrivateIpv6(ip: string): boolean {
    const lower = ip.toLowerCase();
    if (lower === '::' || lower === '::1') return true; // unspecified / loopback
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00::/7 ULA
    if (
      lower.startsWith('fe8') ||
      lower.startsWith('fe9') ||
      lower.startsWith('fea') ||
      lower.startsWith('feb')
    ) {
      return true; // fe80::/10 link-local
    }
    return false;
  }

  async updateStatus(
    id: string,
    userId: string,
    data: UpdateApplicationStatusDto,
  ) {
    const application = await this.prisma.application.findFirst({
      where: { id, userId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return this.prisma.application.update({
      where: { id },
      data: {
        status: data.status,
        events: {
          create: [{ status: data.status, notes: data.notes }],
        },
      },
      include: { events: true },
    });
  }

  async remove(id: string, userId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id, userId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return this.prisma.application.delete({
      where: { id },
    });
  }
}
