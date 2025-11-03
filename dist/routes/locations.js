"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const router = express_1.default.Router();
router.get('/cities', async (req, res) => {
    try {
        const { search } = req.query;
        const where = {};
        if (search && typeof search === 'string') {
            where.name = {
                contains: search,
                mode: 'insensitive'
            };
        }
        const cities = await index_1.prisma.city.findMany({
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
            take: 100
        });
        res.json({
            message: 'Cities retrieved successfully',
            cities
        });
    }
    catch (error) {
        console.error('Get cities error:', error);
        res.status(500).json({
            error: 'Failed to get cities',
            message: 'An error occurred while retrieving cities'
        });
    }
});
router.get('/cities/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const city = await index_1.prisma.city.findUnique({
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
    }
    catch (error) {
        console.error('Get city error:', error);
        res.status(500).json({
            error: 'Failed to get city',
            message: 'An error occurred while retrieving city'
        });
    }
});
router.get('/cities/:cityId/neighborhoods', async (req, res) => {
    try {
        const { cityId } = req.params;
        const { search } = req.query;
        const where = { cityId };
        if (search && typeof search === 'string') {
            where.name = {
                contains: search,
                mode: 'insensitive'
            };
        }
        const neighborhoods = await index_1.prisma.neighborhood.findMany({
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
            take: 100
        });
        res.json({
            message: 'Neighborhoods retrieved successfully',
            neighborhoods
        });
    }
    catch (error) {
        console.error('Get neighborhoods error:', error);
        res.status(500).json({
            error: 'Failed to get neighborhoods',
            message: 'An error occurred while retrieving neighborhoods'
        });
    }
});
router.get('/neighborhoods', async (req, res) => {
    try {
        const { cityId } = req.query;
        const where = {};
        if (cityId) {
            where.cityId = cityId;
        }
        const neighborhoods = await index_1.prisma.neighborhood.findMany({
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
    }
    catch (error) {
        console.error('Get neighborhoods error:', error);
        res.status(500).json({
            error: 'Failed to get neighborhoods',
            message: 'An error occurred while retrieving neighborhoods'
        });
    }
});
router.get('/neighborhoods/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const neighborhood = await index_1.prisma.neighborhood.findUnique({
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
    }
    catch (error) {
        console.error('Get neighborhood error:', error);
        res.status(500).json({
            error: 'Failed to get neighborhood',
            message: 'An error occurred while retrieving neighborhood'
        });
    }
});
router.get('/neighborhoods/:neighborhoodId/localities', async (req, res) => {
    try {
        const { neighborhoodId } = req.params;
        const { search } = req.query;
        const where = { neighborhoodId };
        if (search && typeof search === 'string') {
            where.name = {
                contains: search,
                mode: 'insensitive'
            };
        }
        const localities = await index_1.prisma.locality.findMany({
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
            take: 100
        });
        res.json({
            message: 'Localities retrieved successfully',
            localities
        });
    }
    catch (error) {
        console.error('Get localities error:', error);
        res.status(500).json({
            error: 'Failed to get localities',
            message: 'An error occurred while retrieving localities'
        });
    }
});
router.get('/localities', async (req, res) => {
    try {
        const { neighborhoodId } = req.query;
        const where = {};
        if (neighborhoodId) {
            where.neighborhoodId = neighborhoodId;
        }
        const localities = await index_1.prisma.locality.findMany({
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
    }
    catch (error) {
        console.error('Get localities error:', error);
        res.status(500).json({
            error: 'Failed to get localities',
            message: 'An error occurred while retrieving localities'
        });
    }
});
router.get('/localities/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const locality = await index_1.prisma.locality.findUnique({
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
    }
    catch (error) {
        console.error('Get locality error:', error);
        res.status(500).json({
            error: 'Failed to get locality',
            message: 'An error occurred while retrieving locality'
        });
    }
});
exports.default = router;
//# sourceMappingURL=locations.js.map