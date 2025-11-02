"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireVerifiedAgent = exports.requireUserType = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'No token provided'
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await index_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                userType: true,
                email: true
            }
        });
        if (!user) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'User not found'
            });
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'Invalid token'
            });
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'Token expired'
            });
        }
        return res.status(500).json({
            error: 'Authentication failed',
            message: 'An error occurred during authentication'
        });
    }
};
exports.authenticateToken = authenticateToken;
const requireUserType = (userType) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'Authentication required'
            });
        }
        if (req.user.userType !== userType) {
            return res.status(403).json({
                error: 'Access denied',
                message: `This endpoint requires ${userType} privileges`
            });
        }
        next();
    };
};
exports.requireUserType = requireUserType;
const requireVerifiedAgent = async (req, res, next) => {
    try {
        if (!req.user || req.user.userType !== 'AGENT') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'This endpoint requires agent privileges'
            });
        }
        const agent = await index_1.prisma.agent.findUnique({
            where: { userId: req.user.userId },
            select: {
                isVerified: true,
                verificationStatus: true
            }
        });
        if (!agent) {
            return res.status(404).json({
                error: 'Agent not found',
                message: 'Agent profile not found'
            });
        }
        if (!agent.isVerified) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Agent verification required'
            });
        }
        next();
    }
    catch (error) {
        console.error('Agent verification error:', error);
        return res.status(500).json({
            error: 'Verification failed',
            message: 'An error occurred during agent verification'
        });
    }
};
exports.requireVerifiedAgent = requireVerifiedAgent;
//# sourceMappingURL=auth.js.map