"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.get('/:neighborhoodId', async (req, res) => {
    try {
        const { neighborhoodId } = req.params;
        const score = await prisma.neighborhoodScore.findUnique({
            where: { neighborhoodId },
            include: {
                neighborhood: {
                    include: {
                        city: true
                    }
                },
                ratings: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        security: true,
                        accessibility: true,
                        amenities: true,
                        nightlife: true,
                        internet: true,
                        comment: true,
                        createdAt: true
                    }
                }
            }
        });
        if (!score) {
            return res.status(404).json({
                error: 'Score de quartier non trouvé',
                message: 'Ce quartier n\'a pas encore été évalué'
            });
        }
        res.json({
            success: true,
            data: score
        });
    }
    catch (error) {
        console.error('❌ Erreur récupération score:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
router.get('/city/:cityId', async (req, res) => {
    try {
        const { cityId } = req.params;
        const scores = await prisma.neighborhoodScore.findMany({
            where: {
                neighborhood: {
                    cityId
                }
            },
            include: {
                neighborhood: true
            },
            orderBy: {
                overall: 'desc'
            }
        });
        res.json({
            success: true,
            count: scores.length,
            data: scores
        });
    }
    catch (error) {
        console.error('❌ Erreur récupération scores ville:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
router.post('/:neighborhoodId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { neighborhoodId } = req.params;
        const { security, accessibility, amenities, nightlife, internet, description, highlights, concerns, averageRent, transportCost, popularFor } = req.body;
        const scores = { security, accessibility, amenities, nightlife, internet };
        for (const [key, value] of Object.entries(scores)) {
            if (value !== undefined && (value < 0 || value > 5)) {
                return res.status(400).json({
                    error: `Le score "${key}" doit être entre 0 et 5`
                });
            }
        }
        const validScores = Object.values(scores).filter(s => s !== undefined);
        const overall = validScores.length > 0
            ? validScores.reduce((a, b) => a + b, 0) / validScores.length
            : 0;
        const neighborhood = await prisma.neighborhood.findUnique({
            where: { id: neighborhoodId }
        });
        if (!neighborhood) {
            return res.status(404).json({ error: 'Quartier non trouvé' });
        }
        const score = await prisma.neighborhoodScore.upsert({
            where: { neighborhoodId },
            create: {
                neighborhoodId,
                security: security || 0,
                accessibility: accessibility || 0,
                amenities: amenities || 0,
                nightlife: nightlife || 0,
                internet: internet || 0,
                overall,
                description,
                highlights: highlights || [],
                concerns: concerns || [],
                averageRent,
                transportCost,
                popularFor: popularFor || []
            },
            update: {
                security: security !== undefined ? security : undefined,
                accessibility: accessibility !== undefined ? accessibility : undefined,
                amenities: amenities !== undefined ? amenities : undefined,
                nightlife: nightlife !== undefined ? nightlife : undefined,
                internet: internet !== undefined ? internet : undefined,
                overall,
                description: description !== undefined ? description : undefined,
                highlights: highlights !== undefined ? highlights : undefined,
                concerns: concerns !== undefined ? concerns : undefined,
                averageRent: averageRent !== undefined ? averageRent : undefined,
                transportCost: transportCost !== undefined ? transportCost : undefined,
                popularFor: popularFor !== undefined ? popularFor : undefined,
                updatedAt: new Date()
            },
            include: {
                neighborhood: {
                    include: {
                        city: true
                    }
                }
            }
        });
        res.json({
            success: true,
            message: 'Score de quartier mis à jour avec succès',
            data: score
        });
    }
    catch (error) {
        console.error('❌ Erreur mise à jour score:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
router.post('/:neighborhoodId/rate', auth_1.authenticateToken, async (req, res) => {
    try {
        const { neighborhoodId } = req.params;
        const userId = req.user.userId;
        const { security, accessibility, amenities, nightlife, internet, comment } = req.body;
        const scores = { security, accessibility, amenities, nightlife, internet };
        for (const [key, value] of Object.entries(scores)) {
            if (!value || value < 1 || value > 5) {
                return res.status(400).json({
                    error: `Le score "${key}" est requis et doit être entre 1 et 5`
                });
            }
        }
        let neighborhoodScore = await prisma.neighborhoodScore.findUnique({
            where: { neighborhoodId }
        });
        if (!neighborhoodScore) {
            neighborhoodScore = await prisma.neighborhoodScore.create({
                data: {
                    neighborhoodId,
                    security: 0,
                    accessibility: 0,
                    amenities: 0,
                    nightlife: 0,
                    internet: 0,
                    overall: 0
                }
            });
        }
        const existingRating = await prisma.neighborhoodRating.findUnique({
            where: {
                userId_scoreId: {
                    userId,
                    scoreId: neighborhoodScore.id
                }
            }
        });
        if (existingRating) {
            return res.status(400).json({
                error: 'Vous avez déjà évalué ce quartier',
                message: 'Une seule évaluation par quartier est autorisée'
            });
        }
        const rating = await prisma.neighborhoodRating.create({
            data: {
                userId,
                scoreId: neighborhoodScore.id,
                security,
                accessibility,
                amenities,
                nightlife,
                internet,
                comment
            }
        });
        const allRatings = await prisma.neighborhoodRating.findMany({
            where: { scoreId: neighborhoodScore.id }
        });
        const totalRatings = allRatings.length;
        const avgSecurity = allRatings.reduce((sum, r) => sum + r.security, 0) / totalRatings;
        const avgAccessibility = allRatings.reduce((sum, r) => sum + r.accessibility, 0) / totalRatings;
        const avgAmenities = allRatings.reduce((sum, r) => sum + r.amenities, 0) / totalRatings;
        const avgNightlife = allRatings.reduce((sum, r) => sum + r.nightlife, 0) / totalRatings;
        const avgInternet = allRatings.reduce((sum, r) => sum + r.internet, 0) / totalRatings;
        const avgOverall = (avgSecurity + avgAccessibility + avgAmenities + avgNightlife + avgInternet) / 5;
        const updatedScore = await prisma.neighborhoodScore.update({
            where: { id: neighborhoodScore.id },
            data: {
                security: avgSecurity,
                accessibility: avgAccessibility,
                amenities: avgAmenities,
                nightlife: avgNightlife,
                internet: avgInternet,
                overall: avgOverall,
                totalRatings
            },
            include: {
                neighborhood: {
                    include: {
                        city: true
                    }
                }
            }
        });
        res.json({
            success: true,
            message: 'Merci pour votre évaluation ! 🎉',
            data: {
                rating,
                updatedScore
            }
        });
    }
    catch (error) {
        console.error('❌ Erreur ajout évaluation:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
router.get('/top/:criterion', async (req, res) => {
    try {
        const { criterion } = req.params;
        const { cityId, limit = '10' } = req.query;
        const validCriteria = ['security', 'accessibility', 'amenities', 'nightlife', 'internet', 'overall'];
        if (!validCriteria.includes(criterion)) {
            return res.status(400).json({
                error: 'Critère invalide',
                validCriteria
            });
        }
        const where = {};
        if (cityId) {
            where.neighborhood = {
                cityId: cityId
            };
        }
        const orderBy = {};
        orderBy[criterion] = 'desc';
        const topNeighborhoods = await prisma.neighborhoodScore.findMany({
            where,
            take: parseInt(limit),
            orderBy,
            include: {
                neighborhood: {
                    include: {
                        city: true
                    }
                }
            }
        });
        res.json({
            success: true,
            criterion,
            count: topNeighborhoods.length,
            data: topNeighborhoods
        });
    }
    catch (error) {
        console.error('❌ Erreur récupération top quartiers:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
router.put('/:neighborhoodId/practical-info', auth_1.authenticateToken, async (req, res) => {
    try {
        const { neighborhoodId } = req.params;
        const { description, highlights, concerns, averageRent, transportCost, popularFor } = req.body;
        const score = await prisma.neighborhoodScore.update({
            where: { neighborhoodId },
            data: {
                description: description !== undefined ? description : undefined,
                highlights: highlights !== undefined ? highlights : undefined,
                concerns: concerns !== undefined ? concerns : undefined,
                averageRent: averageRent !== undefined ? averageRent : undefined,
                transportCost: transportCost !== undefined ? transportCost : undefined,
                popularFor: popularFor !== undefined ? popularFor : undefined,
                updatedAt: new Date()
            },
            include: {
                neighborhood: {
                    include: {
                        city: true
                    }
                }
            }
        });
        res.json({
            success: true,
            message: 'Informations pratiques mises à jour',
            data: score
        });
    }
    catch (error) {
        console.error('❌ Erreur mise à jour infos pratiques:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
router.get('/stats/overview', async (req, res) => {
    try {
        const { cityId } = req.query;
        const where = {};
        if (cityId) {
            where.neighborhood = {
                cityId: cityId
            };
        }
        const scores = await prisma.neighborhoodScore.findMany({
            where,
            include: {
                neighborhood: {
                    include: {
                        city: true
                    }
                }
            }
        });
        const totalNeighborhoods = scores.length;
        const totalRatings = scores.reduce((sum, s) => sum + s.totalRatings, 0);
        const avgScores = {
            security: scores.reduce((sum, s) => sum + s.security, 0) / totalNeighborhoods || 0,
            accessibility: scores.reduce((sum, s) => sum + s.accessibility, 0) / totalNeighborhoods || 0,
            amenities: scores.reduce((sum, s) => sum + s.amenities, 0) / totalNeighborhoods || 0,
            nightlife: scores.reduce((sum, s) => sum + s.nightlife, 0) / totalNeighborhoods || 0,
            internet: scores.reduce((sum, s) => sum + s.internet, 0) / totalNeighborhoods || 0,
            overall: scores.reduce((sum, s) => sum + s.overall, 0) / totalNeighborhoods || 0
        };
        const topRated = scores
            .sort((a, b) => b.overall - a.overall)
            .slice(0, 5)
            .map(s => ({
            name: s.neighborhood.name,
            city: s.neighborhood.city.name,
            score: s.overall,
            totalRatings: s.totalRatings
        }));
        res.json({
            success: true,
            stats: {
                totalNeighborhoods,
                totalRatings,
                averageScores: avgScores,
                topRated
            }
        });
    }
    catch (error) {
        console.error('❌ Erreur statistiques:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=neighborhood-scores.js.map