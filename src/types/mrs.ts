export type UserRole =
  | 'PUBLIC_VISITOR'
  | 'REGISTERED_ADVENTURER'
  | 'VERIFICATION_REVIEWER'
  | 'APPEAL_REVIEWER'
  | 'DESTINATION_MANAGER'
  | 'ORGANIZATION_MANAGER'
  | 'GUIDE_PROVIDER'
  | 'SPONSOR_ADVERTISER'
  | 'CUSTOMER_SUPPORT'
  | 'SECURITY_ADMIN'
  | 'PLATFORM_ADMIN'
  | 'GOVERNANCE_COMMITTEE'
  | 'SUPERUSER_EMERGENCY';

export type SubmissionState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'VALIDATION_PENDING'
  | 'UNDER_REVIEW'
  | 'ADDITIONAL_EVIDENCE_REQUIRED'
  | 'ESCALATED'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN';

export type AppealState =
  | 'NOT_ELIGIBLE'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ADDITIONAL_INFORMATION_REQUIRED'
  | 'UPHELD'
  | 'OVERTURNED'
  | 'CLOSED';

export type CredentialState =
  | 'NOT_ISSUED'
  | 'VALID'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'EXPIRED_IF_APPLICABLE';

export type ActivityCategory =
  | 'High-Altitude Mountaineering'
  | 'Alpine Trekking'
  | 'Technical Rock & Big Wall'
  | 'Polar & Glacial Expedition'
  | 'Ultra Trail & Endurance'
  | 'Ocean & Sea-to-Summit';

export type AchievementClassification =
  | 'COMPLETED_ACHIEVEMENT'
  | 'DOCUMENTED_ATTEMPT'
  | 'TRAINING_ASCENT';

export interface Destination {
  id: string; // DEST-001 .. DEST-100
  catalogNumber: number; // 1 .. 100
  name: string;
  nativeName?: string;
  country: string;
  region: string;
  continent: string;
  activityType: ActivityCategory;
  elevationMeters: number; // 0 to 8848.86
  latitude: number;
  longitude: number;
  sourceReference: string;
  approvedRoute: string;
  secondaryRoutes: string[];
  difficultyGrade: string;
  eligibilityRules: string;
  seasonalWindow: string;
  safetyAdvisory: string;
  permitAuthority: string;
  permitRequired: boolean;
  evidenceRequirements: string[];
  ruleVersion: string;
  lastUpdated: string;
  revisionHistory: {
    version: string;
    date: string;
    authorRole: string;
    summary: string;
    approvedByGovernance: boolean;
  }[];
}

export interface GpxAnalysisResult {
  fileName: string;
  fileSizeBytes: number;
  sha256Hash: string;
  trackpointCount: number;
  startTimestamp: string;
  endTimestamp: string;
  durationHours: number;
  totalDistanceKm: number;
  minElevationM: number;
  maxElevationM: number;
  cumulativeElevationGainM: number;
  maxSegmentSpeedKmh: number;
  routeContinuityPass: boolean;
  timestampMonotonicPass: boolean;
  duplicateHashDetected: boolean;
  exifMetadataPresent: boolean;
  anomalies: {
    code: string;
    severity: 'INFO' | 'WARNING' | 'HIGH_RISK';
    description: string;
    ruleRef: string;
  }[];
  automatedSummary: string;
}

export interface DecisionRecord {
  id: string;
  timestamp: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: UserRole;
  previousState: SubmissionState;
  newState: SubmissionState;
  reason: string;
  conflictOfInterestDeclared: boolean;
  checklistVerified: {
    routeMatch: boolean;
    elevationMatch: boolean;
    timestampsConsistent: boolean;
    identityCorroborated: boolean;
    permitVerified: boolean;
  };
}

export interface AchievementSubmission {
  id: string;
  adventurerId: string;
  adventurerName: string;
  destinationId: string;
  destinationName: string;
  elevationMeters: number;
  classification: AchievementClassification;
  ruleVersion: string;
  activityStartDate: string;
  activityEndDate: string;
  routeTaken: string;
  adventurerNotes: string;
  publicVisibilityConsent: boolean;
  state: SubmissionState;
  submittedAt: string;
  AssignedReviewerId?: string;
  gpxAnalysis: GpxAnalysisResult;
  supportingDocuments: {
    name: string;
    type: 'GPX_TRACK' | 'SUMMIT_PHOTO_EXIF' | 'PERMIT_DOCUMENT' | 'WITNESS_STATEMENT';
    sha256: string;
    privateStorageRef: string;
  }[];
  decisionHistory: DecisionRecord[];
  credentialId?: string;
  highRiskEscalated: boolean;
}

export interface AppealRecord {
  id: string;
  submissionId: string;
  destinationName: string;
  adventurerId: string;
  adventurerName: string;
  originalReviewerId: string;
  assignedAppealReviewerId?: string;
  state: AppealState;
  submittedAt: string;
  appealReason: string;
  additionalEvidenceSummary: string;
  conflictOfInterestChecked: boolean;
  decisionReason?: string;
  decidedAt?: string;
  decidedBy?: string;
}

export interface CredentialRecord {
  credentialId: string;
  submissionId: string;
  adventurerId: string;
  adventurerName: string;
  publicDisplayAuthorized: boolean;
  destinationId: string;
  destinationName: string;
  country: string;
  elevationMeters: number;
  activityType: ActivityCategory;
  classification: AchievementClassification;
  completedDate: string;
  issuedAt: string;
  ruleVersion: string;
  state: CredentialState;
  badgeTitle: string;
  badgeFreeStandard: true; // BR-002: Standard digital badges remain free
  verificationReviewerId: string;
  cryptographicDigest: string;
  statusReason?: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  handle: string;
  email: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  role: UserRole;
  country: string;
  bio: string;
  privacyDefaultPrivate: boolean;
  publicAchievementsOptIn: boolean;
  notificationPrefs: {
    emailStatusUpdates: boolean;
    inAppAlerts: boolean;
    securityAlerts: boolean;
  };
  organizationId?: string;
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'CLOSURE_REQUESTED';
  joinedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  category: 'SECURITY' | 'VERIFICATION' | 'APPEAL' | 'CREDENTIAL' | 'GOVERNANCE' | 'DESTINATION' | 'PRIVACY';
  action: string;
  targetId: string;
  reason: string;
  integrityHash: string;
}

export interface RequirementItem {
  id: string; // FR-001 .. FR-243, NFR-001 .. NFR-040, BR-001 .. BR-017
  category: 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'BUSINESS_RULE';
  moduleCode: string;
  moduleName: string;
  statement: string;
  constitutionArticle: string;
  roadmapPhase: number; // 1 .. 21
  status: 'OPERATIONAL' | 'FAIL_CLOSED_DISABLED' | 'ARCHITECTURAL_READY';
  verificationMethod: string;
  interactiveTargetTab?: 'landing' | 'destinations' | 'verify' | 'leaderboards' | 'workspace' | 'specification';
}
