import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

import { config } from 'dotenv';
config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postulatrack?schema=public';
const pool = new Pool({ connectionString: connectionString.replace('sslmode=require', 'sslmode=verify-full') });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const apps = await prisma.application.findMany({
    include: { offer: true }
  });
  console.log(JSON.stringify(apps, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
