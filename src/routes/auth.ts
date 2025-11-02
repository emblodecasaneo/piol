import { UserType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

const router = express.Router();

// Interface pour les données d'inscription
interface RegisterData {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: UserType;
  // Champs spécifiques aux agents
  businessName?: string;
  license?: string;
  idCardNumber?: string;
}

// Interface pour les données de connexion
interface LoginData {
  email: string;
  password: string;
}

// Inscription
router.post('/register', async (req, res) => {
  try {
    const {
      email,
      phone,
      password,
      firstName,
      lastName,
      userType,
      businessName,
      license,
      idCardNumber
    }: RegisterData = req.body;

    // Validation des champs requis
    if (!email || !phone || !password || !firstName || !lastName || !userType) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email, phone, password, firstName, lastName, and userType are required'
      });
    }

    // Validation pour les agents
    if (userType === 'AGENT' && (!businessName || !idCardNumber)) {
      return res.status(400).json({
        error: 'Missing agent fields',
        message: 'Business name and ID card number are required for agents'
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
    const hashedPassword = await bcrypt.hash(password, 12);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        firstName,
        lastName,
        userType
      }
    });

    // Si c'est un agent, créer le profil agent
    if (userType === 'AGENT') {
      await prisma.agent.create({
        data: {
          userId: user.id,
          businessName: businessName!,
          license,
          idCardNumber: idCardNumber!,
          idCardPhoto: '', // À implémenter avec l'upload
          profilePhoto: '' // À implémenter avec l'upload
        }
      });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user.id, userType: user.userType },
      process.env.JWT_SECRET || 'fallback-secret'
    );

    // Retourner les données utilisateur (sans le mot de passe)
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      message: 'User registered successfully',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
});

// Connexion
router.post('/login', async (req, res) => {
  try {
    const { email, password }: LoginData = req.body;

    // Validation des champs requis
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
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

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user.id, userType: user.userType },
      process.env.JWT_SECRET || 'fallback-secret'
    );

    // Retourner les données utilisateur (sans le mot de passe)
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
});

// Vérification du token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Authorization token is required'
      });
    }

    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
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

    // Retourner les données utilisateur (sans le mot de passe)
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Token is valid',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      error: 'Invalid token',
      message: 'Token verification failed'
    });
  }
});

export default router;
