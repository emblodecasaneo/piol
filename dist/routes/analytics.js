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
router.get('/dashboard', auth_1.authenticateToken, auth_1.requireAdmin, async (_req, res) => {
    try {
        const [totalProperties, totalAgents, activeSubscriptionsCount, paymentsCompleted, pendingAgentsCount] = await Promise.all([
            prisma.property.count(),
            prisma.agent.count(),
            prisma.activeSubscription.count({ where: { isActive: true } }),
            prisma.payment.aggregate({
                where: { status: client_1.PaymentStatus.COMPLETED },
                _sum: {
                    amount: true,
                },
            }),
            prisma.agent.count({ where: { verificationStatus: 'PENDING' } }),
        ]);
        const totalRevenue = paymentsCompleted._sum?.amount || 0;
        res.json({
            success: true,
            stats: {
                totalProperties,
                totalAgents,
                activeSubscriptions: activeSubscriptionsCount,
                totalRevenue,
                pendingAgents: pendingAgentsCount,
            },
        });
    }
    catch (error) {
        console.error('❌ Erreur stats tableau de bord:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération des statistiques' });
    }
});
router.get('/revenue/monthly', auth_1.authenticateToken, auth_1.requireAdmin, async (_req, res) => {
    try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        const payments = await prisma.payment.findMany({
            where: {
                status: client_1.PaymentStatus.COMPLETED,
                transactionType: client_1.TransactionType.SUBSCRIPTION,
                paidAt: {
                    gte: start,
                },
            },
            orderBy: { paidAt: 'asc' },
        });
        const revenueByMonth = {};
        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            revenueByMonth[key] = 0;
        }
        payments.forEach((payment) => {
            if (!payment.paidAt)
                return;
            const date = new Date(payment.paidAt);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            if (revenueByMonth[key] !== undefined) {
                revenueByMonth[key] += payment.amount;
            }
        });
        const labels = Object.keys(revenueByMonth)
            .map((key) => {
            const [year, month] = key.split('-');
            return `${month.padStart(2, '0')}/${year}`;
        })
            .reverse();
        const data = Object.values(revenueByMonth).reverse();
        res.json({
            success: true,
            labels,
            data,
        });
    }
    catch (error) {
        console.error('❌ Erreur revenu mensuel:', error);
        res.status(500).json({ error: 'Erreur serveur lors du calcul du revenu mensuel' });
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map