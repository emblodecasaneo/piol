"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
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
router.post('/cities', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { name, region } = req.body;
        if (!name || !region) {
            return res.status(400).json({
                error: 'Missing fields',
                message: 'Name and region are required',
            });
        }
        const existingCity = await index_1.prisma.city.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
        if (existingCity) {
            return res.status(409).json({
                error: 'City exists',
                message: 'A city with this name already exists',
            });
        }
        const city = await index_1.prisma.city.create({
            data: {
                name,
                region,
            },
        });
        res.status(201).json({
            message: 'City created successfully',
            city,
        });
    }
    catch (error) {
        console.error('Create city error:', error);
        res.status(500).json({
            error: 'Failed to create city',
            message: 'An error occurred while creating city',
        });
    }
});
router.put('/cities/:id', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, region } = req.body;
        const city = await index_1.prisma.city.findUnique({ where: { id } });
        if (!city) {
            return res.status(404).json({
                error: 'City not found',
                message: 'The specified city does not exist',
            });
        }
        if (name && name.toLowerCase() !== city.name.toLowerCase()) {
            const existingCity = await index_1.prisma.city.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
            if (existingCity) {
                return res.status(409).json({
                    error: 'City exists',
                    message: 'A city with this name already exists',
                });
            }
        }
        const updatedCity = await index_1.prisma.city.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(region !== undefined && { region }),
            },
        });
        res.json({
            message: 'City updated successfully',
            city: updatedCity,
        });
    }
    catch (error) {
        console.error('Update city error:', error);
        res.status(500).json({
            error: 'Failed to update city',
            message: 'An error occurred while updating city',
        });
    }
});
router.delete('/cities/:id', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const city = await index_1.prisma.city.findUnique({ where: { id } });
        if (!city) {
            return res.status(404).json({
                error: 'City not found',
                message: 'The specified city does not exist',
            });
        }
        await index_1.prisma.city.delete({ where: { id } });
        res.json({
            message: 'City deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete city error:', error);
        res.status(500).json({
            error: 'Failed to delete city',
            message: 'An error occurred while deleting city',
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
router.post('/neighborhoods', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { name, cityId } = req.body;
        if (!name || !cityId) {
            return res.status(400).json({
                error: 'Missing fields',
                message: 'Name and cityId are required',
            });
        }
        const city = await index_1.prisma.city.findUnique({ where: { id: cityId } });
        if (!city) {
            return res.status(404).json({
                error: 'City not found',
                message: 'The specified city does not exist',
            });
        }
        const existingNeighborhood = await index_1.prisma.neighborhood.findFirst({
            where: {
                name: { equals: name, mode: 'insensitive' },
                cityId,
            },
        });
        if (existingNeighborhood) {
            return res.status(409).json({
                error: 'Neighborhood exists',
                message: 'A neighborhood with this name already exists in this city',
            });
        }
        const neighborhood = await index_1.prisma.neighborhood.create({
            data: {
                name,
                cityId,
            },
        });
        res.status(201).json({
            message: 'Neighborhood created successfully',
            neighborhood,
        });
    }
    catch (error) {
        console.error('Create neighborhood error:', error);
        res.status(500).json({
            error: 'Failed to create neighborhood',
            message: 'An error occurred while creating neighborhood',
        });
    }
});
router.put('/neighborhoods/:id', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, cityId } = req.body;
        const neighborhood = await index_1.prisma.neighborhood.findUnique({ where: { id } });
        if (!neighborhood) {
            return res.status(404).json({
                error: 'Neighborhood not found',
                message: 'The specified neighborhood does not exist',
            });
        }
        let newCityId = neighborhood.cityId;
        if (cityId && cityId !== neighborhood.cityId) {
            const city = await index_1.prisma.city.findUnique({ where: { id: cityId } });
            if (!city) {
                return res.status(404).json({
                    error: 'City not found',
                    message: 'The specified city does not exist',
                });
            }
            newCityId = cityId;
        }
        if (name && (name.toLowerCase() !== neighborhood.name.toLowerCase() || newCityId !== neighborhood.cityId)) {
            const existingNeighborhood = await index_1.prisma.neighborhood.findFirst({
                where: {
                    name: { equals: name, mode: 'insensitive' },
                    cityId: newCityId,
                    id: { not: id },
                },
            });
            if (existingNeighborhood) {
                return res.status(409).json({
                    error: 'Neighborhood exists',
                    message: 'A neighborhood with this name already exists in the selected city',
                });
            }
        }
        const updatedNeighborhood = await index_1.prisma.neighborhood.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(newCityId && { cityId: newCityId }),
            },
        });
        res.json({
            message: 'Neighborhood updated successfully',
            neighborhood: updatedNeighborhood,
        });
    }
    catch (error) {
        console.error('Update neighborhood error:', error);
        res.status(500).json({
            error: 'Failed to update neighborhood',
            message: 'An error occurred while updating neighborhood',
        });
    }
});
router.delete('/neighborhoods/:id', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const neighborhood = await index_1.prisma.neighborhood.findUnique({ where: { id } });
        if (!neighborhood) {
            return res.status(404).json({
                error: 'Neighborhood not found',
                message: 'The specified neighborhood does not exist',
            });
        }
        await index_1.prisma.neighborhood.delete({ where: { id } });
        res.json({
            message: 'Neighborhood deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete neighborhood error:', error);
        res.status(500).json({
            error: 'Failed to delete neighborhood',
            message: 'An error occurred while deleting neighborhood',
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
router.post('/localities', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { name, neighborhoodId } = req.body;
        if (!name || !neighborhoodId) {
            return res.status(400).json({
                error: 'Missing fields',
                message: 'Name and neighborhoodId are required',
            });
        }
        const neighborhood = await index_1.prisma.neighborhood.findUnique({ where: { id: neighborhoodId } });
        if (!neighborhood) {
            return res.status(404).json({
                error: 'Neighborhood not found',
                message: 'The specified neighborhood does not exist',
            });
        }
        const existingLocality = await index_1.prisma.locality.findFirst({
            where: {
                name: { equals: name, mode: 'insensitive' },
                neighborhoodId,
            },
        });
        if (existingLocality) {
            return res.status(409).json({
                error: 'Locality exists',
                message: 'A locality with this name already exists in this neighborhood',
            });
        }
        const locality = await index_1.prisma.locality.create({
            data: {
                name,
                neighborhoodId,
            },
        });
        res.status(201).json({
            message: 'Locality created successfully',
            locality,
        });
    }
    catch (error) {
        console.error('Create locality error:', error);
        res.status(500).json({
            error: 'Failed to create locality',
            message: 'An error occurred while creating locality',
        });
    }
});
router.put('/localities/:id', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, neighborhoodId } = req.body;
        const locality = await index_1.prisma.locality.findUnique({ where: { id } });
        if (!locality) {
            return res.status(404).json({
                error: 'Locality not found',
                message: 'The specified locality does not exist',
            });
        }
        let newNeighborhoodId = locality.neighborhoodId;
        if (neighborhoodId && neighborhoodId !== locality.neighborhoodId) {
            const neighborhood = await index_1.prisma.neighborhood.findUnique({ where: { id: neighborhoodId } });
            if (!neighborhood) {
                return res.status(404).json({
                    error: 'Neighborhood not found',
                    message: 'The specified neighborhood does not exist',
                });
            }
            newNeighborhoodId = neighborhoodId;
        }
        if (name && (name.toLowerCase() !== locality.name.toLowerCase() || newNeighborhoodId !== locality.neighborhoodId)) {
            const existingLocality = await index_1.prisma.locality.findFirst({
                where: {
                    name: { equals: name, mode: 'insensitive' },
                    neighborhoodId: newNeighborhoodId,
                    id: { not: id },
                },
            });
            if (existingLocality) {
                return res.status(409).json({
                    error: 'Locality exists',
                    message: 'A locality with this name already exists in the selected neighborhood',
                });
            }
        }
        const updatedLocality = await index_1.prisma.locality.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(newNeighborhoodId && { neighborhoodId: newNeighborhoodId }),
            },
        });
        res.json({
            message: 'Locality updated successfully',
            locality: updatedLocality,
        });
    }
    catch (error) {
        console.error('Update locality error:', error);
        res.status(500).json({
            error: 'Failed to update locality',
            message: 'An error occurred while updating locality',
        });
    }
});
router.delete('/localities/:id', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const locality = await index_1.prisma.locality.findUnique({ where: { id } });
        if (!locality) {
            return res.status(404).json({
                error: 'Locality not found',
                message: 'The specified locality does not exist',
            });
        }
        await index_1.prisma.locality.delete({ where: { id } });
        res.json({
            message: 'Locality deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete locality error:', error);
        res.status(500).json({
            error: 'Failed to delete locality',
            message: 'An error occurred while deleting locality',
        });
    }
});
exports.default = router;
//# sourceMappingURL=locations.js.map