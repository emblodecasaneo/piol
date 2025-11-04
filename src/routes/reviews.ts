import express from 'express';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Interface pour créer un avis
interface CreateReviewData {
  agentId: string;
  propertyId?: string;
  rating: number;
  comment?: string; // Optionnel
  communication: number;
  honesty: number;
  responsiveness: number;
  propertyAccuracy: number;
}

// Créer un avis
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userType = (req as any).user.userType;

    // Seuls les locataires peuvent laisser des avis
    if (userType !== 'TENANT') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only tenants can leave reviews'
      });
    }

    const {
      agentId,
      propertyId,
      rating,
      comment,
      communication,
      honesty,
      responsiveness,
      propertyAccuracy
    }: CreateReviewData = req.body;

    // Validation des champs requis
    if (!agentId || !rating || !communication || !honesty || !responsiveness || !propertyAccuracy) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Agent ID, rating, and all aspect ratings are required'
      });
    }

    // Validation des notes (1-5)
    const ratings = [rating, communication, honesty, responsiveness, propertyAccuracy];
    if (ratings.some(r => r < 1 || r > 5)) {
      return res.status(400).json({
        error: 'Invalid rating',
        message: 'All ratings must be between 1 and 5'
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

    // Vérifier que la propriété existe si spécifiée
    if (propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId }
      });

      if (!property) {
        return res.status(404).json({
          error: 'Property not found',
          message: 'The specified property does not exist'
        });
      }

      // Vérifier que la propriété appartient à l'agent
      if (property.agentId !== agentId) {
        return res.status(400).json({
          error: 'Invalid property',
          message: 'The property does not belong to the specified agent'
        });
      }
    }

    // Vérifier qu'un avis n'existe pas déjà pour cette combinaison
    const existingReview = await prisma.review.findFirst({
      where: {
        userId,
        agentId,
        propertyId: propertyId || null
      }
    });

    if (existingReview) {
      return res.status(409).json({
        error: 'Review already exists',
        message: 'You have already reviewed this agent for this property'
      });
    }

    // Créer l'avis
    const review = await prisma.review.create({
      data: {
        userId,
        agentId,
        propertyId: propertyId || null,
        rating,
        comment: comment || null, // Gérer le cas où comment est vide
        communication,
        honesty,
        responsiveness,
        propertyAccuracy,
        isVerified: false // À implémenter : vérification si l'utilisateur a réellement loué
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        property: {
          select: {
            title: true
          }
        }
      }
    });

    // Mettre à jour la note moyenne de l'agent
    await updateAgentRating(agentId);

    res.status(201).json({
      message: 'Review created successfully',
      review
    });

  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      error: 'Failed to create review',
      message: 'An error occurred while creating the review'
    });
  }
});

// Obtenir les avis d'un agent
router.get('/agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { page = '1', limit = '10', rating } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { agentId };

    if (rating) {
      where.rating = parseInt(rating as string);
    }

    const [reviews, total, stats] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          property: {
            select: {
              title: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.review.count({ where }),
      getAgentReviewStats(agentId)
    ]);

    res.json({
      message: 'Reviews retrieved successfully',
      reviews,
      stats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get agent reviews error:', error);
    res.status(500).json({
      error: 'Failed to get reviews',
      message: 'An error occurred while retrieving reviews'
    });
  }
});

// Obtenir les avis d'une propriété
router.get('/property/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { propertyId },
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
        },
        skip,
        take: limitNum
      }),
      prisma.review.count({ where: { propertyId } })
    ]);

    res.json({
      message: 'Property reviews retrieved successfully',
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get property reviews error:', error);
    res.status(500).json({
      error: 'Failed to get property reviews',
      message: 'An error occurred while retrieving property reviews'
    });
  }
});

