import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
          select: { email: true },
        },
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

  async exportPdf(userId: string): Promise<Buffer> {
    const profile = await this.getProfile(userId);

    // Lazy load pdfmake to avoid top-level require issues
    const pdfMake = require('pdfmake');
    pdfMake.setFonts({
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    });

    const content: any[] = [];

    // Header (Name & Title)
    content.push({
      text:
        `${profile.firstName || ''} ${profile.lastName || ''}`.trim() ||
        'Sin Nombre',
      style: 'header',
    });

    if (profile.headline) {
      content.push({ text: profile.headline, style: 'subHeader' });
    }

    // Contact info
    const contactInfo = [];
    if (profile.email) contactInfo.push(profile.email);
    if (profile.phone) contactInfo.push(profile.phone);
    if (profile.location) contactInfo.push(profile.location);
    if (profile.linkedinUrl)
      contactInfo.push(`LinkedIn: ${profile.linkedinUrl}`);
    if (profile.githubUrl) contactInfo.push(`GitHub: ${profile.githubUrl}`);

    if (contactInfo.length > 0) {
      content.push({ text: contactInfo.join(' | '), style: 'contactInfo' });
    }

    content.push({ text: '', margin: [0, 10] }); // Spacer

    // Summary
    if (profile.summary) {
      content.push({ text: 'Resumen Profesional', style: 'sectionTitle' });
      content.push({ text: profile.summary, style: 'body' });
    }

    // Work Experience
    if (profile.workExperiences && profile.workExperiences.length > 0) {
      content.push({ text: 'Experiencia Laboral', style: 'sectionTitle' });

      profile.workExperiences.forEach((exp) => {
        content.push({
          columns: [
            { text: exp.role, style: 'jobTitle', width: '*' },
            {
              text: `${exp.startDate} - ${exp.endDate || 'Presente'}`,
              style: 'dateText',
              width: 'auto',
            },
          ],
        });
        content.push({ text: exp.company, style: 'companyName' });

        if (exp.description) {
          content.push({
            text: exp.description,
            style: 'body',
            margin: [0, 5, 0, 10],
          });
        } else {
          content.push({ text: '', margin: [0, 0, 0, 10] });
        }
      });
    }

    // Education
    if (profile.educations && profile.educations.length > 0) {
      content.push({ text: 'Educación', style: 'sectionTitle' });

      profile.educations.forEach((edu) => {
        const startYear = new Date(edu.startDate).getFullYear();
        const endYear = edu.endDate
          ? new Date(edu.endDate).getFullYear()
          : 'Presente';

        content.push({
          columns: [
            {
              text: `${edu.degree}${edu.fieldOfStudy ? ` en ${edu.fieldOfStudy}` : ''}`,
              style: 'jobTitle',
              width: '*',
            },
            {
              text: `${startYear} - ${endYear}`,
              style: 'dateText',
              width: 'auto',
            },
          ],
        });
        content.push({
          text: edu.institution,
          style: 'companyName',
          margin: [0, 0, 0, 10],
        });
      });
    }

    // Skills
    if (profile.skills && profile.skills.length > 0) {
      content.push({ text: 'Habilidades', style: 'sectionTitle' });
      content.push({ text: profile.skills.join(', '), style: 'body' });
    }

    // Languages
    if (profile.languages) {
      content.push({ text: 'Idiomas', style: 'sectionTitle' });
      content.push({ text: profile.languages, style: 'body' });
    }

    // Hobbies
    if (profile.hobbies) {
      content.push({ text: 'Hobbies', style: 'sectionTitle' });
      content.push({ text: profile.hobbies, style: 'body' });
    }

    const docDefinition = {
      defaultStyle: { font: 'Helvetica', fontSize: 10, lineHeight: 1.2 },
      content,
      styles: {
        header: {
          fontSize: 22,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 5],
        },
        subHeader: {
          fontSize: 14,
          alignment: 'center',
          color: '#444444',
          margin: [0, 0, 0, 10],
        },
        contactInfo: {
          fontSize: 9,
          alignment: 'center',
          color: '#666666',
          margin: [0, 0, 0, 15],
        },
        sectionTitle: {
          fontSize: 14,
          bold: true,
          color: '#333333',
          margin: [0, 15, 0, 8],
          decoration: 'underline',
        },
        jobTitle: { fontSize: 12, bold: true },
        companyName: {
          fontSize: 11,
          italics: true,
          color: '#555555',
          margin: [0, 2, 0, 5],
        },
        dateText: { fontSize: 10, alignment: 'right', color: '#666666' },
        body: { fontSize: 10, alignment: 'justify', margin: [0, 0, 0, 10] },
      },
    };

    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    return await pdfDocGenerator.getBuffer();
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
      languages: Array.isArray(data.languages)
        ? data.languages.join(', ')
        : data.languages,
      hobbies: Array.isArray(data.hobbies)
        ? data.hobbies.join(', ')
        : data.hobbies,
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
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException(
          `El correo ${data.email} ya está registrado en otra cuenta.`,
        );
      }

      if (!existingUser || existingUser.id === userId) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { email: data.email },
        });
      }
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
