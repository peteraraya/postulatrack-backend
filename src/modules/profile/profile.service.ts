import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CvIngestionDto } from './dto/cv-ingestion.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        experiences: true,
        educations: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  async ingestCv(userId: string, data: CvIngestionDto, cvDocumentUrl?: string) {
    const updateData: any = {
      headline: data.headline,
      experience: data.experience,
      summary: data.summary,
      skills: data.skills || [],
      location: data.location,
      portfolioUrl: data.portfolioUrl,
    };

    if (cvDocumentUrl) {
      updateData.cvDocumentUrl = cvDocumentUrl;
    }

    const profile = await this.prisma.profile.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        headline: data.headline,
        experience: data.experience,
        summary: data.summary,
        skills: data.skills || [],
        location: data.location,
        portfolioUrl: data.portfolioUrl,
        cvDocumentUrl: cvDocumentUrl,
      },
    });

    // Replace experiences
    if (data.experiences) {
      await this.prisma.experience.deleteMany({
        where: { profileId: profile.id },
      });
      if (data.experiences.length > 0) {
        await this.prisma.experience.createMany({
          data: data.experiences.map((exp) => ({
            ...exp,
            profileId: profile.id,
            startDate: new Date(exp.startDate),
            endDate: exp.endDate ? new Date(exp.endDate) : null,
          })),
        });
      }
    }

    // Replace educations
    if (data.educations) {
      await this.prisma.education.deleteMany({
        where: { profileId: profile.id },
      });
      if (data.educations.length > 0) {
        await this.prisma.education.createMany({
          data: data.educations.map((edu) => ({
            ...edu,
            profileId: profile.id,
            startDate: new Date(edu.startDate),
            endDate: edu.endDate ? new Date(edu.endDate) : null,
          })),
        });
      }
    }

    return this.getProfile(userId);
  }
}
