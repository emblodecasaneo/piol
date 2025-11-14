import { ReservationStatus } from '@prisma/client';
import express from 'express';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Obtenir toutes les réservations de l'utilisateur connecté (locataire) ou de ses hôtels (agent)
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.userType;

    let reservations;

    if (userType === 'AGENT') {
      // Pour les agents : récupérer toutes les réservations de leurs hôtels
      const agent = await prisma.agent.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!agent) {
        return res.status(404).json({
          error: 'Agent not found',
          message: 'Agent profile not found',
        });
      }

      const agentProperties = await prisma.property.findMany({
        where: { agentId: agent.id, type: 'HOTEL' },
        select: { id: true },
      });

      const propertyIds = agentProperties.map((p) => p.id);

      reservations = await prisma.reservation.findMany({
        where: {
          propertyId: { in: propertyIds },
        },
        include: {
          property: {
            include: {
              city: true,
              neighborhood: true,
              agent: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Pour les locataires : récupérer leurs réservations
      reservations = await prisma.reservation.findMany({
        where: { userId },
        include: {
          property: {
            include: {
              city: true,
              neighborhood: true,
              agent: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    res.json({
      message: 'Reservations retrieved successfully',
      reservations,
    });
  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({
      error: 'Failed to retrieve reservations',
      message: 'An error occurred while retrieving reservations',
    });
  }
});

// Obtenir les réservations d'un hôtel spécifique (pour les agents)
router.get('/property/:propertyId', authenticateToken, async (req: any, res) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user.userId;

    // Vérifier que l'utilisateur est un agent et propriétaire de l'hôtel
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { agent: true },
    });

    if (!property) {
      return res.status(404).json({
        error: 'Property not found',
      });
    }

    if (property.agent.userId !== userId) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You are not the owner of this property',
      });
    }

    const reservations = await prisma.reservation.findMany({
      where: { propertyId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { checkInDate: 'desc' },
    });

    res.json({
      message: 'Reservations retrieved successfully',
      reservations,
    });
  } catch (error) {
    console.error('Get property reservations error:', error);
    res.status(500).json({
      error: 'Failed to retrieve reservations',
      message: 'An error occurred while retrieving reservations',
    });
  }
});

// Vérifier la disponibilité d'un hôtel pour une période
router.post('/check-availability', authenticateToken, async (req: any, res) => {
  try {
    const { propertyId, checkInDate, checkOutDate } = req.body;

    if (!propertyId || !checkInDate || !checkOutDate) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'propertyId, checkInDate, and checkOutDate are required',
      });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return res.status(404).json({
        error: 'Property not found',
      });
    }

    if (property.type !== 'HOTEL') {
      return res.status(400).json({
        error: 'Invalid property type',
        message: 'This property is not a hotel',
      });
    }

    // Vérifier s'il y a des réservations qui se chevauchent
    const overlappingReservations = await prisma.reservation.findMany({
      where: {
        propertyId,
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
        OR: [
          {
            checkInDate: {
              lte: new Date(checkOutDate),
            },
            checkOutDate: {
              gte: new Date(checkInDate),
            },
          },
        ],
      },
    });

    const isAvailable = overlappingReservations.length === 0;

    res.json({
      isAvailable,
      message: isAvailable
        ? 'Property is available for the selected dates'
        : 'Property is not available for the selected dates',
      overlappingReservations: overlappingReservations.length,
    });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({
      error: 'Failed to check availability',
      message: 'An error occurred while checking availability',
    });
  }
});

