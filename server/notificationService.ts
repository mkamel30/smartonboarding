import prisma from './db.js';

export const NOTIFICATION_TYPES = {
    REQUEST_SUBMITTED: 'REQUEST_SUBMITTED',
    REQUEST_APPROVED_BMGMT: 'REQUEST_APPROVED_BMGMT',
    REQUEST_RETURNED: 'REQUEST_RETURNED',
    REQUEST_REJECTED: 'REQUEST_REJECTED',
    BATCH_SHIPPED: 'BATCH_SHIPPED',
    BATCH_RECEIVED: 'BATCH_RECEIVED',
    REQUEST_APPROVED_SALES: 'REQUEST_APPROVED_SALES',
    SENT_TO_BANK: 'SENT_TO_BANK',
    BANK_RESPONSE: 'BANK_RESPONSE',
    MID_ASSIGNED: 'MID_ASSIGNED',
    ACTIVATION_CONFIRMED: 'ACTIVATION_CONFIRMED'
};

export async function createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    requestId?: string;
}) {
    return prisma.notification.create({
        data
    });
}

// Helper to notify all users of a specific role (and optionally in a specific branch)
export async function notifyRole(
    role: string,
    data: { type: string; title: string; message: string; requestId?: string },
    branchId?: string
) {
    let where: any = { role, isActive: true };
    if (branchId) {
        where.branchId = branchId;
    }

    const users = await prisma.user.findMany({ where });
    
    if (users.length === 0) return;

    const notifications = users.map(user => ({
        userId: user.id,
        ...data
    }));

    await prisma.notification.createMany({
        data: notifications
    });
}

export async function notifyWorkflowEvent(event: string, request: any, payload: any = {}) {
    switch (event) {
        case NOTIFICATION_TYPES.REQUEST_SUBMITTED:
            await notifyRole('BRANCH_MGMT', {
                type: event,
                title: 'طلب جديد للمراجعة',
                message: `تم تقديم طلب جديد (${request.id}) من فرع ${request.branch?.name || request.branchId}`,
                requestId: request.id
            });
            break;
            
        case NOTIFICATION_TYPES.REQUEST_APPROVED_BMGMT:
            // Notify branch sales who created it
            await createNotification({
                userId: request.createdById,
                type: event,
                title: 'تمت الموافقة المبدئية',
                message: `طلب ${request.id} جاهز لشحن المستندات`,
                requestId: request.id
            });
            // Notify Sales Mgmt
            await notifyRole('SALES_MGMT', {
                type: event,
                title: 'طلب جاهز لمراجعة المبيعات',
                message: `طلب ${request.id} حصل على موافقة إدارة الفروع بانتظار المراجعة`,
                requestId: request.id
            });
            break;

        case NOTIFICATION_TYPES.REQUEST_RETURNED:
            await createNotification({
                userId: request.createdById,
                type: event,
                title: 'طلب مُرجع للتعديل',
                message: `تم إرجاع طلب ${request.id} للتعديل. ${payload.comment || ''}`,
                requestId: request.id
            });
            break;

        case NOTIFICATION_TYPES.REQUEST_REJECTED:
            await createNotification({
                userId: request.createdById,
                type: event,
                title: 'تم رفض الطلب',
                message: `تم رفض طلب ${request.id} بشكل نهائي.`,
                requestId: request.id
            });
            break;

        case NOTIFICATION_TYPES.REQUEST_APPROVED_SALES:
            await notifyRole('OPERATIONS', {
                type: event,
                title: 'طلب جاهز للعمليات',
                message: `طلب ${request.id} معتمد من المبيعات ومرفق معه النموذج`,
                requestId: request.id
            });
            break;

        case NOTIFICATION_TYPES.SENT_TO_BANK:
            await createNotification({
                userId: request.createdById,
                type: event,
                title: 'تم الإرسال للبنك',
                message: `طلب ${request.id} قيد المراجعة في البنك`,
                requestId: request.id
            });
            break;

        case NOTIFICATION_TYPES.MID_ASSIGNED:
            await createNotification({
                userId: request.createdById,
                type: event,
                title: 'تم إصدار كود التاجر (MID)',
                message: `طلب ${request.id} له MID جديد. يرجى تأكيد تشغيل السوفتوير.`,
                requestId: request.id
            });
            break;

        case NOTIFICATION_TYPES.ACTIVATION_CONFIRMED:
            await notifyRole('OPERATIONS', {
                type: event,
                title: 'اكتملت التهيئة',
                message: `تم تشغيل السوفتوير للطلب ${request.id} بنجاح.`,
                requestId: request.id
            });
            break;
            
        case NOTIFICATION_TYPES.BATCH_SHIPPED:
            await notifyRole('BRANCH_MGMT', {
                type: event,
                title: 'باتش مستندات جديد',
                message: `تم إرسال باتش مستندات برقم بوليصة ${payload.waybillNumber}`,
            });
            break;
            
        case NOTIFICATION_TYPES.BATCH_RECEIVED:
            await createNotification({
                userId: payload.senderUserId,
                type: event,
                title: 'تم استلام باتش المستندات',
                message: `إدارة الفروع استلمت باتش المستندات الخاص بك (${payload.batchNumber})`,
            });
            break;
    }
}
