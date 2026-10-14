// Domain Types for Wash-Go Admin Panel

export type Role = 'ADMIN' | 'CUSTOMER' | 'AGENT' | 'STAFF';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type AgentStatus = 'PENDING_VERIFICATION' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type DocumentVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export type DocumentType =
  | 'GOVERNMENT_ID'
  | 'DRIVING_LICENSE'
  | 'VEHICLE_REGISTRATION'
  | 'POLICE_CLEARANCE'
  | 'INSURANCE';

export type BookingStatus =
  | 'CREATED'
  | 'CONFIRMED'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type AuditAction =
  | 'USER_CREATED'
  | 'USER_STATUS_CHANGED'
  | 'STAFF_CREATED'
  | 'STAFF_ASSIGNED'
  | 'STAFF_REASSIGNED'
  | 'BOOKING_STATUS_CHANGED'
  | 'PAYMENT_CREATED'
  | 'PAYMENT_CAPTURED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUNDED'
  | 'COUPON_CREATED'
  | 'COUPON_UPDATED'
  | 'SERVICE_CREATED'
  | 'SERVICE_UPDATED'
  | 'REVIEW_MODERATED'
  | 'AGENT_REGISTERED'
  | 'AGENT_STATUS_CHANGED'
  | 'AGENT_DOCUMENT_UPLOADED'
  | 'AGENT_DOCUMENT_REVIEWED';

export interface ApiResponse<T> {
  data: T;
  timestamp?: string;
  status?: number;
  message?: string;
  code?: string;
  fieldErrors?: Record<string, string>;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profileImageUrl?: string;
  preferredAddress?: string;
  role: Role;
  status: UserStatus;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
}

export interface AgentProfile {
  id: string;
  userId: string;
  agentCode: string;
  displayName: string;
  email: string;
  phone: string;
  status: AgentStatus;
  rejectionReason?: string | null;
  available: boolean;
  isOnline: boolean;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  headingDegrees?: number | null;
  locationUpdatedAt?: string | null;
  waterCapacityLiters?: number | null;
  hasPressureWasher?: boolean | null;
  hasVacuumExtractor?: boolean | null;
  averageRating?: number | null;
  totalReviewsCount?: number | null;
  totalCompletedWashes?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentDocument {
  id: string;
  agentId: string;
  agentName?: string;
  agentCode?: string;
  agentPhone?: string;
  documentType: DocumentType;
  documentNumber?: string | null;
  fileName: string;
  contentType: string;
  fileSize: number;
  verificationStatus: DocumentVerificationStatus;
  rejectionReason?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

export interface OperationsSummary {
  totalAgents: number;
  pendingReviewAgents: number;
  approvedAgents: number;
  rejectedAgents: number;
  suspendedAgents: number;
  onlineAgents: number;
  availableAgents: number;
  pendingKycDocuments: number;
  bookingsToday: number;
  completedBookingsToday: number;
  cancelledBookingsToday: number;
  capturedRevenueToday: number;
}

export interface BookingResponse {
  id: string;
  bookingReference: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  vehicleId: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  serviceId: string;
  serviceName?: string;
  servicePrice: number;
  status: BookingStatus;
  scheduledStartTime: string;
  agentId?: string | null;
  agentName?: string | null;
  cancellationReason?: string | null;
  addressLine?: string | null;
  city?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: Role;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