// Créer une nouvelle réservation
router.post('/', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const {
      propertyId,
      checkInDate,
      checkOutDate,
      tariff,
      guests,
      guestName,
      guestEmail,
      guestPhone,
      specialRequests,
    } = req.body;

    // Validation des champs requis
    if (
      !propertyId ||
      !checkInDate ||
      !checkOutDate ||
      !tariff ||
      !guests ||
      !guestName ||
      !guestEmail ||
      !guestPhone
    ) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'All required fields must be provided',
      });
    }

    // Valider le tarif
    if (!['STANDARD', 'WEEKEND', 'PREMIUM', 'SUITE'].includes(tariff)) {
      return res.status(400).json({
        error: 'Invalid tariff',
        message: 'Tariff must be one of: STANDARD, WEEKEND, PREMIUM, SUITE',
      });
    }

    // Vérifier que la propriété existe et est un hôtel
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { agent: true },
    });

    if (!property) {
      return res.status(404).json({
        error: 'Property not found',
      });
    }

    if (property.type !== 'HOTEL') {
      return res.status(400).json({
        error: 'Invalid property type',
        message: 'Reservations are only available for hotels',
      });
    }

    // Vérifier que la grille tarifaire existe
    const priceGrid = property.priceGrid as any;
    if (!priceGrid || typeof priceGrid !== 'object') {
      return res.status(400).json({
        error: 'Invalid property',
        message: 'This hotel does not have a price grid configured',
      });
    }

    // Obtenir le prix selon le tarif choisi
    let pricePerNight: number | null = null;
    switch (tariff) {
      case 'STANDARD':
        pricePerNight = priceGrid.standard || null;
        break;
      case 'WEEKEND':
        pricePerNight = priceGrid.weekend || null;
        break;
      case 'PREMIUM':
        pricePerNight = priceGrid.premium || null;
        break;
      case 'SUITE':
        pricePerNight = priceGrid.suite || null;
        break;
    }

    if (!pricePerNight) {
      return res.status(400).json({
        error: 'Invalid tariff',
        message: `The selected tariff (${tariff}) is not available for this hotel`,
      });
    }

    // Vérifier la disponibilité
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (checkOut <= checkIn) {
      return res.status(400).json({
        error: 'Invalid dates',
        message: 'Check-out date must be after check-in date',
      });
    }

    // Vérifier les chevauchements
    const overlappingReservations = await prisma.reservation.findMany({
      where: {
        propertyId,
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
        OR: [
          {
            checkInDate: {
              lte: checkOut,
            },
            checkOutDate: {
              gte: checkIn,
            },
          },
        ],
      },
    });

    if (overlappingReservations.length > 0) {
      return res.status(400).json({
        error: 'Property not available',
        message: 'The property is not available for the selected dates',
      });
    }

    // Calculer le nombre de nuits
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) {
      return res.status(400).json({
        error: 'Invalid dates',
        message: 'Check-out date must be after check-in date',
      });
    }

    // Calculer le prix total selon le tarif choisi
    // Pour les weekends, appliquer le tarif weekend pour les nuits qui sont vendredi/samedi
    let totalPrice = 0;
    
    if (tariff === 'WEEKEND') {
      // Appliquer le tarif weekend pour toutes les nuits
      totalPrice = pricePerNight * nights;
    } else if (tariff === 'STANDARD') {
      // Appliquer le tarif standard pour toutes les nuits
      totalPrice = pricePerNight * nights;
    } else {
      // Pour PREMIUM et SUITE, utiliser le prix fixe
      totalPrice = pricePerNight * nights;
    }

    // Créer la réservation
    const reservation = await prisma.reservation.create({
      data: {
        userId,
        propertyId,
        agentId: property.agentId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        nights,
        tariff: tariff as 'STANDARD' | 'WEEKEND' | 'PREMIUM' | 'SUITE',
        pricePerNight,
        guests: parseInt(guests),
        totalPrice,
        guestName,
        guestEmail,
        guestPhone,
        specialRequests: specialRequests || null,
        status: 'PENDING',
      } as any,
      include: {
        property: {
          include: {
            city: true,
            neighborhood: true,
            agent: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Reservation created successfully',
      reservation,
    });
  } catch (error) {
    console.error('Create reservation error:', error);
    res.status(500).json({
      error: 'Failed to create reservation',
      message: 'An error occurred while creating reservation',
    });
  }
});

