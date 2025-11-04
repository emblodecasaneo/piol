/**
 * 🎯 Script de seed pour les scores de quartiers
 * Données réalistes pour Douala et Yaoundé
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface NeighborhoodData {
  neighborhoodName: string;
  cityName: string;
  scores: {
    security: number;
    accessibility: number;
    amenities: number;
    nightlife: number;
    internet: number;
  };
  description: string;
  highlights: string[];
  concerns: string[];
  averageRent: number;
  transportCost: number;
  popularFor: string[];
}

const neighborhoodScoresData: NeighborhoodData[] = [
  // ====== DOUALA ======
  {
    neighborhoodName: 'Bonamoussadi',
    cityName: 'Douala',
    scores: {
      security: 4.2,
      accessibility: 4.5,
      amenities: 4.8,
      nightlife: 4.0,
      internet: 4.3
    },
    description: 'Quartier résidentiel moderne et dynamique, très prisé par les jeunes professionnels et les familles. Excellente infrastructure et nombreux commerces.',
    highlights: [
      'Centre commercial moderne (Dovv)',
      'Nombreux restaurants et cafés',
      'Bonne connexion internet',
      'Écoles de qualité',
      'Marché moderne',
      'Pharmacies et cliniques'
    ],
    concerns: [
      'Trafic dense aux heures de pointe',
      'Prix des loyers élevés',
      'Stationnement parfois difficile'
    ],
    averageRent: 80000,
    transportCost: 2000,
    popularFor: ['Jeunes professionnels', 'Familles', 'Étudiants']
  },
  {
    neighborhoodName: 'Akwa',
    cityName: 'Douala',
    scores: {
      security: 4.5,
      accessibility: 4.8,
      amenities: 4.9,
      nightlife: 4.7,
      internet: 4.6
    },
    description: 'Centre d\'affaires et quartier administratif de Douala. Zone premium avec tous les services modernes, idéal pour les expatriés et cadres supérieurs.',
    highlights: [
      'Centre-ville animé',
      'Nombreux hôtels et restaurants haut de gamme',
      'Banques et institutions financières',
      'Vie nocturne active',
      'Excellente connexion internet',
      'Transports faciles'
    ],
    concerns: [
      'Très cher',
      'Bruit et animation constante',
      'Peu d\'espaces verts'
    ],
    averageRent: 150000,
    transportCost: 1500,
    popularFor: ['Expatriés', 'Cadres supérieurs', 'Hommes d\'affaires']
  },
  {
    neighborhoodName: 'Bonapriso',
    cityName: 'Douala',
    scores: {
      security: 4.7,
      accessibility: 4.6,
      amenities: 4.8,
      nightlife: 4.5,
      internet: 4.7
    },
    description: 'Quartier résidentiel chic avec une forte présence d\'expatriés. Très sécurisé et calme, avec de nombreuses commodités internationales.',
    highlights: [
      'Très sécurisé',
      'Ambassades et consulats',
      'Restaurants internationaux',
      'Supermarchés modernes',
      'Écoles internationales',
      'Environnement calme'
    ],
    concerns: [
      'Loyers très élevés',
      'Peu de transport en commun',
      'Éloigné des marchés locaux'
    ],
    averageRent: 200000,
    transportCost: 3000,
    popularFor: ['Expatriés', 'Diplomates', 'Cadres internationaux']
  },
  {
    neighborhoodName: 'Bonabéri',
    cityName: 'Douala',
    scores: {
      security: 3.5,
      accessibility: 3.8,
      amenities: 3.7,
      nightlife: 3.2,
      internet: 3.4
    },
    description: 'Quartier populaire de l\'autre côté du pont. Plus abordable mais moins développé en termes d\'infrastructures modernes.',
    highlights: [
      'Loyers abordables',
      'Proche du port',
      'Marché très animé',
      'Communauté chaleureuse',
      'Accès au fleuve Wouri'
    ],
    concerns: [
      'Embouteillages au pont',
      'Infrastructure moins développée',
      'Connexion internet moyenne',
      'Sécurité à renforcer'
    ],
    averageRent: 45000,
    transportCost: 2500,
    popularFor: ['Familles', 'Travailleurs du port', 'Budget limité']
  },
  {
    neighborhoodName: 'Bépanda',
    cityName: 'Douala',
    scores: {
      security: 3.2,
      accessibility: 3.9,
      amenities: 3.8,
      nightlife: 3.5,
      internet: 3.3
    },
    description: 'Quartier populaire et animé, très accessible. Bon pour les petits budgets avec accès facile aux transports.',
    highlights: [
      'Très abordable',
      'Nombreux transports en commun',
      'Marchés dynamiques',
      'Vie communautaire active',
      'Proche du centre-ville'
    ],
    concerns: [
      'Densité de population élevée',
      'Bruit constant',
      'Sécurité à surveiller la nuit',
      'Infrastructure vieillissante'
    ],
    averageRent: 35000,
    transportCost: 1500,
    popularFor: ['Étudiants', 'Petits budgets', 'Travailleurs']
  },
  {
    neighborhoodName: 'Makepe',
    cityName: 'Douala',
    scores: {
      security: 3.8,
      accessibility: 4.2,
      amenities: 4.0,
      nightlife: 3.5,
      internet: 3.9
    },
    description: 'Quartier en pleine expansion avec un bon mix de zones résidentielles et commerciales. Prisé par les étudiants.',
    highlights: [
      'Prix raisonnables',
      'Proche des universités',
      'Bons restaurants locaux',
      'Transports accessibles',
      'Développement rapide'
    ],
    concerns: [
      'Certaines zones mal éclairées',
      'Infrastructure inégale',
      'Bruit dans certaines zones'
    ],
    averageRent: 55000,
    transportCost: 2000,
    popularFor: ['Étudiants', 'Jeunes travailleurs', 'Familles']
  },

  // ====== YAOUNDÉ ======
  {
    neighborhoodName: 'Bastos',
    cityName: 'Yaoundé',
    scores: {
      security: 4.8,
      accessibility: 4.5,
      amenities: 4.9,
      nightlife: 4.3,
      internet: 4.8
    },
    description: 'Quartier diplomatique huppé de Yaoundé. Le plus sécurisé et luxueux de la capitale, avec toutes les commodités modernes.',
    highlights: [
      'Extrêmement sécurisé',
      'Ambassades et résidences officielles',
      'Restaurants gastronomiques',
      'Supermarchés internationaux',
      'Écoles internationales',
      'Excellente connexion internet'
    ],
    concerns: [
      'Prix prohibitifs',
      'Très exclusif',
      'Éloigné de l\'ambiance locale'
    ],
    averageRent: 250000,
    transportCost: 3500,
    popularFor: ['Expatriés', 'Diplomates', 'Elite']
  },
  {
    neighborhoodName: 'Odza',
    cityName: 'Yaoundé',
    scores: {
      security: 3.5,
      accessibility: 4.0,
      amenities: 3.9,
      nightlife: 3.3,
      internet: 3.6
    },
    description: 'Quartier populaire et dynamique, très accessible. Bon compromis entre prix et commodités.',
    highlights: [
      'Prix abordables',
      'Proche du centre-ville',
      'Nombreux transports',
      'Marchés variés',
      'Vie active'
    ],
    concerns: [
      'Densité élevée',
      'Bruit important',
      'Sécurité variable selon les zones',
      'Rues parfois impraticables pendant la saison des pluies'
    ],
    averageRent: 50000,
    transportCost: 2000,
    popularFor: ['Étudiants', 'Travailleurs', 'Petits budgets']
  },
  {
    neighborhoodName: 'Ngousso',
    cityName: 'Yaoundé',
    scores: {
      security: 3.3,
      accessibility: 3.7,
      amenities: 3.5,
      nightlife: 3.0,
      internet: 3.2
    },
    description: 'Quartier populaire en périphérie. Très abordable mais infrastructures limitées.',
    highlights: [
      'Loyers très bas',
      'Communauté solidaire',
      'Espace disponible',
      'Proche de la gare routière'
    ],
    concerns: [
      'Éloigné du centre',
      'Infrastructure basique',
      'Connexion internet faible',
      'Sécurité à améliorer'
    ],
    averageRent: 35000,
    transportCost: 2500,
    popularFor: ['Budget très limité', 'Familles nombreuses']
  },
  {
    neighborhoodName: 'Essos',
    cityName: 'Yaoundé',
    scores: {
      security: 4.0,
      accessibility: 4.3,
      amenities: 4.2,
      nightlife: 3.8,
      internet: 4.0
    },
    description: 'Quartier moderne en développement rapide. Bon équilibre entre prix, sécurité et commodités.',
    highlights: [
      'Infrastructure moderne',
      'Centres commerciaux',
      'Bonne sécurité',
      'Transports faciles',
      'Écoles et cliniques'
    ],
    concerns: [
      'Prix en hausse rapide',
      'Travaux constants',
      'Embouteillages en croissance'
    ],
    averageRent: 75000,
    transportCost: 2000,
    popularFor: ['Jeunes professionnels', 'Familles', 'Classe moyenne']
  },
  {
    neighborhoodName: 'Mimboman',
    cityName: 'Yaoundé',
    scores: {
      security: 3.6,
      accessibility: 3.9,
      amenities: 3.7,
      nightlife: 3.2,
      internet: 3.5
    },
    description: 'Quartier universitaire par excellence. Animé et jeune, avec de nombreux logements étudiants.',
    highlights: [
      'Très proche de l\'université',
      'Prix étudiants',
      'Ambiance jeune',
      'Nombreux maquis et restaurants',
      'Vie nocturne active'
    ],
    concerns: [
      'Très bruyant',
      'Sécurité variable',
      'Infrastructure vieillissante',
      'Surpeuplement'
    ],
    averageRent: 40000,
    transportCost: 1500,
    popularFor: ['Étudiants', 'Jeunes', 'Enseignants']
  },
  {
    neighborhoodName: 'Santa Barbara',
    cityName: 'Yaoundé',
    scores: {
      security: 4.3,
      accessibility: 4.2,
      amenities: 4.4,
      nightlife: 3.9,
      internet: 4.2
    },
    description: 'Quartier résidentiel moderne et bien planifié. Populaire auprès de la classe moyenne supérieure.',
    highlights: [
      'Quartier bien organisé',
      'Sécurité correcte',
      'Supermarchés modernes',
      'Bonne connexion internet',
      'Écoles de qualité',
      'Environnement calme'
    ],
    concerns: [
      'Prix moyens à élevés',
      'Circulation dense',
      'Peu de parkings'
    ],
    averageRent: 90000,
    transportCost: 2500,
    popularFor: ['Familles', 'Professionnels', 'Classe moyenne supérieure']
  }
];

async function seedNeighborhoodScores() {
  console.log('🌱 Démarrage du seeding des scores de quartiers...\n');

  try {
    for (const data of neighborhoodScoresData) {
      console.log(`📍 Traitement: ${data.neighborhoodName}, ${data.cityName}`);

      // Trouver la ville
      const city = await prisma.city.findUnique({
        where: { name: data.cityName }
      });

      if (!city) {
        console.log(`   ⚠️  Ville "${data.cityName}" non trouvée, passage...\n`);
        continue;
      }

      // Trouver le quartier
      const neighborhood = await prisma.neighborhood.findFirst({
        where: {
          name: data.neighborhoodName,
          cityId: city.id
        }
      });

      if (!neighborhood) {
        console.log(`   ⚠️  Quartier "${data.neighborhoodName}" non trouvé, passage...\n`);
        continue;
      }

      // Calculer le score global
      const overall = (
        data.scores.security +
        data.scores.accessibility +
        data.scores.amenities +
        data.scores.nightlife +
        data.scores.internet
      ) / 5;

      // Créer ou mettre à jour le score
      const score = await prisma.neighborhoodScore.upsert({
        where: { neighborhoodId: neighborhood.id },
        create: {
          neighborhoodId: neighborhood.id,
          security: data.scores.security,
          accessibility: data.scores.accessibility,
          amenities: data.scores.amenities,
          nightlife: data.scores.nightlife,
          internet: data.scores.internet,
          overall,
          description: data.description,
          highlights: data.highlights,
          concerns: data.concerns,
          averageRent: data.averageRent,
          transportCost: data.transportCost,
          popularFor: data.popularFor,
          totalRatings: 0
        },
        update: {
          security: data.scores.security,
          accessibility: data.scores.accessibility,
          amenities: data.scores.amenities,
          nightlife: data.scores.nightlife,
          internet: data.scores.internet,
          overall,
          description: data.description,
          highlights: data.highlights,
          concerns: data.concerns,
          averageRent: data.averageRent,
          transportCost: data.transportCost,
          popularFor: data.popularFor
        }
      });

      console.log(`   ✅ Score créé/mis à jour (Overall: ${overall.toFixed(1)}/5)\n`);
    }

    console.log('🎉 Seeding terminé avec succès!');
    console.log(`📊 ${neighborhoodScoresData.length} quartiers traités`);

  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le seed
seedNeighborhoodScores()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

