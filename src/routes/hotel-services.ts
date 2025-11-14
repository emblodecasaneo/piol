import express from 'express';
import { prisma } from '../index';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// GET /api/hotel-services - Obtenir tous les services hôteliers
router.get('/', async (req, res) => {
  try {
    const { activeOnly } = req.query;
    
    const where: any = {};
    if (activeOnly === 'true') {
      where.isActive = true;
    }

    const services = await prisma.hotelService.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { label: 'asc' }
      ]
    });

    res.json({
      message: 'Hotel services retrieved successfully',
      services
    });
  } catch (error) {
    console.error('Get hotel services error:', error);
    res.status(500).json({
      error: 'Failed to retrieve hotel services',
      message: 'An error occurred while retrieving hotel services'
    });
  }
});

// GET /api/hotel-services/:id - Obtenir un service spécifique
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const service = await prisma.hotelService.findUnique({
      where: { id }
    });

    if (!service) {
      return res.status(404).json({
        error: 'Service not found',
        message: 'Hotel service not found'
      });
    }

    res.json({
      message: 'Hotel service retrieved successfully',
      service
    });
  } catch (error) {
    console.error('Get hotel service error:', error);
    res.status(500).json({
      error: 'Failed to retrieve hotel service',
      message: 'An error occurred while retrieving hotel service'
    });
  }
});

// POST /api/hotel-services - Créer un nouveau service (Admin seulement)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key, label, icon, description, isActive, order } = req.body;

    if (!key || !label || !icon) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'key, label, and icon are required'
      });
    }

    // Vérifier si le service existe déjà
    const existingService = await prisma.hotelService.findUnique({
      where: { key }
    });

    if (existingService) {
      return res.status(409).json({
        error: 'Service already exists',
        message: `A service with key "${key}" already exists`
      });
    }

    const service = await prisma.hotelService.create({
      data: {
        key,
        label,
        icon,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
        order: order || 0
      }
    });

    res.status(201).json({
      message: 'Hotel service created successfully',
      service
    });
  } catch (error) {
    console.error('Create hotel service error:', error);
    res.status(500).json({
      error: 'Failed to create hotel service',
      message: 'An error occurred while creating hotel service'
    });
  }
});

// PUT /api/hotel-services/:id - Mettre à jour un service (Admin seulement)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { key, label, icon, description, isActive, order } = req.body;

    // Vérifier si le service existe
    const existingService = await prisma.hotelService.findUnique({
      where: { id }
    });

    if (!existingService) {
      return res.status(404).json({
        error: 'Service not found',
        message: 'Hotel service not found'
      });
    }

    // Si la clé change, vérifier qu'elle n'existe pas déjà
    if (key && key !== existingService.key) {
      const keyExists = await prisma.hotelService.findUnique({
        where: { key }
      });

      if (keyExists) {
        return res.status(409).json({
          error: 'Service key already exists',
          message: `A service with key "${key}" already exists`
        });
      }
    }

    const service = await prisma.hotelService.update({
      where: { id },
      data: {
        ...(key && { key }),
        ...(label && { label }),
        ...(icon && { icon }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        ...(order !== undefined && { order })
      }
    });

    res.json({
      message: 'Hotel service updated successfully',
      service
    });
  } catch (error) {
    console.error('Update hotel service error:', error);
    res.status(500).json({
      error: 'Failed to update hotel service',
      message: 'An error occurred while updating hotel service'
    });
  }
});

// DELETE /api/hotel-services/:id - Supprimer un service (Admin seulement)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const service = await prisma.hotelService.findUnique({
      where: { id }
    });

    if (!service) {
      return res.status(404).json({
        error: 'Service not found',
        message: 'Hotel service not found'
      });
    }

    await prisma.hotelService.delete({
      where: { id }
    });

    res.json({
      message: 'Hotel service deleted successfully'
    });
  } catch (error) {
    console.error('Delete hotel service error:', error);
    res.status(500).json({
      error: 'Failed to delete hotel service',
      message: 'An error occurred while deleting hotel service'
    });
  }
});

export default router;

