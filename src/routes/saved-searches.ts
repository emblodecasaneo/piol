import express from 'express';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Interface pour les filtres de recherche
interface SearchFilters {
  propertyType?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  location?: {
    city?: string;
    neighborhoods?: string[];
    radius?: number;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  features?: {
    minBedrooms?: number;
    minBathrooms?: number;
    furnished?: boolean;
    airConditioned?: boolean;
    parking?: boolean;
    security?: boolean;
    internet?: boolean;
    water?: boolean;
    electricity?: boolean;
  };
  availability?: {
    from: string;
    to?: string;
  };
}

// Créer une recherche sauvegardée
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { name, filters }: { name: string; filters: SearchFilters } = req.body;

    if (!name || !filters) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Name and filters are required'
      });
    }

    // Vérifier qu'une recherche avec ce nom n'existe pas déjà
    const existingSearch = await prisma.savedSearch.findFirst({
      where: {
        userId,
        name
      }
    });

    if (existingSearch) {
      return res.status(409).json({
        error: 'Search name already exists',
        message: 'A saved search with this name already exists'
      });
    }

    // Compter les résultats actuels pour cette recherche
    const resultCount = await countSearchResults(filters);

    const savedSearch = await prisma.savedSearch.create({
      data: {
        userId,
        name,
        filters: filters as any, // Prisma Json type
        resultCount
      }
    });

    res.status(201).json({
      message: 'Search saved successfully',
      savedSearch
    });

  } catch (error) {
    console.error('Save search error:', error);
    res.status(500).json({
      error: 'Failed to save search',
      message: 'An error occurred while saving the search'
    });
  }
});

// Obtenir toutes les recherches sauvegardées de l'utilisateur
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;

    const savedSearches = await prisma.savedSearch.findMany({
      where: { userId },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Mettre à jour le nombre de résultats pour chaque recherche
    const updatedSearches = await Promise.all(
      savedSearches.map(async (search) => {
        const currentResultCount = await countSearchResults(search.filters as SearchFilters);
        
        // Mettre à jour si le nombre a changé
        if (currentResultCount !== search.resultCount) {
          await prisma.savedSearch.update({
            where: { id: search.id },
            data: { resultCount: currentResultCount }
          });
        }

        return {
          ...search,
          resultCount: currentResultCount,
          hasNewResults: currentResultCount > search.resultCount
        };
      })
    );

    res.json({
      message: 'Saved searches retrieved successfully',
      savedSearches: updatedSearches
    });

  } catch (error) {
    console.error('Get saved searches error:', error);
    res.status(500).json({
      error: 'Failed to get saved searches',
      message: 'An error occurred while retrieving saved searches'
    });
  }
});

// Obtenir une recherche sauvegardée par ID
router.get('/:searchId', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { searchId } = req.params;

    const savedSearch = await prisma.savedSearch.findFirst({
      where: {
        id: searchId,
        userId
      }
    });

    if (!savedSearch) {
      return res.status(404).json({
        error: 'Saved search not found',
        message: 'The specified saved search does not exist'
      });
    }

    // Mettre à jour le nombre de résultats
    const currentResultCount = await countSearchResults(savedSearch.filters as SearchFilters);
    
    if (currentResultCount !== savedSearch.resultCount) {
      await prisma.savedSearch.update({
        where: { id: searchId },
        data: { resultCount: currentResultCount }
      });
    }

    res.json({
      message: 'Saved search retrieved successfully',
      savedSearch: {
        ...savedSearch,
        resultCount: currentResultCount,
        hasNewResults: currentResultCount > savedSearch.resultCount
      }
    });

  } catch (error) {
    console.error('Get saved search error:', error);
    res.status(500).json({
      error: 'Failed to get saved search',
      message: 'An error occurred while retrieving the saved search'
    });
  }
});

