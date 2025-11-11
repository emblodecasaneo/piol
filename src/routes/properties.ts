import { PropertyType } from '@prisma/client';
import express from 'express';
import { prisma } from '../index';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Obtenir toutes les propriétés avec filtres
router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '10',
      type,
      cityId,
      neighborhoodId,
      localityId,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      minArea,
      maxArea,
      furnished,
      airConditioned,
      parking,
      security,
      internet,
      water,
      electricity,
      latitude,
      longitude,
      radius,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Construire les filtres
    const where: any = {
      isAvailable: true
    };
    
    console.log('Base WHERE conditions:', where);

    if (type) {
      where.type = type as PropertyType;
    }

    if (cityId) {
      where.cityId = cityId as string;
    }

    if (neighborhoodId) {
      where.neighborhoodId = neighborhoodId as string;
    }

    if (localityId) {
      where.localityId = localityId as string;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseInt(minPrice as string);
      if (maxPrice) where.price.lte = parseInt(maxPrice as string);
    }

    if (bedrooms) {
      where.bedrooms = {
        gte: parseInt(bedrooms as string)
      };
    }

    if (bathrooms) {
      where.bathrooms = {
        gte: parseInt(bathrooms as string)
      };
    }

    // Filtres par surface
    if (minArea || maxArea) {
      where.area = {};
      if (minArea) where.area.gte = parseInt(minArea as string);
      if (maxArea) where.area.lte = parseInt(maxArea as string);
    }

    // Filtres par équipements
    if (furnished !== undefined) {
      where.furnished = furnished === 'true';
    }

    if (airConditioned !== undefined) {
      where.airConditioned = airConditioned === 'true';
    }

    if (parking !== undefined) {
      where.parking = parking === 'true';
    }

    if (security !== undefined) {
      where.security = security === 'true';
    }

    if (internet !== undefined) {
      where.internet = internet === 'true';
    }

    if (water !== undefined) {
      where.water = water === 'true';
    }

    if (electricity !== undefined) {
      where.electricity = electricity === 'true';
    }

    if (search) {
      const searchTerm = search as string;
      console.log('Searching for:', searchTerm); // Debug log
      
      where.OR = [
        {
          title: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        {
          address: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        {
          city: {
            name: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        },
        {
          neighborhood: {
            name: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        }
      ];
      
      console.log('Search WHERE clause:', JSON.stringify(where.OR, null, 2)); // Debug log
    }

    // Filtrage géographique (recherche par rayon)
    let geoFilteredProperties: string[] | undefined;
    if (latitude && longitude && radius) {
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const radiusKm = parseFloat(radius as string);
      
      // Calculer les propriétés dans le rayon spécifié
      geoFilteredProperties = await getPropertiesWithinRadius(lat, lng, radiusKm);
      
      if (geoFilteredProperties.length === 0) {
        // Aucune propriété dans le rayon
        return res.json({
          message: 'Properties retrieved successfully',
          properties: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            totalPages: 0
          }
        });
      }
      
      where.id = {
        in: geoFilteredProperties
      };
    }

    // Configuration du tri
    let orderBy: any = [
      { isPremium: 'desc' },
      { createdAt: 'desc' }
    ];

    if (sortBy && sortBy !== 'createdAt') {
      const validSortFields = ['price', 'views', 'bedrooms', 'area', 'updatedAt'];
      if (validSortFields.includes(sortBy as string)) {
        orderBy = [
          { isPremium: 'desc' },
          { [sortBy as string]: sortOrder === 'asc' ? 'asc' : 'desc' }
        ];
      }
    }

    // Debug: Log de la requête finale
    console.log('Final WHERE clause:', JSON.stringify(where, null, 2));
    console.log('Query params:', { page, limit, search, type, cityId, neighborhoodId });

    // Récupérer les propriétés
    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          agent: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true
                }
              }
            }
          },
          city: true,
          neighborhood: true,
          locality: true
        },
        orderBy,
        skip,
        take: limitNum
      }),
      prisma.property.count({ where })
    ]);

    console.log('Found properties:', properties.length);
    console.log('Total count:', total);

    // 📊 Ajouter les statistiques à chaque propriété
    const propertiesWithStats = await Promise.all(
      properties.map(async (property) => {
        const [favoriteCount, reviewCount, avgRating] = await Promise.all([
          prisma.favorite.count({ where: { propertyId: property.id } }),
          prisma.review.count({ where: { agentId: property.agentId } }),
          prisma.review.aggregate({
            where: { agentId: property.agentId },
            _avg: { rating: true }
          })
        ]);

        return {
          ...property,
          favoriteCount,
          reviewCount,
          averageRating: avgRating._avg.rating ? parseFloat(avgRating._avg.rating.toFixed(1)) : 0,
        };
      })
    );

    res.json({
      message: 'Properties retrieved successfully',
      properties: propertiesWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({
      error: 'Failed to get properties',
      message: 'An error occurred while retrieving properties'
    });
  }
});

