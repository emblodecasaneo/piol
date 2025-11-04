/**
 * 🎯 Script de seed pour les plans d'abonnement
 * Plans: FREE, BASIC, PREMIUM
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const subscriptionPlans = [
  {
    name: 'FREE',
    displayName: 'Plan Gratuit',
    price: 0,
    maxProperties: 3,
    maxPhotos: 5,
    maxBoosts: 0,
    hasPrioritySupport: false,
    hasAdvancedStats: false,
    hasPremiumBadge: false,
    description: 'Parfait pour commencer et tester la plateforme',
    features: [
      '3 propriétés maximum',
      '5 photos par propriété',
      'Support standard',
      'Statistiques basiques',
    ],
    isActive: true,
  },
  {
    name: 'BASIC',
    displayName: 'Plan Basic',
    price: 3000,
    maxProperties: 15,
    maxPhotos: 10,
    maxBoosts: 2,
    hasPrioritySupport: true,
    hasAdvancedStats: true,
    hasPremiumBadge: false,
    description: 'Pour les agents actifs cherchant plus de visibilité',
    features: [
      '15 propriétés maximum',
      '10 photos HD par propriété',
      '2 mises en avant par mois',
      'Support prioritaire',
      'Statistiques détaillées',
      'Badge "Agent Vérifié"',
    ],
    isActive: true,
  },
  {
    name: 'PREMIUM',
    displayName: 'Plan Premium',
    price: 8000,
    maxProperties: -1, // Illimité
    maxPhotos: 20,
    maxBoosts: 10,
    hasPrioritySupport: true,
    hasAdvancedStats: true,
    hasPremiumBadge: true,
    description: 'Solution complète pour les professionnels de l\'immobilier',
    features: [
      'Propriétés illimitées',
      '20 photos HD + vidéos par propriété',
      '10 mises en avant par mois',
      'Badge "Agent Premium" visible',
      'Support 24/7 prioritaire',
      'Analytics avancées',
      'Export des données',
      'API access (bientôt)',
    ],
    isActive: true,
  },
];

async function seedSubscriptionPlans() {
  console.log('🌱 Démarrage du seeding des plans d\'abonnement...\n');

  try {
    for (const plan of subscriptionPlans) {
      console.log(`💳 Création/Mise à jour du plan: ${plan.displayName}`);

      const result = await prisma.subscriptionPlanDetails.upsert({
        where: { name: plan.name },
        create: plan,
        update: {
          displayName: plan.displayName,
          price: plan.price,
          maxProperties: plan.maxProperties,
          maxPhotos: plan.maxPhotos,
          maxBoosts: plan.maxBoosts,
          hasPrioritySupport: plan.hasPrioritySupport,
          hasAdvancedStats: plan.hasAdvancedStats,
          hasPremiumBadge: plan.hasPremiumBadge,
          description: plan.description,
          features: plan.features,
          isActive: plan.isActive,
        },
      });

      console.log(`   ✅ ${result.displayName} - ${result.price} FCFA/mois`);
      console.log(`   📦 ${result.maxProperties === -1 ? 'Illimité' : result.maxProperties} propriétés\n`);
    }

    console.log('🎉 Seeding terminé avec succès!');
    console.log(`📊 ${subscriptionPlans.length} plans créés/mis à jour`);

  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le seed
seedSubscriptionPlans()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

