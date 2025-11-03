import express from 'express';
import { prisma } from '../index';

const router = express.Router();

// Obtenir toutes les villes
router.get('/cities', async (req, res) => {
  try {
    const { search } = req.query;
    
    const where: any = {};
    if (search && typeof search === 'string') {
      where.name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const cities = await prisma.city.findMany({
      where,
      orderBy: {
        name: 'asc'
      },
      include: {
        _count: {
          select: {
            neighborhoods: true,
            properties: true
          }
        }
      },
      take: 100 // Limiter pour la performance
    });

    res.json({
      message: 'Cities retrieved successfully',
      cities
    });
  } catch (error) {
    console.error('Get cities error:', error);
    res.status(500).json({
      error: 'Failed to get cities',
      message: 'An error occurred while retrieving cities'
    });
  }
});

// Obtenir une ville par ID
router.get('/cities/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const city = await prisma.city.findUnique({
      where: { id },
      include: {
        neighborhoods: {
          orderBy: {
            name: 'asc'
          }
        }
      }
    });

    if (!city) {
      return res.status(404).json({
        error: 'City not found',
        message: 'The specified city does not exist'
      });
    }

    res.json({
      message: 'City retrieved successfully',
      city
    });
  } catch (error) {
    console.error('Get city error:', error);
    res.status(500).json({
      error: 'Failed to get city',
      message: 'An error occurred while retrieving city'
    });
  }
});

// Obtenir les quartiers d'une ville
router.get('/cities/:cityId/neighborhoods', async (req, res) => {
  try {
    const { cityId } = req.params;
    const { search } = req.query;

    const where: any = { cityId };
    if (search && typeof search === 'string') {
      where.name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const neighborhoods = await prisma.neighborhood.findMany({
      where,
      orderBy: {
        name: 'asc'
      },
      include: {
        _count: {
          select: {
            localities: true,
            properties: true
          }
        }
      },
      take: 100 // Limiter pour la performance
    });

    res.json({
      message: 'Neighborhoods retrieved successfully',
      neighborhoods
    });
  } catch (error) {
    console.error('Get neighborhoods error:', error);
    res.status(500).json({
      error: 'Failed to get neighborhoods',
      message: 'An error occurred while retrieving neighborhoods'
    });
  }
});

// Obtenir tous les quartiers (optionnel)
router.get('/neighborhoods', async (req, res) => {
  try {
    const { cityId } = req.query;

    const where: any = {};
    if (cityId) {
      where.cityId = cityId as string;
    }

    const neighborhoods = await prisma.neighborhood.findMany({
      where,
      orderBy: {
        name: 'asc'
      },
      include: {
        city: true,
        _count: {
          select: {
            localities: true,
            properties: true
          }
        }
      }
    });

    res.json({
      message: 'Neighborhoods retrieved successfully',
      neighborhoods
    });
  } catch (error) {
    console.error('Get neighborhoods error:', error);
    res.status(500).json({
      error: 'Failed to get neighborhoods',
      message: 'An error occurred while retrieving neighborhoods'
    });
  }
});

// Obtenir un quartier par ID
router.get('/neighborhoods/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const neighborhood = await prisma.neighborhood.findUnique({
      where: { id },
      include: {
        city: true,
        localities: {
          orderBy: {
            name: 'asc'
          }
        }
      }
    });

    if (!neighborhood) {
      return res.status(404).json({
        error: 'Neighborhood not found',
        message: 'The specified neighborhood does not exist'
      });
    }

    res.json({
      message: 'Neighborhood retrieved successfully',
      neighborhood
    });
  } catch (error) {
    console.error('Get neighborhood error:', error);
    res.status(500).json({
      error: 'Failed to get neighborhood',
      message: 'An error occurred while retrieving neighborhood'
    });
  }
});

// Obtenir les lieux-dits d'un quartier
router.get('/neighborhoods/:neighborhoodId/localities', async (req, res) => {
  try {
    const { neighborhoodId } = req.params;
    const { search } = req.query;

    const where: any = { neighborhoodId };
    if (search && typeof search === 'string') {
      where.name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const localities = await prisma.locality.findMany({
      where,
      orderBy: {
        name: 'asc'
      },
      include: {
        _count: {
          select: {
            properties: true
          }
        }
      },
      take: 100 // Limiter pour la performance
    });

    res.json({
      message: 'Localities retrieved successfully',
      localities
    });
  } catch (error) {
    console.error('Get localities error:', error);
    res.status(500).json({
      error: 'Failed to get localities',
      message: 'An error occurred while retrieving localities'
    });
  }
});

// Obtenir tous les lieux-dits (optionnel)
router.get('/localities', async (req, res) => {
  try {
    const { neighborhoodId } = req.query;

    const where: any = {};
    if (neighborhoodId) {
      where.neighborhoodId = neighborhoodId as string;
    }

    const localities = await prisma.locality.findMany({
      where,
      orderBy: {
        name: 'asc'
      },
      include: {
        neighborhood: {
          include: {
            city: true
          }
        },
        _count: {
          select: {
            properties: true
          }
        }
      }
    });

    res.json({
      message: 'Localities retrieved successfully',
      localities
    });
  } catch (error) {
    console.error('Get localities error:', error);
    res.status(500).json({
      error: 'Failed to get localities',
      message: 'An error occurred while retrieving localities'
    });
  }
});

// Obtenir un lieu-dit par ID
router.get('/localities/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const locality = await prisma.locality.findUnique({
      where: { id },
      include: {
        neighborhood: {
          include: {
            city: true
          }
        }
      }
    });

    if (!locality) {
      return res.status(404).json({
        error: 'Locality not found',
        message: 'The specified locality does not exist'
      });
    }

    res.json({
      message: 'Locality retrieved successfully',
      locality
    });
  } catch (error) {
    console.error('Get locality error:', error);
    res.status(500).json({
      error: 'Failed to get locality',
      message: 'An error occurred while retrieving locality'
    });
  }
});

export default router;