// Obtenir les propriétés d'un agent spécifique (pour les agents connectés)
router.get('/my-properties', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userType = (req as any).user.userType;

    // Vérifier que l'utilisateur est un agent
    if (userType !== 'AGENT') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only agents can access this endpoint'
      });
    }

    // Récupérer l'agent
    const agent = await prisma.agent.findUnique({
      where: { userId }
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        message: 'Agent profile not found'
      });
    }

    const {
      page = '1',
      limit = '10',
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Construire les filtres
    const where: any = {
      agentId: agent.id
    };

    if (status) {
      where.status = status;
    }

    // Configuration du tri
    const orderBy: any = {};
    if (sortBy && ['createdAt', 'updatedAt', 'price', 'views'].includes(sortBy as string)) {
      orderBy[sortBy as string] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    // Récupérer les propriétés de l'agent
    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          city: true,
          neighborhood: true,
          locality: true,
          reviews: {
            select: {
              id: true,
              rating: true
            }
          },
          favorites: {
            select: {
              id: true
            }
          }
        },
        orderBy,
        skip,
        take: limitNum
      }),
      prisma.property.count({ where })
    ]);

    // Calculer les statistiques pour chaque propriété
    const propertiesWithStats = properties.map(property => ({
      ...property,
      averageRating: property.reviews.length > 0 
        ? property.reviews.reduce((sum, review) => sum + review.rating, 0) / property.reviews.length 
        : 0,
      reviewCount: property.reviews.length,
      favoriteCount: property.favorites.length
    }));

    res.json({
      message: 'Agent properties retrieved successfully',
      properties: propertiesWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get agent properties error:', error);
    res.status(500).json({
      error: 'Failed to get agent properties',
      message: 'An error occurred while retrieving agent properties'
    });
  }
});

// Obtenir une propriété par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        agent: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true
              }
            }
          }
        },
        city: true,
        neighborhood: {
          include: {
            score: true  // 🌟 Inclure le score du quartier
          }
        },
        locality: true,
        reviews: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!property) {
      return res.status(404).json({
        error: 'Property not found',
        message: 'The specified property does not exist'
      });
    }

    // Incrémenter le nombre de vues
    await prisma.property.update({
      where: { id },
      data: {
        views: {
          increment: 1
        }
      }
    });

    // 📊 Calculer les statistiques
    const favoriteCount = await prisma.favorite.count({
      where: { propertyId: id }
    });

    const agentReviews = await prisma.review.findMany({
      where: { agentId: property.agentId }
    });

    const reviewCount = agentReviews.length;
    const averageRating = reviewCount > 0
      ? agentReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0;

    // Ajouter les stats à la propriété
    const propertyWithStats = {
      ...property,
      favoriteCount,
      reviewCount,
      averageRating: parseFloat(averageRating.toFixed(1)),
    };

    res.json({
      message: 'Property retrieved successfully',
      property: propertyWithStats
    });

  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({
      error: 'Failed to get property',
      message: 'An error occurred while retrieving property'
    });
  }
});

