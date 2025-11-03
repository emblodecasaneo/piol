import express from 'express';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Obtenir le profil utilisateur
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        agent: true,
        favorites: {
          include: {
            property: {
              include: {
                agent: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        searches: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    // Retourner les données utilisateur (sans le mot de passe)
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Profile retrieved successfully',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'An error occurred while retrieving profile'
    });
  }
});

// Mettre à jour le profil utilisateur
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userType = (req as any).user.userType;
    const { firstName, lastName, phone, avatar, businessName } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
        ...(avatar && { avatar })
      },
      include: {
        agent: true
      }
    });

    // Si l'utilisateur est un agent et qu'il y a un businessName, mettre à jour l'agent aussi
    if (userType === 'AGENT' && businessName) {
      await prisma.agent.update({
        where: { userId },
        data: {
          businessName
        }
      });
    }

    // Récupérer les données complètes avec l'agent mis à jour
    const finalUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        agent: true
      }
    });

    // Retourner les données utilisateur (sans le mot de passe)
    const { password: _, ...userWithoutPassword } = finalUser!;

    res.json({
      message: 'Profile updated successfully',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: 'An error occurred while updating profile'
    });
  }
});

// Obtenir les favoris de l'utilisateur
router.get('/favorites', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        property: {
          include: {
            agent: {
              include: {
                user: {
                  select: {
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
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      message: 'Favorites retrieved successfully',
      favorites
    });

  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({
      error: 'Failed to get favorites',
      message: 'An error occurred while retrieving favorites'
    });
  }
});

// Ajouter/retirer des favoris
router.post('/favorites/:propertyId', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { propertyId } = req.params;

    // Vérifier si la propriété existe
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return res.status(404).json({
        error: 'Property not found',
        message: 'The specified property does not exist'
      });
    }

    // Vérifier si c'est déjà en favori
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_propertyId: {
          userId,
          propertyId
        }
      }
    });

    if (existingFavorite) {
      // Retirer des favoris
      await prisma.favorite.delete({
        where: {
          userId_propertyId: {
            userId,
            propertyId
          }
        }
      });

      res.json({
        message: 'Property removed from favorites',
        isFavorite: false
      });
    } else {
      // Ajouter aux favoris
      await prisma.favorite.create({
        data: {
          userId,
          propertyId
        }
      });

      res.json({
        message: 'Property added to favorites',
        isFavorite: true
      });
    }

  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({
      error: 'Failed to toggle favorite',
      message: 'An error occurred while updating favorites'
    });
  }
});

export default router;
