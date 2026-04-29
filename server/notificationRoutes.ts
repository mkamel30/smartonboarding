import express from 'express';
import prisma from './db.js';
import { authenticate } from './auth.js';

const router = express.Router();
router.use(authenticate);

// Get user notifications
router.get('/', async (req: any, res) => {
    try {
        const userId = req.user.id;
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Get unread count
router.get('/unread-count', async (req: any, res) => {
    try {
        const userId = req.user.id;
        const count = await prisma.notification.count({
            where: { userId, isRead: false }
        });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Failed to count notifications' });
    }
});

// Mark one as read
router.patch('/:id/read', async (req: any, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const notification = await prisma.notification.update({
            where: { id, userId },
            data: { isRead: true }
        });
        res.json(notification);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Mark all as read
router.patch('/read-all', async (req: any, res) => {
    try {
        const userId = req.user.id;
        await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});

export default router;
