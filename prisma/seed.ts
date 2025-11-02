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
  await prisma.agent.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('🧹 Database cleaned');

  // Créer des utilisateurs de test
  const hashedPassword = await bcrypt.hash('password123', 12);

  // Utilisateurs locataires
  const tenant1 = await prisma.user.create({
    data: {
      email: 'emmanuel@example.com',
      phone: '+237671234567',
      password: hashedPassword,
      firstName: 'Emmanuel',
      lastName: 'Embolobiloa',
      userType: UserType.TENANT,
    },
  });

  const tenant2 = await prisma.user.create({
    data: {
      email: 'marie@example.com',
      phone: '+237672345678',
      password: hashedPassword,
      firstName: 'Marie',
      lastName: 'Nguyen',
      userType: UserType.TENANT,
    },
  });

  // Utilisateurs agents
  const agentUser1 = await prisma.user.create({
    data: {
      email: 'agent.marie@example.com',
      phone: '+237673456789',
      password: hashedPassword,
      firstName: 'Marie',
      lastName: 'Dupont',
      userType: UserType.AGENT,
    },
  });

  const agentUser2 = await prisma.user.create({
    data: {
      email: 'agent.jean@example.com',
      phone: '+237674567890',
      password: hashedPassword,
      firstName: 'Jean',
      lastName: 'Kamga',
      userType: UserType.AGENT,
    },
  });

  const agentUser3 = await prisma.user.create({
    data: {
      email: 'agent.paul@example.com',
      phone: '+237675678901',
      password: hashedPassword,
      firstName: 'Paul',
      lastName: 'Mballa',
      userType: UserType.AGENT,
    },
  });

  // Créer les profils agents
  const agent1 = await prisma.agent.create({
    data: {
      userId: agentUser1.id,
      businessName: 'Dupont Immobilier',
      license: 'LIC001234',
      idCardNumber: '123456789',
      idCardPhoto: 'https://example.com/id1.jpg',
      profilePhoto: 'https://example.com/profile1.jpg',
      isVerified: true,
      verificationStatus: 'APPROVED',
      rating: 4.5,
      reviewCount: 12,
    },
  });

  const agent2 = await prisma.agent.create({
    data: {
      userId: agentUser2.id,
      businessName: 'Kamga Properties',
      idCardNumber: '987654321',
      idCardPhoto: 'https://example.com/id2.jpg',
      profilePhoto: 'https://example.com/profile2.jpg',
      isVerified: true,
      verificationStatus: 'APPROVED',
      rating: 4.2,
      reviewCount: 8,
    },
  });

  const agent3 = await prisma.agent.create({
    data: {
      userId: agentUser3.id,
      businessName: 'Mballa Real Estate',
      license: 'LIC005678',
      idCardNumber: '456789123',
      idCardPhoto: 'https://example.com/id3.jpg',
      profilePhoto: 'https://example.com/profile3.jpg',
      isVerified: true,
      verificationStatus: 'APPROVED',
      rating: 4.8,
      reviewCount: 15,
    },
  });

  console.log('👥 Users and agents created');

  // Créer des propriétés de test
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
      city: 'Douala',
      neighborhood: 'Bonanjo',
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
      agentId: agent2.id,
      title: 'Appartement 2 pièces Akwa',
      description: 'Spacieux appartement de 2 pièces dans le centre-ville d\'Akwa. Vue sur mer et balcon.',
      type: PropertyType.APPARTEMENT,
      price: 120000,
      deposit: 240000,
      fees: 36000,
      address: '456 Boulevard de la Liberté, Akwa',
      city: 'Douala',
      neighborhood: 'Akwa',
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
      agentId: agent3.id,
      title: 'Villa 4 chambres Bonapriso',
      description: 'Luxueuse villa de 4 chambres avec jardin et piscine dans le quartier huppé de Bonapriso.',
      type: PropertyType.MAISON,
      price: 350000,
      deposit: 700000,
      fees: 105000,
      address: '789 Avenue des Cocotiers, Bonapriso',
      city: 'Douala',
      neighborhood: 'Bonapriso',
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
    {
      agentId: agent1.id,
      title: 'Chambre meublée Bassa',
      description: 'Chambre confortable et meublée dans une maison familiale à Bassa. Idéale pour étudiants.',
      type: PropertyType.CHAMBRE,
      price: 45000,
      deposit: 90000,
      address: '321 Rue des Étudiants, Bassa',
      city: 'Douala',
      neighborhood: 'Bassa',
      latitude: 4.0167,
      longitude: 9.7167,
      bedrooms: 1,
      bathrooms: 1,
      area: 25,
      furnished: true,
      airConditioned: false,
      parking: false,
      security: false,
      internet: true,
      water: true,
      electricity: true,
      images: [
        'https://example.com/property4_1.jpg',
      ],
      isPremium: false,
    },
    {
      agentId: agent2.id,
      title: 'Duplex moderne Makepe',
      description: 'Duplex moderne de 3 chambres avec terrasse dans le quartier dynamique de Makepe.',
      type: PropertyType.DUPLEX,
      price: 200000,
      deposit: 400000,
      fees: 60000,
      address: '654 Route de Makepe, Makepe',
      city: 'Douala',
      neighborhood: 'Makepe',
      latitude: 4.0833,
      longitude: 9.7333,
      bedrooms: 3,
      bathrooms: 2,
      area: 120,
      furnished: false,
      airConditioned: true,
      parking: true,
      security: true,
      internet: true,
      water: true,
      electricity: true,
      images: [
        'https://example.com/property5_1.jpg',
        'https://example.com/property5_2.jpg',
        'https://example.com/property5_3.jpg',
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

  // Créer des favoris
  await prisma.favorite.create({
    data: {
      userId: tenant1.id,
      propertyId: createdProperties[0].id,
    },
  });

  await prisma.favorite.create({
    data: {
      userId: tenant1.id,
      propertyId: createdProperties[2].id,
    },
  });

  await prisma.favorite.create({
    data: {
      userId: tenant2.id,
      propertyId: createdProperties[1].id,
    },
  });

  console.log('❤️ Favorites created');

  // Créer des avis
  await prisma.review.create({
    data: {
      userId: tenant1.id,
      agentId: agent1.id,
      propertyId: createdProperties[0].id,
      rating: 5,
      comment: 'Excellent service ! Marie est très professionnelle et à l\'écoute.',
      communication: 5,
      honesty: 5,
      responsiveness: 5,
      propertyAccuracy: 5,
      isVerified: true,
    },
  });

  await prisma.review.create({
    data: {
      userId: tenant2.id,
      agentId: agent2.id,
      propertyId: createdProperties[1].id,
      rating: 4,
      comment: 'Bon agent, réactif. L\'appartement correspondait à la description.',
      communication: 4,
      honesty: 4,
      responsiveness: 5,
      propertyAccuracy: 4,
      isVerified: true,
    },
  });

  console.log('⭐ Reviews created');

  // Créer des messages
  await prisma.message.create({
    data: {
      senderId: tenant1.id,
      receiverId: agentUser1.id,
      propertyId: createdProperties[0].id,
      content: 'Bonjour, je suis intéressé par votre studio à Bonanjo. Quand puis-je le visiter ?',
    },
  });

  await prisma.message.create({
    data: {
      senderId: agentUser1.id,
      receiverId: tenant1.id,
      propertyId: createdProperties[0].id,
      content: 'Bonjour ! Je serais ravi de vous faire visiter. Êtes-vous disponible demain après-midi ?',
    },
  });

  await prisma.message.create({
    data: {
      senderId: tenant2.id,
      receiverId: agentUser2.id,
      propertyId: createdProperties[1].id,
      content: 'Bonsoir, l\'appartement à Akwa est-il toujours disponible ?',
    },
  });

  console.log('💬 Messages created');

  // Créer des recherches sauvegardées
  await prisma.savedSearch.create({
    data: {
      userId: tenant1.id,
      name: 'Studios Bonanjo < 100k',
      filters: {
        type: 'STUDIO',
        neighborhood: 'Bonanjo',
        maxPrice: 100000,
      },
      resultCount: 3,
    },
  });

  await prisma.savedSearch.create({
    data: {
      userId: tenant2.id,
      name: 'Appartements 2 pièces Douala',
      filters: {
        type: 'APPARTEMENT',
        city: 'Douala',
        bedrooms: 2,
      },
      resultCount: 8,
    },
  });

  console.log('🔍 Saved searches created');

  console.log('✅ Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Users: ${await prisma.user.count()}`);
  console.log(`- Agents: ${await prisma.agent.count()}`);
  console.log(`- Properties: ${await prisma.property.count()}`);
  console.log(`- Favorites: ${await prisma.favorite.count()}`);
  console.log(`- Reviews: ${await prisma.review.count()}`);
  console.log(`- Messages: ${await prisma.message.count()}`);
  console.log(`- Saved searches: ${await prisma.savedSearch.count()}`);
  
  console.log('\n🔑 Test accounts:');
  console.log('Tenant: emmanuel@example.com / password123');
  console.log('Agent: agent.marie@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
