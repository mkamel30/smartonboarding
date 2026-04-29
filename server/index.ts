import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { uploadMerchantDocs, listRequestFiles } from './driveService.js';
import prisma from './db.js';
import authRouter, { authenticate, authorizeRole } from './auth.js';
import adminRouter from './adminRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import batchRoutes from './batchRoutes.js';
import { processAction, ROLES, WORKFLOW_STAGES } from './workflowEngine.js';
import { notifyWorkflowEvent, NOTIFICATION_TYPES } from './notificationService.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// Sub-routers
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/batches', batchRoutes);

// Setup Multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024, files: 20 } // 50MB max file size
});

// Upload Docs
apiRouter.post('/upload', upload.array('docs'), async (req: any, res) => {
    try {
        const { requestId, branchName, merchantName, docTypes } = req.body;
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

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
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to upload files', details: error.message });
    }
});

// Upload Sales Form
apiRouter.post('/upload-sales-form', authorizeRole('SALES_MGMT', 'ADMIN'), upload.single('salesForm'), async (req: any, res) => {
    try {
        const { requestId } = req.body;
        const file = req.file as Express.Multer.File;

        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        const request = await prisma.onboardingRequest.findUnique({ where: { id: requestId }, include: { branch: true } });
        if (!request) return res.status(404).json({ error: 'Request not found' });

        const result = await uploadMerchantDocs({
            requestId,
            branchName: request.branch?.name || 'Unknown',
            merchantName: request.merchantNameAr,
            files: [file],
            docTypes: ['Sales_Signed_Form']
        });

        res.json({ success: true, fileId: result.files[0]?.fileId });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to upload sales form', details: error.message });
    }
});

apiRouter.get('/files/:branchName/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;
        const files = await listRequestFiles(requestId, req.params.branchName);
        res.json(files);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to list files' });
    }
});

// --- REQUESTS ---

apiRouter.get('/requests', async (req: any, res) => {
    try {
        const user = req.user;
        let where: any = {};

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
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

apiRouter.get('/requests/:id', async (req: any, res) => {
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

        if (!request) return res.status(404).json({ error: 'Request not found' });

        if (['BRANCH_SALES', 'BRANCH_SUPERVISOR', 'BRANCH_MANAGER'].includes(user.role) && request.branchId !== user.branchId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(request);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch request' });
    }
});

function generateFriendlyId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = 'SMT-';
    for (let i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

apiRouter.post('/requests', authorizeRole('BRANCH_SALES', 'ADMIN'), async (req: any, res) => {
    try {
        const data = req.body;
        const user = req.user;

        if (!user.branchId && user.role !== 'ADMIN') {
            return res.status(400).json({ error: 'User must be assigned to a branch to create requests' });
        }

        let requestId = '';
        if (data.activityType === 'تاجر خارجي') {
            requestId = generateFriendlyId();
        } else {
            if (!data.customerCode) {
                return res.status(400).json({ error: 'Customer code is required for this activity type' });
            }
            requestId = data.customerCode;
            
            // Check if ID already exists
            const existing = await prisma.onboardingRequest.findUnique({ where: { id: requestId } });
            if (existing) {
                return res.status(400).json({ error: 'Customer code already exists as a request ID' });
            }
        }

        const request = await prisma.onboardingRequest.create({
            data: {
                ...data,
                id: requestId,
                branchId: user.branchId || data.branchId,
                createdById: user.id,
                stage: WORKFLOW_STAGES.BRANCH_MGMT_REVIEW,
                status: 'Pending',
                ownerRole: ROLES.BRANCH_MGMT,
                slaStartDate: new Date(),
                slaTargetDays: 3,
                history: {
                    create: {
                        fromStage: 'Creation',
                        toStage: WORKFLOW_STAGES.BRANCH_MGMT_REVIEW,
                        status: 'Pending',
                        changedById: user.id,
                        comment: 'تم إنشاء الطلب وتقديمه لمراجعة إدارة الفروع',
                        createdAt: new Date()
                    }
                }
            },
            include: { branch: true }
        });

        await notifyWorkflowEvent(NOTIFICATION_TYPES.REQUEST_SUBMITTED, request);

        res.status(201).json(request);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to create request', details: error.message });
    }
});

apiRouter.patch('/requests/:id/action', async (req: any, res) => {
    try {
        const { id } = req.params;
        const { action, payload } = req.body;
        const user = req.user;

        const request = await processAction(id, action, user, payload);
        
        // Notify based on action
        if (action === 'approve' && request.stage === WORKFLOW_STAGES.SALES_MGMT_REVIEW) {
            await notifyWorkflowEvent(NOTIFICATION_TYPES.REQUEST_APPROVED_BMGMT, request);
        } else if (action === 'approve' && request.stage === WORKFLOW_STAGES.OPERATIONS_REVIEW) {
            await notifyWorkflowEvent(NOTIFICATION_TYPES.REQUEST_APPROVED_SALES, request);
        } else if (action === 'send_to_bank') {
            await notifyWorkflowEvent(NOTIFICATION_TYPES.SENT_TO_BANK, request);
        } else if (action === 'bank_approved') {
            await notifyWorkflowEvent(NOTIFICATION_TYPES.MID_ASSIGNED, request);
        } else if (action === 'confirm_activation') {
            await notifyWorkflowEvent(NOTIFICATION_TYPES.ACTIVATION_CONFIRMED, request);
        } else if (action === 'return' || action === 'bank_modification') {
            await notifyWorkflowEvent(NOTIFICATION_TYPES.REQUEST_RETURNED, request, payload);
        } else if (action === 'reject' || action === 'bank_rejected') {
            await notifyWorkflowEvent(NOTIFICATION_TYPES.REQUEST_REJECTED, request);
        }

        res.json(request);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Regular patch for basic edits
apiRouter.patch('/requests/:id', async (req: any, res) => {
    try {
        const { id } = req.params;
        const { historyEntry, ...updateData } = req.body;
        const user = req.user;
        
        // If it's a resubmission
        if (updateData.status === 'Submitted' && updateData.stage === WORKFLOW_STAGES.BRANCH_MGMT_REVIEW) {
           return res.status(400).json({error: 'Use /action endpoint for resubmission'});
        }

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
            include: { history: true, branch: true }
        });

        res.json(request);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to update request' });
    }
});

// Dashboard Stats
apiRouter.get('/dashboard/stats', async (req: any, res) => {
    try {
        const user = req.user;
        let where: any = {};

        if (['BRANCH_SALES', 'BRANCH_SUPERVISOR', 'BRANCH_MANAGER'].includes(user.role)) {
            where.branchId = user.branchId;
        }

        const total = await prisma.onboardingRequest.count({ where });
        const activated = await prisma.onboardingRequest.count({ where: { ...where, status: 'Activated' } });
        const pending = await prisma.onboardingRequest.count({ where: { ...where, status: 'Pending' } });
        const returned = await prisma.onboardingRequest.count({ where: { ...where, status: 'Returned' } });
        const rejected = await prisma.onboardingRequest.count({ where: { ...where, status: 'Rejected' } });

        res.json({ total, activated, pending, returned, rejected });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

apiRouter.get('/activity', async (req: any, res) => {
    try {
        const user = req.user;
        let where: any = {};

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
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch activity log' });
    }
});

app.listen(port, () => {
    console.log(`\n🚀 PRODUCTION-READY SERVER RUNNING ON http://localhost:${port}\n`);
});