// Créer une nouvelle propriété (agents seulement)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userType = (req as any).user.userType;

    // Vérifier que l'utilisateur est un agent
    if (userType !== 'AGENT') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only agents can create properties'
      });
    }

    // Récupérer l'agent
    const agent = await prisma.agent.findUnique({
      where: { userId }
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        message: 'Agent profile not found'
      });
    }

    const {
      title,
      description,
      type,
      price,
      deposit,
      fees,
      address,
      cityId,
      neighborhoodId,
      localityId,
      latitude,
      longitude,
      bedrooms,
      bathrooms,
      area,
      furnished,
      airConditioned,
      parking,
      security,
      internet,
      water,
      electricity,
      images,
      availableFrom
    } = req.body;

    // Validation des champs requis
    if (!title || !description || !type || !price || !address || !cityId || !neighborhoodId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Title, description, type, price, address, cityId, and neighborhoodId are required'
      });
    }

    const property = await prisma.property.create({
      data: {
        agentId: agent.id,
        title,
        description,
        type: type as PropertyType,
        price: parseInt(price),
        deposit: deposit ? parseInt(deposit) : 0,
        fees: fees ? parseInt(fees) : null,
        address,
        cityId,
        neighborhoodId,
        localityId: localityId || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        bedrooms: parseInt(bedrooms) || 1,
        bathrooms: parseInt(bathrooms) || 1,
        area: parseInt(area) || 0,
        furnished: furnished === true,
        airConditioned: airConditioned === true,
        parking: parking === true,
        security: security === true,
        internet: internet === true,
        water: water === true,
        electricity: electricity === true,
        images: images || [],
        availableFrom: availableFrom ? new Date(availableFrom) : null
      },
      include: {
        agent: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        city: true,
        neighborhood: true,
        locality: true
      }
    });

    res.status(201).json({
      message: 'Property created successfully',
      property
    });

  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({
      error: 'Failed to create property',
      message: 'An error occurred while creating property'
    });
  }
});

// Mettre à jour une propriété
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    // Récupérer l'agent
    const agent = await prisma.agent.findUnique({
      where: { userId }
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        message: 'Agent profile not found'
      });
    }

    // Vérifier que la propriété appartient à l'agent
    const property = await prisma.property.findFirst({
      where: {
        id,
        agentId: agent.id
      }
    });

    if (!property) {
      return res.status(404).json({
        error: 'Property not found',
        message: 'Property not found or you do not have permission to edit it'
      });
    }

    const updatedProperty = await prisma.property.update({
      where: { id },
      data: req.body,
      include: {
        agent: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        city: true,
        neighborhood: true,
        locality: true
      }
    });

    res.json({
      message: 'Property updated successfully',
      property: updatedProperty
    });

  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({
      error: 'Failed to update property',
      message: 'An error occurred while updating property'
    });
  }
});

// Supprimer une propriété
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    // Récupérer l'agent
    const agent = await prisma.agent.findUnique({
      where: { userId }
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        message: 'Agent profile not found'
      });
    }

    // Vérifier que la propriété appartient à l'agent
    const property = await prisma.property.findFirst({
      where: {
        id,
        agentId: agent.id
      }
    });

    if (!property) {
      return res.status(404).json({
        error: 'Property not found',
        message: 'Property not found or you do not have permission to delete it'
      });
    }

    await prisma.property.delete({
      where: { id }
    });

    res.json({
      message: 'Property deleted successfully'
    });

  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({
      error: 'Failed to delete property',
      message: 'An error occurred while deleting property'
    });
  }
});

// Nouvelle route pour recherche géographique avancée
router.get('/nearby', async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      radius = '5', // rayon par défaut de 5km
      limit = '20'
    } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const radiusKm = parseFloat(radius as string);
    const limitNum = parseInt(limit as string);

    const nearbyProperties = await getPropertiesWithinRadius(lat, lng, radiusKm, limitNum);

    const properties = await prisma.property.findMany({
      where: {
        id: { in: nearbyProperties },
        status: 'ACTIVE',
        isAvailable: true
      },
      include: {
        agent: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                phone: true
              }
            }
          }
        },
        city: true,
        neighborhood: true,
        locality: true
      },
      orderBy: [
        { isPremium: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Calculer la distance pour chaque propriété
    const propertiesWithDistance = properties
      .filter(property => property.latitude !== null && property.longitude !== null)
      .map(property => ({
        ...property,
        distance: calculateDistance(lat, lng, property.latitude!, property.longitude!)
      }))
      .sort((a, b) => a.distance - b.distance);

    res.json({
      message: 'Nearby properties retrieved successfully',
      properties: propertiesWithDistance,
      searchCenter: { latitude: lat, longitude: lng },
      radius: radiusKm
    });

  } catch (error) {
    console.error('Get nearby properties error:', error);
    res.status(500).json({
      error: 'Failed to get nearby properties',
      message: 'An error occurred while retrieving nearby properties'
    });
  }
});