// Exécuter une recherche sauvegardée
router.get('/:searchId/results', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { searchId } = req.params;
    const { page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const savedSearch = await prisma.savedSearch.findFirst({
      where: {
        id: searchId,
        userId
      }
    });

    if (!savedSearch) {
      return res.status(404).json({
        error: 'Saved search not found',
        message: 'The specified saved search does not exist'
      });
    }

    const filters = savedSearch.filters as SearchFilters;
    const where = buildWhereClause(filters);

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
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
          }
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

    // Mettre à jour le nombre de résultats et la date de dernière consultation
    await prisma.savedSearch.update({
      where: { id: searchId },
      data: {
        resultCount: total,
        updatedAt: new Date()
      }
    });

    res.json({
      message: 'Search results retrieved successfully',
      properties,
      savedSearch: {
        id: savedSearch.id,
        name: savedSearch.name,
        filters: savedSearch.filters
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Execute saved search error:', error);
    res.status(500).json({
      error: 'Failed to execute saved search',
      message: 'An error occurred while executing the saved search'
    });
  }
});

// Mettre à jour une recherche sauvegardée
router.put('/:searchId', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { searchId } = req.params;
    const { name, filters } = req.body;

    const savedSearch = await prisma.savedSearch.findFirst({
      where: {
        id: searchId,
        userId
      }
    });

    if (!savedSearch) {
      return res.status(404).json({
        error: 'Saved search not found',
        message: 'The specified saved search does not exist'
      });
    }

    // Vérifier qu'une autre recherche avec ce nom n'existe pas déjà
    if (name && name !== savedSearch.name) {
      const existingSearch = await prisma.savedSearch.findFirst({
        where: {
          userId,
          name,
          id: { not: searchId }
        }
      });

      if (existingSearch) {
        return res.status(409).json({
          error: 'Search name already exists',
          message: 'A saved search with this name already exists'
        });
      }
    }

    // Calculer le nouveau nombre de résultats si les filtres ont changé
    let resultCount = savedSearch.resultCount;
    if (filters) {
      resultCount = await countSearchResults(filters);
    }

    const updatedSearch = await prisma.savedSearch.update({
      where: { id: searchId },
      data: {
        ...(name && { name }),
        ...(filters && { filters: filters as any }),
        resultCount
      }
    });

    res.json({
      message: 'Saved search updated successfully',
      savedSearch: updatedSearch
    });

  } catch (error) {
    console.error('Update saved search error:', error);
    res.status(500).json({
      error: 'Failed to update saved search',
      message: 'An error occurred while updating the saved search'
    });
  }
});

// Supprimer une recherche sauvegardée
router.delete('/:searchId', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { searchId } = req.params;

    const savedSearch = await prisma.savedSearch.findFirst({
      where: {
        id: searchId,
        userId
      }
    });

    if (!savedSearch) {
      return res.status(404).json({
        error: 'Saved search not found',
        message: 'The specified saved search does not exist'
      });
    }

    await prisma.savedSearch.delete({
      where: { id: searchId }
    });

    res.json({
      message: 'Saved search deleted successfully'
    });

  } catch (error) {
    console.error('Delete saved search error:', error);
    res.status(500).json({
      error: 'Failed to delete saved search',
      message: 'An error occurred while deleting the saved search'
    });
  }
});

// Fonction utilitaire pour construire la clause WHERE
function buildWhereClause(filters: SearchFilters): any {
  const where: any = {
    status: 'ACTIVE',
    isAvailable: true
  };

  // Filtres par type de propriété
  if (filters.propertyType && filters.propertyType.length > 0) {
    where.type = {
      in: filters.propertyType
    };
  }

  // Filtres par prix
  if (filters.priceRange) {
    where.price = {};
    if (filters.priceRange.min) {
      where.price.gte = filters.priceRange.min;
    }
    if (filters.priceRange.max) {
      where.price.lte = filters.priceRange.max;
    }
  }

  // Filtres par localisation
  if (filters.location) {
    if (filters.location.city) {
      where.city = {
        contains: filters.location.city,
        mode: 'insensitive'
      };
    }

    if (filters.location.neighborhoods && filters.location.neighborhoods.length > 0) {
      where.neighborhood = {
        in: filters.location.neighborhoods
      };
    }

    // TODO: Implémenter la recherche par rayon géographique
    // if (filters.location.radius && filters.location.coordinates) {
    //   // Recherche géographique avec MongoDB
    // }
  }

  // Filtres par caractéristiques
  if (filters.features) {
    if (filters.features.minBedrooms) {
      where.bedrooms = {
        gte: filters.features.minBedrooms
      };
    }

    if (filters.features.minBathrooms) {
      where.bathrooms = {
        gte: filters.features.minBathrooms
      };
    }

    if (filters.features.furnished !== undefined) {
      where.furnished = filters.features.furnished;
    }

    if (filters.features.airConditioned !== undefined) {
      where.airConditioned = filters.features.airConditioned;
    }

    if (filters.features.parking !== undefined) {
      where.parking = filters.features.parking;
    }

    if (filters.features.security !== undefined) {
      where.security = filters.features.security;
    }

    if (filters.features.internet !== undefined) {
      where.internet = filters.features.internet;
    }

    if (filters.features.water !== undefined) {
      where.water = filters.features.water;
    }

    if (filters.features.electricity !== undefined) {
      where.electricity = filters.features.electricity;
    }
  }

  // Filtres par disponibilité
  if (filters.availability) {
    if (filters.availability.from) {
      where.availableFrom = {
        lte: new Date(filters.availability.from)
      };
    }
  }

  return where;
}

// Fonction utilitaire pour compter les résultats d'une recherche
async function countSearchResults(filters: SearchFilters): Promise<number> {
  try {
    const where = buildWhereClause(filters);
    return await prisma.property.count({ where });
  } catch (error) {
    console.error('Count search results error:', error);
    return 0;
  }
}

export default router;
