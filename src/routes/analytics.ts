import express from 'express';
import { PrismaClient, PaymentStatus, TransactionType } from '@prisma/client';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/analytics/dashboard - Statistiques pour le tableau de bord admin
router.get('/dashboard', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const [totalProperties, totalAgents, activeSubscriptionsCount, paymentsCompleted, pendingAgentsCount] =
      await Promise.all([
        prisma.property.count(),
        prisma.agent.count(),
        prisma.activeSubscription.count({ where: { isActive: true } }),
        prisma.payment.aggregate({
          where: { status: PaymentStatus.COMPLETED },
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
  } catch (error) {
    console.error('❌ Erreur stats tableau de bord:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des statistiques' });
  }
});

// GET /api/analytics/revenue/monthly - Revenu mensuel sur 12 mois
router.get('/revenue/monthly', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const payments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        transactionType: TransactionType.SUBSCRIPTION,
        paidAt: {
          gte: start,
        },
      },
      orderBy: { paidAt: 'asc' },
    });

    const revenueByMonth: Record<string, number> = {};
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      revenueByMonth[key] = 0;
    }

    payments.forEach((payment) => {
      if (!payment.paidAt) return;
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
  } catch (error) {
    console.error('❌ Erreur revenu mensuel:', error);
    res.status(500).json({ error: 'Erreur serveur lors du calcul du revenu mensuel' });
  }
});

export default router;
