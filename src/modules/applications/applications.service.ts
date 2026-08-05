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
import { v4 as uuidv4 } from 'uuid';

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
          externalId: `manual-${uuidv4()}`,
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
      const response = await fetch(url);
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
      return {
        title: 'Not Found',
        company: 'Not Found',
        location: 'Not Found',
      };
    }
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
