import express from 'express';
import { prisma } from '../index';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Routes spécifiques (doivent être AVANT les routes avec paramètres dynamiques)

// Obtenir les documents d'un agent (agent connecté)
router.get('/documents', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userType = (req as any).user.userType;

    if (userType !== 'AGENT') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only agents can access their documents'
      });
    }

    const agent = await prisma.agent.findUnique({
      where: { userId }
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        message: 'Agent profile not found'
      });
    }

    res.json({
      message: 'Documents retrieved successfully',
      documents: agent
    });

  } catch (error) {
    console.error('Get agent documents error:', error);
    res.status(500).json({
      error: 'Failed to get documents',
      message: 'An error occurred while retrieving documents'
    });
  }
});

// [ADMIN] Lister les agents en attente de vérification
router.get('/pending-verification', authenticateToken, async (req, res) => {
  try {
    const agents = await prisma.agent.findMany({
      where: {
        verificationStatus: 'PENDING'
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      message: 'Pending agents retrieved successfully',
      agents,
      total: agents.length
    });

  } catch (error) {
    console.error('Get pending agents error:', error);
    res.status(500).json({
      error: 'Failed to get pending agents',
      message: 'An error occurred while retrieving pending agents'
    });
  }
});

// Obtenir tous les agents
router.get('/', async (req, res) => {
  try {
    const { page = '1', limit = '10', verified, city } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (verified !== undefined) {
      where.isVerified = verified === 'true';
    }

    const agents = await prisma.agent.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            email: true
          }
        },
        properties: {
          where: {
            status: 'ACTIVE'
          },
          select: {
            id: true,
            city: true
          }
        },
        _count: {
          select: {
            properties: true,
            reviews: true
          }
        }
      },
      orderBy: [
        { isVerified: 'desc' },
        { rating: 'desc' },
        { createdAt: 'desc' }
      ],
      skip,
      take: limitNum
    });

    const total = await prisma.agent.count({ where });

    res.json({
      message: 'Agents retrieved successfully',
      agents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({
      error: 'Failed to get agents',
      message: 'An error occurred while retrieving agents'
    });
  }
});

// Obtenir un agent par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            email: true
          }
        },
        properties: {
          where: {
            status: 'ACTIVE'
          },
          orderBy: {
            createdAt: 'desc'
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
        },
        _count: {
          select: {
            properties: true,
            reviews: true
          }
        }
      }
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        message: 'The specified agent does not exist'
      });
    }

    res.json({
      message: 'Agent retrieved successfully',
      agent
    });

  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({
      error: 'Failed to get agent',
      message: 'An error occurred while retrieving agent'
    });
  }
});

// Mettre à jour le profil agent
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userType = (req as any).user.userType;

    if (userType !== 'AGENT') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only agents can update agent profile'
      });
    }

    const agent = await prisma.agent.findUnique({
      where: { userId }
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        message: 'Agent profile not found'
      });
    }

    const {
      businessName,
      license,
      idCardNumber,
      idCardPhoto,
      profilePhoto
    } = req.body;

    const updatedAgent = await prisma.agent.update({
      where: { userId },
      data: {
        ...(businessName && { businessName }),
        ...(license && { license }),
        ...(idCardNumber && { idCardNumber }),
        ...(idCardPhoto && { idCardPhoto }),
        ...(profilePhoto && { profilePhoto })
      },
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
    });

    res.json({
      message: 'Agent profile updated successfully',
      agent: updatedAgent
    });

  } catch (error) {
    console.error('Update agent profile error:', error);
    res.status(500).json({
      error: 'Failed to update agent profile',
      message: 'An error occurred while updating agent profile'
    });
  }
});

// Obtenir les propriétés d'un agent
router.get('/:id/properties', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '10', status } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { agentId: id };

    if (status) {
      where.status = status;
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.property.count({ where })
    ]);

    res.json({
      message: 'Agent properties retrieved successfully',
      properties,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get agent properties error:', error);
    res.status(500).json({
      error: 'Failed to get agent properties',
      message: 'An error occurred while retrieving agent properties'
    });
  }
});

// Obtenir les avis d'un agent
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { agentId: id },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          property: {
            select: {
              title: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.review.count({ where: { agentId: id } })
    ]);

    res.json({
      message: 'Agent reviews retrieved successfully',
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get agent reviews error:', error);
    res.status(500).json({
      error: 'Failed to get agent reviews',
      message: 'An error occurred while retrieving agent reviews'
    });
  }
});