// Mettre à jour le statut d'une réservation (pour les agents)
router.patch('/:id/status', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    if (!status || !['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Status must be one of: PENDING, CONFIRMED, CANCELLED, COMPLETED, REJECTED',
      });
    }

    // Vérifier que la réservation existe
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        property: {
          include: { agent: true },
        },
      },
    });

    if (!reservation) {
      return res.status(404).json({
        error: 'Reservation not found',
      });
    }

    // Vérifier que l'utilisateur est l'agent propriétaire ou le client
    const property = await prisma.property.findUnique({
      where: { id: reservation.propertyId },
      include: { agent: true },
    });
    const isAgent = property && property.agent.userId === userId;
    const isClient = reservation.userId === userId;

    if (!isAgent && !isClient) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You are not authorized to update this reservation',
      });
    }

    // Les clients peuvent annuler ou réactiver une réservation annulée
    if (isClient) {
      if (status === 'CANCELLED' && reservation.status !== 'CANCELLED') {
        // Client peut annuler
      } else if (status === 'PENDING' && reservation.status === 'CANCELLED') {
        // Client peut réactiver une réservation annulée
      } else if (status !== 'CANCELLED' && status !== 'PENDING') {
        return res.status(403).json({
          error: 'Unauthorized',
          message: 'Clients can only cancel or reactivate cancelled reservations',
        });
      }
    }

    // Si on confirme, vérifier qu'il n'y a pas de conflits
    if (status === 'CONFIRMED') {
      const overlappingReservations = await prisma.reservation.findMany({
        where: {
          propertyId: reservation.propertyId,
          id: { not: id },
          status: {
            in: ['PENDING', 'CONFIRMED'],
          },
          OR: [
            {
              checkInDate: {
                lte: reservation.checkOutDate,
              },
              checkOutDate: {
                gte: reservation.checkInDate,
              },
            },
          ],
        },
      });

      if (overlappingReservations.length > 0) {
        return res.status(400).json({
          error: 'Conflict',
          message: 'Cannot confirm: overlapping reservations exist',
        });
      }
    }

    // Mettre à jour le statut
    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: { status: status as ReservationStatus },
      include: {
        property: {
          include: {
            city: true,
            neighborhood: true,
            agent: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    res.json({
      message: 'Reservation status updated successfully',
      reservation: updatedReservation,
    });
  } catch (error) {
    console.error('Update reservation status error:', error);
    res.status(500).json({
      error: 'Failed to update reservation',
      message: 'An error occurred while updating reservation',
    });
  }
});

