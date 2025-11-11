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
        const { agentId, propertyId, requestedDateTime, message } = req.body;
        const user = await index_1.prisma.user.findUnique({
            where: { id: userId },
            select: { userType: true }
        });
        if (user?.userType !== 'TENANT') {
            return res.status(403).json({
                message: 'Seuls les locataires peuvent demander un rendez-vous'
            });
        }
        const property = await index_1.prisma.property.findUnique({
            where: { id: propertyId },
            include: { agent: true }
        });
        if (!property) {
            return res.status(404).json({ message: 'Propriété non trouvée' });
        }
        let finalAgentId = agentId;
        const agentByUserId = await index_1.prisma.agent.findUnique({
            where: { userId: agentId }
        });
        if (agentByUserId) {
            finalAgentId = agentByUserId.id;
        }
        if (property.agentId !== finalAgentId) {
            return res.status(403).json({
                message: 'Cette propriété n\'appartient pas à cet agent'
            });
        }
        const existingAppointment = await index_1.prisma.appointment.findFirst({
            where: {
                tenantId: userId,
                propertyId: propertyId,
                status: 'PENDING'
            }
        });
        if (existingAppointment) {
            return res.status(400).json({
                message: 'Vous avez déjà un rendez-vous en attente pour cette propriété'
            });
        }
        const appointment = await index_1.prisma.appointment.create({
            data: {
                tenantId: userId,
                agentId: finalAgentId,
                propertyId: propertyId,
                requestedDateTime: new Date(requestedDateTime),
                message: message || null,
                status: 'PENDING'
            },
            include: {
                tenant: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true
                    }
                },
                agent: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone: true
                            }
                        }
                    }
                },
                property: {
                    select: {
                        id: true,
                        title: true,
                        address: true,
                        city: {
                            select: { name: true }
                        },
                        neighborhood: {
                            select: { name: true }
                        }
                    }
                }
            }
        });
        res.status(201).json({
            message: 'Rendez-vous demandé avec succès',
            appointment
        });
    }
    catch (error) {
        console.error('Create appointment error:', error);
        res.status(500).json({
            message: 'Erreur lors de la création du rendez-vous',
            error: error.message
        });
    }
});
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { status } = req.query;
        const user = await index_1.prisma.user.findUnique({
            where: { id: userId },
            select: { userType: true, agent: { select: { id: true } } }
        });
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        let appointments;
        if (user.userType === 'TENANT') {
            const where = { tenantId: userId };
            if (status && typeof status === 'string') {
                where.status = status;
            }
            appointments = await index_1.prisma.appointment.findMany({
                where,
                include: {
                    agent: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                    phone: true,
                                    avatar: true
                                }
                            }
                        }
                    },
                    property: {
                        select: {
                            id: true,
                            title: true,
                            address: true,
                            images: true,
                            price: true,
                            city: {
                                select: { name: true }
                            },
                            neighborhood: {
                                select: { name: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        }
        else {
            if (!user.agent) {
                return res.status(403).json({ message: 'Utilisateur non trouvé comme agent' });
            }
            const where = { agentId: user.agent.id };
            if (status && typeof status === 'string') {
                where.status = status;
            }
            appointments = await index_1.prisma.appointment.findMany({
                where,
                include: {
                    tenant: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            avatar: true
                        }
                    },
                    property: {
                        select: {
                            id: true,
                            title: true,
                            address: true,
                            images: true,
                            price: true,
                            city: {
                                select: { name: true }
                            },
                            neighborhood: {
                                select: { name: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        }
        res.json({
            message: 'Rendez-vous récupérés avec succès',
            appointments
        });
    }
    catch (error) {
        console.error('Get appointments error:', error);
        res.status(500).json({
            message: 'Erreur lors de la récupération des rendez-vous',
            error: error.message
        });
    }
});
router.patch('/:id/approve', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { scheduledDateTime, agentNotes } = req.body;
        const user = await index_1.prisma.user.findUnique({
            where: { id: userId },
            include: { agent: true }
        });
        if (user?.userType !== 'AGENT' || !user.agent) {
            return res.status(403).json({
                message: 'Seuls les agents peuvent approuver un rendez-vous'
            });
        }
        const appointment = await index_1.prisma.appointment.findUnique({
            where: { id }
        });
        if (!appointment) {
            return res.status(404).json({ message: 'Rendez-vous non trouvé' });
        }
        if (appointment.agentId !== user.agent.id) {
            return res.status(403).json({
                message: 'Ce rendez-vous ne vous appartient pas'
            });
        }
        if (appointment.status !== 'PENDING') {
            return res.status(400).json({
                message: 'Ce rendez-vous ne peut plus être modifié'
            });
        }
        const updatedAppointment = await index_1.prisma.appointment.update({
            where: { id },
            data: {
                status: 'APPROVED',
                scheduledDateTime: scheduledDateTime ? new Date(scheduledDateTime) : appointment.requestedDateTime,
                agentNotes: agentNotes || null
            },
            include: {
                tenant: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true
                    }
                },
                agent: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone: true
                            }
                        }
                    }
                },
                property: {
                    select: {
                        id: true,
                        title: true,
                        address: true,
                        city: {
                            select: { name: true }
                        },
                        neighborhood: {
                            select: { name: true }
                        }
                    }
                }
            }
        });
        res.json({
            message: 'Rendez-vous approuvé avec succès',
            appointment: updatedAppointment
        });
    }
    catch (error) {
        console.error('Approve appointment error:', error);
        res.status(500).json({
            message: 'Erreur lors de l\'approbation du rendez-vous',
            error: error.message
        });
    }
});
router.patch('/:id/reject', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { agentNotes } = req.body;
        const user = await index_1.prisma.user.findUnique({
            where: { id: userId },
            include: { agent: true }
        });
        if (user?.userType !== 'AGENT' || !user.agent) {
            return res.status(403).json({
                message: 'Seuls les agents peuvent rejeter un rendez-vous'
            });
        }
        const appointment = await index_1.prisma.appointment.findUnique({
            where: { id }
        });
        if (!appointment) {
            return res.status(404).json({ message: 'Rendez-vous non trouvé' });
        }
        if (appointment.agentId !== user.agent.id) {
            return res.status(403).json({
                message: 'Ce rendez-vous ne vous appartient pas'
            });
        }
        if (appointment.status !== 'PENDING') {
            return res.status(400).json({
                message: 'Ce rendez-vous ne peut plus être modifié'
            });
        }
        const updatedAppointment = await index_1.prisma.appointment.update({
            where: { id },
            data: {
                status: 'REJECTED',
                agentNotes: agentNotes || null
            },
            include: {
                tenant: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true
                    }
                },
                agent: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone: true
                            }
                        }
                    }
                },
                property: {
                    select: {
                        id: true,
                        title: true,
                        address: true,
                        city: {
                            select: { name: true }
                        },
                        neighborhood: {
                            select: { name: true }
                        }
                    }
                }
            }
        });
        res.json({
            message: 'Rendez-vous rejeté',
            appointment: updatedAppointment
        });
    }
    catch (error) {
        console.error('Reject appointment error:', error);
        res.status(500).json({
            message: 'Erreur lors du rejet du rendez-vous',
            error: error.message
        });
    }
});
router.patch('/:id/cancel', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const user = await index_1.prisma.user.findUnique({
            where: { id: userId },
            include: { agent: true }
        });
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        const appointment = await index_1.prisma.appointment.findUnique({
            where: { id }
        });
        if (!appointment) {
            return res.status(404).json({ message: 'Rendez-vous non trouvé' });
        }
        const isAgent = user.userType === 'AGENT' && user.agent;
        const isOwner = isAgent && user.agent
            ? appointment.agentId === user.agent.id
            : appointment.tenantId === userId;
        if (!isOwner) {
            return res.status(403).json({
                message: 'Vous n\'avez pas le droit d\'annuler ce rendez-vous'
            });
        }
        if (appointment.status === 'CANCELLED') {
            return res.status(400).json({
                message: 'Ce rendez-vous est déjà annulé'
            });
        }
        const updatedAppointment = await index_1.prisma.appointment.update({
            where: { id },
            data: {
                status: 'CANCELLED'
            },
            include: {
                tenant: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true
                    }
                },
                agent: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone: true
                            }
                        }
                    }
                },
                property: {
                    select: {
                        id: true,
                        title: true,
                        address: true,
                        city: {
                            select: { name: true }
                        },
                        neighborhood: {
                            select: { name: true }
                        }
                    }
                }
            }
        });
        res.json({
            message: 'Rendez-vous annulé',
            appointment: updatedAppointment
        });
    }
    catch (error) {
        console.error('Cancel appointment error:', error);
        res.status(500).json({
            message: 'Erreur lors de l\'annulation du rendez-vous',
            error: error.message
        });
    }
});
exports.default = router;
router.get('/admin/agent/:agentId', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { agentId } = req.params;
        const { status } = req.query;
        const agent = await index_1.prisma.agent.findUnique({
            where: { id: agentId },
            select: { id: true },
        });
        if (!agent) {
            return res.status(404).json({ message: 'Agent introuvable' });
        }
        const where = { agentId };
        if (status && typeof status === 'string') {
            where.status = status;
        }
        const appointments = await index_1.prisma.appointment.findMany({
            where,
            include: {
                tenant: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                property: {
                    select: {
                        id: true,
                        title: true,
                        address: true,
                        price: true,
                        images: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({
            success: true,
            appointments,
        });
    }
    catch (error) {
        console.error('❌ Erreur récupération rendez-vous agent:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération des rendez-vous' });
    }
});
//# sourceMappingURL=appointments.js.map