// Uploader ou mettre à jour un document (agent connecté)
router.post('/documents/upload', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userType = (req as any).user.userType;

    if (userType !== 'AGENT') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only agents can upload documents'
      });
    }

    const agent = await prisma.agent.findUnique({
      where: { userId }
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        message: 'Agent profile not found'
      });
    }

    const {
      documentType, // 'cni', 'businessLicense', 'locationPlan', 'proofOfAddress', 'businessCertificate'
      documentUrl
    } = req.body;

    if (!documentType || !documentUrl) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Document type and URL are required'
      });
    }

    // Map des types de documents aux champs de la base de données
    const documentFieldMap: { [key: string]: string } = {
      cni: 'idCardPhoto',
      businessLicense: 'businessLicense',
      locationPlan: 'locationPlan',
      proofOfAddress: 'proofOfAddress',
      businessCertificate: 'businessCertificate',
      profilePhoto: 'profilePhoto'
    };

    const fieldName = documentFieldMap[documentType];
    if (!fieldName) {
      return res.status(400).json({
        error: 'Invalid document type',
        message: 'The specified document type is not valid'
      });
    }

    // Récupérer le statut actuel des documents
    const currentStatus = ((agent as any).documentsStatus) || {};
    
    // Mettre à jour le statut du document à 'uploaded'
    const updatedStatus = {
      ...currentStatus,
      [documentType]: 'uploaded'
    };

    // Mettre à jour l'agent avec le nouveau document
    const updatedAgent = await prisma.agent.update({
      where: { userId },
      data: {
        [fieldName]: documentUrl,
        documentsStatus: updatedStatus,
        // Si un document est uploadé, remettre en PENDING pour re-vérification
        verificationStatus: 'PENDING',
        isVerified: false
      } as any
    });

    res.json({
      message: 'Document uploaded successfully',
      agent: updatedAgent
    });

  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({
      error: 'Failed to upload document',
      message: 'An error occurred while uploading the document'
    });
  }
});

// [ADMIN] Ajouter un document à un agent
router.post('/:agentId/documents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { documentField, documentUrl } = req.body;

    if (!documentField || !documentUrl) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Document field and URL are required'
      });
    }

    // Vérifier que l'agent existe
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        message: 'Agent not found'
      });
    }

    // Vérifier que le champ de document est valide
    const validFields = [
      'idCardPhoto',
      'businessLicense',
      'locationPlan',
      'proofOfAddress',
      'businessCertificate',
      'profilePhoto'
    ];

    if (!validFields.includes(documentField)) {
      return res.status(400).json({
        error: 'Invalid document field',
        message: `Document field must be one of: ${validFields.join(', ')}`
      });
    }

    // Récupérer le statut actuel des documents
    const currentStatus = ((agent as any).documentsStatus) || {};
    
    // Mapper le nom du champ au type de document pour le statut
    const fieldToDocumentType: { [key: string]: string } = {
      idCardPhoto: 'cni',
      businessLicense: 'businessLicense',
      locationPlan: 'locationPlan',
      proofOfAddress: 'proofOfAddress',
      businessCertificate: 'businessCertificate',
      profilePhoto: 'profilePhoto'
    };

    const documentType = fieldToDocumentType[documentField] || documentField;
    
    // Mettre à jour le statut du document à 'pending'
    const updatedStatus = {
      ...currentStatus,
      [documentType]: 'pending'
    };

    // Mettre à jour l'agent avec le nouveau document
    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        [documentField]: documentUrl,
        documentsStatus: updatedStatus,
        // Remettre en PENDING pour re-vérification si nécessaire
        verificationStatus: 'PENDING',
        isVerified: false
      } as any
    });

    res.json({
      message: 'Document added successfully',
      agent: updatedAgent
    });

  } catch (error) {
    console.error('Add document error:', error);
    res.status(500).json({
      error: 'Failed to add document',
      message: 'An error occurred while adding the document'
    });
  }
});

