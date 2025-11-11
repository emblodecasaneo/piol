import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

// Interface pour les données du token JWT
interface JwtPayload {
  userId: string;
  userType: 'TENANT' | 'AGENT' | 'ADMIN';
  iat: number;
  exp: number;
}

// Étendre l'interface Request pour inclure les données utilisateur
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Middleware d'authentification
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Récupérer le token depuis l'en-tête Authorization
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // Vérifier que l'utilisateur existe toujours
    const user = await prisma.user.findUnique({
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

    // Ajouter les données utilisateur à la requête
    req.user = decoded;
    next();

  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token'
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
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

// Middleware pour vérifier le type d'utilisateur
export const requireUserType = (userType: 'TENANT' | 'AGENT' | 'ADMIN') => {
  return (req: Request, res: Response, next: NextFunction) => {
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

// Middleware pour vérifier les droits admin
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Access denied',
      message: 'Authentication required'
    });
  }

  if (req.user.userType !== 'ADMIN') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'This endpoint requires admin privileges'
    });
  }

  next();
};

// Middleware pour vérifier que l'agent est vérifié
export const requireVerifiedAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || (req.user.userType !== 'AGENT' && req.user.userType !== 'ADMIN')) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'This endpoint requires agent privileges'
      });
    }

    const agent = await prisma.agent.findUnique({
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

  } catch (error) {
    console.error('Agent verification error:', error);
    return res.status(500).json({
      error: 'Verification failed',
      message: 'An error occurred during agent verification'
    });
  }
};
