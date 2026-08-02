import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    let connectionString = process.env.DATABASE_URL || '';

    // Mute pg-connection-string warning by explicitly using verify-full for SSL
    // when Neon DB or other cloud DBs enforce sslmode=require
    if (connectionString.includes('sslmode=require')) {
      connectionString = connectionString.replace(
        'sslmode=require',
        'sslmode=verify-full',
      );
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
