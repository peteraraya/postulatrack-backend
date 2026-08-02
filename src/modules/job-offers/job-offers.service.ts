import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JobOffersService {
  constructor(private readonly prisma: PrismaService) {}

  async getJobOffers(
    filters: any,
    page: number = 1,
    limit: number = 10,
    userId: string,
  ) {
    const where: any = {};

    if (filters.title) {
      where.title = { contains: filters.title, mode: 'insensitive' };
    }

    if (filters.company) {
      where.company = { contains: filters.company, mode: 'insensitive' };
    }

    if (filters.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }

    if (filters.country) {
      where.country = { contains: filters.country, mode: 'insensitive' };
    }

    if (filters.workModel) {
      where.workModel = filters.workModel;
    } else if (filters.isRemote !== undefined) {
      const isRem = filters.isRemote === 'true' || filters.isRemote === true;
      if (isRem) {
        where.workModel = 'REMOTE';
      }
    }

    if (filters.skills && filters.skills.length > 0) {
      where.skills = {
        hasSome: Array.isArray(filters.skills)
          ? filters.skills
          : [filters.skills],
      };
    }

    if (filters.experience) {
      where.seniority = { contains: filters.experience, mode: 'insensitive' };
    }

    if (filters.salaryMin !== undefined && !isNaN(Number(filters.salaryMin))) {
      const minSal = Number(filters.salaryMin);
      where.OR = [
        { salaryMin: { gte: minSal } },
        { salaryMax: { gte: minSal } },
      ];
    }

    if (filters.favorites === 'true' || filters.favorites === true) {
      where.savedBy = {
        some: { userId },
      };
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.jobOffer.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          savedBy: {
            where: { userId },
            select: { id: true },
          },
        },
      } as any),
      this.prisma.jobOffer.count({ where }),
    ] as const);

    const mappedData = (data as any[]).map((offer: any) => {
      const isFavorite = Array.isArray(offer.savedBy)
        ? offer.savedBy.length > 0
        : false;
      delete offer.savedBy;
      return { ...offer, isFavorite };
    });

    return {
      data: mappedData,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async saveFavorite(userId: string, offerId: string) {
    return this.prisma.savedJob.upsert({
      where: { userId_offerId: { userId, offerId } },
      update: {},
      create: { userId, offerId },
    });
  }

  async removeFavorite(userId: string, offerId: string) {
    try {
      return await this.prisma.savedJob.delete({
        where: { userId_offerId: { userId, offerId } },
      });
    } catch (e) {
      // ignore if it doesn't exist
      return { success: true };
    }
  }
}
