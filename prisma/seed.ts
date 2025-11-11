import { PrismaClient, PropertyType, UserType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Nettoyer la base de données
  await prisma.message.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.savedSearch.deleteMany({});
  await prisma.property.deleteMany({});
  await prisma.locality.deleteMany({});
  await prisma.neighborhood.deleteMany({});
  await prisma.city.deleteMany({});
  await prisma.agent.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('🧹 Database cleaned');

  // Créer les utilisateurs avec les identifiants spécifiés
  const hashedPassword = await bcrypt.hash('12345678', 12);

  // Locataire
  const tenant1 = await prisma.user.create({
    data: {
      email: 'mbolo@casaneo.io',
      phone: '+237671234567',
      password: hashedPassword,
      firstName: 'Mbolo',
      lastName: 'User',
      userType: UserType.TENANT,
    },
  });

  // Agent
  const agentUser1 = await prisma.user.create({
    data: {
      email: 'agent@casaneo.io',
      phone: '+237673456789',
      password: hashedPassword,
      firstName: 'Agent',
      lastName: 'Casaneo',
      userType: UserType.AGENT,
    },
  });

  // Admin
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@piol.com',
      phone: '+237690000000',
      password: 12345678,
      firstName: 'Admin',
      lastName: 'PIOL',
      userType: UserType.ADMIN,
    },
  });

  // Créer le profil agent
  const agent1 = await prisma.agent.create({
    data: {
      userId: agentUser1.id,
      businessName: 'Casaneo Immobilier',
      license: 'LIC001234',
      idCardNumber: '123456789',
      idCardPhoto: 'https://example.com/id1.jpg',
      profilePhoto: 'https://example.com/profile1.jpg',
      isVerified: true,
      verificationStatus: 'APPROVED',
      rating: 5.0,
      reviewCount: 0,
    },
  });

  console.log('👥 Users and agents created');

  // Créer les villes, quartiers et lieux-dits
  const douala = await prisma.city.create({
    data: {
      name: 'Douala',
      region: 'Littoral',
    },
  });

  const yaounde = await prisma.city.create({
    data: {
      name: 'Yaoundé',
      region: 'Centre',
    },
  });

  const bafoussam = await prisma.city.create({
    data: {
      name: 'Bafoussam',
      region: 'Ouest',
    },
  });

  console.log('🏙️ Cities created');

  // Quartiers de Douala
  const bonanjo = await prisma.neighborhood.create({
    data: {
      name: 'Bonanjo',
      cityId: douala.id,
    },
  });

  const akwa = await prisma.neighborhood.create({
    data: {
      name: 'Akwa',
      cityId: douala.id,
    },
  });

  const bonapriso = await prisma.neighborhood.create({
    data: {
      name: 'Bonapriso',
      cityId: douala.id,
    },
  });

  const bassa = await prisma.neighborhood.create({
    data: {
      name: 'Bassa',
      cityId: douala.id,
    },
  });

  const makepe = await prisma.neighborhood.create({
    data: {
      name: 'Makepe',
      cityId: douala.id,
    },
  });

  const deido = await prisma.neighborhood.create({
    data: {
      name: 'Deido',
      cityId: douala.id,
    },
  });

  const newBell = await prisma.neighborhood.create({
    data: {
      name: 'New Bell',
      cityId: douala.id,
    },
  });

  const logbaba = await prisma.neighborhood.create({
    data: {
      name: 'Logbaba',
      cityId: douala.id,
    },
  });

  // Quartiers de Yaoundé
  const bastos = await prisma.neighborhood.create({
    data: {
      name: 'Bastos',
      cityId: yaounde.id,
    },
  });

  const odza = await prisma.neighborhood.create({
    data: {
      name: 'Odza',
      cityId: yaounde.id,
    },
  });

  const melen = await prisma.neighborhood.create({
    data: {
      name: 'Melen',
      cityId: yaounde.id,
    },
  });

  const ngousso = await prisma.neighborhood.create({
    data: {
      name: 'Ngousso',
      cityId: yaounde.id,
    },
  });

  const essos = await prisma.neighborhood.create({
    data: {
      name: 'Essos',
      cityId: yaounde.id,
    },
  });

  console.log('🏘️ Neighborhoods created');

  // Lieux-dits pour Bonanjo
  await prisma.locality.create({
    data: {
      name: 'Bonanjo Centre',
      neighborhoodId: bonanjo.id,
    },
  });

  await prisma.locality.create({
    data: {
      name: 'Bonanjo Port',
      neighborhoodId: bonanjo.id,
    },
  });

  // Lieux-dits pour Akwa
  await prisma.locality.create({
    data: {
      name: 'Akwa Centre',
      neighborhoodId: akwa.id,
    },
  });

  await prisma.locality.create({
    data: {
      name: 'Akwa Nord',
      neighborhoodId: akwa.id,
    },
  });

  // Lieux-dits pour Bonapriso
  await prisma.locality.create({
    data: {
      name: 'Bonapriso Village',
      neighborhoodId: bonapriso.id,
    },
  });

  await prisma.locality.create({
    data: {
      name: 'Bonapriso Résidentiel',
      neighborhoodId: bonapriso.id,
    },
  });

  // Lieux-dits pour Bassa
  await prisma.locality.create({
    data: {
      name: 'Bassa Université',
      neighborhoodId: bassa.id,
    },
  });

  await prisma.locality.create({
    data: {
      name: 'Bassa Marché',
      neighborhoodId: bassa.id,
    },
  });

  // Lieux-dits pour Makepe
  await prisma.locality.create({
    data: {
      name: 'Makepe Missoke',
      neighborhoodId: makepe.id,
    },
  });

  await prisma.locality.create({
    data: {
      name: 'Makepe Petit Pays',
      neighborhoodId: makepe.id,
    },
  });

  // Lieux-dits pour Bastos (Yaoundé)
  await prisma.locality.create({
    data: {
      name: 'Bastos Centre',
      neighborhoodId: bastos.id,
    },
  });

  await prisma.locality.create({
    data: {
      name: 'Bastos Ambassades',
      neighborhoodId: bastos.id,
    },
  });

  console.log('📍 Localities created');

  // Créer des propriétés de test pour l'agent
  const properties = [
    {
      agentId: agent1.id,
      title: 'Studio moderne à Bonanjo',
      description: 'Magnifique studio entièrement meublé dans le quartier résidentiel de Bonanjo. Proche des commodités et des transports.',
      type: PropertyType.STUDIO,
      price: 85000,
      deposit: 170000,
      fees: 25000,
      address: '123 Rue de la Paix, Bonanjo',
      cityId: douala.id,
      neighborhoodId: bonanjo.id,
      latitude: 4.0511,
      longitude: 9.7679,
      bedrooms: 1,
      bathrooms: 1,
      area: 35,
      furnished: true,
      airConditioned: true,
      parking: false,
      security: true,
      internet: true,
      water: true,
      electricity: true,
      images: [
        'https://example.com/property1_1.jpg',
        'https://example.com/property1_2.jpg',
        'https://example.com/property1_3.jpg',
      ],
      isPremium: true,
    },
    {
      agentId: agent1.id,
      title: 'Appartement 2 pièces Akwa',
      description: 'Spacieux appartement de 2 pièces dans le centre-ville d\'Akwa. Vue sur mer et balcon.',
      type: PropertyType.APPARTEMENT,
      price: 120000,
      deposit: 240000,
      fees: 36000,
      address: '456 Boulevard de la Liberté, Akwa',
      cityId: douala.id,
      neighborhoodId: akwa.id,
      latitude: 4.0469,
      longitude: 9.7069,
      bedrooms: 2,
      bathrooms: 1,
      area: 65,
      furnished: false,
      airConditioned: true,
      parking: true,
      security: true,
      internet: false,
      water: true,
      electricity: true,
      images: [
        'https://example.com/property2_1.jpg',
        'https://example.com/property2_2.jpg',
      ],
      isPremium: false,
    },
    {
      agentId: agent1.id,
      title: 'Villa 4 chambres Bonapriso',
      description: 'Luxueuse villa de 4 chambres avec jardin et piscine dans le quartier huppé de Bonapriso.',
      type: PropertyType.MAISON,
      price: 350000,
      deposit: 700000,
      fees: 105000,
      address: '789 Avenue des Cocotiers, Bonapriso',
      cityId: douala.id,
      neighborhoodId: bonapriso.id,
      latitude: 4.0614,
      longitude: 9.7244,
      bedrooms: 4,
      bathrooms: 3,
      area: 180,
      furnished: true,
      airConditioned: true,
      parking: true,
      security: true,
      internet: true,
      water: true,
      electricity: true,
      images: [
        'https://example.com/property3_1.jpg',
        'https://example.com/property3_2.jpg',
        'https://example.com/property3_3.jpg',
        'https://example.com/property3_4.jpg',
      ],
      isPremium: true,
    },
  ];

  const createdProperties = [];
  for (const propertyData of properties) {
    const property = await prisma.property.create({
      data: propertyData,
    });
    createdProperties.push(property);
  }

  console.log('🏠 Properties created');

  // Créer un favori
  await prisma.favorite.create({
    data: {
      userId: tenant1.id,
      propertyId: createdProperties[0].id,
    },
  });

  console.log('❤️ Favorites created');

  console.log('✅ Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Users: ${await prisma.user.count()}`);
  console.log(`- Agents: ${await prisma.agent.count()}`);
  console.log(`- Cities: ${await prisma.city.count()}`);
  console.log(`- Neighborhoods: ${await prisma.neighborhood.count()}`);
  console.log(`- Localities: ${await prisma.locality.count()}`);
  console.log(`- Properties: ${await prisma.property.count()}`);
  console.log(`- Favorites: ${await prisma.favorite.count()}`);
  
  console.log('\n🔑 Comptes de test:');
  console.log('Locataire: mbolo@casaneo.io / 12345678');
  console.log('Agent: agent@casaneo.io / 12345678');
  console.log('Admin: admin@piol.com / 12345678');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
