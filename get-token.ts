import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import jwt from 'jsonwebtoken';

import { config } from 'dotenv';
config();

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/postulatrack?schema=public';
const pool = new Pool({
  connectionString: connectionString.replace(
    'sslmode=require',
    'sslmode=verify-full',
  ),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const emailArg = process.argv[2];

  let user;
  if (emailArg) {
    user = await prisma.user.findUnique({ where: { email: emailArg } });
    if (!user) {
      console.error(`No existe un usuario con el email: ${emailArg}`);
      process.exit(1);
    }
  } else {
    const users = await prisma.user.findMany({ take: 5, orderBy: { createdAt: 'asc' } });
    if (users.length === 0) {
      console.error('No hay usuarios en la base de datos. Crea uno primero con Google OAuth.');
      process.exit(1);
    }
    user = users[0];
    if (users.length > 1) {
      console.log(`Usuarios disponibles (se usa el primero):`);
      users.forEach((u) => console.log(`  - ${u.email} (${u.id})`));
    }
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET no está definido en el .env');
    process.exit(1);
  }

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.avatarUrl,
    },
    secret,
    { expiresIn: '7d' },
  );

  console.log('\nToken para', user.email, ':\n');
  console.log(token);
  console.log('\nÚsalo así:');
  console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/scraping/trigger`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