// Fonction utilitaire pour calculer la distance entre deux points (formule de Haversine)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Rayon de la Terre en kilomètres
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance en kilomètres
}

// Fonction utilitaire pour obtenir les propriétés dans un rayon donné
async function getPropertiesWithinRadius(
  centerLat: number, 
  centerLng: number, 
  radiusKm: number,
  limit?: number
): Promise<string[]> {
  try {
    // Récupérer toutes les propriétés actives avec leurs coordonnées
    const allProperties = await prisma.property.findMany({
      where: {
        status: 'ACTIVE',
        isAvailable: true,
        latitude: { not: null },
        longitude: { not: null }
      },
      select: {
        id: true,
        latitude: true,
        longitude: true
      }
    });

    // Filtrer par distance
    const propertiesWithinRadius = allProperties
      .filter(property => property.latitude !== null && property.longitude !== null)
      .map(property => ({
        id: property.id,
        distance: calculateDistance(centerLat, centerLng, property.latitude!, property.longitude!)
      }))
      .filter(property => property.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    // Limiter les résultats si spécifié
    const results = limit 
      ? propertiesWithinRadius.slice(0, limit)
      : propertiesWithinRadius;

    return results.map(property => property.id);

  } catch (error) {
    console.error('Get properties within radius error:', error);
    return [];
  }
}

// [ADMIN-TEST] Endpoint temporaire pour tester sans requireAdmin
router.get('/admin-test', authenticateToken, async (req, res) => {
  console.log('🧪 Admin-test endpoint called');
  console.log('User from token:', req.user);
  console.log('User type:', req.user?.userType);
  
  try {
    const properties = await prisma.property.findMany({
      include: {
        agent: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true
              }
            }
          }
        },
        city: true,
        neighborhood: true,
        locality: true
      },
      orderBy: [
        { isPremium: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 50
    });

    console.log('Properties found for test:', properties.length);

    res.json({
      message: 'Test admin properties retrieved successfully',
      properties,
      userType: req.user?.userType,
      isAdmin: req.user?.userType === 'ADMIN'
    });

  } catch (error) {
    console.error('Get test admin properties error:', error);
    res.status(500).json({
      error: 'Failed to get test admin properties',
      message: 'An error occurred while retrieving test admin properties'
    });
  }
});

// [ADMIN] Obtenir toutes les propriétés (pour le backoffice)
router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
  console.log('🔐 Admin endpoint called');
  console.log('User from token:', req.user);
  console.log('User type:', req.user?.userType);
  console.log('Is admin?', req.user?.userType === 'ADMIN');
  try {
    const {
      page = '1',
      limit = '50',
      search,
      type,
      status,
      agentId
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Construire les filtres pour l'admin
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { address: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (type) {
      where.type = type as PropertyType;
    }

    if (status) {
      where.status = status;
    }

    if (agentId) {
      where.agentId = agentId as string;
    }

    console.log('Admin properties query - WHERE:', JSON.stringify(where, null, 2));

    // Récupérer les propriétés avec toutes les relations
    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          agent: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  email: true
                }
              }
            }
          },
          city: true,
          neighborhood: true,
          locality: true
        },
        orderBy: [
          { isPremium: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limitNum
      }),
      prisma.property.count({ where })
    ]);

    console.log('Admin properties found:', properties.length);
    console.log('Sample property images:', properties[0]?.images || 'No properties');

    res.json({
      message: 'Admin properties retrieved successfully',
      properties,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get admin properties error:', error);
    res.status(500).json({
      error: 'Failed to get admin properties',
      message: 'An error occurred while retrieving admin properties'
    });
  }
});

