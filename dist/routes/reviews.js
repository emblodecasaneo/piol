"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userType = req.user.userType;
        if (userType !== 'TENANT') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only tenants can leave reviews'
            });
        }
        const { agentId, propertyId, rating, comment, communication, honesty, responsiveness, propertyAccuracy } = req.body;
        if (!agentId || !rating || !communication || !honesty || !responsiveness || !propertyAccuracy) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Agent ID, rating, and all aspect ratings are required'
            });
        }
        const ratings = [rating, communication, honesty, responsiveness, propertyAccuracy];
        if (ratings.some(r => r < 1 || r > 5)) {
            return res.status(400).json({
                error: 'Invalid rating',
                message: 'All ratings must be between 1 and 5'
            });
        }
        const agent = await index_1.prisma.agent.findUnique({
            where: { id: agentId }
        });
        if (!agent) {
            return res.status(404).json({
                error: 'Agent not found',
                message: 'The specified agent does not exist'
            });
        }
        if (propertyId) {
            const property = await index_1.prisma.property.findUnique({
                where: { id: propertyId }
            });
            if (!property) {
                return res.status(404).json({
                    error: 'Property not found',
                    message: 'The specified property does not exist'
                });
            }
            if (property.agentId !== agentId) {
                return res.status(400).json({
                    error: 'Invalid property',
                    message: 'The property does not belong to the specified agent'
                });
            }
        }
        const existingReview = await index_1.prisma.review.findFirst({
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
        const review = await index_1.prisma.review.create({
            data: {
                userId,
                agentId,
                propertyId: propertyId || null,
                rating,
                comment: comment || null,
                communication,
                honesty,
                responsiveness,
                propertyAccuracy,
                isVerified: false
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
        await updateAgentRating(agentId);
        res.status(201).json({
            message: 'Review created successfully',
            review
        });
    }
    catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({
            error: 'Failed to create review',
            message: 'An error occurred while creating the review'
        });
    }
});
router.get('/agent/:agentId', async (req, res) => {
    try {
        const { agentId } = req.params;
        const { page = '1', limit = '10', rating } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = { agentId };
        if (rating) {
            where.rating = parseInt(rating);
        }
        const [reviews, total, stats] = await Promise.all([
            index_1.prisma.review.findMany({
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
            index_1.prisma.review.count({ where }),
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
    }
    catch (error) {
        console.error('Get agent reviews error:', error);
        res.status(500).json({
            error: 'Failed to get reviews',
            message: 'An error occurred while retrieving reviews'
        });
    }
});
router.get('/property/:propertyId', async (req, res) => {
    try {
        const { propertyId } = req.params;
        const { page = '1', limit = '10' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const [reviews, total] = await Promise.all([
            index_1.prisma.review.findMany({
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
            index_1.prisma.review.count({ where: { propertyId } })
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
    }
    catch (error) {
        console.error('Get property reviews error:', error);
        res.status(500).json({
            error: 'Failed to get property reviews',
            message: 'An error occurred while retrieving property reviews'
        });
    }
});
router.put('/:reviewId', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { reviewId } = req.params;
        const review = await index_1.prisma.review.findUnique({
            where: { id: reviewId }
        });
        if (!review) {
            return res.status(404).json({
                error: 'Review not found',
                message: 'The specified review does not exist'
            });
        }
        if (review.userId !== userId) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'You can only update your own reviews'
            });
        }
        const { rating, comment, communication, honesty, responsiveness, propertyAccuracy } = req.body;
        const ratings = [rating, communication, honesty, responsiveness, propertyAccuracy].filter(r => r !== undefined);
        if (ratings.some(r => r < 1 || r > 5)) {
            return res.status(400).json({
                error: 'Invalid rating',
                message: 'All ratings must be between 1 and 5'
            });
        }
        const updatedReview = await index_1.prisma.review.update({
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
        await updateAgentRating(review.agentId);
        res.json({
            message: 'Review updated successfully',
            review: updatedReview
        });
    }
    catch (error) {
        console.error('Update review error:', error);
        res.status(500).json({
            error: 'Failed to update review',
            message: 'An error occurred while updating the review'
        });
    }
});
router.delete('/:reviewId', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { reviewId } = req.params;
        const review = await index_1.prisma.review.findUnique({
            where: { id: reviewId }
        });
        if (!review) {
            return res.status(404).json({
                error: 'Review not found',
                message: 'The specified review does not exist'
            });
        }
        if (review.userId !== userId) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'You can only delete your own reviews'
            });
        }
        await index_1.prisma.review.delete({
            where: { id: reviewId }
        });
        await updateAgentRating(review.agentId);
        res.json({
            message: 'Review deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({
            error: 'Failed to delete review',
            message: 'An error occurred while deleting the review'
        });
    }
});
router.post('/:reviewId/report', auth_1.authenticateToken, async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({
                error: 'Missing reason',
                message: 'Report reason is required'
            });
        }
        const review = await index_1.prisma.review.findUnique({
            where: { id: reviewId }
        });
        if (!review) {
            return res.status(404).json({
                error: 'Review not found',
                message: 'The specified review does not exist'
            });
        }
        res.json({
            message: 'Review reported successfully',
            reportId: `report_${Date.now()}`
        });
    }
    catch (error) {
        console.error('Report review error:', error);
        res.status(500).json({
            error: 'Failed to report review',
            message: 'An error occurred while reporting the review'
        });
    }
});
async function updateAgentRating(agentId) {
    const reviews = await index_1.prisma.review.findMany({
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
        await index_1.prisma.agent.update({
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
    await index_1.prisma.agent.update({
        where: { id: agentId },
        data: {
            rating: Math.round(averageRating * 10) / 10,
            reviewCount: reviews.length
        }
    });
}
async function getAgentReviewStats(agentId) {
    const reviews = await index_1.prisma.review.findMany({
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
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
        ratingDistribution[review.rating]++;
    });
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
exports.default = router;
//# sourceMappingURL=reviews.js.map