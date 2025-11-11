"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const paymentAggregatorService_1 = require("../services/paymentAggregatorService");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.get('/plans', async (req, res) => {
    try {
        const plans = await prisma.subscriptionPlanDetails.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' },
        });
        res.json({
            success: true,
            plans,
        });
    }
    catch (error) {
        console.error('❌ Erreur récupération plans:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
router.post('/initiate', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { amount, transactionType, paymentMethod, phoneNumber, description, metadata, } = req.body;
        if (!amount || !transactionType || !paymentMethod) {
            return res.status(400).json({
                error: 'Champs requis manquants',
                message: 'amount, transactionType, et paymentMethod sont requis',
            });
        }
        if (amount < 100) {
            return res.status(400).json({
                error: 'Montant invalide',
                message: 'Le montant minimum est 100 FCFA',
            });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { agent: true },
        });
        if (transactionType === 'SUBSCRIPTION' && user?.userType !== 'AGENT') {
            return res.status(403).json({
                error: 'Accès refusé',
                message: 'Seuls les agents peuvent souscrire à un abonnement',
            });
        }
        if (!user) {
            return res.status(401).json({
                error: 'Non authentifié',
                message: 'Utilisateur non trouvé',
            });
        }
        const payment = await prisma.payment.create({
            data: {
                userId,
                agentId: user.agent?.id,
                amount,
                transactionType,
                paymentMethod,
                phoneNumber,
                description,
                metadata,
                status: 'PENDING',
            },
        });
        const paymentResponse = await paymentAggregatorService_1.paymentAggregatorService.initiatePayment({
            amount,
            phoneNumber: phoneNumber || user.phone,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            description,
            reference: payment.id,
            callbackUrl: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/payments/callback`,
            returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:8081'}/payment/success`,
        });
        if (paymentResponse.transactionId) {
            await prisma.payment.update({
                where: { id: payment.id },
                data: {
                    externalReference: paymentResponse.transactionId,
                    status: paymentResponse.success ? 'PROCESSING' : 'FAILED',
                },
            });
        }
        res.json({
            success: true,
            message: 'Paiement initié',
            payment: {
                id: payment.id,
                amount: payment.amount,
                status: payment.status,
                paymentMethod: payment.paymentMethod,
            },
            paymentUrl: paymentResponse.paymentUrl,
            qrCode: paymentResponse.qrCode,
        });
    }
    catch (error) {
        console.error('❌ Erreur initiation paiement:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
router.put('/:paymentId/confirm', auth_1.authenticateToken, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { externalReference, providerResponse } = req.body;
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                user: {
                    include: {
                        agent: true,
                    },
                },
            },
        });
        if (!payment) {
            return res.status(404).json({ error: 'Paiement non trouvé' });
        }
        const updatedPayment = await prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: 'COMPLETED',
                paidAt: new Date(),
                externalReference,
                providerResponse,
            },
        });
        if (payment.transactionType === 'SUBSCRIPTION' && payment.user.agent) {
            const now = new Date();
            const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            await prisma.activeSubscription.upsert({
                where: { agentId: payment.user.agent.id },
                create: {
                    agentId: payment.user.agent.id,
                    plan: payment.user.agent.subscriptionPlan,
                    startDate: now,
                    endDate,
                    isActive: true,
                    lastPaymentId: payment.id,
                },
                update: {
                    endDate,
                    isActive: true,
                    lastPaymentId: payment.id,
                    updatedAt: now,
                },
            });
            await prisma.agent.update({
                where: { id: payment.user.agent.id },
                data: {
                    subscriptionExpiry: endDate,
                },
            });
        }
        res.json({
            success: true,
            message: 'Paiement confirmé avec succès',
            payment: updatedPayment,
        });
    }
    catch (error) {
        console.error('❌ Erreur confirmation paiement:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
router.put('/:paymentId/fail', auth_1.authenticateToken, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { failureReason, providerResponse } = req.body;
        const payment = await prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: 'FAILED',
                failureReason,
                providerResponse,
            },
        });
        res.json({
            success: true,
            message: 'Paiement marqué comme échoué',
            payment,
        });
    }
    catch (error) {
        console.error('❌ Erreur échec paiement:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
router.get('/history', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { limit = '20', status, transactionType } = req.query;
        const where = { userId };
        if (status)
            where.status = status;
        if (transactionType)
            where.transactionType = transactionType;
        const payments = await prisma.payment.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
        });
        const total = await prisma.payment.count({ where });
        res.json({
            success: true,
            count: payments.length,
            total,
            payments,
        });
    }
    catch (error) {
        console.error('❌ Erreur historique paiements:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
router.get('/stats', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { agent: true },
        });
        if (!user?.agent) {
            return res.status(403).json({ error: 'Accessible uniquement aux agents' });
        }
        const payments = await prisma.payment.findMany({
            where: { userId },
        });
        const totalPaid = payments
            .filter((p) => p.status === 'COMPLETED')
            .reduce((sum, p) => sum + p.amount, 0);
        const totalPending = payments
            .filter((p) => p.status === 'PENDING' || p.status === 'PROCESSING')
            .reduce((sum, p) => sum + p.amount, 0);
        const byType = {
            subscriptions: payments.filter((p) => p.transactionType === 'SUBSCRIPTION').length,
            boosts: payments.filter((p) => p.transactionType === 'BOOST').length,
            commissions: payments.filter((p) => p.transactionType === 'COMMISSION').length,
        };
        res.json({
            success: true,
            stats: {
                totalPaid,
                totalPending,
                totalTransactions: payments.length,
                byType,
            },
        });
    }
    catch (error) {
        console.error('❌ Erreur stats paiements:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
router.get('/subscription/status', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                agent: {
                    include: {
                        activeSubscription: true,
                    },
                },
            },
        });
        if (!user?.agent) {
            return res.status(403).json({ error: 'Accessible uniquement aux agents' });
        }
        const subscription = user.agent.activeSubscription;
        const now = new Date();
        const isExpired = subscription ? subscription.endDate < now : true;
        res.json({
            success: true,
            subscription: subscription || null,
            currentPlan: user.agent.subscriptionPlan,
            isActive: subscription?.isActive && !isExpired,
            isExpired,
            daysRemaining: subscription ? Math.max(0, Math.ceil((subscription.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0,
        });
    }
    catch (error) {
        console.error('❌ Erreur statut abonnement:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
router.post('/callback', async (req, res) => {
    try {
        console.log('📥 Callback paiement reçu:', req.body);
        const callbackData = await paymentAggregatorService_1.paymentAggregatorService.handleCallback(req.body);
        const payment = await prisma.payment.findFirst({
            where: {
                OR: [
                    { id: callbackData.reference },
                    { externalReference: callbackData.transactionId },
                ],
            },
            include: {
                user: {
                    include: {
                        agent: true,
                    },
                },
            },
        });
        if (!payment) {
            console.error('❌ Paiement non trouvé:', callbackData.reference);
            return res.status(404).json({ error: 'Paiement non trouvé' });
        }
        const newStatus = callbackData.status === 'success' ? 'COMPLETED' :
            callbackData.status === 'failed' ? 'FAILED' :
                'PROCESSING';
        const updatedPayment = await prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: newStatus,
                paidAt: newStatus === 'COMPLETED' ? new Date() : undefined,
                providerResponse: callbackData,
            },
        });
        if (newStatus === 'COMPLETED' && payment.transactionType === 'SUBSCRIPTION' && payment.user.agent) {
            const now = new Date();
            const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            await prisma.activeSubscription.upsert({
                where: { agentId: payment.user.agent.id },
                create: {
                    agentId: payment.user.agent.id,
                    plan: payment.user.agent.subscriptionPlan,
                    startDate: now,
                    endDate,
                    isActive: true,
                    lastPaymentId: payment.id,
                },
                update: {
                    endDate,
                    isActive: true,
                    lastPaymentId: payment.id,
                },
            });
            await prisma.agent.update({
                where: { id: payment.user.agent.id },
                data: { subscriptionExpiry: endDate },
            });
        }
        console.log(`✅ Paiement ${payment.id} confirmé: ${newStatus}`);
        res.json({ success: true, status: newStatus });
    }
    catch (error) {
        console.error('❌ Erreur traitement callback:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
router.get('/:paymentId/status', auth_1.authenticateToken, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.user.userId;
        const payment = await prisma.payment.findFirst({
            where: {
                id: paymentId,
                userId,
            },
        });
        if (!payment) {
            return res.status(404).json({ error: 'Paiement non trouvé' });
        }
        if (payment.status === 'PENDING' || payment.status === 'PROCESSING') {
            if (payment.externalReference) {
                const statusResponse = await paymentAggregatorService_1.paymentAggregatorService.checkPaymentStatus(payment.externalReference);
                if (statusResponse.status === 'success') {
                    await prisma.payment.update({
                        where: { id: payment.id },
                        data: {
                            status: 'COMPLETED',
                            paidAt: new Date(),
                        },
                    });
                    payment.status = 'COMPLETED';
                }
                else if (statusResponse.status === 'failed') {
                    await prisma.payment.update({
                        where: { id: payment.id },
                        data: { status: 'FAILED' },
                    });
                    payment.status = 'FAILED';
                }
            }
        }
        res.json({
            success: true,
            payment: {
                id: payment.id,
                amount: payment.amount,
                status: payment.status,
                paymentMethod: payment.paymentMethod,
                transactionType: payment.transactionType,
                createdAt: payment.createdAt,
                paidAt: payment.paidAt,
            },
        });
    }
    catch (error) {
        console.error('❌ Erreur vérification statut:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=payments.js.map