// Mettre à jour les détails d'une réservation (pour les locataires)
router.put('/:id', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const {
      checkInDate,
      checkOutDate,
      tariff,
      guests,
      guestName,
      guestEmail,
      guestPhone,
      specialRequests,
    } = req.body;

    // Vérifier que la réservation existe
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        property: {
          include: { agent: true },
        },
      },
    });

    if (!reservation) {
      return res.status(404).json({
        error: 'Reservation not found',
        message: 'The specified reservation does not exist',
      });
    }

    // Vérifier que l'utilisateur est le client propriétaire de la réservation
    if (reservation.userId !== userId) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You are not authorized to update this reservation',
      });
    }

    // Seules les réservations PENDING ou CANCELLED peuvent être modifiées
    if (reservation.status !== 'PENDING' && reservation.status !== 'CANCELLED') {
      return res.status(400).json({
        error: 'Cannot modify reservation',
        message: 'Only pending or cancelled reservations can be modified',
      });
    }

    // Vérifier que la propriété existe et est un hôtel
    const property = await prisma.property.findUnique({
      where: { id: reservation.propertyId },
      include: { agent: true },
    });

    if (!property || property.type !== 'HOTEL') {
      return res.status(400).json({
        error: 'Invalid property',
        message: 'Reservation property is not a hotel',
      });
    }

    // Vérifier la grille tarifaire
    const priceGrid = property.priceGrid as any;
    if (!priceGrid || typeof priceGrid !== 'object') {
      return res.status(400).json({
        error: 'Invalid property',
        message: 'This hotel does not have a price grid configured',
      });
    }

    // Utiliser les nouvelles valeurs ou garder les anciennes
    const reservationData = reservation as any;
    const newCheckInDate = checkInDate ? new Date(checkInDate) : reservation.checkInDate;
    const newCheckOutDate = checkOutDate ? new Date(checkOutDate) : reservation.checkOutDate;
    const newTariff = tariff || reservationData.tariff;
    const newGuests = guests ? parseInt(guests) : reservation.guests;

    // Valider les dates
    if (newCheckOutDate <= newCheckInDate) {
      return res.status(400).json({
        error: 'Invalid dates',
        message: 'Check-out date must be after check-in date',
      });
    }

    // Valider le tarif
    if (tariff && !['STANDARD', 'WEEKEND', 'PREMIUM', 'SUITE'].includes(tariff)) {
      return res.status(400).json({
        error: 'Invalid tariff',
        message: 'Tariff must be one of: STANDARD, WEEKEND, PREMIUM, SUITE',
      });
    }

    // Obtenir le prix selon le tarif choisi
    let pricePerNight: number | null = null;
    switch (newTariff) {
      case 'STANDARD':
        pricePerNight = priceGrid.standard || null;
        break;
      case 'WEEKEND':
        pricePerNight = priceGrid.weekend || null;
        break;
      case 'PREMIUM':
        pricePerNight = priceGrid.premium || null;
        break;
      case 'SUITE':
        pricePerNight = priceGrid.suite || null;
        break;
    }

    if (!pricePerNight) {
      return res.status(400).json({
        error: 'Invalid tariff',
        message: `The selected tariff (${newTariff}) is not available for this hotel`,
      });
    }

    // Vérifier les chevauchements (exclure la réservation actuelle)
    const overlappingReservations = await prisma.reservation.findMany({
      where: {
        propertyId: reservation.propertyId,
        id: { not: id },
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
        OR: [
          {
            checkInDate: {
              lte: newCheckOutDate,
            },
            checkOutDate: {
              gte: newCheckInDate,
            },
          },
        ],
      },
    });

    if (overlappingReservations.length > 0) {
      return res.status(400).json({
        error: 'Property not available',
        message: 'The property is not available for the selected dates',
      });
    }

    // Calculer le nombre de nuits et le prix total
    const nights = Math.ceil((newCheckOutDate.getTime() - newCheckInDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = pricePerNight * nights;

    // Préparer les données de mise à jour
    const updateData: any = {
      checkInDate: newCheckInDate,
      checkOutDate: newCheckOutDate,
      nights,
      tariff: newTariff as 'STANDARD' | 'WEEKEND' | 'PREMIUM' | 'SUITE',
      pricePerNight,
      guests: newGuests,
      totalPrice,
    };

    // Si la réservation était annulée, la remettre en PENDING
    if (reservation.status === 'CANCELLED') {
      updateData.status = 'PENDING';
    }

    // Mettre à jour les informations client si fournies
    if (guestName) updateData.guestName = guestName;
    if (guestEmail) updateData.guestEmail = guestEmail;
    if (guestPhone) updateData.guestPhone = guestPhone;
    if (specialRequests !== undefined) updateData.specialRequests = specialRequests || null;

    // Mettre à jour la réservation
    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: updateData as any,
      include: {
        property: {
          include: {
            city: true,
            neighborhood: true,
            agent: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    res.json({
      message: 'Reservation updated successfully',
      reservation: updatedReservation,
    });
  } catch (error) {
    console.error('Update reservation error:', error);
    res.status(500).json({
      error: 'Failed to update reservation',
      message: 'An error occurred while updating reservation',
    });
  }
});

// Obtenir une réservation spécifique
router.get('/:id', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        property: {
          include: {
            city: true,
            neighborhood: true,
            agent: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!reservation) {
      return res.status(404).json({
        error: 'Reservation not found',
      });
    }

    // Vérifier que l'utilisateur est autorisé à voir cette réservation
    const property = await prisma.property.findUnique({
      where: { id: reservation.propertyId },
      include: { agent: true },
    });

    if (
      reservation.userId !== userId &&
      property &&
      property.agent.userId !== userId
    ) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You are not authorized to view this reservation',
      });
    }

    res.json({
      message: 'Reservation retrieved successfully',
      reservation,
    });
  } catch (error) {
    console.error('Get reservation error:', error);
    res.status(500).json({
      error: 'Failed to retrieve reservation',
      message: 'An error occurred while retrieving reservation',
    });
  }
});

export default router;