// Mettre à jour un avis
router.put('/:reviewId', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { reviewId } = req.params;

    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      return res.status(404).json({
        error: 'Review not found',
        message: 'The specified review does not exist'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire de l'avis
    if (review.userId !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update your own reviews'
      });
    }

    const {
      rating,
      comment,
      communication,
      honesty,
      responsiveness,
      propertyAccuracy
    } = req.body;

    // Validation des notes si fournies
    const ratings = [rating, communication, honesty, responsiveness, propertyAccuracy].filter(r => r !== undefined);
    if (ratings.some(r => r < 1 || r > 5)) {
      return res.status(400).json({
        error: 'Invalid rating',
        message: 'All ratings must be between 1 and 5'
      });
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(rating && { rating }),
        ...(comment && { comment }),
        ...(communication && { communication }),
        ...(honesty && { honesty }),
        ...(responsiveness && { responsiveness }),
        ...(propertyAccuracy && { propertyAccuracy })
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        property: {
          select: {
            title: true
          }
        }
      }
    });

    // Mettre à jour la note moyenne de l'agent
    await updateAgentRating(review.agentId);

    res.json({
      message: 'Review updated successfully',
      review: updatedReview
    });

  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      error: 'Failed to update review',
      message: 'An error occurred while updating the review'
    });
  }
});

// Supprimer un avis
router.delete('/:reviewId', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { reviewId } = req.params;

    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      return res.status(404).json({
        error: 'Review not found',
        message: 'The specified review does not exist'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire de l'avis
    if (review.userId !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only delete your own reviews'
      });
    }

    await prisma.review.delete({
      where: { id: reviewId }
    });

    // Mettre à jour la note moyenne de l'agent
    await updateAgentRating(review.agentId);

    res.json({
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      error: 'Failed to delete review',
      message: 'An error occurred while deleting the review'
    });
  }
});

// Signaler un avis
router.post('/:reviewId/report', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        error: 'Missing reason',
        message: 'Report reason is required'
      });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      return res.status(404).json({
        error: 'Review not found',
        message: 'The specified review does not exist'
      });
    }

    // TODO: Implémenter le système de signalement
    // Pour l'instant, on peut logger ou envoyer une notification

    res.json({
      message: 'Review reported successfully',
      reportId: `report_${Date.now()}` // Temporaire
    });

  } catch (error) {
    console.error('Report review error:', error);
    res.status(500).json({
      error: 'Failed to report review',
      message: 'An error occurred while reporting the review'
    });
  }
});

// Fonction utilitaire pour mettre à jour la note moyenne d'un agent
async function updateAgentRating(agentId: string) {
  const reviews = await prisma.review.findMany({
    where: { agentId },
    select: {
      rating: true,
      communication: true,
      honesty: true,
      responsiveness: true,
      propertyAccuracy: true
    }
  });

  if (reviews.length === 0) {
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        rating: 0,
        reviewCount: 0
      }
    });
    return;
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;

  await prisma.agent.update({
    where: { id: agentId },
    data: {
      rating: Math.round(averageRating * 10) / 10, // Arrondir à 1 décimale
      reviewCount: reviews.length
    }
  });
}

// Fonction utilitaire pour obtenir les statistiques des avis d'un agent
async function getAgentReviewStats(agentId: string) {
  const reviews = await prisma.review.findMany({
    where: { agentId },
    select: {
      rating: true,
      communication: true,
      honesty: true,
      responsiveness: true,
      propertyAccuracy: true
    }
  });

  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      aspectAverages: {
        communication: 0,
        honesty: 0,
        responsiveness: 0,
        propertyAccuracy: 0
      }
    };
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;

  // Distribution des notes
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(review => {
    ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
  });

  // Moyennes par aspect
  const aspectAverages = {
    communication: reviews.reduce((sum, r) => sum + r.communication, 0) / reviews.length,
    honesty: reviews.reduce((sum, r) => sum + r.honesty, 0) / reviews.length,
    responsiveness: reviews.reduce((sum, r) => sum + r.responsiveness, 0) / reviews.length,
    propertyAccuracy: reviews.reduce((sum, r) => sum + r.propertyAccuracy, 0) / reviews.length
  };

  return {
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews: reviews.length,
    ratingDistribution,
    aspectAverages: {
      communication: Math.round(aspectAverages.communication * 10) / 10,
      honesty: Math.round(aspectAverages.honesty * 10) / 10,
      responsiveness: Math.round(aspectAverages.responsiveness * 10) / 10,
      propertyAccuracy: Math.round(aspectAverages.propertyAccuracy * 10) / 10
    }
  };
}

export default router;
