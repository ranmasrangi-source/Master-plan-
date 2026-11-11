import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Lock,
  FileCheck2,
  Scale,
  Building2,
  ShieldAlert,
  Download,
  UserCheck,
  Award,
  Plus,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  PlatformUser,
  UserRole,
  AchievementSubmission,
  CredentialRecord,
  AppealRecord,
  AuditLogEntry,
  SubmissionState,
  AppealState,
  CredentialState,
} from '../types/mrs';
import {
  ROLE_DEFINITIONS,
  DISABLED_OUT_OF_SCOPE_MODULES,
} from '../data/mrsSpecificationData';

interface WorkspaceViewProps {
  currentUser: PlatformUser;
  allUsers: PlatformUser[];
  onSwitchUser: (userId: string) => void;
  onRegisterAdventurer: (name: string, email: string, country: string) => void;
  onUpdateUserProfile: (updated: PlatformUser) => void;
  submissions: AchievementSubmission[];
  credentials: CredentialRecord[];
  appeals: AppealRecord[];
  auditLogs: AuditLogEntry[];
  onOpenNewSubmission: () => void;
  onWithdrawSubmission: (submissionId: string) => void;
  onSubmitAdditionalEvidence: (submissionId: string, note: string) => void;
  onReviewDecision: (
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
  ) => void;
  onCreateAppeal: (submissionId: string, reason: string, evidenceSummary: string) => void;
  onDecideAppeal: (appealId: string, newState: AppealState, reason: string) => void;
  onAdminCredentialStateChange: (
    credentialId: string,
    newState: CredentialState,
    reason: string
  ) => void;
  onSelectCredentialForModal: (cred: CredentialRecord) => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  currentUser,
  allUsers,
  onSwitchUser,
  onRegisterAdventurer,
  onUpdateUserProfile,
  submissions,
  credentials,
  appeals,
  auditLogs,
  onOpenNewSubmission,
  onWithdrawSubmission,
  onSubmitAdditionalEvidence,
  onReviewDecision,
  onCreateAppeal,
  onDecideAppeal,
  onAdminCredentialStateChange,
  onSelectCredentialForModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'adventurer' | 'verification' | 'appeals' | 'ecosystem' | 'governance'
  >('adventurer');

  // New Adventurer registration state (Workflow A)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCountry, setRegCountry] = useState('Nepal');
  const [regMessage, setRegMessage] = useState('');

  // Verification Reviewer form state (Workflow C)
  const [selectedSubId, setSelectedSubId] = useState<string>(
    submissions.find((s) => s.state === 'UNDER_REVIEW')?.id || submissions[0]?.id || ''
  );
  const [coiConfirmed, setCoiConfirmed] = useState(true);
  const [checklist, setChecklist] = useState({
    routeMatch: true,
    elevationMatch: true,
    timestampsConsistent: true,
    identityCorroborated: true,
    permitVerified: true,
  });
  const [decisionReason, setDecisionReason] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState('');

  // Appeal creation & decision state (Workflow D)
  const [appealTargetSubId, setAppealTargetSubId] = useState<string>('');
  const [newAppealReason, setNewAppealReason] = useState('');
  const [newAppealEvidence, setNewAppealEvidence] = useState('');
  const [appealDecisionReason, setAppealDecisionReason] = useState('');

  // Additional evidence state (FR-062)
  const [extraEvidenceNote, setExtraEvidenceNote] = useState('');

  // Admin Credential state change (Workflow F)
  const [adminTargetCredId, setAdminTargetCredId] = useState<string>(
    credentials[0]?.credentialId || ''
  );
  const [adminTargetCredState, setAdminTargetCredState] = useState<CredentialState>('SUSPENDED');
  const [adminActionReason, setAdminActionReason] = useState('');
  const [adminDualConfirm, setAdminDualConfirm] = useState(false);

  const currentRoleDef =
    ROLE_DEFINITIONS.find((r) => r.role === currentUser.role) || ROLE_DEFINITIONS[0];

  const mySubmissions = submissions.filter((s) => s.adventurerId === currentUser.id);
  const myCredentials = credentials.filter((c) => c.adventurerId === currentUser.id);

  const selectedSubForReview = submissions.find((s) => s.id === selectedSubId) || submissions[0];

