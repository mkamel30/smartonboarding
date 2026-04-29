import prisma from './db.js';

export const WORKFLOW_STAGES = {
    BRANCH_SUBMISSION: 'Branch Submission',
    SUPERVISOR_REVIEW: 'Supervisor Review',
    BRANCH_MGMT_REVIEW: 'Branch Management Review',
    SALES_MGMT_REVIEW: 'Sales Management Review',
    OPERATIONS_REVIEW: 'Operations Review',
    BANK_REVIEW: 'Bank Review',
    SOFTWARE_ACTIVATION: 'Software Activation',
    COMPLETED: 'Completed',
    CLOSED: 'Closed'
};
export const ROLES = {
    BRANCH_SALES: 'BRANCH_SALES',
    BRANCH_SUPERVISOR: 'BRANCH_SUPERVISOR',
    BRANCH_MGMT: 'BRANCH_MGMT',
    SALES_MGMT: 'SALES_MGMT',
    OPERATIONS: 'OPERATIONS'
};

export async function processAction(
    requestId: string,
    action: string,
    user: any,
    payload: any = {}
) {
    const request = await prisma.onboardingRequest.findUnique({
        where: { id: requestId }
    });

    if (!request) throw new Error('Request not found');

    let updates: any = {};
    let historyEntry: any = {
        fromStage: request.stage,
        changedById: user.id,
        comment: payload.comment || ''
    };

    const { kycType, formFileId, mid, bankResponse } = payload;

    switch (request.stage) {
        case WORKFLOW_STAGES.SUPERVISOR_REVIEW:
            if (user.role !== 'BRANCH_SUPERVISOR' && user.role !== 'BRANCH_MANAGER' && user.role !== 'ADMIN') throw new Error('Unauthorized');
            
            if (action === 'approve') {
                updates.stage = WORKFLOW_STAGES.BRANCH_MGMT_REVIEW;
                updates.ownerRole = ROLES.BRANCH_MGMT;
                updates.status = 'Submitted';
                historyEntry.toStage = updates.stage;
                historyEntry.status = 'Approved by Branch Supervisor';
            } else if (action === 'reject') {
                updates.stage = WORKFLOW_STAGES.CLOSED;
                updates.status = 'Rejected';
                historyEntry.toStage = updates.stage;
                historyEntry.status = 'Rejected by Supervisor';
            } else if (action === 'return') {
                updates.stage = WORKFLOW_STAGES.BRANCH_SUBMISSION;
                updates.ownerRole = ROLES.BRANCH_SALES;
                updates.status = 'Returned';
                historyEntry.toStage = updates.stage;
                historyEntry.status = 'Returned for Modification';
            }
            break;

        case WORKFLOW_STAGES.BRANCH_MGMT_REVIEW:
            if (user.role !== ROLES.BRANCH_MGMT && user.role !== 'ADMIN') throw new Error('Unauthorized');
            
            if (action === 'approve') {
                if (!kycType) throw new Error('KYC Type is required for approval');
                updates.stage = WORKFLOW_STAGES.SALES_MGMT_REVIEW;
                updates.ownerRole = ROLES.SALES_MGMT;
                updates.kycType = kycType;
                updates.branchMgmtApprovedAt = new Date();
                updates.branchMgmtApprovedBy = user.id;
                updates.status = 'Submitted';
                historyEntry.toStage = updates.stage;
                historyEntry.status = 'Approved by Branch Mgmt';
            } else if (action === 'reject') {
                updates.stage = WORKFLOW_STAGES.CLOSED;
                updates.status = 'Rejected';
                historyEntry.toStage = updates.stage;
                historyEntry.status = 'Rejected';
            } else if (action === 'return') {
                updates.stage = WORKFLOW_STAGES.BRANCH_SUBMISSION;
                updates.ownerRole = ROLES.BRANCH_SALES;
                updates.status = 'Returned';
                historyEntry.toStage = updates.stage;
                historyEntry.status = 'Returned for Modification';
            }
            break;

        case WORKFLOW_STAGES.SALES_MGMT_REVIEW:
            if (user.role !== ROLES.SALES_MGMT && user.role !== 'ADMIN') throw new Error('Unauthorized');

            if (action === 'approve') {
                if (!formFileId) throw new Error('Signed form file ID is required');
                updates.stage = WORKFLOW_STAGES.OPERATIONS_REVIEW;
                updates.ownerRole = ROLES.OPERATIONS;
                updates.salesMgmtApprovedAt = new Date();
                updates.salesMgmtApprovedBy = user.id;
                updates.salesMgmtFormFileId = formFileId;
                updates.status = 'Submitted';
                historyEntry.toStage = updates.stage;
                historyEntry.status = 'Approved by Sales Mgmt';
            } else if (action === 'reject') {
                updates.stage = WORKFLOW_STAGES.CLOSED;
                updates.status = 'Rejected';
                historyEntry.toStage = updates.stage;
                historyEntry.status = 'Rejected';
            } else if (action === 'return') {
                updates.stage = WORKFLOW_STAGES.BRANCH_SUBMISSION;
                updates.ownerRole = ROLES.BRANCH_SALES;
                updates.status = 'Returned';
                historyEntry.toStage = updates.stage;
                historyEntry.status = 'Returned for Modification';
            }
            break;

        case WORKFLOW_STAGES.OPERATIONS_REVIEW:
            if (user.role !== ROLES.OPERATIONS && user.role !== 'ADMIN') throw new Error('Unauthorized');

            if (action === 'send_to_bank') {
                updates.stage = WORKFLOW_STAGES.BANK_REVIEW;
                updates.ownerRole = ROLES.OPERATIONS; // Operations still tracks it
                updates.sentToBankAt = new Date();
                updates.status = 'Submitted';
                historyEntry.toStage = updates.stage;
                historyEntry.status = 'Sent to Bank';
            } else if (action === 'return') {
                updates.stage = WORKFLOW_STAGES.BRANCH_SUBMISSION;
                updates.ownerRole = ROLES.BRANCH_SALES;
                updates.status = 'Returned';
                updates.returnToStage = WORKFLOW_STAGES.OPERATIONS_REVIEW; // Save fast-track destination
                historyEntry.toStage = updates.stage;
                historyEntry.status = 'Returned for Modification';
            }
            break;

        case WORKFLOW_STAGES.BANK_REVIEW:
            if (user.role !== ROLES.OPERATIONS && user.role !== 'ADMIN') throw new Error('Unauthorized');

            updates.bankResponseAt = new Date();
            
            if (action === 'bank_approved') {
                if (!mid) throw new Error('MID is required for bank approval');
                updates.stage = WORKFLOW_STAGES.SOFTWARE_ACTIVATION;
                updates.ownerRole = ROLES.BRANCH_SALES;
                updates.bankResponse = 'approved';
                updates.merchantId = mid;
                updates.status = 'Activated';
                historyEntry.toStage = updates.stage;
                historyEntry.status = 'Bank Approved';
            } else if (action === 'bank_rejected') {
                updates.stage = WORKFLOW_STAGES.CLOSED;
                updates.bankResponse = 'rejected';
                updates.status = 'Rejected';
                historyEntry.toStage = updates.stage;
                historyEntry.status = 'Bank Rejected';
            } else if (action === 'bank_modification') {
                updates.stage = WORKFLOW_STAGES.BRANCH_SUBMISSION;
                updates.ownerRole = ROLES.BRANCH_SALES;
                updates.bankResponse = 'modification';
                updates.status = 'Returned';
                historyEntry.toStage = updates.stage;
                historyEntry.status = 'Bank Modification Requested';
            }
            break;

        case WORKFLOW_STAGES.SOFTWARE_ACTIVATION:
            if (user.role !== ROLES.BRANCH_SALES && user.role !== 'ADMIN') throw new Error('Unauthorized');

            if (action === 'confirm_activation') {
                updates.stage = WORKFLOW_STAGES.COMPLETED;
                updates.softwareActivated = true;
                updates.activatedAt = new Date();
                updates.activatedById = user.id;
                updates.status = 'Completed';
                historyEntry.toStage = updates.stage;
                historyEntry.status = 'Software Activated';
            }
            break;

        case WORKFLOW_STAGES.BRANCH_SUBMISSION:
            if (user.role !== ROLES.BRANCH_SALES && user.role !== 'ADMIN') throw new Error('Unauthorized');
            
            if (action === 'resubmit') {
                if ((request as any).returnToStage === WORKFLOW_STAGES.OPERATIONS_REVIEW) {
                    updates.stage = WORKFLOW_STAGES.OPERATIONS_REVIEW;
                    updates.ownerRole = ROLES.OPERATIONS;
                    updates.returnToStage = null; // clear it
                } else {
                    updates.stage = WORKFLOW_STAGES.SUPERVISOR_REVIEW;
                    updates.ownerRole = ROLES.BRANCH_SUPERVISOR;
                }
                updates.status = 'Submitted';
                historyEntry.toStage = updates.stage;
                historyEntry.status = 'Resubmitted';
            }
            break;

        default:
            throw new Error('Invalid stage or action');
    }

    const updatedRequest = await prisma.onboardingRequest.update({
        where: { id: requestId },
        data: {
            ...updates,
            history: {
                create: historyEntry
            }
        },
        include: { history: true }
    });

    return updatedRequest;
}
