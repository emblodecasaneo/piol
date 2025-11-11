"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/documents', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userType = req.user.userType;
        if (userType !== 'AGENT') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only agents can access their documents'
            });
        }
        const agent = await index_1.prisma.agent.findUnique({
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
    }
    catch (error) {
        console.error('Get agent documents error:', error);
        res.status(500).json({
            error: 'Failed to get documents',
            message: 'An error occurred while retrieving documents'
        });
    }
});
router.get('/pending-verification', auth_1.authenticateToken, async (req, res) => {
    try {
        const agents = await index_1.prisma.agent.findMany({
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
    }
    catch (error) {
        console.error('Get pending agents error:', error);
        res.status(500).json({
            error: 'Failed to get pending agents',
            message: 'An error occurred while retrieving pending agents'
        });
    }
});
router.get('/', async (req, res) => {
    try {
        const { page = '1', limit = '10', verified, city } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (verified !== undefined) {
            where.isVerified = verified === 'true';
        }
        const agents = await index_1.prisma.agent.findMany({
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
        const total = await index_1.prisma.agent.count({ where });
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
    }
    catch (error) {
        console.error('Get agents error:', error);
        res.status(500).json({
            error: 'Failed to get agents',
            message: 'An error occurred while retrieving agents'
        });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const agent = await index_1.prisma.agent.findUnique({
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
    }
    catch (error) {
        console.error('Get agent error:', error);
        res.status(500).json({
            error: 'Failed to get agent',
            message: 'An error occurred while retrieving agent'
        });
    }
});
router.put('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userType = req.user.userType;
        if (userType !== 'AGENT') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only agents can update agent profile'
            });
        }
        const agent = await index_1.prisma.agent.findUnique({
            where: { userId }
        });
        if (!agent) {
            return res.status(404).json({
                error: 'Agent not found',
                message: 'Agent profile not found'
            });
        }
        const { businessName, license, idCardNumber, idCardPhoto, profilePhoto } = req.body;
        const updatedAgent = await index_1.prisma.agent.update({
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
    }
    catch (error) {
        console.error('Update agent profile error:', error);
        res.status(500).json({
            error: 'Failed to update agent profile',
            message: 'An error occurred while updating agent profile'
        });
    }
});
router.get('/:id/properties', async (req, res) => {
    try {
        const { id } = req.params;
        const { page = '1', limit = '10', status } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = { agentId: id };
        if (status) {
            where.status = status;
        }
        const [properties, total] = await Promise.all([
            index_1.prisma.property.findMany({
                where,
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: limitNum
            }),
            index_1.prisma.property.count({ where })
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
    }
    catch (error) {
        console.error('Get agent properties error:', error);
        res.status(500).json({
            error: 'Failed to get agent properties',
            message: 'An error occurred while retrieving agent properties'
        });
    }
});
router.get('/:id/reviews', async (req, res) => {
    try {
        const { id } = req.params;
        const { page = '1', limit = '10' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const [reviews, total] = await Promise.all([
            index_1.prisma.review.findMany({
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
            index_1.prisma.review.count({ where: { agentId: id } })
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
    }
    catch (error) {
        console.error('Get agent reviews error:', error);
        res.status(500).json({
            error: 'Failed to get agent reviews',
            message: 'An error occurred while retrieving agent reviews'
        });
    }
});
router.post('/documents/upload', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userType = req.user.userType;
        if (userType !== 'AGENT') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only agents can upload documents'
            });
        }
        const agent = await index_1.prisma.agent.findUnique({
            where: { userId }
        });
        if (!agent) {
            return res.status(404).json({
                error: 'Agent not found',
                message: 'Agent profile not found'
            });
        }
        const { documentType, documentUrl } = req.body;
        if (!documentType || !documentUrl) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Document type and URL are required'
            });
        }
        const documentFieldMap = {
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
        const currentStatus = (agent.documentsStatus) || {};
        const updatedStatus = {
            ...currentStatus,
            [documentType]: 'uploaded'
        };
        const updatedAgent = await index_1.prisma.agent.update({
            where: { userId },
            data: {
                [fieldName]: documentUrl,
                documentsStatus: updatedStatus,
                verificationStatus: 'PENDING',
                isVerified: false
            }
        });
        res.json({
            message: 'Document uploaded successfully',
            agent: updatedAgent
        });
    }
    catch (error) {
        console.error('Upload document error:', error);
        res.status(500).json({
            error: 'Failed to upload document',
            message: 'An error occurred while uploading the document'
        });
    }
});
router.post('/:agentId/documents', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { agentId } = req.params;
        const { documentField, documentUrl } = req.body;
        if (!documentField || !documentUrl) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Document field and URL are required'
            });
        }
        const agent = await index_1.prisma.agent.findUnique({
            where: { id: agentId }
        });
        if (!agent) {
            return res.status(404).json({
                error: 'Agent not found',
                message: 'Agent not found'
            });
        }
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
        const currentStatus = (agent.documentsStatus) || {};
        const fieldToDocumentType = {
            idCardPhoto: 'cni',
            businessLicense: 'businessLicense',
            locationPlan: 'locationPlan',
            proofOfAddress: 'proofOfAddress',
            businessCertificate: 'businessCertificate',
            profilePhoto: 'profilePhoto'
        };
        const documentType = fieldToDocumentType[documentField] || documentField;
        const updatedStatus = {
            ...currentStatus,
            [documentType]: 'pending'
        };
        const updatedAgent = await index_1.prisma.agent.update({
            where: { id: agentId },
            data: {
                [documentField]: documentUrl,
                documentsStatus: updatedStatus,
                verificationStatus: 'PENDING',
                isVerified: false
            }
        });
        res.json({
            message: 'Document added successfully',
            agent: updatedAgent
        });
    }
    catch (error) {
        console.error('Add document error:', error);
        res.status(500).json({
            error: 'Failed to add document',
            message: 'An error occurred while adding the document'
        });
    }
});
router.post('/verify/:agentId', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { agentId } = req.params;
        const { action, rejectionReason, documentsStatus } = req.body;
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
        const agent = await index_1.prisma.agent.findUnique({
            where: { id: agentId }
        });
        if (!agent) {
            return res.status(404).json({
                error: 'Agent not found',
                message: 'The specified agent does not exist'
            });
        }
        const updateData = {
            verificationStatus: action === 'approve' ? 'APPROVED' : 'REJECTED',
            isVerified: action === 'approve'
        };
        if (action === 'reject') {
            updateData.rejectionReason = rejectionReason;
        }
        else {
            updateData.rejectionReason = null;
        }
        if (documentsStatus) {
            updateData.documentsStatus = documentsStatus;
        }
        const updatedAgent = await index_1.prisma.agent.update({
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
    }
    catch (error) {
        console.error('Verify agent error:', error);
        res.status(500).json({
            error: 'Failed to verify agent',
            message: 'An error occurred while verifying the agent'
        });
    }
});
router.put('/:agentId/document-status', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
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
        const agent = await index_1.prisma.agent.findUnique({
            where: { id: agentId }
        });
        if (!agent) {
            return res.status(404).json({
                error: 'Agent not found',
                message: 'The specified agent does not exist'
            });
        }
        const currentStatus = (agent.documentsStatus) || {};
        const updatedStatus = {
            ...currentStatus,
            [documentField]: status
        };
        const updatedAgent = await index_1.prisma.agent.update({
            where: { id: agentId },
            data: {
                documentsStatus: updatedStatus
            },
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
    }
    catch (error) {
        console.error('Update document status error:', error);
        res.status(500).json({
            error: 'Failed to update document status',
            message: 'An error occurred while updating the document status'
        });
    }
});
router.delete('/documents/:documentType', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userType = req.user.userType;
        const { documentType } = req.params;
        if (userType !== 'AGENT') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only agents can delete documents'
            });
        }
        const agent = await index_1.prisma.agent.findUnique({
            where: { userId }
        });
        if (!agent) {
            return res.status(404).json({
                error: 'Agent not found',
                message: 'Agent profile not found'
            });
        }
        const documentFieldMap = {
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
        const currentStatus = (agent.documentsStatus) || {};
        const updatedStatus = {
            ...currentStatus,
            [documentType]: 'pending'
        };
        const updatedAgent = await index_1.prisma.agent.update({
            where: { userId },
            data: {
                [fieldName]: null,
                documentsStatus: updatedStatus
            }
        });
        res.json({
            message: 'Document deleted successfully',
            agent: updatedAgent
        });
    }
    catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({
            error: 'Failed to delete document',
            message: 'An error occurred while deleting the document'
        });
    }
});
router.post('/', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { email, phone, password, firstName, lastName, businessName, license, idCardNumber, idCardPhoto, profilePhoto, businessLicense, locationPlan, proofOfAddress, businessCertificate } = req.body;
        if (!email || !phone || !password || !firstName || !lastName || !businessName || !idCardNumber) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Email, phone, password, firstName, lastName, businessName, and idCardNumber are required'
            });
        }
        const existingUser = await index_1.prisma.user.findFirst({
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
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await index_1.prisma.user.create({
            data: {
                email,
                phone,
                password: hashedPassword,
                firstName,
                lastName,
                userType: 'AGENT'
            }
        });
        const agent = await index_1.prisma.agent.create({
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
    }
    catch (error) {
        console.error('Create agent error:', error);
        res.status(500).json({
            error: 'Failed to create agent',
            message: 'An error occurred while creating agent'
        });
    }
});
router.put('/:id', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { email, phone, firstName, lastName, businessName, license, idCardNumber, idCardPhoto, profilePhoto, businessLicense, locationPlan, proofOfAddress, businessCertificate, verificationStatus, isVerified } = req.body;
        const agent = await index_1.prisma.agent.findUnique({
            where: { id },
            include: { user: true }
        });
        if (!agent) {
            return res.status(404).json({
                error: 'Agent not found',
                message: 'The specified agent does not exist'
            });
        }
        const userUpdateData = {};
        if (email)
            userUpdateData.email = email;
        if (phone)
            userUpdateData.phone = phone;
        if (firstName)
            userUpdateData.firstName = firstName;
        if (lastName)
            userUpdateData.lastName = lastName;
        if (Object.keys(userUpdateData).length > 0) {
            await index_1.prisma.user.update({
                where: { id: agent.userId },
                data: userUpdateData
            });
        }
        const agentUpdateData = {};
        if (businessName)
            agentUpdateData.businessName = businessName;
        if (license !== undefined)
            agentUpdateData.license = license;
        if (idCardNumber)
            agentUpdateData.idCardNumber = idCardNumber;
        if (idCardPhoto !== undefined)
            agentUpdateData.idCardPhoto = idCardPhoto;
        if (profilePhoto !== undefined)
            agentUpdateData.profilePhoto = profilePhoto;
        if (businessLicense !== undefined)
            agentUpdateData.businessLicense = businessLicense;
        if (locationPlan !== undefined)
            agentUpdateData.locationPlan = locationPlan;
        if (proofOfAddress !== undefined)
            agentUpdateData.proofOfAddress = proofOfAddress;
        if (businessCertificate !== undefined)
            agentUpdateData.businessCertificate = businessCertificate;
        if (verificationStatus)
            agentUpdateData.verificationStatus = verificationStatus;
        if (isVerified !== undefined)
            agentUpdateData.isVerified = isVerified;
        const updatedAgent = await index_1.prisma.agent.update({
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
    }
    catch (error) {
        console.error('Update agent error:', error);
        res.status(500).json({
            error: 'Failed to update agent',
            message: 'An error occurred while updating agent'
        });
    }
});
exports.default = router;
//# sourceMappingURL=agents.js.map