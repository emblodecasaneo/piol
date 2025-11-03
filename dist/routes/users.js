"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await index_1.prisma.user.findUnique({
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
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            message: 'Profile retrieved successfully',
            user: userWithoutPassword
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: 'Failed to get profile',
            message: 'An error occurred while retrieving profile'
        });
    }
});
router.put('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userType = req.user.userType;
        const { firstName, lastName, phone, avatar, businessName } = req.body;
        const updatedUser = await index_1.prisma.user.update({
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
        if (userType === 'AGENT' && businessName) {
            await index_1.prisma.agent.update({
                where: { userId },
                data: {
                    businessName
                }
            });
        }
        const finalUser = await index_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                agent: true
            }
        });
        const { password: _, ...userWithoutPassword } = finalUser;
        res.json({
            message: 'Profile updated successfully',
            user: userWithoutPassword
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            error: 'Failed to update profile',
            message: 'An error occurred while updating profile'
        });
    }
});
router.get('/favorites', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const favorites = await index_1.prisma.favorite.findMany({
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
    }
    catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({
            error: 'Failed to get favorites',
            message: 'An error occurred while retrieving favorites'
        });
    }
});
router.post('/favorites/:propertyId', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { propertyId } = req.params;
        const property = await index_1.prisma.property.findUnique({
            where: { id: propertyId }
        });
        if (!property) {
            return res.status(404).json({
                error: 'Property not found',
                message: 'The specified property does not exist'
            });
        }
        const existingFavorite = await index_1.prisma.favorite.findUnique({
            where: {
                userId_propertyId: {
                    userId,
                    propertyId
                }
            }
        });
        if (existingFavorite) {
            await index_1.prisma.favorite.delete({
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
        }
        else {
            await index_1.prisma.favorite.create({
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
    }
    catch (error) {
        console.error('Toggle favorite error:', error);
        res.status(500).json({
            error: 'Failed to toggle favorite',
            message: 'An error occurred while updating favorites'
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map