// [ADMIN] Approuver ou rejeter la vérification d'un agent
router.post('/verify/:agentId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { action, rejectionReason, documentsStatus } = req.body; // action: 'approve' ou 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action',
        message: 'Action must be either "approve" or "reject"'
      });
    }

    if (action === 'reject' && !rejectionReason) {
      return res.status(400).json({
        error: 'Missing rejection reason',
        message: 'A reason is required when rejecting verification'
      });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        message: 'The specified agent does not exist'
      });
    }

    const updateData: any = {
      verificationStatus: action === 'approve' ? 'APPROVED' : 'REJECTED',
      isVerified: action === 'approve'
    };

    if (action === 'reject') {
      updateData.rejectionReason = rejectionReason;
    } else {
      updateData.rejectionReason = null;
    }

    if (documentsStatus) {
      updateData.documentsStatus = documentsStatus;
    }

    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: updateData,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    res.json({
      message: `Agent ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      agent: updatedAgent
    });

  } catch (error) {
    console.error('Verify agent error:', error);
    res.status(500).json({
      error: 'Failed to verify agent',
      message: 'An error occurred while verifying the agent'
    });
  }
});

// [ADMIN] Mettre à jour le statut d'un document spécifique
router.put('/:agentId/document-status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { documentField, status } = req.body;

    if (!documentField || !status) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'documentField and status are required'
      });
    }

    if (!['verified', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Status must be verified, rejected, or pending'
      });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        message: 'The specified agent does not exist'
      });
    }

    // Récupérer le statut actuel des documents
    const currentStatus = ((agent as any).documentsStatus) || {};
    
    // Mettre à jour le statut du document spécifique
    const updatedStatus = {
      ...currentStatus,
      [documentField]: status
    };

    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        documentsStatus: updatedStatus
      } as any,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    res.json({
      message: 'Document status updated successfully',
      agent: updatedAgent
    });

  } catch (error) {
    console.error('Update document status error:', error);
    res.status(500).json({
      error: 'Failed to update document status',
      message: 'An error occurred while updating the document status'
    });
  }
});

// Supprimer un document spécifique
router.delete('/documents/:documentType', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userType = (req as any).user.userType;
    const { documentType } = req.params;

    if (userType !== 'AGENT') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only agents can delete documents'
      });
    }

    const agent = await prisma.agent.findUnique({
      where: { userId }
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        message: 'Agent profile not found'
      });
    }

    // Map des types de documents
    const documentFieldMap: { [key: string]: string } = {
      cni: 'idCardPhoto',
      businessLicense: 'businessLicense',
      locationPlan: 'locationPlan',
      proofOfAddress: 'proofOfAddress',
      businessCertificate: 'businessCertificate',
      profilePhoto: 'profilePhoto'
    };

    const fieldName = documentFieldMap[documentType];
    if (!fieldName) {
      return res.status(400).json({
        error: 'Invalid document type',
        message: 'The specified document type is not valid'
      });
    }

    // Récupérer le statut actuel des documents
    const currentStatus = ((agent as any).documentsStatus) || {};
    
    // Mettre à jour le statut du document à 'pending'
    const updatedStatus = {
      ...currentStatus,
      [documentType]: 'pending'
    };

    const updatedAgent = await prisma.agent.update({
      where: { userId },
      data: {
        [fieldName]: null,
        documentsStatus: updatedStatus
      } as any
    });

    res.json({
      message: 'Document deleted successfully',
      agent: updatedAgent
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      error: 'Failed to delete document',
      message: 'An error occurred while deleting the document'
    });
  }
});

// [ADMIN] Créer un agent
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      email,
      phone,
      password,
      firstName,
      lastName,
      businessName,
      license,
      idCardNumber,
      idCardPhoto,
      profilePhoto,
      businessLicense,
      locationPlan,
      proofOfAddress,
      businessCertificate
    } = req.body;

    // Validation des champs requis
    if (!email || !phone || !password || !firstName || !lastName || !businessName || !idCardNumber) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email, phone, password, firstName, lastName, businessName, and idCardNumber are required'
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'A user with this email or phone number already exists'
      });
    }

    // Hasher le mot de passe
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        firstName,
        lastName,
        userType: 'AGENT'
      }
    });

    // Créer le profil agent
    const agent = await prisma.agent.create({
      data: {
        userId: user.id,
        businessName,
        license: license || null,
        idCardNumber,
        idCardPhoto: idCardPhoto || null,
        profilePhoto: profilePhoto || null,
        businessLicense: businessLicense || null,
        locationPlan: locationPlan || null,
        proofOfAddress: proofOfAddress || null,
        businessCertificate: businessCertificate || null
      },
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
    });

    res.status(201).json({
      message: 'Agent created successfully',
      agent
    });

  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({
      error: 'Failed to create agent',
      message: 'An error occurred while creating agent'
    });
  }
});

// [ADMIN] Mettre à jour un agent
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      email,
      phone,
      firstName,
      lastName,
      businessName,
      license,
      idCardNumber,
      idCardPhoto,
      profilePhoto,
      businessLicense,
      locationPlan,
      proofOfAddress,
      businessCertificate,
      verificationStatus,
      isVerified
    } = req.body;

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
        message: 'The specified agent does not exist'
      });
    }

    // Mettre à jour l'utilisateur si nécessaire
    const userUpdateData: any = {};
    if (email) userUpdateData.email = email;
    if (phone) userUpdateData.phone = phone;
    if (firstName) userUpdateData.firstName = firstName;
    if (lastName) userUpdateData.lastName = lastName;

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: agent.userId },
        data: userUpdateData
      });
    }

    // Mettre à jour l'agent
    const agentUpdateData: any = {};
    if (businessName) agentUpdateData.businessName = businessName;
    if (license !== undefined) agentUpdateData.license = license;
    if (idCardNumber) agentUpdateData.idCardNumber = idCardNumber;
    if (idCardPhoto !== undefined) agentUpdateData.idCardPhoto = idCardPhoto;
    if (profilePhoto !== undefined) agentUpdateData.profilePhoto = profilePhoto;
    if (businessLicense !== undefined) agentUpdateData.businessLicense = businessLicense;
    if (locationPlan !== undefined) agentUpdateData.locationPlan = locationPlan;
    if (proofOfAddress !== undefined) agentUpdateData.proofOfAddress = proofOfAddress;
    if (businessCertificate !== undefined) agentUpdateData.businessCertificate = businessCertificate;
    if (verificationStatus) agentUpdateData.verificationStatus = verificationStatus;
    if (isVerified !== undefined) agentUpdateData.isVerified = isVerified;

    const updatedAgent = await prisma.agent.update({
      where: { id },
      data: agentUpdateData,
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
    });

    res.json({
      message: 'Agent updated successfully',
      agent: updatedAgent
    });

  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({
      error: 'Failed to update agent',
      message: 'An error occurred while updating agent'
    });
  }
});

export default router;
