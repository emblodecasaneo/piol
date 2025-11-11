import { PrismaClient, UserType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting admin seeding...');

  // Vérifier si l'admin existe déjà
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@piol.com' },
  });

  if (existingAdmin) {
    console.log('⚠️  Admin already exists. Skipping...');
    return;
  }

  // Hasher le mot de passe
  const hashedPassword = await bcrypt.hash('12345678', 12);

  // Créer l'admin
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@piol.com',
      phone: '+237690000000',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'PIOL',
      userType: UserType.ADMIN,
    },
  });

  console.log('✅ Admin created successfully!');
  console.log('\n🔑 Admin credentials:');
  console.log('Email: admin@piol.com');
  console.log('Password: 12345678');
  console.log(`Admin ID: ${adminUser.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

