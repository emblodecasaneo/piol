"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.use(auth_1.requireAdmin);
router.get('/', async (req, res) => {
    try {
        const admins = await index_1.prisma.user.findMany({
            where: {
                userType: client_1.UserType.ADMIN
            },
            select: {
                id: true,
                email: true,
                phone: true,
                firstName: true,
                lastName: true,
                avatar: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            message: 'Admins retrieved successfully',
            admins
        });
    }
    catch (error) {
        console.error('Get admins error:', error);
        res.status(500).json({
            error: 'Failed to get admins',
            message: 'An error occurred while retrieving admins'
        });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const admin = await index_1.prisma.user.findFirst({
            where: {
                id,
                userType: client_1.UserType.ADMIN
            },
            select: {
                id: true,
                email: true,
                phone: true,
                firstName: true,
                lastName: true,
                avatar: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!admin) {
            return res.status(404).json({
                error: 'Admin not found',
                message: 'The specified admin does not exist'
            });
        }
        res.json({
            message: 'Admin retrieved successfully',
            admin
        });
    }
    catch (error) {
        console.error('Get admin error:', error);
        res.status(500).json({
            error: 'Failed to get admin',
            message: 'An error occurred while retrieving admin'
        });
    }
});
router.post('/', async (req, res) => {
    try {
        const { email, phone, password, firstName, lastName } = req.body;
        if (!email || !phone || !password || !firstName || !lastName) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Email, phone, password, firstName, and lastName are required'
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
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const admin = await index_1.prisma.user.create({
            data: {
                email,
                phone,
                password: hashedPassword,
                firstName,
                lastName,
                userType: client_1.UserType.ADMIN
            },
            select: {
                id: true,
                email: true,
                phone: true,
                firstName: true,
                lastName: true,
                avatar: true,
                createdAt: true,
                updatedAt: true
            }
        });
        res.status(201).json({
            message: 'Admin created successfully',
            admin
        });
    }
    catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({
            error: 'Failed to create admin',
            message: 'An error occurred while creating admin'
        });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { email, phone, firstName, lastName, avatar, password } = req.body;
        const existingAdmin = await index_1.prisma.user.findFirst({
            where: {
                id,
                userType: client_1.UserType.ADMIN
            }
        });
        if (!existingAdmin) {
            return res.status(404).json({
                error: 'Admin not found',
                message: 'The specified admin does not exist'
            });
        }
        if (email || phone) {
            const conflictingUser = await index_1.prisma.user.findFirst({
                where: {
                    AND: [
                        { id: { not: id } },
                        {
                            OR: [
                                ...(email ? [{ email }] : []),
                                ...(phone ? [{ phone }] : [])
                            ]
                        }
                    ]
                }
            });
            if (conflictingUser) {
                return res.status(409).json({
                    error: 'Conflict',
                    message: 'Email or phone number already in use by another user'
                });
            }
        }
        const updateData = {};
        if (email)
            updateData.email = email;
        if (phone)
            updateData.phone = phone;
        if (firstName)
            updateData.firstName = firstName;
        if (lastName)
            updateData.lastName = lastName;
        if (avatar !== undefined)
            updateData.avatar = avatar;
        if (password) {
            updateData.password = await bcryptjs_1.default.hash(password, 12);
        }
        const updatedAdmin = await index_1.prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                phone: true,
                firstName: true,
                lastName: true,
                avatar: true,
                createdAt: true,
                updatedAt: true
            }
        });
        res.json({
            message: 'Admin updated successfully',
            admin: updatedAdmin
        });
    }
    catch (error) {
        console.error('Update admin error:', error);
        res.status(500).json({
            error: 'Failed to update admin',
            message: 'An error occurred while updating admin'
        });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user.userId;
        if (id === currentUserId) {
            return res.status(400).json({
                error: 'Cannot delete yourself',
                message: 'You cannot delete your own admin account'
            });
        }
        const existingAdmin = await index_1.prisma.user.findFirst({
            where: {
                id,
                userType: client_1.UserType.ADMIN
            }
        });
        if (!existingAdmin) {
            return res.status(404).json({
                error: 'Admin not found',
                message: 'The specified admin does not exist'
            });
        }
        await index_1.prisma.user.delete({
            where: { id }
        });
        res.json({
            message: 'Admin deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete admin error:', error);
        res.status(500).json({
            error: 'Failed to delete admin',
            message: 'An error occurred while deleting admin'
        });
    }
});
exports.default = router;
//# sourceMappingURL=admins.js.map