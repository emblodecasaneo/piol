import express from 'express';
import { prisma } from '../index';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import { UserType } from '@prisma/client';

const router = express.Router();

// Toutes les routes nécessitent l'authentification et les droits admin
router.use(authenticateToken);
router.use(requireAdmin);

// Obtenir tous les admins
router.get('/', async (req, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        userType: UserType.ADMIN
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      message: 'Admins retrieved successfully',
      admins
    });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({
      error: 'Failed to get admins',
      message: 'An error occurred while retrieving admins'
    });
  }
});

// Obtenir un admin par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await prisma.user.findFirst({
      where: {
        id,
        userType: UserType.ADMIN
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!admin) {
      return res.status(404).json({
        error: 'Admin not found',
        message: 'The specified admin does not exist'
      });
    }

    res.json({
      message: 'Admin retrieved successfully',
      admin
    });
  } catch (error) {
    console.error('Get admin error:', error);
    res.status(500).json({
      error: 'Failed to get admin',
      message: 'An error occurred while retrieving admin'
    });
  }
});

// Créer un nouvel admin
router.post('/', async (req, res) => {
  try {
    const { email, phone, password, firstName, lastName } = req.body;

    // Validation des champs requis
    if (!email || !phone || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email, phone, password, firstName, and lastName are required'
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'A user with this email or phone number already exists'
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Créer l'admin
    const admin = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        firstName,
        lastName,
        userType: UserType.ADMIN
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json({
      message: 'Admin created successfully',
      admin
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      error: 'Failed to create admin',
      message: 'An error occurred while creating admin'
    });
  }
});

// Mettre à jour un admin
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone, firstName, lastName, avatar, password } = req.body;

    // Vérifier que l'admin existe
    const existingAdmin = await prisma.user.findFirst({
      where: {
        id,
        userType: UserType.ADMIN
      }
    });

    if (!existingAdmin) {
      return res.status(404).json({
        error: 'Admin not found',
        message: 'The specified admin does not exist'
      });
    }

    // Vérifier si l'email ou le téléphone sont déjà utilisés par un autre utilisateur
    if (email || phone) {
      const conflictingUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(email ? [{ email }] : []),
                ...(phone ? [{ phone }] : [])
              ]
            }
          ]
        }
      });

      if (conflictingUser) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Email or phone number already in use by another user'
        });
      }
    }

    // Préparer les données de mise à jour
    const updateData: any = {};
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    // Mettre à jour l'admin
    const updatedAdmin = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Admin updated successfully',
      admin: updatedAdmin
    });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({
      error: 'Failed to update admin',
      message: 'An error occurred while updating admin'
    });
  }
});

// Supprimer un admin
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = (req as any).user.userId;

    // Empêcher la suppression de soi-même
    if (id === currentUserId) {
      return res.status(400).json({
        error: 'Cannot delete yourself',
        message: 'You cannot delete your own admin account'
      });
    }

    // Vérifier que l'admin existe
    const existingAdmin = await prisma.user.findFirst({
      where: {
        id,
        userType: UserType.ADMIN
      }
    });

    if (!existingAdmin) {
      return res.status(404).json({
        error: 'Admin not found',
        message: 'The specified admin does not exist'
      });
    }

    // Supprimer l'admin
    await prisma.user.delete({
      where: { id }
    });

    res.json({
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({
      error: 'Failed to delete admin',
      message: 'An error occurred while deleting admin'
    });
  }
});

export default router;

