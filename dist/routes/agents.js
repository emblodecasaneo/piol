"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    try {
        const { page = '1', limit = '10', verified, city } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (verified !== undefined) {
            where.isVerified = verified === 'true';
        }
        const agents = await index_1.prisma.agent.findMany({
            where,
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phone: true,
                        email: true
                    }
                },
                properties: {
                    where: {
                        status: 'ACTIVE'
                    },
                    select: {
                        id: true,
                        city: true
                    }
                },
                _count: {
                    select: {
                        properties: true,
                        reviews: true
                    }
                }
            },
            orderBy: [
                { isVerified: 'desc' },
                { rating: 'desc' },
                { createdAt: 'desc' }
            ],
            skip,
            take: limitNum
        });
        const total = await index_1.prisma.agent.count({ where });
        res.json({
            message: 'Agents retrieved successfully',
            agents,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    }
    catch (error) {
        console.error('Get agents error:', error);
        res.status(500).json({
            error: 'Failed to get agents',
            message: 'An error occurred while retrieving agents'
        });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const agent = await index_1.prisma.agent.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phone: true,
                        email: true
                    }
                },
                properties: {
                    where: {
                        status: 'ACTIVE'
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
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
                },
                _count: {
                    select: {
                        properties: true,
                        reviews: true
                    }
                }
            }
        });
        if (!agent) {
            return res.status(404).json({
                error: 'Agent not found',
                message: 'The specified agent does not exist'
            });
        }
        res.json({
            message: 'Agent retrieved successfully',
            agent
        });
    }
    catch (error) {
        console.error('Get agent error:', error);
        res.status(500).json({
            error: 'Failed to get agent',
            message: 'An error occurred while retrieving agent'
        });
    }
});
router.put('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userType = req.user.userType;
        if (userType !== 'AGENT') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only agents can update agent profile'
            });
        }
        const agent = await index_1.prisma.agent.findUnique({
            where: { userId }
        });
        if (!agent) {
            return res.status(404).json({
                error: 'Agent not found',
                message: 'Agent profile not found'
            });
        }
        const { businessName, license, idCardNumber, idCardPhoto, profilePhoto } = req.body;
        const updatedAgent = await index_1.prisma.agent.update({
            where: { userId },
            data: {
                ...(businessName && { businessName }),
                ...(license && { license }),
                ...(idCardNumber && { idCardNumber }),
                ...(idCardPhoto && { idCardPhoto }),
                ...(profilePhoto && { profilePhoto })
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phone: true,
                        email: true
                    }
                }
            }
        });
        res.json({
            message: 'Agent profile updated successfully',
            agent: updatedAgent
        });
    }
    catch (error) {
        console.error('Update agent profile error:', error);
        res.status(500).json({
            error: 'Failed to update agent profile',
            message: 'An error occurred while updating agent profile'
        });
    }
});
router.get('/:id/properties', async (req, res) => {
    try {
        const { id } = req.params;
        const { page = '1', limit = '10', status } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = { agentId: id };
        if (status) {
            where.status = status;
        }
        const [properties, total] = await Promise.all([
            index_1.prisma.property.findMany({
                where,
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: limitNum
            }),
            index_1.prisma.property.count({ where })
        ]);
        res.json({
            message: 'Agent properties retrieved successfully',
            properties,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    }
    catch (error) {
        console.error('Get agent properties error:', error);
        res.status(500).json({
            error: 'Failed to get agent properties',
            message: 'An error occurred while retrieving agent properties'
        });
    }
});
router.get('/:id/reviews', async (req, res) => {
    try {
        const { id } = req.params;
        const { page = '1', limit = '10' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const [reviews, total] = await Promise.all([
            index_1.prisma.review.findMany({
                where: { agentId: id },
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
            index_1.prisma.review.count({ where: { agentId: id } })
        ]);
        res.json({
            message: 'Agent reviews retrieved successfully',
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
        console.error('Get agent reviews error:', error);
        res.status(500).json({
            error: 'Failed to get agent reviews',
            message: 'An error occurred while retrieving agent reviews'
        });
    }
});
exports.default = router;
//# sourceMappingURL=agents.js.map