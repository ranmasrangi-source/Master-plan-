import React from 'react';
import { ShieldCheck, AlertTriangle, XCircle, X, Lock, Award, QrCode, CheckCircle2 } from 'lucide-react';
import { CredentialRecord } from '../types/mrs';

interface CertificateModalProps {
  credential: CredentialRecord | null;
  onClose: () => void;
  unitSystem: 'METRIC' | 'IMPERIAL';
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  credential,
  onClose,
  unitSystem,
}) => {
  if (!credential) return null;

  const formatElevation = (meters: number) => {
    if (unitSystem === 'IMPERIAL') {
      return `${Math.round(meters * 3.28084).toLocaleString()} ft (${meters.toLocaleString()} m)`;
    }
    return `${meters.toLocaleString()} m (${Math.round(meters * 3.28084).toLocaleString()} ft)`;
  };

  // Deterministic 7x7 QR visual matrix based on credentialId
  const qrCells: boolean[] = [];
  for (let i = 0; i < 49; i++) {
    const code = credential.credentialId.charCodeAt(i % credential.credentialId.length);
    qrCells.push(((code + i * 7) % 3) !== 0);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cert-modal-title"
    >
      <div className="relative w-full max-w-3xl border border-slate-300 bg-white text-slate-900 shadow-xl">
        {/* Top Institutional Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <Award className="h-5 w-5 text-sky-400" />
            <div>
              <span id="cert-modal-title" className="font-display text-lg font-bold tracking-wide">
                0 TO 8848 — OFFICIAL CREDENTIAL & FREE DIGITAL BADGE RECORD
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-400"
            aria-label="Close certificate view"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Banner (Never color-only per NFR-032) */}
        <div
          className={`flex items-center justify-between border-b px-6 py-3 text-sm font-medium ${
            credential.state === 'VALID'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : credential.state === 'SUSPENDED'
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {credential.state === 'VALID' && <ShieldCheck className="h-4 w-4 text-emerald-700" />}
            {credential.state === 'SUSPENDED' && <AlertTriangle className="h-4 w-4 text-amber-700" />}
            {credential.state === 'REVOKED' && <XCircle className="h-4 w-4 text-red-700" />}
            <span>
              Authoritative Credential Status: <strong>{credential.state}</strong>
            </span>
          </div>
          <span className="font-mono text-xs tabular-nums">
            ID: {credential.credentialId}
          </span>
        </div>

        <div className="p-6 md:p-8">
          {credential.statusReason && (
            <div className="mb-6 border border-red-200 bg-red-50/70 p-4 text-xs text-red-900">
              <strong className="block font-semibold">Official Status Audit Note (FR-110):</strong>
              {credential.statusReason}
            </div>
          )}

          {/* Main Certificate Body */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="md:col-span-2 space-y-5">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Earned By Verified Adventurer · {credential.classification.replace('_', ' ')}
                </p>
                <h3 className="font-display text-3xl font-bold tracking-tight text-slate-900 mt-1">
                  {credential.publicDisplayAuthorized
                    ? credential.adventurerName
                    : 'Private Adventurer (Identity Shielded by User Consent — FR-026)'}
                </h3>
              </div>

              <div className="border-t border-b border-slate-200 py-4 space-y-2">
                <p className="text-xs text-slate-500">Verified Global Destination & Geodetic Elevation</p>
                <p className="font-display text-2xl font-bold text-slate-900">
                  {credential.destinationName} ({credential.destinationId})
                </p>
                <p className="text-sm text-slate-700 font-mono tabular-nums">
                  Elevation: {formatElevation(credential.elevationMeters)} · {credential.country} · {credential.activityType}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-slate-500">Activity Completion Date</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {credential.completedDate}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500">Verification & Issuance Timestamp</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {credential.issuedAt.slice(0, 10)}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500">Governing Rule Version (FR-048)</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {credential.ruleVersion}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500">Authorized Reviewer Ref (FR-088)</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {credential.verificationReviewerId}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <Lock className="h-3.5 w-3.5 text-slate-600" />
                  <span>Cryptographic Evidence Integrity & Privacy Protection (FR-079, BR-013)</span>
                </div>
                <p className="font-mono text-[11px] text-slate-600 break-all">
                  Evidence Digest: {credential.cryptographicDigest}
                </p>
                <p className="text-slate-600">
                  Original GPX tracks, EXIF photographs, and permit documents remain strictly isolated in private vault storage and are never exposed on public credential pages.
                </p>
              </div>
            </div>

            {/* Right Column: Standard Free Digital Badge + QR Verification */}
            <div className="flex flex-col justify-between border border-slate-200 bg-slate-50 p-5">
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-20 w-20 items-center justify-center border-2 border-slate-900 bg-slate-900 text-white">
                  <div className="text-center">
                    <span className="block font-mono text-[10px] tracking-widest text-sky-400">0 TO 8848</span>
                    <span className="block font-display text-xl font-bold tabular-nums">
                      {Math.round(credential.elevationMeters)}m
                    </span>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-xs text-slate-900">{credential.badgeTitle}</p>
                  <p className="mt-1 text-[11px] text-emerald-800 font-medium flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Free Standard Digital Badge (BR-002)</span>
                  </p>
                </div>
              </div>

              <div className="my-4 border-t border-slate-200 pt-4 text-center">
                <div className="mx-auto inline-grid grid-cols-7 gap-0.5 border border-slate-300 bg-white p-2">
                  {qrCells.map((filled, idx) => (
                    <div
                      key={idx}
                      className={`h-2.5 w-2.5 ${filled ? 'bg-slate-900' : 'bg-slate-100'}`}
                    />
                  ))}
                </div>
                <p className="mt-2 flex items-center justify-center gap-1 text-[11px] font-medium text-slate-600">
                  <QrCode className="h-3.5 w-3.5" />
                  <span>QR Public Verification (FR-108)</span>
                </p>
                <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                  0to8848official.com/verify/{credential.credentialId}
                </p>
              </div>

              <div className="border-t border-slate-200 pt-3 text-[11px] text-slate-500 space-y-1">
                <p>• Non-transferable between users (FR-113)</p>
                <p>• Earned strictly by verified evidence, never payment (BR-001, FR-114)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <span className="text-xs text-slate-600">
            0 TO 8848 — EXPLORE. ACHIEVE. PROVE. · Primary Database Authoritative (BR-010)
          </span>
          <button
            onClick={onClose}
            className="bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            Close Certificate
          </button>
        </div>
      </div>
    </div>
  );
};
