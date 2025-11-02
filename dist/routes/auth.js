"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const router = express_1.default.Router();
router.post('/register', async (req, res) => {
    try {
        const { email, phone, password, firstName, lastName, userType, businessName, license, idCardNumber } = req.body;
        if (!email || !phone || !password || !firstName || !lastName || !userType) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Email, phone, password, firstName, lastName, and userType are required'
            });
        }
        if (userType === 'AGENT' && (!businessName || !idCardNumber)) {
            return res.status(400).json({
                error: 'Missing agent fields',
                message: 'Business name and ID card number are required for agents'
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
        const user = await index_1.prisma.user.create({
            data: {
                email,
                phone,
                password: hashedPassword,
                firstName,
                lastName,
                userType
            }
        });
        if (userType === 'AGENT') {
            await index_1.prisma.agent.create({
                data: {
                    userId: user.id,
                    businessName: businessName,
                    license,
                    idCardNumber: idCardNumber,
                    idCardPhoto: '',
                    profilePhoto: ''
                }
            });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, userType: user.userType }, process.env.JWT_SECRET || 'fallback-secret');
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json({
            message: 'User registered successfully',
            user: userWithoutPassword,
            token
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Registration failed',
            message: 'An error occurred during registration'
        });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                error: 'Missing credentials',
                message: 'Email and password are required'
            });
        }
        const user = await index_1.prisma.user.findUnique({
            where: { email },
            include: {
                agent: true
            }
        });
        if (!user) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, userType: user.userType }, process.env.JWT_SECRET || 'fallback-secret');
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            message: 'Login successful',
            user: userWithoutPassword,
            token
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            message: 'An error occurred during login'
        });
    }
});
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                error: 'No token provided',
                message: 'Authorization token is required'
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await index_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            include: {
                agent: true
            }
        });
        if (!user) {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'User not found'
            });
        }
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            message: 'Token is valid',
            user: userWithoutPassword
        });
    }
    catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({
            error: 'Invalid token',
            message: 'Token verification failed'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map