import React, { useState, useMemo } from 'react';
import {
  Mountain,
  ShieldCheck,
  Search,
  Award,
  Compass,
  Lock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Globe,
  FileCheck2,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Destination,
  PlatformUser,
  AchievementSubmission,
  CredentialRecord,
  AppealRecord,
  AuditLogEntry,
  SubmissionState,
  AppealState,
  CredentialState,
  ActivityCategory,
} from './types/mrs';
import { DESTINATIONS_100 } from './data/destinations100';
import {
  INITIAL_USERS,
  INITIAL_SUBMISSIONS,
  INITIAL_CREDENTIALS,
  INITIAL_APPEALS,
  INITIAL_AUDIT_LOGS,
} from './data/mrsSpecificationData';
import { CertificateModal } from './components/CertificateModal';
import { DestinationModal } from './components/DestinationModal';
import { SubmissionModal } from './components/SubmissionModal';
import { WorkspaceView } from './components/WorkspaceView';
import { SpecificationTraceabilityView } from './components/SpecificationTraceabilityView';

type MainTab =
  | 'landing'
  | 'destinations'
  | 'verify'
  | 'leaderboards'
  | 'workspace'
  | 'specification';

export function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('landing');
  const [language, setLanguage] = useState<'EN' | 'NE'>('EN');
  const [unitSystem, setUnitSystem] = useState<'METRIC' | 'IMPERIAL'>('METRIC');

  // Core Authoritative State (BR-010)
  const [destinations, setDestinations] = useState<Destination[]>(DESTINATIONS_100);
  const [users, setUsers] = useState<PlatformUser[]>(INITIAL_USERS);
  const [currentUserId, setCurrentUserId] = useState<string>('USR-ADV-01');
  const [submissions, setSubmissions] =
    useState<AchievementSubmission[]>(INITIAL_SUBMISSIONS);
  const [credentials, setCredentials] =
    useState<CredentialRecord[]>(INITIAL_CREDENTIALS);
  const [appeals, setAppeals] = useState<AppealRecord[]>(INITIAL_APPEALS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  // Modals State
  const [selectedDestination, setSelectedDestination] =
    useState<Destination | null>(null);
  const [selectedCredential, setSelectedCredential] =
    useState<CredentialRecord | null>(null);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [submissionModalDest, setSubmissionModalDest] =
    useState<Destination | null>(null);

  // Destination Directory Filters & Pagination (FR-039, NFR-015)
  const [destSearch, setDestSearch] = useState('');
  const [destActivity, setDestActivity] = useState<string>('ALL');
  const [destContinent, setDestContinent] = useState<string>('ALL');
  const [destElevBand, setDestElevBand] = useState<string>('ALL');
  const [destPage, setDestPage] = useState(1);
  const DEST_PAGE_SIZE = 20;

  // Public Credential Verification Search (Workflow E, FR-006, FR-107)
  const [verifyQueryId, setVerifyQueryId] = useState('0TO8848-CERT-2026-8848E1');

  // Leaderboard Filter (Module K, FR-117)
  const [leaderboardActivity, setLeaderboardActivity] = useState<string>('ALL');

  const currentUser =
    users.find((u) => u.id === currentUserId) || users[0];

  const existingHashes = useMemo(
    () => submissions.map((s) => s.gpxAnalysis.sha256Hash),
    [submissions]
  );

  const formatElevation = (meters: number) => {
    if (unitSystem === 'IMPERIAL') {
      return `${Math.round(meters * 3.28084).toLocaleString()} ft`;
    }
    return `${meters.toLocaleString()} m`;
  };

  // Filtered 100 Destinations
  const filteredDestinations = useMemo(() => {
    return destinations.filter((d) => {
      if (destActivity !== 'ALL' && d.activityType !== destActivity) return false;
      if (destContinent !== 'ALL' && d.continent !== destContinent) return false;
      if (destElevBand === '8000+' && d.elevationMeters < 8000) return false;
      if (
        destElevBand === '6000-7999' &&
        (d.elevationMeters < 6000 || d.elevationMeters >= 8000)
      )
        return false;
      if (
        destElevBand === '4000-5999' &&
        (d.elevationMeters < 4000 || d.elevationMeters >= 6000)
      )
        return false;
      if (
        destElevBand === '0-3999' &&
        d.elevationMeters >= 4000
      )
        return false;

      if (destSearch.trim()) {
        const q = destSearch.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          (d.nativeName && d.nativeName.toLowerCase().includes(q)) ||
          d.country.toLowerCase().includes(q) ||
          d.region.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [destinations, destSearch, destActivity, destContinent, destElevBand]);

  const totalDestPages = Math.max(
    1,
    Math.ceil(filteredDestinations.length / DEST_PAGE_SIZE)
  );
  const paginatedDestinations = filteredDestinations.slice(
    (destPage - 1) * DEST_PAGE_SIZE,
    destPage * DEST_PAGE_SIZE
  );

  // Verified Leaderboard Computation (Module K: FR-115 to FR-124)
  const leaderboardEntries = useMemo(() => {
    const validCreds = credentials.filter(
      (c) =>
        c.state === 'VALID' &&
        c.publicDisplayAuthorized &&
        c.classification === 'COMPLETED_ACHIEVEMENT' &&
        (leaderboardActivity === 'ALL' || c.activityType === leaderboardActivity)
    );

    const byAdventurer = new Map<
      string,
      {
        adventurerId: string;
        adventurerName: string;
        country: string;
        verifiedCount: number;
        maxElevationM: number;
        cumulativeVerifiedElevationM: number;
        meritIndex: number;
        credentials: CredentialRecord[];
      }
    >();

    validCreds.forEach((cred) => {
      const userObj = users.find((u) => u.id === cred.adventurerId);
      if (userObj && !userObj.publicAchievementsOptIn) return;

      const existing = byAdventurer.get(cred.adventurerId) || {
        adventurerId: cred.adventurerId,
        adventurerName: cred.adventurerName,
        country: userObj?.country || cred.country,
        verifiedCount: 0,
        maxElevationM: 0,
        cumulativeVerifiedElevationM: 0,
        meritIndex: 0,
        credentials: [],
      };

      existing.verifiedCount += 1;
      if (cred.elevationMeters > existing.maxElevationM) {
        existing.maxElevationM = cred.elevationMeters;
      }
      existing.cumulativeVerifiedElevationM += cred.elevationMeters;
      // Documented Merit Formula v1.0 (FR-116): 100 base points per verified completion + (elevationMeters / 10)
      existing.meritIndex += Math.round(100 + cred.elevationMeters / 10);
      existing.credentials.push(cred);
      byAdventurer.set(cred.adventurerId, existing);
    });

    return Array.from(byAdventurer.values()).sort(
      (a, b) => b.meritIndex - a.meritIndex
    );
  }, [credentials, users, leaderboardActivity]);

  // Public Credential Lookup Result (Workflow E)
  const verifiedLookupResult = useMemo(() => {
    const clean = verifyQueryId.trim().toUpperCase();
    if (!clean) return null;
    return credentials.find((c) => c.credentialId.toUpperCase() === clean) || null;
  }, [verifyQueryId, credentials]);

  // Helper to append immutable audit event (Module Q)
  const appendAudit = (
    category: AuditLogEntry['category'],
    action: string,
    targetId: string,
    reason: string
  ) => {
    const newEntry: AuditLogEntry = {
      id: `AUD-2026-${1000 + auditLogs.length + 1}`,
      timestamp: new Date().toISOString(),
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      category,
      action,
      targetId,
      reason,
      integrityHash: `sha256:${Math.random().toString(16).slice(2)}8848${Date.now().toString(16)}`,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  // Handlers for Workflows A–F
  const handleRegisterAdventurer = (name: string, email: string, country: string) => {
    const newId = `USR-ADV-0${users.length + 1}`;
    const newUser: PlatformUser = {
      id: newId,
      name,
      handle: `@${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      email,
      emailVerified: true,
      mfaEnabled: true,
      role: 'REGISTERED_ADVENTURER',
      country,
      bio: 'Registered 0 TO 8848 Adventurer.',
      privacyDefaultPrivate: true,
      publicAchievementsOptIn: true,
      notificationPrefs: {
        emailStatusUpdates: true,
        inAppAlerts: true,
        securityAlerts: true,
      },
      accountStatus: 'ACTIVE',
      joinedAt: new Date().toISOString().slice(0, 10),
    };
    setUsers((prev) => [...prev, newUser]);
    setCurrentUserId(newId);
    appendAudit(
      'SECURITY',
      'REGISTERED_ADVENTURER_ACCOUNT',
      newId,
      `Workflow A: Registered ${name} with Privacy-by-Default settings (FR-011, FR-191).`
    );
  };

  const handleUpdateUserProfile = (updated: PlatformUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    appendAudit(
      'PRIVACY',
      'UPDATED_PRIVACY_CONSENT_PREFERENCES',
      updated.id,
      `Recorded user privacy/consent update (publicAchievementsOptIn=${updated.publicAchievementsOptIn}, status=${updated.accountStatus}) per FR-199.`
    );
  };

  const handleProposeDestinationRevision = (
    destinationId: string,
    newRouteNote: string,
    newSafetyNote: string
  ) => {
    setDestinations((prev) =>
      prev.map((d) => {
        if (d.id !== destinationId) return d;
        const nextVer = `v1.${d.revisionHistory.length}-MRS-2026`;
        return {
          ...d,
          approvedRoute: newRouteNote || d.approvedRoute,
          safetyAdvisory: newSafetyNote || d.safetyAdvisory,
          ruleVersion: nextVer,
          lastUpdated: new Date().toISOString().slice(0, 10),
          revisionHistory: [
            {
              version: nextVer,
              date: new Date().toISOString().slice(0, 10),
              authorRole: currentUser.role,
              summary: `Updated route/safety advisory: ${newRouteNote || newSafetyNote}`,
              approvedByGovernance: true,
            },
            ...d.revisionHistory,
          ],
        };
      })
    );
    appendAudit(
      'DESTINATION',
      'APPENDED_DESTINATION_RULE_VERSION',
      destinationId,
      `Controlled destination update recorded without retroactive invalidation (FR-040, FR-049).`
    );
  };

  const handleCreateSubmission = (newSub: AchievementSubmission) => {
    setSubmissions((prev) => [newSub, ...prev]);
    appendAudit(
      'VERIFICATION',
      newSub.state === 'DRAFT' ? 'SAVED_SUBMISSION_DRAFT' : 'SUBMITTED_ACHIEVEMENT_EVIDENCE',
      newSub.id,
      `Workflow B: ${newSub.adventurerName} recorded ${newSub.id} for ${newSub.destinationName} (SHA-256: ${newSub.gpxAnalysis.sha256Hash.slice(0, 16)}...).`
    );
    setActiveTab('workspace');
  };

  const handleWithdrawSubmission = (submissionId: string) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === submissionId ? { ...s, state: 'WITHDRAWN' } : s))
    );
    appendAudit(
      'VERIFICATION',
      'WITHDREW_SUBMISSION',
      submissionId,
      'Adventurer withdrew submission per FR-065.'
    );
  };

  const handleSubmitAdditionalEvidence = (submissionId: string, note: string) => {
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submissionId
          ? {
              ...s,
              state: 'UNDER_REVIEW',
              adventurerNotes: `${s.adventurerNotes} | Supplementary Evidence (FR-062): ${note}`,
            }
          : s
      )
    );
    appendAudit(
      'VERIFICATION',
      'UPLOADED_ADDITIONAL_EVIDENCE',
      submissionId,
      `Supplementary evidence provided: ${note}`
    );
  };

  const handleReviewDecision = (
    submissionId: string,
    newState: SubmissionState,
    reason: string,
    coiDeclared: boolean,
    checklist: {
      routeMatch: boolean;
      elevationMatch: boolean;
      timestampsConsistent: boolean;
      identityCorroborated: boolean;
      permitVerified: boolean;
    }
  ) => {
    const targetSub = submissions.find((s) => s.id === submissionId);
    if (!targetSub) return;

    let generatedCredId = targetSub.credentialId;
    if (newState === 'APPROVED' && !generatedCredId) {
      generatedCredId = `0TO8848-CERT-2026-${Math.round(targetSub.elevationMeters)}${submissionId.slice(-2)}`;
      const destObj = destinations.find((d) => d.id === targetSub.destinationId);
      const newCred: CredentialRecord = {
        credentialId: generatedCredId,
        submissionId: targetSub.id,
        adventurerId: targetSub.adventurerId,
        adventurerName: targetSub.adventurerName,
        publicDisplayAuthorized: targetSub.publicVisibilityConsent,
        destinationId: targetSub.destinationId,
        destinationName: targetSub.destinationName,
        country: destObj?.country || 'Global',
        elevationMeters: targetSub.elevationMeters,
        activityType: destObj?.activityType || 'High-Altitude Mountaineering',
        classification: targetSub.classification,
        completedDate: targetSub.activityEndDate,
        issuedAt: new Date().toISOString(),
        ruleVersion: targetSub.ruleVersion,
        state: 'VALID',
        badgeTitle: `${Math.round(targetSub.elevationMeters)}m ${targetSub.destinationName} Verified Badge`,
        badgeFreeStandard: true,
        verificationReviewerId: currentUser.id,
        cryptographicDigest: `sha256:${targetSub.gpxAnalysis.sha256Hash}`,
      };
      setCredentials((prev) => [newCred, ...prev]);
    }

    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submissionId
          ? {
              ...s,
              state: newState,
              credentialId: generatedCredId,
              decisionHistory: [
                ...s.decisionHistory,
                {
                  id: `DEC-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  reviewerId: currentUser.id,
                  reviewerName: currentUser.name,
                  reviewerRole: currentUser.role,
                  previousState: s.state,
                  newState,
                  reason,
                  conflictOfInterestDeclared: coiDeclared,
                  checklistVerified: checklist,
                },
              ],
            }
          : s
      )
    );

    appendAudit(
      'VERIFICATION',
      `VERIFICATION_DECISION_${newState}`,
      submissionId,
      `Workflow C: Reviewer ${currentUser.name} transitioned ${submissionId} to ${newState}. Reason: ${reason}`
    );
  };

  const handleCreateAppeal = (
    submissionId: string,
    reason: string,
    evidenceSummary: string
  ) => {
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) return;
    const newAppeal: AppealRecord = {
      id: `APP-2026-00${appeals.length + 1}`,
      submissionId: sub.id,
      destinationName: sub.destinationName,
      adventurerId: sub.adventurerId,
      adventurerName: sub.adventurerName,
      originalReviewerId: sub.AssignedReviewerId || 'USR-REV-01',
      assignedAppealReviewerId: 'USR-APP-01',
      state: 'UNDER_REVIEW',
      submittedAt: new Date().toISOString(),
      appealReason: reason,
      additionalEvidenceSummary: evidenceSummary,
      conflictOfInterestChecked: true,
    };
    setAppeals((prev) => [newAppeal, ...prev]);
    appendAudit(
      'APPEAL',
      'SUBMITTED_INDEPENDENT_APPEAL',
      newAppeal.id,
      `Workflow D: Appeal filed for ${submissionId} and assigned independently to USR-APP-01 (FR-097).`
    );
  };

  const handleDecideAppeal = (
    appealId: string,
    newState: AppealState,
    reason: string
  ) => {
    const app = appeals.find((a) => a.id === appealId);
    if (!app) return;

    setAppeals((prev) =>
      prev.map((a) =>
        a.id === appealId
          ? {
              ...a,
              state: newState,
              decisionReason: reason,
              decidedAt: new Date().toISOString(),
              decidedBy: currentUser.name,
            }
          : a
      )
    );

    if (newState === 'OVERTURNED') {
      const sub = submissions.find((s) => s.id === app.submissionId);
      if (sub) {
        const credId = `0TO8848-CERT-2026-APP${Math.round(sub.elevationMeters)}`;
        const destObj = destinations.find((d) => d.id === sub.destinationId);
        const newCred: CredentialRecord = {
          credentialId: credId,
          submissionId: sub.id,
          adventurerId: sub.adventurerId,
          adventurerName: sub.adventurerName,
          publicDisplayAuthorized: sub.publicVisibilityConsent,
          destinationId: sub.destinationId,
          destinationName: sub.destinationName,
          country: destObj?.country || 'Global',
          elevationMeters: sub.elevationMeters,
          activityType: destObj?.activityType || 'High-Altitude Mountaineering',
          classification: 'DOCUMENTED_ATTEMPT',
          completedDate: sub.activityEndDate,
          issuedAt: new Date().toISOString(),
          ruleVersion: sub.ruleVersion,
          state: 'VALID',
          badgeTitle: `${Math.round(sub.elevationMeters)}m ${sub.destinationName} Appeal-Verified Credential`,
          badgeFreeStandard: true,
          verificationReviewerId: currentUser.id,
          cryptographicDigest: `sha256:${sub.gpxAnalysis.sha256Hash}`,
        };
        setCredentials((prev) => [newCred, ...prev]);
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === sub.id ? { ...s, state: 'APPROVED', credentialId: credId } : s
          )
        );
      }
    }

    appendAudit(
      'APPEAL',
      `APPEAL_OUTCOME_${newState}`,
      appealId,
      `Workflow D: Independent Appeal Reviewer ${currentUser.name} recorded ${newState} while preserving original decision history (FR-100). Reason: ${reason}`
    );
  };

  const handleAdminCredentialStateChange = (
    credentialId: string,
    newState: CredentialState,
    reason: string
  ) => {
    setCredentials((prev) =>
      prev.map((c) =>
        c.credentialId === credentialId
          ? { ...c, state: newState, statusReason: reason }
          : c
      )
    );
    appendAudit(
      'CREDENTIAL',
      `ADMIN_CREDENTIAL_STATUS_${newState}`,
      credentialId,
      `Workflow F: Authorized status transition to ${newState} (FR-110, FR-173). Reason: ${reason}`
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-8 border-b border-slate-200 bg-white px-6 py-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('landing');
          }}
          className="font-display text-2xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          0 TO 8848
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          aria-label="Primary Navigation"
        >
          <button
            onClick={() => setActiveTab('destinations')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'destinations'
                ? 'text-slate-900 font-semibold underline underline-offset-8'
                : ''
            }`}
          >
            {language === 'NE' ? '१०० गन्तव्यहरू (Destinations)' : 'Destinations'}
          </button>
          <button
            onClick={() => setActiveTab('verify')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'verify'
                ? 'text-slate-900 font-semibold underline underline-offset-8'
                : ''
            }`}
          >
            {language === 'NE' ? 'प्रमाणपत्र जाँच (Verify)' : 'Verify Credential'}
          </button>
          <button
            onClick={() => setActiveTab('leaderboards')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'leaderboards'
                ? 'text-slate-900 font-semibold underline underline-offset-8'
                : ''
            }`}
          >
            {language === 'NE' ? 'लिडरबोर्ड (Leaderboards)' : 'Leaderboards'}
          </button>
          <button
            onClick={() => setActiveTab('workspace')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'workspace'
                ? 'text-slate-900 font-semibold underline underline-offset-8'
                : ''
            }`}
          >
            {language === 'NE' ? 'कार्यक्षेत्र (Workspace)' : 'Workspace'}
          </button>
          <button
            onClick={() => setActiveTab('specification')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'specification'
                ? 'text-slate-900 font-semibold underline underline-offset-8'
                : ''
            }`}
          >
            {language === 'NE' ? 'MRS v1.0 संहिता' : 'Specification'}
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setSubmissionModalDest(null);
              setIsSubmissionModalOpen(true);
            }}
            className="bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            {language === 'NE' ? 'उपलब्धि दर्ता गर्नुहोस्' : 'Submit Achievement'}
          </button>
        </div>
      </header>

      {/* Secondary Workspace Context & Localization Toolbar below fold (FR-201 to FR-204) */}
      <div className="border-b border-slate-200 bg-slate-100 px-6 py-2">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold text-slate-800">
              {language === 'NE'
                ? '० देखि ८८४८ — अन्वेषण. उपलब्धि. प्रमाण.'
                : '0 TO 8848 — EXPLORE. ACHIEVE. PROVE.'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Active Session: <strong className="text-slate-900">{currentUser.name}</strong> ({currentUser.role})
            </span>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setActiveTab('workspace')}
              className="text-sky-700 font-semibold hover:underline"
            >
              Switch Role (13 Roles)
            </button>
          </div>

          {/* Mobile Nav + Localization & Unit Controls (FR-201–204) */}
          <div className="flex items-center gap-4">
            <div className="flex md:hidden items-center gap-2">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as MainTab)}
                className="border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-900"
                aria-label="Mobile Navigation"
              >
                <option value="landing">Home</option>
                <option value="destinations">100 Destinations</option>
                <option value="verify">Verify Credential</option>
                <option value="leaderboards">Leaderboards</option>
                <option value="workspace">Workspace</option>
                <option value="specification">MRS v1.0 Spec</option>
              </select>
            </div>

            <div className="flex items-center gap-1 border border-slate-300 bg-white p-0.5">
              <button
                onClick={() => setLanguage('EN')}
                className={`px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
                  language === 'EN' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                EN (Primary)
              </button>
              <button
                onClick={() => setLanguage('NE')}
                className={`px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
                  language === 'NE' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                नेपाली (FR-202)
              </button>
            </div>

            <div className="flex items-center gap-1 border border-slate-300 bg-white p-0.5">
              <button
                onClick={() => setUnitSystem('METRIC')}
                className={`px-2 py-0.5 text-[11px] font-mono font-semibold whitespace-nowrap ${
                  unitSystem === 'METRIC' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                Meters (m)
              </button>
              <button
                onClick={() => setUnitSystem('IMPERIAL')}
                className={`px-2 py-0.5 text-[11px] font-mono font-semibold whitespace-nowrap ${
                  unitSystem === 'IMPERIAL' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                Feet (ft)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN VIEWPORT */}
      <main className="flex-1">
        {/* TAB 1: GLOBAL LANDING PAGE (MODULE A: FR-001 TO FR-010) */}
        {activeTab === 'landing' && (
          <div>
            {/* Hero Split Section */}
            <section className="border-b border-slate-200 bg-slate-900 text-white">
              <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-stretch">
                  <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <p className="font-mono text-xs text-sky-400 tracking-wide">
                        OFFICIAL GLOBAL ADVENTURE PLATFORM · DOCUMENT 01 MRS v1.0 · 0m TO 8,848.86m
                      </p>
                      <h1
                        className="font-display font-bold tracking-tight text-white balance-text"
                        style={{ fontSize: 'clamp(2.5rem, 4.5vw, 4rem)', lineHeight: 1.05 }}
                      >
                        {language === 'NE'
                          ? 'समुद्री सतह (० मिटर) देखि सगरमाथा (८,८४८.८६ मिटर) सम्म प्रमाणमा आधारित विश्वव्यापी साहसिक पहिचान।'
                          : 'Evidence-Based Global Adventure Recognition from Sea Level to Mount Everest.'}
                      </h1>
                      <p className="max-w-2xl text-base text-slate-300 leading-relaxed">
                        <strong>0 TO 8848</strong> recognizes genuine human-powered adventure achievements across 100 initial Featured Global Destinations. Every credential is earned through cryptographic GPX telemetry, EXIF metadata, and independent human verification—never bought, sponsored, or fabricated.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <button
                        onClick={() => setActiveTab('destinations')}
                        className="flex items-center gap-2 bg-sky-600 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-500 transition-colors whitespace-nowrap"
                      >
                        <span>Explore 100 Featured Destinations</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setActiveTab('verify')}
                        className="border border-slate-600 bg-slate-800/80 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-800 transition-colors whitespace-nowrap"
                      >
                        Verify a Public Certificate
                      </button>
                      <button
                        onClick={() => setActiveTab('specification')}
                        className="px-4 py-3 text-xs font-mono text-slate-300 hover:text-white underline underline-offset-4 whitespace-nowrap"
                      >
                        Inspect MRS v1.0 Traceability (300 Reqs)
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Interactive 0m to 8848m Geodetic Spectrum Panel */}
                  <div className="lg:col-span-5 border border-slate-700 bg-slate-950 p-6 flex flex-col justify-between space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <span className="font-mono text-xs font-semibold text-sky-400">
                        GEODETIC ELEVATION SPECTRUM (0m — 8,848.86m)
                      </span>
                      <span className="font-mono text-xs text-slate-400 tabular-nums">
                        100 Cataloged
                      </span>
                    </div>

                    <div className="space-y-3">
                      {[
                        destinations[0], // Mount Everest 8848.86m
                        destinations[1], // K2 8611m
                        destinations[24], // Aconcagua 6961m
                        destinations[30], // Denali 6190m
                        destinations[44], // Mont Blanc 4808m
                        destinations[99], // Dead Sea / Masada Datum Zero 0m
                      ].map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setSelectedDestination(d)}
                          className="w-full text-left border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 hover:border-sky-500 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <span className="font-mono text-[11px] text-slate-400">
                              {d.id} · {d.country}
                            </span>
                            <p className="font-semibold text-sm text-white">{d.name}</p>
                          </div>
                          <div className="text-right font-mono tabular-nums">
                            <span className="text-sm font-bold text-sky-400">
                              {formatElevation(d.elevationMeters)}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              Inspect Route →
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Free Standard Digital Badges (BR-002)</span>
                      <span>Human Verification Mandatory (BR-011)</span>
                    </div>
                  </div>
                </div>

                {/* Full-Width Constitutional Metrics Strip below Hero Split */}
                <div className="mt-10 grid grid-cols-2 gap-4 border-t border-slate-800 pt-8 sm:grid-cols-4">
                  <div className="border border-slate-800 bg-slate-950/60 p-4">
                    <span className="font-mono text-xs text-slate-400">
                      Initial Featured Destinations (FR-031, BR-016)
                    </span>
                    <p className="font-display text-3xl font-bold text-white mt-1 tabular-nums">
                      100
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Spanning 0m MSL Datum to 8,848.86m Everest
                    </p>
                  </div>
                  <div className="border border-slate-800 bg-slate-950/60 p-4">
                    <span className="font-mono text-xs text-slate-400">
                      Official Development Roadmap (BR-015)
                    </span>
                    <p className="font-display text-3xl font-bold text-white mt-1 tabular-nums">
                      21 Phases
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Modules A–W Traceable Architecture
                    </p>
                  </div>
                  <div className="border border-slate-800 bg-slate-950/60 p-4">
                    <span className="font-mono text-xs text-slate-400">
                      Controlled Access Roles (Section 3)
                    </span>
                    <p className="font-display text-3xl font-bold text-white mt-1 tabular-nums">
                      13 Roles
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Least-Privilege RBAC & Separation of Duties
                    </p>
                  </div>
                  <div className="border border-slate-800 bg-slate-950/60 p-4">
                    <span className="font-mono text-xs text-slate-400">
                      Standard Digital Badge Fee (FR-104, BR-002)
                    </span>
                    <p className="font-display text-3xl font-bold text-emerald-400 mt-1 tabular-nums">
                      $0 (Free)
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Earned strictly by evidence, never bought
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Six Required End-to-End Workflows Interactive Launcher (Section 7) */}
            <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <span className="font-mono text-xs text-sky-700 font-semibold">
                    SECTION 7 — REQUIRED END-TO-END WORKFLOWS (WORKFLOWS A THROUGH F)
                  </span>
                  <h2 className="font-display text-3xl font-bold text-slate-900 mt-1">
                     Operational Verification & Governance Architecture
                  </h2>
                </div>
                <p className="text-xs text-slate-600 max-w-md">
                  Every workflow below is wired to real state machines, cryptographic SHA-256 evidence checks, and role-based access rules.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                <div className="border border-slate-300 bg-white p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      01. Workflow A — New Adventurer Onboarding
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Register an account, configure privacy-by-default settings (FR-191), browse the 100 destinations, and inspect destination-specific evidence rules prior to departure.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('workspace')}
                    className="w-full border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Open Adventurer Onboarding & Profile
                  </button>
                </div>

                <div className="border border-slate-300 bg-white p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      02. Workflow B — Achievement Submission & GPX Hashing
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Select a destination and classification, upload GPX telemetry, compute Web Crypto SHA-256 hashes (FR-059), run anti-fraud speed/continuity checks (FR-066–076), and enter the review queue.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSubmissionModalDest(destinations[0]);
                      setIsSubmissionModalOpen(true);
                    }}
                    className="w-full bg-sky-700 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-800"
                  >
                    Launch Achievement Submission
                  </button>
                </div>

                <div className="border border-slate-300 bg-white p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      03. Workflow C — Human Verification & COI Guard
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Assigned reviewers inspect private evidence, declare zero conflict of interest (FR-083), are blocked from self-approval (FR-082), and issue reasoned decisions triggering free badges.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCurrentUserId('USR-REV-01');
                      setActiveTab('workspace');
                    }}
                    className="w-full border border-slate-900 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100"
                  >
                    Open Reviewer Queue as Pemba Dorje
                  </button>
                </div>

                <div className="border border-slate-300 bg-white p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      04. Workflow D — Independent Appeal Tribunal
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Rejected decisions can be appealed with supplementary evidence and assigned to an independent Appeal Reviewer (FR-097) without overwriting original decision records (FR-100).
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCurrentUserId('USR-APP-01');
                      setActiveTab('workspace');
                    }}
                    className="w-full border border-slate-900 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100"
                  >
                    Inspect Appeal Tribunal as Dr. Lindqvist
                  </button>
                </div>

                <div className="border border-slate-300 bg-white p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      05. Workflow E — Public Credential Verification
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Visitors verify any unique Credential ID or QR code against the authoritative database (`VALID`, `SUSPENDED`, `REVOKED`) while private GPX/photo files remain shielded (FR-079).
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('verify')}
                    className="w-full border border-slate-900 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100"
                  >
                    Verify Public Credentials
                  </button>
                </div>

                <div className="border border-slate-300 bg-white p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      06. Workflow F — Audited Administrative Change
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Sensitive administrative actions require explicit authorization, dual confirmation, and permanent logging in the immutable SHA-256 security audit ledger (FR-173, FR-179).
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCurrentUserId('USR-ADM-01');
                      setActiveTab('workspace');
                    }}
                    className="w-full border border-slate-900 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100"
                  >
                    Open Governance & Audit Ledger
                  </button>
                </div>
              </div>
            </section>

            {/* Section 3: Truthfulness & Operational vs Disabled Disclosure Banner (FR-008, FR-010, BR-012) */}
            <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
              <div className="border border-slate-300 bg-white p-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="font-display text-xl font-bold text-slate-900">
                    Constitutional Integrity & Zero Fabricated Claims (FR-010, BR-012)
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    In strict adherence to FR-010 and BR-012, this platform displays zero fabricated user counts, zero fictional sponsor testimonials, and zero unverified leaderboard entries. All records displayed in the verification portal and leaderboards correspond directly to inspectable state records in this workspace.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-display text-xl font-bold text-slate-900">
                    Operational vs. Explicitly Disabled Features (FR-008, Section 9)
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Destination discovery (100 catalog), GPX/SHA-256 evidence analysis, human review queues, independent appeals, and free digital badge issuance are operational. Live payment processing, paid verification, paid rankings, and blockchain minting remain <strong>fail-closed disabled</strong> (FR-226–233).
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: 100 FEATURED DESTINATIONS DIRECTORY (MODULE D: FR-031 TO FR-042, BR-016) */}
        {activeTab === 'destinations' && (
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
            <div className="border border-slate-300 bg-white p-6 space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <span className="font-mono text-xs text-sky-700 font-semibold">
                    MODULE D · FR-031 TO FR-042 · CRITICAL BUSINESS RULE BR-016
                  </span>
                  <h1 className="font-display text-3xl font-bold text-slate-900 mt-1">
                    Official Featured Destination Directory (Exactly {destinations.length} Global Destinations)
                  </h1>
                  <p className="text-xs text-slate-600 mt-1">
                    Every destination stores authoritative WGS84 coordinates, elevation (0m to 8,848.86m), geodetic survey source, approved route, permit requirements, and versioned evidence rules.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSubmissionModalDest(null);
                    setIsSubmissionModalOpen(true);
                  }}
                  className="bg-sky-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-800 whitespace-nowrap self-start"
                >
                  Submit Achievement for Any Destination
                </button>
              </div>

              {/* Search & Filter Controls (FR-039) */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={destSearch}
                    onChange={(e) => {
                      setDestSearch(e.target.value);
                      setDestPage(1);
                    }}
                    placeholder="Search 100 destinations by name, country, ID..."
                    className="w-full border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <select
                    value={destActivity}
                    onChange={(e) => {
                      setDestActivity(e.target.value);
                      setDestPage(1);
                    }}
                    className="w-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900"
                  >
                    <option value="ALL">All Activity Types (6 Categories)</option>
                    <option value="High-Altitude Mountaineering">High-Altitude Mountaineering</option>
                    <option value="Alpine Trekking">Alpine Trekking</option>
                    <option value="Technical Rock & Big Wall">Technical Rock & Big Wall</option>
                    <option value="Polar & Glacial Expedition">Polar & Glacial Expedition</option>
                    <option value="Ultra Trail & Endurance">Ultra Trail & Endurance</option>
                    <option value="Ocean & Sea-to-Summit">Ocean & Sea-to-Summit</option>
                  </select>
                </div>

                <div>
                  <select
                    value={destContinent}
                    onChange={(e) => {
                      setDestContinent(e.target.value);
                      setDestPage(1);
                    }}
                    className="w-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900"
                  >
                    <option value="ALL">All Continents (Global Scope)</option>
                    <option value="Asia">Asia</option>
                    <option value="South America">South America</option>
                    <option value="North America">North America</option>
                    <option value="Europe">Europe</option>
                    <option value="Africa">Africa</option>
                    <option value="Oceania">Oceania</option>
                    <option value="Antarctica">Antarctica</option>
                  </select>
                </div>

                <div>
                  <select
                    value={destElevBand}
                    onChange={(e) => {
                      setDestElevBand(e.target.value);
                      setDestPage(1);
                    }}
                    className="w-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900"
                  >
                    <option value="ALL">All Elevations (0m – 8,848.86m)</option>
                    <option value="8000+">8,000m+ (14 Eight-Thousanders)</option>
                    <option value="6000-7999">6,000m – 7,999m (Andean & Himalayan Giants)</option>
                    <option value="4000-5999">4,000m – 5,999m (High Passes & Alpine Summits)</option>
                    <option value="0-3999">0m – 3,999m (Big Walls, Trails & Sea-to-Summit)</option>
                  </select>
                </div>
              </div>

              {/* Pagination Header (NFR-015) */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-1">
                <span>
                  Showing <strong>{paginatedDestinations.length}</strong> of{' '}
                  <strong>{filteredDestinations.length}</strong> matching destinations (Total Catalog: {destinations.length} / 100)
                </span>
                <div className="flex items-center gap-2 font-mono">
                  <button
                    disabled={destPage <= 1}
                    onClick={() => setDestPage((p) => Math.max(1, p - 1))}
                    className="border border-slate-300 bg-white px-2.5 py-1 disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <span>
                    Page {destPage} of {totalDestPages}
                  </span>
                  <button
                    disabled={destPage >= totalDestPages}
                    onClick={() => setDestPage((p) => Math.min(totalDestPages, p + 1))}
                    className="border border-slate-300 bg-white px-2.5 py-1 disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              </div>

              {/* High-Density Destination Table */}
              <div className="overflow-x-auto border border-slate-200">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="py-3 px-3 font-semibold">ID</th>
                      <th className="py-3 px-3 font-semibold">Destination & Native Name</th>
                      <th className="py-3 px-3 font-semibold">Country & Region</th>
                      <th className="py-3 px-3 font-semibold">Activity Category</th>
                      <th className="py-3 px-3 font-semibold text-right">Elevation</th>
                      <th className="py-3 px-3 font-semibold">Approved Route & Source</th>
                      <th className="py-3 px-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedDestinations.map((dest) => (
                      <tr key={dest.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {dest.id}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{dest.name}</div>
                          {dest.nativeName && (
                            <div className="text-[11px] text-slate-500">{dest.nativeName}</div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-slate-900 font-medium">{dest.country}</div>
                          <div className="text-[11px] text-slate-500">{dest.region}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-700">{dest.activityType}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 text-right whitespace-nowrap tabular-nums">
                          {formatElevation(dest.elevationMeters)}
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <div className="text-slate-800 truncate">{dest.approvedRoute}</div>
                          <div className="text-[11px] text-slate-500 truncate">
                            Source: {dest.sourceReference}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap space-x-2">
                          <button
                            onClick={() => setSelectedDestination(dest)}
                            className="border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-800 hover:bg-slate-100"
                          >
                            Requirements
                          </button>
                          <button
                            onClick={() => {
                              setSubmissionModalDest(dest);
                              setIsSubmissionModalOpen(true);
                            }}
                            className="bg-slate-900 px-2.5 py-1 font-semibold text-white hover:bg-slate-800"
                          >
                            Submit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PUBLIC CREDENTIAL VERIFICATION PORTAL (WORKFLOW E, MODULE J: FR-103 TO FR-114) */}
        {activeTab === 'verify' && (
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
            <div className="border border-slate-300 bg-white p-6 space-y-5">
              <div>
                <span className="font-mono text-xs text-sky-700 font-semibold">
                  WORKFLOW E · MODULE J — PUBLIC CREDENTIAL VERIFICATION (FR-006, FR-079, FR-103 TO FR-114)
                </span>
                <h1 className="font-display text-3xl font-bold text-slate-900 mt-1">
                  Verify Official 0 TO 8848 Achievement Credential
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  Enter a unique Credential Identifier below to query its live authoritative status (`VALID`, `SUSPENDED`, `REVOKED`) without exposing private GPX tracks or personal contact information (FR-079).
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={verifyQueryId}
                  onChange={(e) => setVerifyQueryId(e.target.value)}
                  placeholder="Enter Credential ID (e.g., 0TO8848-CERT-2026-8848E1)"
                  className="flex-1 border border-slate-300 px-4 py-2.5 font-mono text-sm text-slate-900"
                />
                <button
                  onClick={() => {
                    if (verifiedLookupResult) {
                      setSelectedCredential(verifiedLookupResult);
                    }
                  }}
                  disabled={!verifiedLookupResult}
                  className="bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap"
                >
                  Open Full Certificate & QR Modal
                </button>
              </div>

              {/* Quick Sample Credential Selectors */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Inspect Registry Credentials:</span>
                {credentials.map((c) => (
                  <button
                    key={c.credentialId}
                    onClick={() => setVerifyQueryId(c.credentialId)}
                    className={`border px-2.5 py-1 font-mono text-[11px] ${
                      verifyQueryId.toUpperCase() === c.credentialId
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {c.credentialId} [{c.state}]
                  </button>
                ))}
              </div>

              {/* Verification Result Card */}
              {verifiedLookupResult ? (
                <div className="border border-slate-300 bg-slate-50 p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-2.5">
                      {verifiedLookupResult.state === 'VALID' && (
                        <CheckCircle2 className="h-6 w-6 text-emerald-700" />
                      )}
                      {verifiedLookupResult.state === 'SUSPENDED' && (
                        <AlertTriangle className="h-6 w-6 text-amber-700" />
                      )}
                      {verifiedLookupResult.state === 'REVOKED' && (
                        <XCircle className="h-6 w-6 text-red-700" />
                      )}
                      <div>
                        <span className="font-mono text-xs text-slate-500">
                          CREDENTIAL ID: {verifiedLookupResult.credentialId}
                        </span>
                        <h2 className="font-display text-2xl font-bold text-slate-900">
                          Authoritative Status: {verifiedLookupResult.state}
                        </h2>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedCredential(verifiedLookupResult)}
                      className="bg-sky-700 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-800"
                    >
                      Inspect Printable Certificate & QR
                    </button>
                  </div>

                  {verifiedLookupResult.statusReason && (
                    <div className="border border-red-300 bg-red-50 p-3.5 text-xs text-red-900">
                      <strong>Revocation / Suspension Audit Reason (FR-110):</strong>{' '}
                      {verifiedLookupResult.statusReason}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Verified Recipient</span>
                      <span className="font-semibold text-slate-900 text-sm">
                        {verifiedLookupResult.publicDisplayAuthorized
                          ? verifiedLookupResult.adventurerName
                          : 'Identity Shielded by User Privacy Setting (FR-026)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Destination & Elevation</span>
                      <span className="font-semibold text-slate-900 text-sm">
                        {verifiedLookupResult.destinationName} ({formatElevation(verifiedLookupResult.elevationMeters)})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Completion Date & Rule Version</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {verifiedLookupResult.completedDate} · {verifiedLookupResult.ruleVersion}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Cryptographic Evidence Digest: <code>{verifiedLookupResult.cryptographicDigest}</code>
                    </span>
                    <span>
                      Private Evidence Access: BLOCKED ON PUBLIC PORTAL (FR-079)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="border border-red-200 bg-red-50 p-6 text-xs text-red-900">
                  <strong>STATUS: INVALID / NOT_ISSUED (Section 8)</strong> — No authoritative credential matches identifier <code>{verifyQueryId}</code>.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: TRANSPARENT VERIFIED LEADERBOARDS (MODULE K: FR-115 TO FR-124, BR-006) */}
        {activeTab === 'leaderboards' && (
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
            <div className="border border-slate-300 bg-white p-6 space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <span className="font-mono text-xs text-sky-700 font-semibold">
                    MODULE K · FR-115 TO FR-124 · CRITICAL BUSINESS RULES BR-006 & BR-007
                  </span>
                  <h1 className="font-display text-3xl font-bold text-slate-900 mt-1">
                    Verified Global Adventure Leaderboards
                  </h1>
                  <p className="text-xs text-slate-600 mt-1">
                    Computed strictly from verified `APPROVED` achievements with `VALID` credentials where the adventurer has opted into public display (FR-026, FR-115). Zero paid positions or sponsorship boosts (FR-119, FR-120).
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Filter by Approved Category (FR-117)
                  </label>
                  <select
                    value={leaderboardActivity}
                    onChange={(e) => setLeaderboardActivity(e.target.value)}
                    className="border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900"
                  >
                    <option value="ALL">All Verified Categories</option>
                    <option value="High-Altitude Mountaineering">High-Altitude Mountaineering</option>
                    <option value="Alpine Trekking">Alpine Trekking</option>
                    <option value="Technical Rock & Big Wall">Technical Rock & Big Wall</option>
                    <option value="Polar & Glacial Expedition">Polar & Glacial Expedition</option>
                    <option value="Ultra Trail & Endurance">Ultra Trail & Endurance</option>
                    <option value="Ocean & Sea-to-Summit">Ocean & Sea-to-Summit</option>
                  </select>
                </div>
              </div>

              {/* Documented Ranking Formula & Limitations Box (FR-116, FR-121, FR-123) */}
              <div className="border border-slate-200 bg-slate-50 p-4 text-xs grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <strong className="text-slate-900 block">
                    Documented Ranking Calculation Formula (FR-116, FR-121 — Version: calc-v1.0-MRS-2026):
                  </strong>
                  <p className="text-slate-600 mt-1">
                    <code>Merit Index = Σ (100 Base Points + Verified Destination Elevation in Meters / 10)</code> across all active <code>VALID</code> Completed Achievement credentials. Unverified, pending, rejected, or revoked submissions contribute 0 points (FR-118).
                  </p>
                </div>
                <div>
                  <strong className="text-slate-900 block">
                    Explicit Ranking Limitations Disclosure (FR-123):
                  </strong>
                  <p className="text-slate-600 mt-1">
                    Rankings reflect only verified credentials opted into public visibility on 0 TO 8848 and do not measure weather severity, winter vs. summer conditions, or unsubmitted ascents.
                  </p>
                </div>
              </div>

              {/* Leaderboard Table */}
              <div className="overflow-x-auto border border-slate-200">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Rank</th>
                      <th className="py-3 px-4 font-semibold">Verified Adventurer</th>
                      <th className="py-3 px-4 font-semibold">Country</th>
                      <th className="py-3 px-4 font-semibold text-right">Verified Completions</th>
                      <th className="py-3 px-4 font-semibold text-right">Highest Verified Point</th>
                      <th className="py-3 px-4 font-semibold text-right">Formula v1.0 Merit Index</th>
                      <th className="py-3 px-4 font-semibold">Authoritative Credentials</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {leaderboardEntries.map((entry, index) => (
                      <tr key={entry.adventurerId} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 tabular-nums">
                          #{index + 1}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {entry.adventurerName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">{entry.country}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-right tabular-nums">
                          {entry.verifiedCount}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-right tabular-nums">
                          {formatElevation(entry.maxElevationM)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-sky-800 text-right tabular-nums">
                          {entry.meritIndex.toLocaleString()} pts
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {entry.credentials.map((c) => (
                              <button
                                key={c.credentialId}
                                onClick={() => setSelectedCredential(c)}
                                className="border border-slate-300 bg-white px-2 py-0.5 font-mono text-[11px] text-slate-800 hover:bg-slate-100"
                              >
                                {c.destinationName} ({Math.round(c.elevationMeters)}m)
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: OPERATIONS & VERIFICATION WORKSPACE */}
        {activeTab === 'workspace' && (
          <WorkspaceView
            currentUser={currentUser}
            allUsers={users}
            onSwitchUser={(id) => setCurrentUserId(id)}
            onRegisterAdventurer={handleRegisterAdventurer}
            onUpdateUserProfile={handleUpdateUserProfile}
            submissions={submissions}
            credentials={credentials}
            appeals={appeals}
            auditLogs={auditLogs}
            onOpenNewSubmission={() => {
              setSubmissionModalDest(null);
              setIsSubmissionModalOpen(true);
            }}
            onWithdrawSubmission={handleWithdrawSubmission}
            onSubmitAdditionalEvidence={handleSubmitAdditionalEvidence}
            onReviewDecision={handleReviewDecision}
            onCreateAppeal={handleCreateAppeal}
            onDecideAppeal={handleDecideAppeal}
            onAdminCredentialStateChange={handleAdminCredentialStateChange}
            onSelectCredentialForModal={(cred) => setSelectedCredential(cred)}
          />
        )}

        {/* TAB 6: MASTER REQUIREMENTS SPECIFICATION & TRACEABILITY MATRIX */}
        {activeTab === 'specification' && (
          <SpecificationTraceabilityView
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}
      </main>

      {/* QUIET INSTITUTIONAL FOOTER */}
      <footer className="border-t border-slate-200 bg-white px-6 py-8 text-xs text-slate-600">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-display text-base font-bold text-slate-900">
              0 TO 8848 — EXPLORE. ACHIEVE. PROVE.
            </p>
            <p>
              Document 01: Master Requirements Specification (MRS v1.0 — Founder Review Draft) · Parent: Document 00 Master Project Constitution
            </p>
          </div>
          <div className="flex flex-wrap gap-5">
            <button onClick={() => setActiveTab('destinations')} className="hover:text-slate-900">
              100 Destinations
            </button>
            <button onClick={() => setActiveTab('verify')} className="hover:text-slate-900">
              Verify Certificate
            </button>
            <button onClick={() => setActiveTab('leaderboards')} className="hover:text-slate-900">
              Verified Leaderboards
            </button>
            <button onClick={() => setActiveTab('workspace')} className="hover:text-slate-900">
              Role Workspace
            </button>
            <button onClick={() => setActiveTab('specification')} className="hover:text-slate-900">
              MRS v1.0 Traceability
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <DestinationModal
        destination={selectedDestination}
        onClose={() => setSelectedDestination(null)}
        onStartSubmission={(dest) => {
          setSubmissionModalDest(dest);
          setIsSubmissionModalOpen(true);
        }}
        currentUserRole={currentUser.role}
        onProposeRevision={handleProposeDestinationRevision}
        unitSystem={unitSystem}
      />

      <CertificateModal
        credential={selectedCredential}
        onClose={() => setSelectedCredential(null)}
        unitSystem={unitSystem}
      />

      <SubmissionModal
        isOpen={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
        initialDestination={submissionModalDest}
        destinations={destinations}
        currentUser={currentUser}
        existingHashes={existingHashes}
        onCreateSubmission={handleCreateSubmission}
        onRequireAdventurerAuth={() => {
          setCurrentUserId('USR-ADV-01');
        }}
      />
    </div>
  );
}

export default App;
