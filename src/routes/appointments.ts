import express from 'express';
import { prisma } from '../index';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Créer un rendez-vous (locataire)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { agentId, propertyId, requestedDateTime, message } = req.body;

    // Vérifier que l'utilisateur est un locataire
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { userType: true }
    });

    if (user?.userType !== 'TENANT') {
      return res.status(403).json({ 
        message: 'Seuls les locataires peuvent demander un rendez-vous' 
      });
    }

    // Vérifier que la propriété existe
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { agent: true }
    });

    if (!property) {
      return res.status(404).json({ message: 'Propriété non trouvée' });
    }

    // Si agentId est un userId, trouver l'agent correspondant
    let finalAgentId = agentId;
    const agentByUserId = await prisma.agent.findUnique({
      where: { userId: agentId }
    });

    if (agentByUserId) {
      finalAgentId = agentByUserId.id;
    }

    // Vérifier que la propriété appartient à l'agent
    if (property.agentId !== finalAgentId) {
      return res.status(403).json({ 
        message: 'Cette propriété n\'appartient pas à cet agent' 
      });
    }

    // Vérifier qu'il n'y a pas déjà un rendez-vous en attente pour cette propriété
    const existingAppointment = await prisma.appointment.findFirst({
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

    // Créer le rendez-vous
    const appointment = await prisma.appointment.create({
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
  } catch (error: any) {
    console.error('Create appointment error:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la création du rendez-vous',
      error: error.message 
    });
  }
});

// Obtenir les rendez-vous de l'utilisateur
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { status } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { userType: true, agent: { select: { id: true } } }
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    let appointments;

    if (user.userType === 'TENANT') {
      // Pour les locataires : récupérer les rendez-vous demandés
      const where: any = { tenantId: userId };
      if (status && typeof status === 'string') {
        where.status = status;
      }

      appointments = await prisma.appointment.findMany({
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
    } else {
      // Pour les agents : récupérer les rendez-vous reçus
      if (!user.agent) {
        return res.status(403).json({ message: 'Utilisateur non trouvé comme agent' });
      }

      const where: any = { agentId: user.agent.id };
      if (status && typeof status === 'string') {
        where.status = status;
      }

      appointments = await prisma.appointment.findMany({
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
  } catch (error: any) {
    console.error('Get appointments error:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des rendez-vous',
      error: error.message 
    });
  }
});

// Approuver un rendez-vous (agent)
router.patch('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const { scheduledDateTime, agentNotes } = req.body;

    // Vérifier que l'utilisateur est un agent
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { agent: true }
    });

    if (user?.userType !== 'AGENT' || !user.agent) {
      return res.status(403).json({ 
        message: 'Seuls les agents peuvent approuver un rendez-vous' 
      });
    }

    // Vérifier que le rendez-vous existe et appartient à cet agent
    const appointment = await prisma.appointment.findUnique({
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

    // Approuver le rendez-vous
    const updatedAppointment = await prisma.appointment.update({
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
  } catch (error: any) {
    console.error('Approve appointment error:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'approbation du rendez-vous',
      error: error.message 
    });
  }
});

// Rejeter un rendez-vous (agent)
router.patch('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const { agentNotes } = req.body;

    // Vérifier que l'utilisateur est un agent
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { agent: true }
    });

    if (user?.userType !== 'AGENT' || !user.agent) {
      return res.status(403).json({ 
        message: 'Seuls les agents peuvent rejeter un rendez-vous' 
      });
    }

    // Vérifier que le rendez-vous existe et appartient à cet agent
    const appointment = await prisma.appointment.findUnique({
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

    // Rejeter le rendez-vous
    const updatedAppointment = await prisma.appointment.update({
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
  } catch (error: any) {
    console.error('Reject appointment error:', error);
    res.status(500).json({ 
      message: 'Erreur lors du rejet du rendez-vous',
      error: error.message 
    });
  }
});

// Annuler un rendez-vous (locataire ou agent)
router.patch('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { agent: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier que le rendez-vous existe
    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Rendez-vous non trouvé' });
    }

    // Vérifier que l'utilisateur a le droit d'annuler (locataire ou agent propriétaire)
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

    // Annuler le rendez-vous
    const updatedAppointment = await prisma.appointment.update({
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
  } catch (error: any) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'annulation du rendez-vous',
      error: error.message 
    });
  }
});

export default router;

router.get('/admin/agent/:agentId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status } = req.query;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true },
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent introuvable' });
    }

    const where: any = { agentId };
    if (status && typeof status === 'string') {
      where.status = status;
    }

    const appointments = await prisma.appointment.findMany({
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
  } catch (error) {
    console.error('❌ Erreur récupération rendez-vous agent:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des rendez-vous' });
  }
});

