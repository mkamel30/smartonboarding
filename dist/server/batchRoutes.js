import express from 'express';
import multer from 'multer';
import prisma from './db.js';
import { authenticate, authorizeRole } from './auth.js';
import { uploadMerchantDocs } from './driveService.js';
import { notifyWorkflowEvent, NOTIFICATION_TYPES } from './notificationService.js';
const router = express.Router();
router.use(authenticate);
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});
// Create a new batch
router.post('/', authorizeRole('BRANCH_SALES'), upload.single('waybillDoc'), async (req, res) => {
    try {
        const { requestIds, waybillNumber } = req.body;
        const file = req.file;
        const user = req.user;
        if (!requestIds || !waybillNumber || !file) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const idsArray = JSON.parse(requestIds);
        // Generate a batch number
        const batchNumber = `BCH-${Date.now().toString().slice(-6)}-${user.branch?.code || 'XX'}`;
        // Upload waybill to Drive
        // Note: For actual implementation, we'd need a specific driveService function for waybills
        // Reusing uploadMerchantDocs for simplicity, mapping it to a special "Waybills" folder logic if needed
        const result = await uploadMerchantDocs({
            requestId: batchNumber,
            branchName: 'بواليص الشحن/' + (user.branch?.name || 'Unknown'),
            merchantName: 'بوليصة',
            files: [file],
            docTypes: ['Waybill']
        });
        // Create the batch
        const batch = await prisma.shipmentBatch.create({
            data: {
                batchNumber,
                waybillNumber,
                waybillFileId: result.files[0]?.fileId,
                waybillFolderId: result.folderId,
                senderBranchId: user.branchId,
                senderUserId: user.id,
                requests: {
                    connect: idsArray.map((id) => ({ id }))
                }
            },
            include: { requests: true }
        });
        // Update requests
        await prisma.onboardingRequest.updateMany({
            where: { id: { in: idsArray } },
            data: {
                shipmentBatchId: batch.id,
                documentsSentAt: new Date(),
                waybillNumber
            }
        });
        await notifyWorkflowEvent(NOTIFICATION_TYPES.BATCH_SHIPPED, null, {
            waybillNumber,
            batchNumber
        });
        res.status(201).json(batch);
    }
    catch (error) {
        console.error('Create Batch Error:', error);
        res.status(500).json({ error: 'Failed to create batch' });
    }
});
// Get all batches
router.get('/', async (req, res) => {
    try {
        const user = req.user;
        let where = {};
        if (user.role === 'BRANCH_SALES' || user.role === 'BRANCH_MANAGER' || user.role === 'BRANCH_SUPERVISOR') {
            where.senderBranchId = user.branchId;
        }
        const batches = await prisma.shipmentBatch.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                senderBranch: true,
                senderUser: { select: { fullName: true } },
                receivedBy: { select: { fullName: true } },
                _count: { select: { requests: true } }
            }
        });
        res.json(batches);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch batches' });
    }
});
// Get batch details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const batch = await prisma.shipmentBatch.findUnique({
            where: { id },
            include: {
                senderBranch: true,
                senderUser: { select: { fullName: true } },
                receivedBy: { select: { fullName: true } },
                requests: { select: { id: true, merchantNameAr: true, status: true, stage: true } }
            }
        });
        if (!batch)
            return res.status(404).json({ error: 'Batch not found' });
        res.json(batch);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch batch details' });
    }
});
// Receive batch
router.patch('/:id/receive', authorizeRole('BRANCH_MGMT', 'ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const batch = await prisma.shipmentBatch.update({
            where: { id },
            data: {
                status: 'Received',
                receivedAt: new Date(),
                receivedById: user.id
            },
            include: { requests: true }
        });
        await prisma.onboardingRequest.updateMany({
            where: { shipmentBatchId: id },
            data: {
                documentsReceivedAt: new Date(),
                documentsReceivedBy: user.id
            }
        });
        await notifyWorkflowEvent(NOTIFICATION_TYPES.BATCH_RECEIVED, null, {
            senderUserId: batch.senderUserId,
            batchNumber: batch.batchNumber
        });
        res.json(batch);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to receive batch' });
    }
});
export default router;