// [ADMIN] Créer une propriété
router.post('/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      agentId,
      title,
      description,
      type,
      price,
      deposit,
      fees,
      address,
      cityId,
      neighborhoodId,
      localityId,
      latitude,
      longitude,
      bedrooms,
      bathrooms,
      area,
      furnished,
      airConditioned,
      parking,
      security,
      internet,
      water,
      electricity,
      images,
      availableFrom,
      status
    } = req.body;

    // Validation des champs requis
    if (!agentId || !title || !description || !type || !price || !address || !cityId || !neighborhoodId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'agentId, title, description, type, price, address, cityId, and neighborhoodId are required'
      });
    }

    // Vérifier que l'agent existe
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        message: 'The specified agent does not exist'
      });
    }

    const property = await prisma.property.create({
      data: {
        agentId,
        title,
        description,
        type: type as PropertyType,
        price: parseInt(price),
        deposit: deposit ? parseInt(deposit) : 0,
        fees: fees ? parseInt(fees) : null,
        address,
        cityId,
        neighborhoodId,
        localityId: localityId || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        bedrooms: parseInt(bedrooms) || 1,
        bathrooms: parseInt(bathrooms) || 1,
        area: parseInt(area) || 0,
        furnished: furnished === true,
        airConditioned: airConditioned === true,
        parking: parking === true,
        security: security === true,
        internet: internet === true,
        water: water === true,
        electricity: electricity === true,
        images: images || [],
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        status: status || 'ACTIVE'
      },
      include: {
        agent: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        city: true,
        neighborhood: true,
        locality: true
      }
    });

    res.status(201).json({
      message: 'Property created successfully',
      property
    });

  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({
      error: 'Failed to create property',
      message: 'An error occurred while creating property'
    });
  }
});

// [ADMIN] Mettre à jour une propriété
router.put('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const property = await prisma.property.findUnique({
      where: { id }
    });

    if (!property) {
      return res.status(404).json({
        error: 'Property not found',
        message: 'The specified property does not exist'
      });
    }

    // Convertir les types si nécessaire
    if (updateData.price) updateData.price = parseInt(updateData.price);
    if (updateData.deposit) updateData.deposit = parseInt(updateData.deposit);
    if (updateData.fees !== undefined) updateData.fees = updateData.fees ? parseInt(updateData.fees) : null;
    if (updateData.bedrooms) updateData.bedrooms = parseInt(updateData.bedrooms);
    if (updateData.bathrooms) updateData.bathrooms = parseInt(updateData.bathrooms);
    if (updateData.area) updateData.area = parseInt(updateData.area);
    if (updateData.latitude) updateData.latitude = parseFloat(updateData.latitude);
    if (updateData.longitude) updateData.longitude = parseFloat(updateData.longitude);
    if (updateData.type) updateData.type = updateData.type as PropertyType;
    if (updateData.availableFrom) updateData.availableFrom = new Date(updateData.availableFrom);

    const updatedProperty = await prisma.property.update({
      where: { id },
      data: updateData,
      include: {
        agent: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        city: true,
        neighborhood: true,
        locality: true
      }
    });

    res.json({
      message: 'Property updated successfully',
      property: updatedProperty
    });

  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({
      error: 'Failed to update property',
      message: 'An error occurred while updating property'
    });
  }
});

// [ADMIN] Bloquer/Débloquer une propriété
router.put('/:id/block', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { blocked } = req.body; // true pour bloquer, false pour débloquer

    const property = await prisma.property.findUnique({
      where: { id }
    });

    if (!property) {
      return res.status(404).json({
        error: 'Property not found',
        message: 'The specified property does not exist'
      });
    }

    const updatedProperty = await prisma.property.update({
      where: { id },
      data: {
        status: blocked ? 'INACTIVE' : 'ACTIVE',
        isAvailable: !blocked
      },
      include: {
        agent: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        city: true,
        neighborhood: true,
        locality: true
      }
    });

    res.json({
      message: `Property ${blocked ? 'blocked' : 'unblocked'} successfully`,
      property: updatedProperty
    });

  } catch (error) {
    console.error('Block property error:', error);
    res.status(500).json({
      error: 'Failed to block property',
      message: 'An error occurred while blocking property'
    });
  }
});

export default router;
