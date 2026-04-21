export type Role = 'ADMIN' | 'BRANCH_SALES' | 'BRANCH_SUPERVISOR' | 'BRANCH_MANAGER' | 'OPERATIONS' | 'MANAGEMENT';

export type RequestStatus = 
  | 'Pending'        // Waiting for first action
  | 'Submitted'      // Forwarded to next stage
  | 'Returned'       // Sent back for modification
  | 'Activated'      // Approved and MID assigned
  | 'Rejected'       // Final rejection
  | 'Cancelled';     // Cancelled by branch

export type RequestStage = 
  | 'Supervisor Review'  // With Branch Supervisor
  | 'Operations Review'  // With Operations Team
  | 'Returned to Branch' // With Branch for edits
  | 'Completed'          // Process finished
  | 'Closed';            // Process aborted

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
    stage: string;
    status: RequestStatus;
    assignedTo: string;
    ownerRole: Role;

    // SLA fields
    slaStartDate: string;
    slaTargetDays: number;

    // Post-approval
    merchantId?: string;

    // History & Docs
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
