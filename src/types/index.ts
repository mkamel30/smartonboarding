export type Role = 'ADMIN' | 'BRANCH_SALES' | 'BRANCH_SUPERVISOR' | 'BRANCH_MANAGER' | 'BRANCH_MGMT' | 'SALES_MGMT' | 'OPERATIONS' | 'MANAGEMENT';

export type RequestStatus = 
  | 'Pending'        // Waiting for first action
  | 'Submitted'      // Forwarded to next stage
  | 'Returned'       // Sent back for modification
  | 'Activated'      // Approved and MID assigned
  | 'Completed'      // Software activated
  | 'Rejected'       // Final rejection
  | 'Cancelled';     // Cancelled by branch

export type RequestStage = 
  | 'Branch Submission'
  | 'Supervisor Review'
  | 'Branch Management Review'
  | 'Sales Management Review'
  | 'Operations Review'
  | 'Bank Review'
  | 'Software Activation'
  | 'Completed'
  | 'Closed';

export interface Document {
    id: string;
    name: string;
    type: string;
    uploadDate: string;
    url: string;
}

export interface ApprovalHistory {
    id: string;
    fromStage?: string;
    toStage?: string;
    status: RequestStatus;
    changedById: string;
    changedByUser?: User;
    createdAt: string;
    comment?: string;
}

export interface Branch {
    id: string;
    name: string;
    code: string;
    governorate: string;
    address?: string;
    phone?: string;
    isActive: boolean;
}

export interface Notification {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    requestId?: string;
    isRead: boolean;
    createdAt: string;
}

export interface ShipmentBatch {
    id: string;
    batchNumber: string;
    waybillNumber: string;
    waybillFileId?: string;
    waybillFolderId?: string;
    senderBranchId: string;
    senderBranch?: Branch;
    senderUserId: string;
    senderUser?: Partial<User>;
    receivedAt?: string;
    receivedById?: string;
    receivedBy?: Partial<User>;
    status: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    requests?: Partial<OnboardingRequest>[];
    _count?: { requests: number };
}

export interface OnboardingRequest {
    id: string;
    branchId: string;
    branch?: Branch;
    governorate?: string;
    merchantNameAr: string;
    merchantNameEn?: string;
    activityType?: string;
    serviceType?: string;
    customerCode?: string;
    machineType?: string;
    address?: string;
    phone?: string;
    email?: string;
    responsiblePerson?: string;
    
    // Identity numbers
    commercialRegistryNo?: string;
    taxCardNo?: string;
    licenseNo?: string;
    nationalIdNo?: string;
    
    // Financial
    iban?: string;
    bankName?: string;
    
    // Technical
    machineCode?: string;
    machineSerial?: string;
    cardsAcceptance?: string;
    
    // Internal/Contract
    contractDate?: string;
    damanCode?: string;

    // Workflow fields
    stage: RequestStage;
    status: RequestStatus;
    assignedTo: string;
    ownerRole: Role;
    kycType?: 'KYC' | 'LKYC';

    // Tracking
    branchMgmtApprovedAt?: string;
    branchMgmtApprovedBy?: string;
    salesMgmtApprovedAt?: string;
    salesMgmtApprovedBy?: string;
    salesMgmtFormFileId?: string;
    sentToBankAt?: string;
    bankResponseAt?: string;
    bankResponse?: string;
    
    softwareActivated?: boolean;
    activatedAt?: string;
    activatedById?: string;

    shipmentBatchId?: string;
    shipmentBatch?: ShipmentBatch;
    documentsSentAt?: string;
    waybillNumber?: string;
    documentsReceivedAt?: string;
    documentsReceivedBy?: string;
    returnToStage?: string;

    // SLA fields
    slaStartDate: string;
    slaTargetDays: number;

    // Post-approval
    merchantId?: string;

    // History & Docs
    driveFolderId?: string;
    documents: Document[];
    history: ApprovalHistory[];
    createdBy?: User;
    createdAt: string;
    updatedAt: string;
}

export interface User {
    id: string;
    username: string;
    fullName: string;
    role: Role;
    branchId?: string;
    branch?: Branch;
    mfaEnabled: boolean;
    mfaVerified: boolean;
    isActive: boolean;
}
