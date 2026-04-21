import express from 'express';
import bcrypt from 'bcrypt';
import prisma from './db.js';
import { authenticate, authorizeRole } from './auth.js';

const router = express.Router();

// Apply ADMIN role protection to ALL admin routes
router.use(authenticate, authorizeRole('ADMIN'));

// --- BRANCHES ---

// Get all branches
router.get('/branches', async (req, res) => {
    try {
        const branches = await prisma.branch.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { users: true, requests: true }
                }
            }
        });
        res.json(branches);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch branches' });
    }
});

// Create branch
router.post('/branches', async (req, res) => {
    try {
        const { name, code, governorate, address, phone } = req.body;
        const branch = await prisma.branch.create({
            data: { name, code, governorate, address, phone }
        });
        res.status(201).json(branch);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create branch' });
    }
});

// Update branch
router.patch('/branches/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const branch = await prisma.branch.update({
            where: { id },
            data
        });
        res.json(branch);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update branch' });
    }
});

// --- USERS ---

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            include: { branch: true }
        });
        // Remove sensitive data
        const safeUsers = users.map(({ passwordHash, mfaSecret, ...u }: any) => u);
        res.json(safeUsers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Create user
router.post('/users', async (req, res) => {
    try {
        const { username, password, fullName, role, branchId } = req.body;
        
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        
        const user = await prisma.user.create({
            data: {
                username,
                passwordHash,
                fullName,
                role,
                branchId: branchId || null
            }
        });

        const { passwordHash: _, ...userSafe } = user;
        res.status(201).json(userSafe);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Update user (including Admin resetting password)
router.patch('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { password, ...data } = req.body;

        if (password) {
            data.passwordHash = await bcrypt.hash(password, 12);
        }

        const user = await prisma.user.update({
            where: { id },
            data: {
                ...data,
                branchId: data.branchId || null
            }
        });

        const { passwordHash: _, mfaSecret: __, ...userSafe } = user;
        res.json(userSafe);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// --- AUDIT LOG ---
router.get('/audit-log', async (req, res) => {
    try {
        const logs = await prisma.stageHistory.findMany({
            take: 100,
            orderBy: { createdAt: 'desc' },
            include: {
                changedByUser: {
                    select: { fullName: true, role: true, username: true }
                },
                request: {
                    select: { merchantNameAr: true, id: true }
                }
            }
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch audit log' });
    }
});

export default router;
