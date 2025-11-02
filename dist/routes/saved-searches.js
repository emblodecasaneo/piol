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
        const { name, filters } = req.body;
        if (!name || !filters) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Name and filters are required'
            });
        }
        const existingSearch = await index_1.prisma.savedSearch.findFirst({
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
        const resultCount = await countSearchResults(filters);
        const savedSearch = await index_1.prisma.savedSearch.create({
            data: {
                userId,
                name,
                filters: filters,
                resultCount
            }
        });
        res.status(201).json({
            message: 'Search saved successfully',
            savedSearch
        });
    }
    catch (error) {
        console.error('Save search error:', error);
        res.status(500).json({
            error: 'Failed to save search',
            message: 'An error occurred while saving the search'
        });
    }
});
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const savedSearches = await index_1.prisma.savedSearch.findMany({
            where: { userId },
            orderBy: {
                updatedAt: 'desc'
            }
        });
        const updatedSearches = await Promise.all(savedSearches.map(async (search) => {
            const currentResultCount = await countSearchResults(search.filters);
            if (currentResultCount !== search.resultCount) {
                await index_1.prisma.savedSearch.update({
                    where: { id: search.id },
                    data: { resultCount: currentResultCount }
                });
            }
            return {
                ...search,
                resultCount: currentResultCount,
                hasNewResults: currentResultCount > search.resultCount
            };
        }));
        res.json({
            message: 'Saved searches retrieved successfully',
            savedSearches: updatedSearches
        });
    }
    catch (error) {
        console.error('Get saved searches error:', error);
        res.status(500).json({
            error: 'Failed to get saved searches',
            message: 'An error occurred while retrieving saved searches'
        });
    }
});
router.get('/:searchId', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { searchId } = req.params;
        const savedSearch = await index_1.prisma.savedSearch.findFirst({
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
        const currentResultCount = await countSearchResults(savedSearch.filters);
        if (currentResultCount !== savedSearch.resultCount) {
            await index_1.prisma.savedSearch.update({
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
    }
    catch (error) {
        console.error('Get saved search error:', error);
        res.status(500).json({
            error: 'Failed to get saved search',
            message: 'An error occurred while retrieving the saved search'
        });
    }
});
router.get('/:searchId/results', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { searchId } = req.params;
        const { page = '1', limit = '10' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const savedSearch = await index_1.prisma.savedSearch.findFirst({
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
        const filters = savedSearch.filters;
        const where = buildWhereClause(filters);
        const [properties, total] = await Promise.all([
            index_1.prisma.property.findMany({
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
            index_1.prisma.property.count({ where })
        ]);
        await index_1.prisma.savedSearch.update({
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
    }
    catch (error) {
        console.error('Execute saved search error:', error);
        res.status(500).json({
            error: 'Failed to execute saved search',
            message: 'An error occurred while executing the saved search'
        });
    }
});
router.put('/:searchId', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { searchId } = req.params;
        const { name, filters } = req.body;
        const savedSearch = await index_1.prisma.savedSearch.findFirst({
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
        if (name && name !== savedSearch.name) {
            const existingSearch = await index_1.prisma.savedSearch.findFirst({
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
        let resultCount = savedSearch.resultCount;
        if (filters) {
            resultCount = await countSearchResults(filters);
        }
        const updatedSearch = await index_1.prisma.savedSearch.update({
            where: { id: searchId },
            data: {
                ...(name && { name }),
                ...(filters && { filters: filters }),
                resultCount
            }
        });
        res.json({
            message: 'Saved search updated successfully',
            savedSearch: updatedSearch
        });
    }
    catch (error) {
        console.error('Update saved search error:', error);
        res.status(500).json({
            error: 'Failed to update saved search',
            message: 'An error occurred while updating the saved search'
        });
    }
});
router.delete('/:searchId', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { searchId } = req.params;
        const savedSearch = await index_1.prisma.savedSearch.findFirst({
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
        await index_1.prisma.savedSearch.delete({
            where: { id: searchId }
        });
        res.json({
            message: 'Saved search deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete saved search error:', error);
        res.status(500).json({
            error: 'Failed to delete saved search',
            message: 'An error occurred while deleting the saved search'
        });
    }
});
function buildWhereClause(filters) {
    const where = {
        status: 'ACTIVE',
        isAvailable: true
    };
    if (filters.propertyType && filters.propertyType.length > 0) {
        where.type = {
            in: filters.propertyType
        };
    }
    if (filters.priceRange) {
        where.price = {};
        if (filters.priceRange.min) {
            where.price.gte = filters.priceRange.min;
        }
        if (filters.priceRange.max) {
            where.price.lte = filters.priceRange.max;
        }
    }
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
    }
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
    if (filters.availability) {
        if (filters.availability.from) {
            where.availableFrom = {
                lte: new Date(filters.availability.from)
            };
        }
    }
    return where;
}
async function countSearchResults(filters) {
    try {
        const where = buildWhereClause(filters);
        return await index_1.prisma.property.count({ where });
    }
    catch (error) {
        console.error('Count search results error:', error);
        return 0;
    }
}
exports.default = router;
//# sourceMappingURL=saved-searches.js.map