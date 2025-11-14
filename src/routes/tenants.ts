import express from 'express';
import { prisma } from '../index';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      userType: 'TENANT',
    };

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
          avatar: true,
          preferences: true,
          _count: {
            select: {
              favorites: true,
              reviews: true,
              requestedAppointments: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      message: 'Tenants retrieved successfully',
      tenants,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({
      error: 'Failed to get tenants',
      message: 'An error occurred while retrieving tenants',
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.user.findFirst({
      where: {
        id,
        userType: 'TENANT',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatar: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
        favorites: {
          include: {
            property: {
              select: {
                id: true,
                title: true,
                images: true,
                price: true,
                city: {
                  select: {
                    name: true,
                  },
                },
                neighborhood: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        },
        requestedAppointments: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        },
        reviews: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found',
        message: 'The specified tenant does not exist',
      });
    }

    res.json({
      message: 'Tenant retrieved successfully',
      tenant,
    });
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({
      error: 'Failed to get tenant',
      message: 'An error occurred while retrieving tenant',
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, avatar, preferences } = req.body;

    const tenant = await prisma.user.findFirst({
      where: {
        id,
        userType: 'TENANT',
      },
    });

    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found',
        message: 'The specified tenant does not exist',
      });
    }

    if (phone && phone !== tenant.phone) {
      const conflict = await prisma.user.findFirst({
        where: {
          phone,
          id: {
            not: id,
          },
        },
      });
      if (conflict) {
        return res.status(409).json({
          error: 'Phone already used',
          message: 'Another user already uses this phone number',
        });
      }
    }

    const updatedTenant = await prisma.user.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(avatar !== undefined && { avatar }),
        ...(preferences !== undefined && { preferences }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatar: true,
        preferences: true,
        updatedAt: true,
      },
    });

    res.json({
      message: 'Tenant updated successfully',
      tenant: updatedTenant,
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({
      error: 'Failed to update tenant',
      message: 'An error occurred while updating tenant',
    });
  }
});

export default router;
