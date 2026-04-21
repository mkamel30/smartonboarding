import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import prisma from './db';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const MFA_ISSUER = process.env.MFA_ISSUER || 'Merchant Onboarding';

// --- MIDDLEWARE ---

export const authenticate = async (req: any, res: any, next: any) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: { branch: true }
        });

        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        // Check if MFA is required but not verified for this session
        if (user.mfaEnabled && !decoded.mfaVerified) {
            return res.status(403).json({ error: 'MFA verification required', mfaRequired: true });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

export const authorizeRole = (...roles: string[]) => {
    return (req: any, res: any, next: any) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};

// --- ROUTES ---

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await prisma.user.findUnique({
            where: { username },
            include: { branch: true }
        });

        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.mfaEnabled) {
            // Return temporary token for MFA verification
            const tempToken = jwt.sign(
                { id: user.id, mfaVerified: false },
                JWT_SECRET,
                { expiresIn: '5m' }
            );
            return res.json({ mfaRequired: true, tempToken });
        }

        const token = jwt.sign(
            { id: user.id, mfaVerified: false },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        const { passwordHash, mfaSecret, ...userSafe } = user;
        res.json({ token, user: userSafe });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Verify MFA
router.post('/verify-mfa', async (req, res) => {
    try {
        const { tempToken, code } = req.body;
        const decoded = jwt.verify(tempToken, JWT_SECRET) as any;

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: { branch: true }
        });

        if (!user || !user.mfaSecret) {
            return res.status(401).json({ error: 'Invalid request' });
        }

        const isValid = authenticator.verify({
            token: code,
            secret: user.mfaSecret
        });

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid MFA code' });
        }

        const token = jwt.sign(
            { id: user.id, mfaVerified: true },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        const { passwordHash, mfaSecret, ...userSafe } = user;
        res.json({ token, user: userSafe });
    } catch (error) {
        res.status(401).json({ error: 'MFA verification failed' });
    }
});

// MFA Setup (Get QR Code)
router.post('/mfa/setup', authenticate, async (req: any, res) => {
    try {
        const user = req.user;
        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(user.username, MFA_ISSUER, secret);
        const qrCodeUrl = await QRCode.toDataURL(otpauth);

        // Store secret temporarily (or just return it to be confirmed)
        // We'll update the user only after they confirm the first code
        res.json({ qrCodeUrl, secret });
    } catch (error) {
        res.status(500).json({ error: 'MFA setup failed' });
    }
});

// Confirm MFA Setup
router.post('/mfa/verify-setup', authenticate, async (req: any, res) => {
    try {
        const { secret, code } = req.body;
        const user = req.user;

        const isValid = authenticator.verify({
            token: code,
            secret: secret
        });

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid confirmation code' });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                mfaSecret: secret,
                mfaEnabled: true,
                mfaVerified: true
            }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'MFA verification failed' });
    }
});

// Disable MFA
router.post('/mfa/disable', authenticate, async (req: any, res) => {
    try {
        const { password } = req.body;
        const user = req.user;

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                mfaEnabled: false,
                mfaSecret: null,
                mfaVerified: false
            }
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to disable MFA' });
    }
});

// Me
router.get('/me', async (req: any, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: { branch: true }
        });

        if (!user || (!decoded.mfaVerified && user.mfaEnabled)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { passwordHash, mfaSecret, ...userSafe } = user;
        res.json(userSafe);
    } catch (error) {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

export default router;
