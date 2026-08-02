import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JobAlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async createAlert(userId: string, filters: string) {
    return this.prisma.jobAlert.create({
      data: {
        userId,
        filters,
      },
    });
  }
}
