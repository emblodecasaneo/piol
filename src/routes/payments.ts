import express, { Request, Response } from 'express';
import { PrismaClient, PaymentStatus, PaymentMethod, TransactionType } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { paymentAggregatorService } from '../services/paymentAggregatorService';

const router = express.Router();
const prisma = new PrismaClient();

// 📋 GET - Récupérer tous les plans d'abonnement
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = await prisma.subscriptionPlanDetails.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });

    res.json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error('❌ Erreur récupération plans:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 💳 POST - Initier un paiement
router.post('/initiate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const {
      amount,
      transactionType,
      paymentMethod,
      phoneNumber,
      description,
      metadata,
    } = req.body;

    // Validation
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

    // Vérifier que l'utilisateur est un agent pour les abonnements
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

    // Créer la transaction
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

    // ⚡ Initier le paiement avec l'agrégateur
    const paymentResponse = await paymentAggregatorService.initiatePayment({
      amount,
      phoneNumber: phoneNumber || user.phone,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      description,
      reference: payment.id,
      callbackUrl: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/payments/callback`,
      returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:8081'}/payment/success`,
    });

    // Mettre à jour avec la référence externe
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
      paymentUrl: paymentResponse.paymentUrl, // URL pour rediriger l'utilisateur
      qrCode: paymentResponse.qrCode,
    });
  } catch (error) {
    console.error('❌ Erreur initiation paiement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ PUT - Confirmer un paiement (callback ou manuel)
router.put('/:paymentId/confirm', authenticateToken, async (req: Request, res: Response) => {
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

    // Mettre à jour le statut
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
        externalReference,
        providerResponse,
      },
    });

    // Si c'est un abonnement, activer/prolonger l'abonnement
    if (payment.transactionType === 'SUBSCRIPTION' && payment.user.agent) {
      const now = new Date();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 jours

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

      // Mettre à jour l'expiration dans Agent
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
  } catch (error) {
    console.error('❌ Erreur confirmation paiement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ❌ PUT - Marquer un paiement comme échoué
router.put('/:paymentId/fail', authenticateToken, async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('❌ Erreur échec paiement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 📜 GET - Historique des paiements de l'utilisateur
router.get('/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { limit = '20', status, transactionType } = req.query;

    const where: any = { userId };
    if (status) where.status = status;
    if (transactionType) where.transactionType = transactionType;

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    const total = await prisma.payment.count({ where });

    res.json({
      success: true,
      count: payments.length,
      total,
      payments,
    });
  } catch (error) {
    console.error('❌ Erreur historique paiements:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 📊 GET - Statistiques des paiements (agent)
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

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
  } catch (error) {
    console.error('❌ Erreur stats paiements:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 🔄 GET - Statut de l'abonnement actif
router.get('/subscription/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

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
  } catch (error) {
    console.error('❌ Erreur statut abonnement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 🔗 POST - Webhook/Callback de l'agrégateur
router.post('/callback', async (req: Request, res: Response) => {
  try {
    console.log('📥 Callback paiement reçu:', req.body);

    // Traiter le callback de l'agrégateur
    const callbackData = await paymentAggregatorService.handleCallback(req.body);

    // Trouver le paiement
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

    // Mettre à jour le statut
    const newStatus: PaymentStatus = 
      callbackData.status === 'success' ? 'COMPLETED' :
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

    // Si paiement réussi et c'est un abonnement, activer
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

      // Mettre à jour Agent
      await prisma.agent.update({
        where: { id: payment.user.agent.id },
        data: { subscriptionExpiry: endDate },
      });
    }

    // TODO: Envoyer une notification push à l'utilisateur
    console.log(`✅ Paiement ${payment.id} confirmé: ${newStatus}`);

    res.json({ success: true, status: newStatus });
  } catch (error) {
    console.error('❌ Erreur traitement callback:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 🔍 GET - Vérifier le statut d'un paiement
router.get('/:paymentId/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const userId = (req as any).user.userId;

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId, // Sécurité: l'utilisateur ne peut voir que ses propres paiements
      },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }

    // Si le paiement est en attente, vérifier avec l'agrégateur
    if (payment.status === 'PENDING' || payment.status === 'PROCESSING') {
      if (payment.externalReference) {
        const statusResponse = await paymentAggregatorService.checkPaymentStatus(
          payment.externalReference
        );

        // Mettre à jour si le statut a changé
        if (statusResponse.status === 'success') {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'COMPLETED',
              paidAt: new Date(),
            },
          });
          payment.status = 'COMPLETED' as any;
        } else if (statusResponse.status === 'failed') {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' },
          });
          payment.status = 'FAILED' as any;
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
  } catch (error) {
    console.error('❌ Erreur vérification statut:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

