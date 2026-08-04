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
        workExperiences: true,
        educations: true,
        user: {
          select: { email: true }
        }
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const { user, ...profileData } = profile;
    return {
      ...profileData,
      email: user?.email,
    };
  }

  async ingestCv(userId: string, data: CvIngestionDto, cvDocumentUrl?: string) {
    const updateData: any = {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      headline: data.headline,
      experienceLevel: data.experienceLevel,
      summary: data.summary,
      skills: data.skills || [],
      location: data.location,
      availability: data.availability,
      portfolioUrl: data.portfolioUrl,
      linkedinUrl: data.linkedinUrl,
      githubUrl: data.githubUrl,
      languages: data.languages,
      hobbies: data.hobbies,
    };

    if (cvDocumentUrl) {
      updateData.cvDocumentUrl = cvDocumentUrl;
    }

    const profile = await this.prisma.profile.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData,
        cvDocumentUrl: cvDocumentUrl,
      },
    });

    // Update email in User model if provided
    if (data.email) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { email: data.email },
      });
    }

    // Replace experiences
    if (data.workExperiences) {
      await this.prisma.workExperience.deleteMany({
        where: { profileId: profile.id },
      });
      if (data.workExperiences.length > 0) {
        await this.prisma.workExperience.createMany({
          data: data.workExperiences.map((exp) => ({
            ...exp,
            profileId: profile.id,
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
