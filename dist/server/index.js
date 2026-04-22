import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { uploadMerchantDocs, listRequestFiles } from './driveService.js';
import prisma from './db.js';
import authRouter, { authenticate, authorizeRole } from './auth.js';
import adminRouter from './adminRoutes.js';
dotenv.config();
const app = express();
const port = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());
// Logger
app.use((req, res, next) => {
    console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});
// --- AUTH & ADMIN ROUTES ---
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
// --- PROTECTED ROUTES ---
const apiRouter = express.Router();
app.use('/api', apiRouter);
// Health check (Open)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Apply authentication to all following API routes
apiRouter.use(authenticate);
// Setup Multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 10 }
});
// Upload Docs
apiRouter.post('/upload', upload.array('docs'), async (req, res) => {
    try {
        const { requestId, branchName, merchantName, docTypes } = req.body;
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        // Ensure docTypes is an array (it might come as a string if only one file)
        const typesArray = Array.isArray(docTypes) ? docTypes : [docTypes];
        const result = await uploadMerchantDocs({
            requestId,
            branchName,
            merchantName,
            files,
            docTypes: typesArray
        });
        await prisma.onboardingRequest.update({
            where: { id: requestId },
            data: { driveFolderId: result.folderId }
        });
        res.json({ success: true, ...result });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to upload files', details: error.message });
    }
});
apiRouter.get('/files/:branchName/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;
        const files = await listRequestFiles(requestId, req.params.branchName);
        res.json(files);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to list files' });
    }
});
// --- REQUESTS ---
apiRouter.get('/requests', async (req, res) => {
    try {
        const user = req.user;
        let where = {};
        // BRANCH ISOLATION: Sales/Supervisor/Manager only see their branch
        if (['BRANCH_SALES', 'BRANCH_SUPERVISOR', 'BRANCH_MANAGER'].includes(user.role)) {
            where.branchId = user.branchId;
        }
        const requests = await prisma.onboardingRequest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                history: {
                    include: { changedByUser: { select: { fullName: true, role: true } } }
                },
                branch: true
            }
        });
        res.json(requests);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});
apiRouter.get('/requests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const request = await prisma.onboardingRequest.findUnique({
            where: { id },
            include: {
                history: {
                    include: { changedByUser: { select: { fullName: true, role: true } } }
                },
                branch: true
            }
        });
        if (!request)
            return res.status(404).json({ error: 'Request not found' });
        // Isolation Check
        if (['BRANCH_SALES', 'BRANCH_SUPERVISOR', 'BRANCH_MANAGER'].includes(user.role) && request.branchId !== user.branchId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json(request);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch request' });
    }
});
// --- HELPERS ---
function generateFriendlyId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confused chars like O, 0, I, 1
    let id = 'SMT-';
    for (let i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}
apiRouter.post('/requests', authorizeRole('BRANCH_SALES', 'ADMIN'), async (req, res) => {
    try {
        const data = req.body;
        const user = req.user;
        if (!user.branchId && user.role !== 'ADMIN') {
            return res.status(400).json({ error: 'User must be assigned to a branch to create requests' });
        }
        // Generate a shorter, friendly ID
        const requestId = generateFriendlyId();
        const request = await prisma.onboardingRequest.create({
            data: {
                ...data,
                id: requestId,
                branchId: user.branchId || data.branchId,
                createdById: user.id,
                stage: 'Supervisor Review',
                status: 'Pending',
                ownerRole: 'BRANCH_SUPERVISOR',
                slaStartDate: new Date(),
                slaTargetDays: 3,
                history: {
                    create: {
                        fromStage: 'Creation',
                        toStage: 'Supervisor Review',
                        status: 'Pending',
                        changedById: user.id,
                        comment: 'تم إنشاء الطلب وتقديمه لمراجعة مشرف الفرع',
                        createdAt: new Date()
                    }
                }
            }
        });
        res.status(201).json(request);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create request', details: error.message });
    }
});
apiRouter.patch('/requests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { historyEntry, ...updateData } = req.body;
        const user = req.user;
        // Basic Isolation/Role check could be expanded here based on stage
        const request = await prisma.onboardingRequest.update({
            where: { id },
            data: {
                ...updateData,
                history: historyEntry ? {
                    create: {
                        ...historyEntry,
                        changedById: user.id,
                        createdAt: new Date()
                    }
                } : undefined
            },
            include: { history: true }
        });
        res.json(request);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update request' });
    }
});
// Dashboard Stats
apiRouter.get('/dashboard/stats', async (req, res) => {
    try {
        const user = req.user;
        let where = {};
        if (['BRANCH_SALES', 'BRANCH_SUPERVISOR', 'BRANCH_MANAGER'].includes(user.role)) {
            where.branchId = user.branchId;
        }
        const total = await prisma.onboardingRequest.count({ where });
        const activated = await prisma.onboardingRequest.count({ where: { ...where, status: 'Activated' } });
        const pending = await prisma.onboardingRequest.count({ where: { ...where, status: 'Pending' } });
        const returned = await prisma.onboardingRequest.count({ where: { ...where, status: 'Returned' } });
        const rejected = await prisma.onboardingRequest.count({ where: { ...where, status: 'Rejected' } });
        res.json({ total, activated, pending, returned, rejected });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});
apiRouter.get('/activity', async (req, res) => {
    try {
        const user = req.user;
        let where = {};
        if (['BRANCH_SALES', 'BRANCH_SUPERVISOR', 'BRANCH_MANAGER'].includes(user.role)) {
            where.request = { branchId: user.branchId };
        }
        const activity = await prisma.stageHistory.findMany({
            where,
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: {
                changedByUser: { select: { fullName: true, role: true } },
                request: { select: { merchantNameAr: true, id: true } }
            }
        });
        res.json(activity);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch activity log' });
    }
});
app.listen(port, () => {
    console.log(`\n🚀 PRODUCTION-READY SERVER RUNNING ON http://localhost:${port}\n`);
});
