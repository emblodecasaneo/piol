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
        const { page = '1', limit = '10', type, city, neighborhood, minPrice, maxPrice, bedrooms, bathrooms, minArea, maxArea, furnished, airConditioned, parking, security, internet, water, electricity, latitude, longitude, radius, sortBy = 'createdAt', sortOrder = 'desc', search } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {
            status: 'ACTIVE',
            isAvailable: true
        };
        if (type) {
            where.type = type;
        }
        if (city) {
            where.city = {
                contains: city,
                mode: 'insensitive'
            };
        }
        if (neighborhood) {
            where.neighborhood = {
                contains: neighborhood,
                mode: 'insensitive'
            };
        }
        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice)
                where.price.gte = parseInt(minPrice);
            if (maxPrice)
                where.price.lte = parseInt(maxPrice);
        }
        if (bedrooms) {
            where.bedrooms = {
                gte: parseInt(bedrooms)
            };
        }
        if (bathrooms) {
            where.bathrooms = {
                gte: parseInt(bathrooms)
            };
        }
        if (minArea || maxArea) {
            where.area = {};
            if (minArea)
                where.area.gte = parseInt(minArea);
            if (maxArea)
                where.area.lte = parseInt(maxArea);
        }
        if (furnished !== undefined) {
            where.furnished = furnished === 'true';
        }
        if (airConditioned !== undefined) {
            where.airConditioned = airConditioned === 'true';
        }
        if (parking !== undefined) {
            where.parking = parking === 'true';
        }
        if (security !== undefined) {
            where.security = security === 'true';
        }
        if (internet !== undefined) {
            where.internet = internet === 'true';
        }
        if (water !== undefined) {
            where.water = water === 'true';
        }
        if (electricity !== undefined) {
            where.electricity = electricity === 'true';
        }
        if (search) {
            where.OR = [
                {
                    title: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    description: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    address: {
                        contains: search,
                        mode: 'insensitive'
                    }
                }
            ];
        }
        let geoFilteredProperties;
        if (latitude && longitude && radius) {
            const lat = parseFloat(latitude);
            const lng = parseFloat(longitude);
            const radiusKm = parseFloat(radius);
            geoFilteredProperties = await getPropertiesWithinRadius(lat, lng, radiusKm);
            if (geoFilteredProperties.length === 0) {
                return res.json({
                    message: 'Properties retrieved successfully',
                    properties: [],
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        total: 0,
                        totalPages: 0
                    }
                });
            }
            where.id = {
                in: geoFilteredProperties
            };
        }
        let orderBy = [
            { isPremium: 'desc' },
            { createdAt: 'desc' }
        ];
        if (sortBy && sortBy !== 'createdAt') {
            const validSortFields = ['price', 'views', 'bedrooms', 'area', 'updatedAt'];
            if (validSortFields.includes(sortBy)) {
                orderBy = [
                    { isPremium: 'desc' },
                    { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' }
                ];
            }
        }
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
                orderBy,
                skip,
                take: limitNum
            }),
            index_1.prisma.property.count({ where })
        ]);
        res.json({
            message: 'Properties retrieved successfully',
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
        console.error('Get properties error:', error);
        res.status(500).json({
            error: 'Failed to get properties',
            message: 'An error occurred while retrieving properties'
        });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const property = await index_1.prisma.property.findUnique({
            where: { id },
            include: {
                agent: {
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
                }
            }
        });
        if (!property) {
            return res.status(404).json({
                error: 'Property not found',
                message: 'The specified property does not exist'
            });
        }
        await index_1.prisma.property.update({
            where: { id },
            data: {
                views: {
                    increment: 1
                }
            }
        });
        res.json({
            message: 'Property retrieved successfully',
            property
        });
    }
    catch (error) {
        console.error('Get property error:', error);
        res.status(500).json({
            error: 'Failed to get property',
            message: 'An error occurred while retrieving property'
        });
    }
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userType = req.user.userType;
        if (userType !== 'AGENT') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only agents can create properties'
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
        const { title, description, type, price, deposit, fees, address, city, neighborhood, latitude, longitude, bedrooms, bathrooms, area, furnished, airConditioned, parking, security, internet, water, electricity, images, availableFrom } = req.body;
        if (!title || !description || !type || !price || !address || !city || !neighborhood) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Title, description, type, price, address, city, and neighborhood are required'
            });
        }
        const property = await index_1.prisma.property.create({
            data: {
                agentId: agent.id,
                title,
                description,
                type: type,
                price: parseInt(price),
                deposit: deposit ? parseInt(deposit) : 0,
                fees: fees ? parseInt(fees) : null,
                address,
                city,
                neighborhood,
                latitude: latitude ? parseFloat(latitude) : 0,
                longitude: longitude ? parseFloat(longitude) : 0,
                bedrooms: parseInt(bedrooms) || 1,
                bathrooms: parseInt(bathrooms) || 1,
                area: parseInt(area) || 0,
                furnished: furnished === true,
                airConditioned: airConditioned === true,
                parking: parking === true,
                security: security === true,
                internet: internet === true,
                water: water === true,
                electricity: electricity === true,
                images: images || [],
                availableFrom: availableFrom ? new Date(availableFrom) : null
            },
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
        });
        res.status(201).json({
            message: 'Property created successfully',
            property
        });
    }
    catch (error) {
        console.error('Create property error:', error);
        res.status(500).json({
            error: 'Failed to create property',
            message: 'An error occurred while creating property'
        });
    }
});
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const agent = await index_1.prisma.agent.findUnique({
            where: { userId }
        });
        if (!agent) {
            return res.status(404).json({
                error: 'Agent not found',
                message: 'Agent profile not found'
            });
        }
        const property = await index_1.prisma.property.findFirst({
            where: {
                id,
                agentId: agent.id
            }
        });
        if (!property) {
            return res.status(404).json({
                error: 'Property not found',
                message: 'Property not found or you do not have permission to edit it'
            });
        }
        const updatedProperty = await index_1.prisma.property.update({
            where: { id },
            data: req.body,
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
        });
        res.json({
            message: 'Property updated successfully',
            property: updatedProperty
        });
    }
    catch (error) {
        console.error('Update property error:', error);
        res.status(500).json({
            error: 'Failed to update property',
            message: 'An error occurred while updating property'
        });
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const agent = await index_1.prisma.agent.findUnique({
            where: { userId }
        });
        if (!agent) {
            return res.status(404).json({
                error: 'Agent not found',
                message: 'Agent profile not found'
            });
        }
        const property = await index_1.prisma.property.findFirst({
            where: {
                id,
                agentId: agent.id
            }
        });
        if (!property) {
            return res.status(404).json({
                error: 'Property not found',
                message: 'Property not found or you do not have permission to delete it'
            });
        }
        await index_1.prisma.property.delete({
            where: { id }
        });
        res.json({
            message: 'Property deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete property error:', error);
        res.status(500).json({
            error: 'Failed to delete property',
            message: 'An error occurred while deleting property'
        });
    }
});
router.get('/nearby', async (req, res) => {
    try {
        const { latitude, longitude, radius = '5', limit = '20' } = req.query;
        if (!latitude || !longitude) {
            return res.status(400).json({
                error: 'Missing coordinates',
                message: 'Latitude and longitude are required'
            });
        }
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const radiusKm = parseFloat(radius);
        const limitNum = parseInt(limit);
        const nearbyProperties = await getPropertiesWithinRadius(lat, lng, radiusKm, limitNum);
        const properties = await index_1.prisma.property.findMany({
            where: {
                id: { in: nearbyProperties },
                status: 'ACTIVE',
                isAvailable: true
            },
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
            ]
        });
        const propertiesWithDistance = properties.map(property => ({
            ...property,
            distance: calculateDistance(lat, lng, property.latitude, property.longitude)
        })).sort((a, b) => a.distance - b.distance);
        res.json({
            message: 'Nearby properties retrieved successfully',
            properties: propertiesWithDistance,
            searchCenter: { latitude: lat, longitude: lng },
            radius: radiusKm
        });
    }
    catch (error) {
        console.error('Get nearby properties error:', error);
        res.status(500).json({
            error: 'Failed to get nearby properties',
            message: 'An error occurred while retrieving nearby properties'
        });
    }
});
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
async function getPropertiesWithinRadius(centerLat, centerLng, radiusKm, limit) {
    try {
        const allProperties = await index_1.prisma.property.findMany({
            where: {
                status: 'ACTIVE',
                isAvailable: true,
                latitude: { not: 0 },
                longitude: { not: 0 }
            },
            select: {
                id: true,
                latitude: true,
                longitude: true
            }
        });
        const propertiesWithinRadius = allProperties
            .map(property => ({
            id: property.id,
            distance: calculateDistance(centerLat, centerLng, property.latitude, property.longitude)
        }))
            .filter(property => property.distance <= radiusKm)
            .sort((a, b) => a.distance - b.distance);
        const results = limit
            ? propertiesWithinRadius.slice(0, limit)
            : propertiesWithinRadius;
        return results.map(property => property.id);
    }
    catch (error) {
        console.error('Get properties within radius error:', error);
        return [];
    }
}
exports.default = router;
//# sourceMappingURL=properties.js.map