  const handleExportPersonalData = () => {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      specificationCompliance: 'MRS v1.0 FR-029 & FR-194 Personal Data Export',
      userProfile: currentUser,
      submissions: mySubmissions,
      earnedCredentials: myCredentials,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `0to8848_personal_data_${currentUser.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) return;
    onRegisterAdventurer(regName.trim(), regEmail.trim(), regCountry.trim());
    setRegName('');
    setRegEmail('');
    setRegMessage(
      'New Registered Adventurer account created with Privacy-by-Default (FR-191) and verified session active.'
    );
  };

  const handleExecuteReview = (newState: SubmissionState) => {
    if (!selectedSubForReview) return;
    if (selectedSubForReview.adventurerId === currentUser.id) {
      setReviewFeedback(
        'BLOCKED (FR-082): Reviewers are strictly prohibited from reviewing or approving their own achievement submissions.'
      );
      return;
    }
    if (!coiConfirmed) {
      setReviewFeedback(
        'BLOCKED (FR-083): You must complete the Conflict-of-Interest declaration before issuing a verification decision.'
      );
      return;
    }
    if (!decisionReason.trim()) {
      setReviewFeedback('BLOCKED (FR-087): Every verification decision requires a written reason.');
      return;
    }
    onReviewDecision(
      selectedSubForReview.id,
      newState,
      decisionReason.trim(),
      coiConfirmed,
      checklist
    );
    setDecisionReason('');
    setReviewFeedback(
      `Recorded reasoned decision [${newState}] on ${selectedSubForReview.id} and appended to immutable audit history.`
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Top Role & Session Control Bar (Section 3 & Module B) */}
      <div className="border border-slate-300 bg-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <span>SECTION 3 CONTROLLED ACCESS · 13 PLATFORM ROLES</span>
              <span aria-hidden="true">·</span>
              <span>SESSION: {currentUser.accountStatus}</span>
              <span aria-hidden="true">·</span>
              <span>MFA: {currentUser.mfaEnabled ? 'ENABLED (FR-017)' : 'STANDARD'}</span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 mt-1">
              Operations & Verification Workspace — {currentUser.name}
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Active Role: <strong className="text-slate-900">{currentRoleDef.title}</strong> ({currentRoleDef.sectionRef}) · {currentUser.bio}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Switch Authorized Role Session (RBAC Inspector — FR-018)
              </label>
              <select
                value={currentUser.id}
                onChange={(e) => onSwitchUser(e.target.value)}
                className="border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900"
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    [{u.role}] {u.name} ({u.country})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={onOpenNewSubmission}
              className="mt-4 sm:mt-5 flex items-center gap-1.5 bg-sky-700 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-800 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>New Achievement Submission</span>
            </button>
          </div>
        </div>

        {/* Active Role Capabilities & Restrictions Matrix */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 text-xs">
          <div className="border border-slate-200 bg-slate-50 p-3.5">
            <span className="font-semibold text-slate-900 block mb-1.5">
              Authorized Capabilities ({currentRoleDef.title})
            </span>
            <ul className="space-y-1 text-slate-700">
              {currentRoleDef.capabilities.map((cap, i) => (
                <li key={i}>• {cap}</li>
              ))}
            </ul>
          </div>
          <div className="border border-slate-200 bg-slate-50 p-3.5">
            <span className="font-semibold text-red-900 block mb-1.5">
              Enforced Constitutional Restrictions ({currentRoleDef.sectionRef})
            </span>
            <ul className="space-y-1 text-slate-700">
              {currentRoleDef.restrictions.map((res, i) => (
                <li key={i}>• {res}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Workspace Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-300 pb-2">
        <button
          onClick={() => setActiveSubTab('adventurer')}
          className={`px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
            activeSubTab === 'adventurer'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          1. Adventurer Profile, Submissions & Privacy (Workflows A & B)
        </button>
        <button
          onClick={() => setActiveSubTab('verification')}
          className={`px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
            activeSubTab === 'verification'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          2. Verification Reviewer Queue ({submissions.filter((s) => s.state === 'UNDER_REVIEW').length} Pending — Workflow C)
        </button>
        <button
          onClick={() => setActiveSubTab('appeals')}
          className={`px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
            activeSubTab === 'appeals'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          3. Independent Appeals Tribunal ({appeals.length} Active — Workflow D)
        </button>
        <button
          onClick={() => setActiveSubTab('ecosystem')}
          className={`px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
            activeSubTab === 'ecosystem'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          4. Organizations, Guide Marketplace & Sponsorships (Modules L, M, N)
        </button>
        <button
          onClick={() => setActiveSubTab('governance')}
          className={`px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
            activeSubTab === 'governance'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          5. Security Audit Ledger & Fail-Closed Locks (Workflow F & Module V)
        </button>
      </div>

      {/* SUB-TAB 1: ADVENTURER PROFILE, SUBMISSIONS & PRIVACY */}
      {activeSubTab === 'adventurer' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left 2 Columns: Submissions & Earned Credentials */}
          <div className="lg:col-span-2 space-y-6">
            {/* My Submissions Table */}
            <div className="border border-slate-300 bg-white p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    Achievement Submissions & State Machine Tracker (FR-061, Section 8)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Showing submissions for {currentUser.name} ({mySubmissions.length} records)
                  </p>
                </div>
                <button
                  onClick={onOpenNewSubmission}
                  className="bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                >
                  Submit Completed Adventure
                </button>
              </div>

              {mySubmissions.length === 0 ? (
                <div className="border border-slate-200 bg-slate-50 p-6 text-center space-y-2">
                  <p className="text-xs text-slate-600">
                    No achievement submissions recorded for this account yet.
                  </p>
                  <button
                    onClick={onOpenNewSubmission}
                    className="bg-sky-700 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-800"
                  >
                    Create First Submission
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {mySubmissions.map((sub) => (
                    <div key={sub.id} className="border border-slate-200 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {sub.id}
                          </span>
                          <span className="mx-1.5 text-slate-400">·</span>
                          <span className="font-semibold text-sm text-slate-900">
                            {sub.destinationName} ({sub.elevationMeters}m)
                          </span>
                          <span className="mx-1.5 text-slate-400">·</span>
                          <span className="text-xs text-slate-600">
                            {sub.classification.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-semibold text-slate-900 border border-slate-300 bg-slate-50 px-2.5 py-1">
                          STATE: {sub.state}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 font-mono">
                        Route: {sub.routeTaken} · Dates: {sub.activityStartDate} to {sub.activityEndDate} · GPX SHA-256: {sub.gpxAnalysis.sha256Hash.slice(0, 20)}...
                      </div>

                      {sub.decisionHistory.length > 0 && (
                        <div className="border-t border-slate-200 pt-2 text-xs text-slate-700">
                          <strong>Latest Verification Decision ({sub.decisionHistory[sub.decisionHistory.length - 1].reviewerName}):</strong>{' '}
                          {sub.decisionHistory[sub.decisionHistory.length - 1].reason}
                        </div>
                      )}

                      {/* Permitted Adventurer Actions per State */}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {(sub.state === 'DRAFT' || sub.state === 'SUBMITTED') && (
                          <button
                            onClick={() => onWithdrawSubmission(sub.id)}
                            className="border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Withdraw Submission (FR-065)
                          </button>
                        )}
                        {sub.state === 'ADDITIONAL_EVIDENCE_REQUIRED' && (
                          <div className="flex items-center gap-2 w-full">
                            <input
                              type="text"
                              value={extraEvidenceNote}
                              onChange={(e) => setExtraEvidenceNote(e.target.value)}
                              placeholder="Provide supplementary GPX/permit clarification (FR-062)..."
                              className="flex-1 border border-slate-300 px-2.5 py-1 text-xs"
                            />
                            <button
                              onClick={() => {
                                if (!extraEvidenceNote.trim()) return;
                                onSubmitAdditionalEvidence(sub.id, extraEvidenceNote.trim());
                                setExtraEvidenceNote('');
                              }}
                              className="bg-sky-700 px-3 py-1 text-xs font-semibold text-white"
                            >
                              Upload Additional Evidence
                            </button>
                          </div>
                        )}
                        {sub.state === 'REJECTED' && (
                          <button
                            onClick={() => setAppealTargetSubId(sub.id)}
                            className="border border-amber-400 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                          >
                            File Independent Appeal (Workflow D · FR-094)
                          </button>
                        )}
                      </div>

                      {appealTargetSubId === sub.id && (
                        <div className="border border-amber-300 bg-amber-50/60 p-3.5 space-y-2.5">
                          <p className="text-xs font-semibold text-slate-900">
                            Submit Formal Appeal for {sub.id} ({sub.destinationName}) — Assigned to Independent Reviewer (FR-097)
                          </p>
                          <textarea
                            rows={2}
                            value={newAppealReason}
                            onChange={(e) => setNewAppealReason(e.target.value)}
                            placeholder="State appeal grounds and reference to eligibility rules (FR-095)..."
                            className="w-full border border-slate-300 bg-white p-2 text-xs"
                          />
                          <input
                            type="text"
                            value={newAppealEvidence}
                            onChange={(e) => setNewAppealEvidence(e.target.value)}
                            placeholder="Supplementary evidence reference / witness statement (FR-096)..."
                            className="w-full border border-slate-300 bg-white p-2 text-xs"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (!newAppealReason.trim()) return;
                                onCreateAppeal(
                                  sub.id,
                                  newAppealReason.trim(),
                                  newAppealEvidence.trim() || 'Supplemental logbook & witness affidavit'
                                );
                                setAppealTargetSubId('');
                                setNewAppealReason('');
                                setNewAppealEvidence('');
                                setActiveSubTab('appeals');
                              }}
                              className="bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              Submit Appeal to Independent Tribunal
                            </button>
                            <button
                              onClick={() => setAppealTargetSubId('')}
                              className="px-3 py-1.5 text-xs text-slate-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Earned Free Digital Badges & Certificates (Module J) */}
            <div className="border border-slate-300 bg-white p-6 space-y-4">
              <h2 className="font-display text-xl font-bold text-slate-900">
                Earned Free Digital Badges & Official Certificates (FR-103 to FR-106, BR-002)
              </h2>
              {myCredentials.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No verified credentials issued for this user yet. Standard badges are issued free of charge upon verification approval.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {myCredentials.map((cred) => (
                    <div
                      key={cred.credentialId}
                      className="border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                          <span>{cred.credentialId}</span>
                          <span className="font-bold text-emerald-800">{cred.state}</span>
                        </div>
                        <h3 className="font-display text-lg font-bold text-slate-900 mt-1">
                          {cred.badgeTitle}
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {cred.destinationName} ({cred.elevationMeters}m) · Completed {cred.completedDate}
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                        <span className="text-[11px] font-medium text-emerald-800">
                          Free Standard Digital Badge (BR-002)
                        </span>
                        <button
                          onClick={() => onSelectCredentialForModal(cred)}
                          className="bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          View Certificate & QR
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Workflow A Registration + Privacy & Data Export (Module C & R) */}
          <div className="space-y-6">
            <div className="border border-slate-300 bg-white p-5 space-y-4">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Privacy-by-Default & Data Rights (Module C & R — FR-025–030, FR-190–200)
              </h3>
              <div className="space-y-2.5 text-xs">
                <label className="flex items-start gap-2.5 text-slate-700">
                  <input
                    type="checkbox"
                    checked={currentUser.publicAchievementsOptIn}
                    onChange={(e) =>
                      onUpdateUserProfile({
                        ...currentUser,
                        publicAchievementsOptIn: e.target.checked,
                      })
                    }
                    className="mt-0.5"
                  />
                  <span>
                    <strong>Public Achievement & Leaderboard Display (FR-026):</strong> Allow my verified achievements to appear on public leaderboards. (Raw GPX & photo evidence always remains private per FR-079).
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-slate-700">
                  <input
                    type="checkbox"
                    checked={currentUser.mfaEnabled}
                    onChange={(e) =>
                      onUpdateUserProfile({
                        ...currentUser,
                        mfaEnabled: e.target.checked,
                      })
                    }
                    className="mt-0.5"
                  />
                  <span>
                    <strong>Multi-Factor Authentication (FR-017):</strong> Require second-factor verification on session login.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-slate-700">
                  <input
                    type="checkbox"
                    checked={currentUser.notificationPrefs.emailStatusUpdates}
                    onChange={(e) =>
                      onUpdateUserProfile({
                        ...currentUser,
                        notificationPrefs: {
                          ...currentUser.notificationPrefs,
                          emailStatusUpdates: e.target.checked,
                        },
                      })
                    }
                    className="mt-0.5"
                  />
                  <span>
                    <strong>Submission & Appeal Notifications (FR-154–162):</strong> Receive status transition and evidence request alerts.
                  </span>
                </label>
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-2.5">
                <button
                  onClick={handleExportPersonalData}
                  className="w-full flex items-center justify-center gap-2 border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Personal Data Record (JSON — FR-029, FR-194)</span>
                </button>
                <button
                  onClick={() =>
                    onUpdateUserProfile({
                      ...currentUser,
                      accountStatus:
                        currentUser.accountStatus === 'CLOSURE_REQUESTED'
                          ? 'ACTIVE'
                          : 'CLOSURE_REQUESTED',
                    })
                  }
                  className="w-full border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-900 hover:bg-red-100"
                >
                  {currentUser.accountStatus === 'CLOSURE_REQUESTED'
                    ? 'Cancel Pending Account Closure Request'
                    : 'Request Account Closure & Deletion Workflow (FR-020)'}
                </button>
              </div>
            </div>

            {/* Workflow A: Register New Adventurer */}
            <div className="border border-slate-300 bg-white p-5 space-y-3">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Workflow A — Register New Adventurer Account (FR-011)
              </h3>
              <p className="text-xs text-slate-600">
                Public registration creates a standard <strong>Registered Adventurer</strong> account. Privileged roles (Reviewer, Admin, Governance) cannot be self-registered (FR-174).
              </p>
              <form onSubmit={handleRegisterSubmit} className="space-y-2.5 text-xs">
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Full Name (e.g., Dawa Yangzum)"
                  className="w-full border border-slate-300 px-3 py-2"
                />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="Verified Email Address"
                  className="w-full border border-slate-300 px-3 py-2"
                />
                <input
                  type="text"
                  required
                  value={regCountry}
                  onChange={(e) => setRegCountry(e.target.value)}
                  placeholder="Country"
                  className="w-full border border-slate-300 px-3 py-2"
                />
                <button
                  type="submit"
                  className="w-full bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800"
                >
                  Register Adventurer & Activate Session
                </button>
              </form>
              {regMessage && (
                <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5">
                  {regMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: VERIFICATION REVIEWER QUEUE (WORKFLOW C) */}
      {activeSubTab === 'verification' && (
        <div className="border border-slate-300 bg-white p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <span className="font-mono text-xs text-sky-700">
                WORKFLOW C · MODULE H — CONTROLLED VERIFICATION QUEUE (FR-080 TO FR-093)
              </span>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Authorized Evidence Assessment & Decision Console
              </h2>
            </div>
            {currentUser.role !== 'VERIFICATION_REVIEWER' &&
              currentUser.role !== 'PLATFORM_ADMIN' && (
                <button
                  onClick={() => onSwitchUser('USR-REV-01')}
                  className="bg-amber-900 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800 whitespace-nowrap"
                >
                  Switch to Pemba Dorje (Verification Reviewer) to Execute Decisions
                </button>
              )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Queue List */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-500">
                Submissions Queue ({submissions.length} Total)
              </h3>
              {submissions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedSubId(s.id);
                    setReviewFeedback('');
                  }}
                  className={`w-full text-left border p-3.5 transition-colors ${
                    selectedSubForReview?.id === s.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span>{s.id}</span>
                    <span>{s.state}</span>
                  </div>
                  <p className="font-semibold text-sm mt-1">
                    {s.destinationName} ({s.elevationMeters}m)
                  </p>
                  <p
                    className={`text-xs mt-0.5 ${
                      selectedSubForReview?.id === s.id ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    Adventurer: {s.adventurerName} · Anomalies: {s.gpxAnalysis.anomalies.length}
                  </p>
                </button>
              ))}
            </div>

            {/* Active Evidence Inspector & Checklist */}
            {selectedSubForReview && (
              <div className="lg:col-span-2 border border-slate-200 p-5 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <span className="font-mono text-xs text-slate-500">
                      {selectedSubForReview.id} · Rule {selectedSubForReview.ruleVersion}
                    </span>
                    <h3 className="font-display text-2xl font-bold text-slate-900">
                      {selectedSubForReview.destinationName} ({selectedSubForReview.elevationMeters}m) — {selectedSubForReview.adventurerName}
                    </h3>
                  </div>
                  <span className="border border-slate-300 bg-slate-100 px-3 py-1 font-mono text-xs font-bold text-slate-900">
                    {selectedSubForReview.state}
                  </span>
                </div>

                {/* GPX & Cryptographic Evidence Summary */}
                <div className="border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                  <div className="font-semibold text-slate-900">
                    Authorized Private Evidence Vault Inspector (FR-078 — Restricted to Reviewer)
                  </div>
                  <div className="font-mono text-[11px] text-slate-700 break-all">
                    File: {selectedSubForReview.gpxAnalysis.fileName} · SHA-256: {selectedSubForReview.gpxAnalysis.sha256Hash}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
                    <div>Peak Elev: {selectedSubForReview.gpxAnalysis.maxElevationM}m</div>
                    <div>Distance: {selectedSubForReview.gpxAnalysis.totalDistanceKm} km</div>
                    <div>Max Speed: {selectedSubForReview.gpxAnalysis.maxSegmentSpeedKmh} km/h</div>
                    <div>Points: {selectedSubForReview.gpxAnalysis.trackpointCount}</div>
                  </div>
                  <p className="text-slate-700 pt-1">
                    <strong>AI Anomaly Summary for Human Reviewer (FR-219, FR-223):</strong>{' '}
                    {selectedSubForReview.gpxAnalysis.automatedSummary}
                  </p>
                </div>

                {/* Reviewer Checklist (FR-083, FR-084) */}
                <div className="space-y-3 text-xs">
                  <h4 className="font-semibold text-slate-900">
                    Mandatory Verification Checklist & Conflict-of-Interest Declaration (FR-083, FR-084)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checklist.routeMatch}
                        onChange={(e) =>
                          setChecklist({ ...checklist, routeMatch: e.target.checked })
                        }
                      />
                      <span>GPX track matches approved route corridor</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checklist.elevationMatch}
                        onChange={(e) =>
                          setChecklist({ ...checklist, elevationMatch: e.target.checked })
                        }
                      />
                      <span>Peak elevation matches geodetic datum</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checklist.timestampsConsistent}
                        onChange={(e) =>
                          setChecklist({ ...checklist, timestampsConsistent: e.target.checked })
                        }
                      />
                      <span>Timestamps & ascent rate plausible</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checklist.permitVerified}
                        onChange={(e) =>
                          setChecklist({ ...checklist, permitVerified: e.target.checked })
                        }
                      />
                      <span>Permit / liaison documentation verified</span>
                    </label>
                  </div>

                  <label className="flex items-center gap-2 pt-2 font-semibold text-slate-900">
                    <input
                      type="checkbox"
                      checked={coiConfirmed}
                      onChange={(e) => setCoiConfirmed(e.target.checked)}
                    />
                    <span>
                      Conflict-of-Interest Declaration (FR-083): I confirm I am not the submitting adventurer (FR-082) and hold no financial/personal conflict.
                    </span>
                  </label>
                </div>

                {/* Written Reason & Decision Buttons (FR-086, FR-087) */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-900">
                    Mandatory Written Verification Reason & Supporting References (FR-087)
                  </label>
                  <textarea
                    rows={2}
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    placeholder="Enter detailed assessment findings, permit reference, and justification..."
                    className="w-full border border-slate-300 p-2.5 text-xs"
                  />

                  {reviewFeedback && (
                    <div className="border border-slate-300 bg-slate-50 p-3 text-xs font-medium text-slate-900">
                      {reviewFeedback}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      disabled={
                        currentUser.role !== 'VERIFICATION_REVIEWER' &&
                        currentUser.role !== 'PLATFORM_ADMIN'
                      }
                      onClick={() => handleExecuteReview('APPROVED')}
                      className="bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
                    >
                      Approve & Issue Free Badge + Certificate (FR-086, FR-103)
                    </button>
                    <button
                      disabled={
                        currentUser.role !== 'VERIFICATION_REVIEWER' &&
                        currentUser.role !== 'PLATFORM_ADMIN'
                      }
                      onClick={() => handleExecuteReview('ADDITIONAL_EVIDENCE_REQUIRED')}
                      className="border border-amber-400 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-40"
                    >
                      Request Additional Evidence (FR-085)
                    </button>
                    <button
                      disabled={
                        currentUser.role !== 'VERIFICATION_REVIEWER' &&
                        currentUser.role !== 'PLATFORM_ADMIN'
                      }
                      onClick={() => handleExecuteReview('ESCALATED')}
                      className="border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-200 disabled:opacity-40"
                    >
                      Escalate for Secondary Review (FR-089)
                    </button>
                    <button
                      disabled={
                        currentUser.role !== 'VERIFICATION_REVIEWER' &&
                        currentUser.role !== 'PLATFORM_ADMIN'
                      }
                      onClick={() => handleExecuteReview('REJECTED')}
                      className="bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-40"
                    >
                      Reject Submission (FR-086)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: INDEPENDENT APPEALS TRIBUNAL (WORKFLOW D) */}
      {activeSubTab === 'appeals' && (
        <div className="border border-slate-300 bg-white p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <span className="font-mono text-xs text-sky-700">
                WORKFLOW D · MODULE I — INDEPENDENT APPEALS TRIBUNAL (FR-094 TO FR-102, BR-005)
              </span>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Appeal Review & Original Decision History Preservation
              </h2>
            </div>
            {currentUser.role !== 'APPEAL_REVIEWER' && (
              <button
                onClick={() => onSwitchUser('USR-APP-01')}
                className="bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
              >
                Switch to Dr. Clara Lindqvist (Independent Appeal Reviewer)
              </button>
            )}
          </div>

          <div className="space-y-4">
            {appeals.map((app) => {
              const isOriginalReviewer = currentUser.id === app.originalReviewerId;
              const canDecideAppeal =
                currentUser.role === 'APPEAL_REVIEWER' && !isOriginalReviewer;

              return (
                <div key={app.id} className="border border-slate-200 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {app.id} (Submission {app.submissionId})
                      </span>
                      <h3 className="font-display text-xl font-bold text-slate-900">
                        {app.destinationName} — Appellant: {app.adventurerName}
                      </h3>
                    </div>
                    <span className="border border-slate-300 bg-slate-50 px-3 py-1 font-mono text-xs font-semibold">
                      APPEAL STATE: {app.state}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                      <span className="font-semibold text-slate-900 block">
                        Appellant Statement & Supplementary Evidence (FR-095, FR-096)
                      </span>
                      <p className="text-slate-700">{app.appealReason}</p>
                      <p className="font-mono text-[11px] text-slate-500 pt-1">
                        Additional Evidence: {app.additionalEvidenceSummary}
                      </p>
                    </div>
                    <div className="border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                      <span className="font-semibold text-slate-900 block">
                        Independence & Original Decision Preservation (FR-097, FR-098, FR-100)
                      </span>
                      <p className="text-slate-700">
                        Original Verification Reviewer: <code>{app.originalReviewerId}</code>
                      </p>
                      <p className="text-slate-700">
                        Assigned Independent Appeal Reviewer: <code>{app.assignedAppealReviewerId}</code>
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        Original verification decision history is cryptographically preserved and never overwritten.
                      </p>
                    </div>
                  </div>

                  {app.decisionReason && (
                    <div className="border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-950">
                      <strong>Recorded Appeal Outcome ({app.decidedBy}):</strong> {app.decisionReason}
                    </div>
                  )}

                  {isOriginalReviewer && (
                    <div className="border border-red-200 bg-red-50 p-3 text-xs text-red-900">
                      <strong>Conflict-of-Interest Block (FR-098):</strong> You were the original Verification Reviewer ({app.originalReviewerId}) on this case and are barred from deciding this appeal.
                    </div>
                  )}

                  {app.state === 'UNDER_REVIEW' && (
                    <div className="space-y-2.5 pt-2 border-t border-slate-200">
                      <input
                        type="text"
                        value={appealDecisionReason}
                        onChange={(e) => setAppealDecisionReason(e.target.value)}
                        placeholder="Enter independent appeal finding and policy citation (FR-099)..."
                        className="w-full border border-slate-300 px-3 py-2 text-xs"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={!canDecideAppeal}
                          onClick={() => {
                            if (!appealDecisionReason.trim()) return;
                            onDecideAppeal(app.id, 'OVERTURNED', appealDecisionReason.trim());
                            setAppealDecisionReason('');
                          }}
                          className="bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
                        >
                          Overturn Rejection & Issue Credential (OVERTURNED)
                        </button>
                        <button
                          disabled={!canDecideAppeal}
                          onClick={() => {
                            if (!appealDecisionReason.trim()) return;
                            onDecideAppeal(app.id, 'UPHELD', appealDecisionReason.trim());
                            setAppealDecisionReason('');
                          }}
                          className="bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
                        >
                          Uphold Original Decision (UPHELD)
                        </button>
                        <button
                          disabled={!canDecideAppeal}
                          onClick={() => {
                            if (!appealDecisionReason.trim()) return;
                            onDecideAppeal(
                              app.id,
                              'ADDITIONAL_INFORMATION_REQUIRED',
                              appealDecisionReason.trim()
                            );
                            setAppealDecisionReason('');
                          }}
                          className="border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                        >
                          Request Additional Info
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: ORGANIZATIONS, GUIDE MARKETPLACE & SPONSORSHIPS (MODULES L, M, N) */}
      {activeSubTab === 'ecosystem' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Module L: Organizations */}
          <div className="border border-slate-300 bg-white p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-800" />
              <h3 className="font-display text-xl font-bold text-slate-900">
                Module L — Organizations & Teams (FR-125–133)
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Authorized alpine clubs, universities, and expedition teams can manage rosters and view aggregated public reports.
            </p>
            <div className="border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1.5">
              <div className="font-semibold text-slate-900">
                ORG-01 · Khumbu High-Altitude Alpine Collective
              </div>
              <p className="text-slate-600">Country: Nepal · Identity & Qualification Verified (FR-126)</p>
              <p className="text-slate-600">Authorized Members: 14 · Public Verified Ascents: 2</p>
              <p className="text-[11px] text-slate-500 pt-1">
                Restriction Enforced (FR-131, FR-132): Organizations cannot access private member GPX evidence without explicit consent and cannot purchase member achievements.
              </p>
            </div>
          </div>

          {/* Module M: Guide & Service Marketplace */}
          <div className="border border-slate-300 bg-white p-5 space-y-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-slate-800" />
              <h3 className="font-display text-xl font-bold text-slate-900">
                Module M — Qualified Guide Directory (FR-134–144)
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Directory of credential-reviewed mountain guides and expedition providers.
            </p>
            <div className="border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1.5">
              <div className="font-semibold text-slate-900">
                GDE-01 · Ang Norbu Sherpa (IFMGA / NMA Certified Guide)
              </div>
              <p className="text-slate-600">
                License: NMA/IFMGA #NP-4082 (Verified under FR-135, FR-136)
              </p>
              <p className="text-slate-600">
                Approved Destinations: Mount Everest (DEST-001), Ama Dablam (DEST-027), Manaslu (DEST-008)
              </p>
              <div className="border-t border-slate-200 pt-2 mt-2 text-[11px] text-amber-900 font-medium">
                • Commercial Firewall (FR-142): Guide status never grants customer achievement approval.
                <br />• Payment Lock (FR-144, BR-008): Live booking payment processing is disabled until formal approval.
              </div>
            </div>
          </div>

          {/* Module N: Sponsorship & Advertising Firewall */}
          <div className="border border-slate-300 bg-white p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-slate-800" />
              <h3 className="font-display text-xl font-bold text-slate-900">
                Module N — Sponsorship Firewall (FR-145–153)
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              All sponsorships require identity verification, explicit labeling, and zero influence over verification or rankings.
            </p>
            <div className="border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1.5">
              <div className="font-semibold text-slate-900">
                No Unverified or Fabricated Sponsors Displayed (FR-010, FR-152, BR-012)
              </div>
              <p className="text-slate-600">
                In strict compliance with FR-010 and FR-152, the platform displays zero fabricated sponsor logos or fake commercial partnerships.
              </p>
              <p className="text-[11px] text-slate-500 pt-1">
                Constitutional Rule (BR-004, FR-150, FR-151): Sponsors can never access private evidence or influence verification, appeals, or leaderboards.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: SECURITY AUDIT LEDGER & FAIL-CLOSED DISABLED MODULES (WORKFLOW F & MODULE V) */}
      {activeSubTab === 'governance' && (
        <div className="space-y-8">
          {/* Workflow F: Administrative Credential Status Control */}
          <div className="border border-slate-300 bg-white p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <span className="font-mono text-xs text-sky-700">
                  WORKFLOW F · MODULE P & J — CONTROLLED ADMINISTRATIVE CHANGE (FR-110, FR-173)
                </span>
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  Credential Status Governance & Audit Enforcement
                </h2>
              </div>
              {currentUser.role !== 'PLATFORM_ADMIN' &&
                currentUser.role !== 'GOVERNANCE_COMMITTEE' && (
                  <button
                    onClick={() => onSwitchUser('USR-ADM-01')}
                    className="bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white"
                  >
                    Switch to Rajan Adhikari (Platform Admin)
                  </button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Credential ID
                </label>
                <select
                  value={adminTargetCredId}
                  onChange={(e) => setAdminTargetCredId(e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 font-mono"
                >
                  {credentials.map((c) => (
                    <option key={c.credentialId} value={c.credentialId}>
                      {c.credentialId} ({c.state})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  New Authoritative Status
                </label>
                <select
                  value={adminTargetCredState}
                  onChange={(e) => setAdminTargetCredState(e.target.value as CredentialState)}
                  className="w-full border border-slate-300 px-3 py-2 font-mono"
                >
                  <option value="VALID">VALID</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="REVOKED">REVOKED</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Mandatory Audit Reason (FR-173, BR-014)
                </label>
                <input
                  type="text"
                  value={adminActionReason}
                  onChange={(e) => setAdminActionReason(e.target.value)}
                  placeholder="Cite verification quality audit finding or governance resolution..."
                  className="w-full border border-slate-300 px-3 py-2"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={adminDualConfirm}
                  onChange={(e) => setAdminDualConfirm(e.target.checked)}
                />
                <span>
                  I confirm separation-of-duties authorization and understand this action is permanently recorded in the immutable audit ledger (Workflow F).
                </span>
              </label>
              <button
                disabled={
                  !adminDualConfirm ||
                  !adminActionReason.trim() ||
                  (currentUser.role !== 'PLATFORM_ADMIN' &&
                    currentUser.role !== 'GOVERNANCE_COMMITTEE')
                }
                onClick={() => {
                  onAdminCredentialStateChange(
                    adminTargetCredId,
                    adminTargetCredState,
                    adminActionReason.trim()
                  );
                  setAdminActionReason('');
                  setAdminDualConfirm(false);
                }}
                className="bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
              >
                Execute Audited Status Change
              </button>
            </div>
          </div>

          {/* Section 9 & Module V: Explicitly Disabled / Fail-Closed Modules */}
          <div className="border border-slate-300 bg-white p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-700" />
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Section 9 & Module V — Explicitly Disabled & Fail-Closed Modules (FR-226 to FR-233)
              </h2>
            </div>
            <p className="text-xs text-slate-600">
              Per MRS Section 9 and FR-233, disabled modules fail closed and are never presented as operational until formal legal, security, and Governance Committee approval.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {DISABLED_OUT_OF_SCOPE_MODULES.map((mod) => (
                <div key={mod.id} className="border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold text-slate-900">{mod.id}</span>
                    <span className="text-red-800 font-semibold">{mod.state}</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900">{mod.name}</h3>
                  <p className="text-[11px] text-slate-600">{mod.reason}</p>
                  <p className="font-mono text-[10px] text-slate-500">{mod.ruleRefs}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Module Q: Immutable Security & Privileged Action Audit Log */}
          <div className="border border-slate-300 bg-white p-6 space-y-4">
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Module Q — Immutable Security & Privileged Action Audit Ledger (FR-177 to FR-189)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-50 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Audit ID & Timestamp</th>
                    <th className="py-2.5 px-3 font-semibold">Actor & Role</th>
                    <th className="py-2.5 px-3 font-semibold">Action & Target</th>
                    <th className="py-2.5 px-3 font-semibold">Recorded Reason</th>
                    <th className="py-2.5 px-3 font-semibold">Integrity Digest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono whitespace-nowrap tabular-nums">
                        <div className="font-bold text-slate-900">{log.id}</div>
                        <div className="text-[11px] text-slate-500">{log.timestamp.slice(0, 19)}Z</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{log.actorName}</div>
                        <div className="font-mono text-[11px] text-slate-500">{log.actorRole}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        <div className="font-semibold text-slate-900">{log.action}</div>
                        <div className="text-[11px] text-sky-800">{log.targetId}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-md">{log.reason}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        {log.integrityHash.slice(0, 22)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
