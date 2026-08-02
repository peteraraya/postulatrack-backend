import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RecommendationService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateForOffer(offerId: string) {
    const offer = await this.prisma.jobOffer.findUnique({
      where: { id: offerId },
    });

    if (!offer) return;

    // Rule-based matching against all profiles
    const profiles = await this.prisma.profile.findMany({
      include: {
        experiences: true,
      },
    });

    for (const profile of profiles) {
      const score = this.computeScore(profile, offer);
      if (score > 0) {
        await this.prisma.recommendationScore.upsert({
          where: { userId_offerId: { userId: profile.userId, offerId } },
          update: { score },
          create: { userId: profile.userId, offerId, score },
        });
      } else {
        try {
          await this.prisma.recommendationScore.delete({
            where: { userId_offerId: { userId: profile.userId, offerId } },
          });
        } catch (e) {
          // Ignoramos el error si no existía
        }
      }
    }
  }

  async calculateForProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { experiences: true },
    });

    if (!profile) return;

    const offers = await this.prisma.jobOffer.findMany();

    // Obtenemos todos los scores actuales para no hacer queries innecesarias
    const existingScoresArray = await this.prisma.recommendationScore.findMany({
      where: { userId },
    });

    const existingScores = new Map(
      existingScoresArray.map((s) => [s.offerId, s.score]),
    );

    const operations: any[] = [];

    for (const offer of offers) {
      const score = this.computeScore(profile, offer);
      const existingScore = existingScores.get(offer.id);

      if (score > 0) {
        if (existingScore !== score) {
          if (existingScore !== undefined) {
            operations.push(
              this.prisma.recommendationScore.update({
                where: { userId_offerId: { userId, offerId: offer.id } },
                data: { score },
              }),
            );
          } else {
            operations.push(
              this.prisma.recommendationScore.create({
                data: { userId, offerId: offer.id, score },
              }),
            );
          }
        }
      } else if (existingScore !== undefined) {
        operations.push(
          this.prisma.recommendationScore.delete({
            where: { userId_offerId: { userId, offerId: offer.id } },
          }),
        );
      }
    }

    // Ejecutamos en batches para no sobrecargar Neon DB
    const BATCH_SIZE = 50;
    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      const batch = operations.slice(i, i + BATCH_SIZE);
      await Promise.all(batch);
    }
  }

  private computeScore(profile: any, offer: any): number {
    let score = 0;
    let maxPossibleScore = 0;

    // Si el usuario no tiene skills ni location en su perfil, no podemos darle un buen match
    if (!profile.skills?.length && !profile.location) {
      return 0;
    }

    // Extraer "skills implicitas" del titulo/descripcion de la oferta si la API no trajo skills
    let offerSkills = offer.skills || [];
    if (offerSkills.length === 0) {
      const commonTechs = [
        'java',
        'python',
        'react',
        'angular',
        'vue',
        'node',
        'aws',
        'azure',
        'gcp',
        'sql',
        'postgres',
        'docker',
        'kubernetes',
        'typescript',
        'javascript',
        'php',
        'ruby',
        'c#',
        'c++',
        'go',
        'swift',
        'kotlin',
      ];
      const textToSearch = (
        (offer.title || '') +
        ' ' +
        (offer.description || '')
      ).toLowerCase();
      offerSkills = commonTechs.filter((tech) => textToSearch.includes(tech));
    }

    // Evaluamos skills
    if (offerSkills.length > 0) {
      maxPossibleScore += offerSkills.length * 10;
      if (profile.skills && profile.skills.length > 0) {
        const profileSkillsLower = profile.skills.map((s: string) =>
          s.toLowerCase(),
        );
        const overlap = offerSkills.filter((s: string) =>
          profileSkillsLower.includes(s.toLowerCase()),
        );
        score += overlap.length * 10;
      }
    } else {
      // Si la oferta definitivamente no especifica skills, el maxPossibleScore base por "skills" será 30
      // para penalizar y no dar 100% solo por ser remoto.
      maxPossibleScore += 30;
    }

    // Evaluamos location / remote
    maxPossibleScore += 20; // El peso máximo que damos a la ubicación es 20
    if (offer.workModel === 'REMOTE') {
      score += 20; // Si es remoto, suma el máximo porque sirve para todos
    } else if (
      offer.location &&
      profile.location &&
      offer.location.toLowerCase().includes(profile.location.toLowerCase())
    ) {
      score += 20;
    }

    if (maxPossibleScore === 0) return 0;

    const percentage = Math.round((score / maxPossibleScore) * 100);
    return percentage > 100 ? 100 : percentage;
  }

  async getUserMatches(
    userId: string,
    filters: any = {},
    page: number = 1,
    limit: number = 10,
  ) {
    // Calculamos el perfil a tiempo real por si no había scores generados
    await this.calculateForProfile(userId);

    const offerWhere: any = {};

    if (filters.title) {
      offerWhere.title = { contains: filters.title, mode: 'insensitive' };
    }
    if (filters.company) {
      offerWhere.company = { contains: filters.company, mode: 'insensitive' };
    }
    if (filters.location) {
      offerWhere.location = { contains: filters.location, mode: 'insensitive' };
    }
    if (filters.country) {
      offerWhere.country = { contains: filters.country, mode: 'insensitive' };
    }
    if (filters.workModel) {
      offerWhere.workModel = filters.workModel;
    }
    if (filters.skills && filters.skills.length > 0) {
      offerWhere.skills = {
        hasSome: Array.isArray(filters.skills)
          ? filters.skills
          : [filters.skills],
      };
    }
    if (filters.experience) {
      offerWhere.seniority = {
        contains: filters.experience,
        mode: 'insensitive',
      };
    }
    if (filters.salaryMin !== undefined && !isNaN(Number(filters.salaryMin))) {
      const minSal = Number(filters.salaryMin);
      offerWhere.OR = [
        { salaryMin: { gte: minSal } },
        { salaryMax: { gte: minSal } },
      ];
    }

    const skip = (page - 1) * limit;

    const [matches, total] = await Promise.all([
      this.prisma.recommendationScore.findMany({
        where: {
          userId,
          offer: offerWhere,
        },
        include: {
          offer: true,
        },
        orderBy: {
          score: 'desc',
        },
        skip,
        take: Number(limit),
      }),
      this.prisma.recommendationScore.count({
        where: {
          userId,
          offer: offerWhere,
        },
      }),
    ]);

    const data = matches.map((match) => ({
      matchPercentage: match.score,
      offer: match.offer,
    }));

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
