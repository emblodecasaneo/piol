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
router.get('/', auth_1.authenticateToken, auth_1.requireAdmin, async (_req, res) => {
    try {
        const subscriptions = await prisma.activeSubscription.findMany({
            include: {
                agent: {
                    include: {
                        user: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
        const paymentIds = subscriptions
            .map((sub) => sub.lastPaymentId)
            .filter((id) => !!id);
        const payments = await prisma.payment.findMany({
            where: {
                id: { in: paymentIds },
            },
        });
        const paymentMap = new Map(payments.map((payment) => [payment.id, payment]));
        const enrichedSubscriptions = subscriptions.map((subscription) => ({
            ...subscription,
            lastPayment: subscription.lastPaymentId
                ? paymentMap.get(subscription.lastPaymentId) || null
                : null,
        }));
        res.json({
            success: true,
            subscriptions: enrichedSubscriptions,
        });
    }
    catch (error) {
        console.error('❌ Erreur récupération abonnements:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération des abonnements' });
    }
});
router.post('/', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { agentId, plan, startDate, endDate, durationDays, autoRenew, isActive } = req.body;
        if (!agentId || !plan) {
            return res.status(400).json({
                error: 'Paramètres manquants',
                message: 'agentId et plan sont requis',
            });
        }
        const subscriptionPlan = plan;
        if (!Object.values(client_1.SubscriptionPlan).includes(subscriptionPlan)) {
            return res.status(400).json({
                error: 'Plan invalide',
                message: 'Le plan spécifié est inconnu',
            });
        }
        const planDetails = await prisma.subscriptionPlanDetails.findFirst({
            where: { name: subscriptionPlan },
        });
        if (!planDetails) {
            return res.status(404).json({
                error: 'Plan introuvable',
                message: "Les détails du plan n'ont pas été trouvés",
            });
        }
        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
            include: { user: true },
        });
        if (!agent || !agent.userId) {
            return res.status(404).json({
                error: 'Agent introuvable',
                message: "Impossible de trouver l'agent spécifié",
            });
        }
        const start = startDate ? new Date(startDate) : new Date();
        let computedEndDate;
        if (endDate) {
            computedEndDate = new Date(endDate);
        }
        else {
            const duration = durationDays ? Number(durationDays) : 30;
            computedEndDate = new Date(start.getTime() + duration * 24 * 60 * 60 * 1000);
        }
        const subscription = await prisma.activeSubscription.upsert({
            where: { agentId },
            update: {
                plan: subscriptionPlan,
                startDate: start,
                endDate: computedEndDate,
                isActive: typeof isActive === 'boolean' ? isActive : true,
                autoRenew: typeof autoRenew === 'boolean' ? autoRenew : false,
            },
            create: {
                agentId,
                plan: subscriptionPlan,
                startDate: start,
                endDate: computedEndDate,
                isActive: typeof isActive === 'boolean' ? isActive : true,
                autoRenew: typeof autoRenew === 'boolean' ? autoRenew : false,
            },
            include: {
                agent: {
                    include: {
                        user: true,
                    },
                },
            },
        });
        await prisma.agent.update({
            where: { id: agentId },
            data: {
                subscriptionPlan: subscriptionPlan,
                subscriptionExpiry: computedEndDate,
            },
        });
        const payment = await prisma.payment.create({
            data: {
                userId: agent.userId,
                agentId: agent.id,
                amount: planDetails.price,
                transactionType: client_1.TransactionType.SUBSCRIPTION,
                paymentMethod: client_1.PaymentMethod.CASH,
                status: client_1.PaymentStatus.COMPLETED,
                description: `Abonnement ${planDetails.displayName} assigné par un administrateur`,
                paidAt: new Date(),
                metadata: {
                    assignedBy: req.user.userId,
                    plan: subscriptionPlan,
                },
            },
        });
        await prisma.activeSubscription.update({
            where: { agentId },
            data: {
                lastPaymentId: payment.id,
            },
        });
        const refreshedSubscription = await prisma.activeSubscription.findUnique({
            where: { agentId },
            include: {
                agent: {
                    include: {
                        user: true,
                    },
                },
            },
        });
        res.json({
            success: true,
            message: 'Abonnement assigné avec succès',
            subscription: {
                ...refreshedSubscription,
                lastPayment: payment,
            },
        });
    }
    catch (error) {
        console.error('❌ Erreur création abonnement:', error);
        res.status(500).json({ error: 'Erreur serveur lors de l\'assignation de l\'abonnement' });
    }
});
router.put('/:id', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { plan, startDate, endDate, isActive, autoRenew } = req.body;
        const data = {};
        if (plan) {
            const subscriptionPlan = plan;
            if (!Object.values(client_1.SubscriptionPlan).includes(subscriptionPlan)) {
                return res.status(400).json({
                    error: 'Plan invalide',
                    message: 'Le plan spécifié est inconnu',
                });
            }
            data.plan = subscriptionPlan;
        }
        if (startDate) {
            data.startDate = new Date(startDate);
        }
        if (endDate) {
            data.endDate = new Date(endDate);
        }
        if (typeof isActive === 'boolean') {
            data.isActive = isActive;
        }
        if (typeof autoRenew === 'boolean') {
            data.autoRenew = autoRenew;
        }
        if (Object.keys(data).length === 0) {
            return res.status(400).json({
                error: 'Aucune donnée à mettre à jour',
            });
        }
        const subscription = await prisma.activeSubscription.update({
            where: { id },
            data,
            include: {
                agent: {
                    include: {
                        user: true,
                    },
                },
            },
        });
        await prisma.agent.update({
            where: { id: subscription.agentId },
            data: {
                ...(data.plan ? { subscriptionPlan: data.plan } : {}),
                ...(data.endDate ? { subscriptionExpiry: subscription.endDate } : {}),
            },
        });
        res.json({
            success: true,
            message: 'Abonnement mis à jour',
            subscription,
        });
    }
    catch (error) {
        console.error('❌ Erreur mise à jour abonnement:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la mise à jour de l\'abonnement' });
    }
});
exports.default = router;
//# sourceMappingURL=subscriptions.js.map