import React, { useState } from 'react';
import { X, Compass, ShieldAlert, FileCheck2, History, Sparkles, Lock, ArrowRight } from 'lucide-react';
import { Destination, UserRole } from '../types/mrs';

interface DestinationModalProps {
  destination: Destination | null;
  onClose: () => void;
  onStartSubmission: (destination: Destination) => void;
  currentUserRole: UserRole;
  onProposeRevision: (destinationId: string, newRouteNote: string, newSafetyNote: string) => void;
  unitSystem: 'METRIC' | 'IMPERIAL';
}

export const DestinationModal: React.FC<DestinationModalProps> = ({
  destination,
  onClose,
  onStartSubmission,
  currentUserRole,
  onProposeRevision,
  unitSystem,
}) => {
  const [showAiBrief, setShowAiBrief] = useState(false);
  const [revisionRoute, setRevisionRoute] = useState('');
  const [revisionSafety, setRevisionSafety] = useState('');
  const [revisionSubmitted, setRevisionSubmitted] = useState(false);

  if (!destination) return null;

  const canManageDestination =
    currentUserRole === 'DESTINATION_MANAGER' || currentUserRole === 'PLATFORM_ADMIN';

  const formatElevation = (meters: number) => {
    if (unitSystem === 'IMPERIAL') {
      return `${Math.round(meters * 3.28084).toLocaleString()} ft (${meters.toLocaleString()} m)`;
    }
    return `${meters.toLocaleString()} m (${Math.round(meters * 3.28084).toLocaleString()} ft)`;
  };

  const handleRevisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionRoute.trim() && !revisionSafety.trim()) return;
    onProposeRevision(destination.id, revisionRoute.trim(), revisionSafety.trim());
    setRevisionRoute('');
    setRevisionSafety('');
    setRevisionSubmitted(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dest-modal-title"
    >
      <div className="relative my-8 w-full max-w-4xl border border-slate-300 bg-white text-slate-900 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-900 px-6 py-5 text-white">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
              <span>{destination.id}</span>
              <span aria-hidden="true">·</span>
              <span>Catalog #{destination.catalogNumber} of 100 (BR-016)</span>
              <span aria-hidden="true">·</span>
              <span>Rule {destination.ruleVersion}</span>
            </div>
            <h2 id="dest-modal-title" className="font-display text-3xl font-bold tracking-tight mt-1">
              {destination.name}{' '}
              {destination.nativeName && (
                <span className="font-normal text-slate-300 text-2xl">({destination.nativeName})</span>
              )}
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              {destination.region} · {destination.country} · {destination.continent} · {destination.activityType}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white"
            aria-label="Close destination specification"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
          {/* Geodetic & Route Summary Strip */}
          <div className="grid grid-cols-1 gap-4 border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
            <div>
              <span className="block text-xs text-slate-500">Authoritative Elevation (FR-033)</span>
              <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                {formatElevation(destination.elevationMeters)}
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-500">Geodetic Coordinates (WGS84)</span>
              <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {destination.latitude.toFixed(4)}°, {destination.longitude.toFixed(4)}°
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-500">Survey Source Reference (FR-033)</span>
              <span className="text-xs font-semibold text-slate-900">{destination.sourceReference}</span>
            </div>
          </div>

          {/* Route, Difficulty, Seasonality, Permits */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-slate-700" />
                  <span>Approved Route & Classification (FR-034, FR-035)</span>
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-900">{destination.approvedRoute}</p>
                <p className="mt-1 text-xs text-slate-600">
                  Difficulty Grade: <strong className="text-slate-800">{destination.difficultyGrade}</strong>
                </p>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  {destination.eligibilityRules}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-700" />
                  <span>Seasonal Window & Safety Information (FR-036, FR-037)</span>
                </h3>
                <p className="mt-1 text-xs text-slate-800">
                  <strong>Primary Window:</strong> {destination.seasonalWindow}
                </p>
                <p className="mt-1 text-xs text-slate-800">
                  <strong>Permit Authority:</strong> {destination.permitAuthority}{' '}
                  ({destination.permitRequired ? 'Mandatory Official Permit' : 'Open Access / Local Registry'})
                </p>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  {destination.safetyAdvisory}
                </p>
              </div>
            </div>

            {/* Mandatory Evidence Requirements before Submission (FR-038, FR-050) */}
            <div className="border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-sky-700" />
                <span>Mandatory Evidence Requirements Before Submission (FR-038, FR-050)</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-700">
                {destination.evidenceRequirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono font-bold text-slate-900">0{idx + 1}.</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-slate-200 pt-3 text-[11px] text-slate-500">
                Per FR-045 & FR-049: Completed Achievements, Documented Attempts, and Training Ascents are recorded distinctly. Rule updates never retroactively invalidate previously verified credentials.
              </div>
            </div>
          </div>

          {/* Optional AI Route & Telemetry Context (Module U: FR-218, FR-222, FR-223) */}
          <div className="border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-sky-700" />
                <span className="text-xs font-semibold text-slate-900">
                  Optional AI-Assisted Route & Telemetry Orientation (Module U — FR-218, FR-222)
                </span>
              </div>
              <button
                onClick={() => setShowAiBrief(!showAiBrief)}
                className="text-xs font-semibold text-sky-700 hover:underline whitespace-nowrap shrink-0"
              >
                {showAiBrief ? 'Hide AI Advisory' : 'View AI Route Advisory'}
              </button>
            </div>
            {showAiBrief && (
              <div className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-700 space-y-2">
                <p className="font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5">
                  AI Disclosure (FR-222, BR-011): This summary is generated as optional planning context and is strictly distinguished from authoritative survey data. AI cannot issue or approve achievement verifications.
                </p>
                <p>
                  <strong>GNSS Recording Guidance for {destination.name}:</strong> Record trackpoints at 5–15 second intervals from the trailhead/base camp through the true {destination.elevationMeters}m geodetic point. Keep barometric altimeter calibrated at known datum benchmarks along {destination.approvedRoute}.
                </p>
              </div>
            )}
          </div>

          {/* Version History & Destination Manager Update Workflow (FR-040, FR-041) */}
          <div className="border-t border-slate-200 pt-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <History className="h-4 w-4 text-slate-700" />
              <span>Controlled Destination Specification Version History (FR-040, FR-048)</span>
            </h3>
            <div className="space-y-2">
              {destination.revisionHistory.map((rev, idx) => (
                <div key={idx} className="flex items-start justify-between border border-slate-200 p-3 text-xs">
                  <div>
                    <span className="font-mono font-semibold text-slate-900">{rev.version}</span>
                    <span className="mx-1.5 text-slate-400">·</span>
                    <span className="text-slate-600">{rev.summary}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500 whitespace-nowrap ml-4 tabular-nums">
                    {rev.date} ({rev.authorRole})
                  </span>
                </div>
              ))}
            </div>

            {canManageDestination ? (
              <form onSubmit={handleRevisionSubmit} className="border border-slate-300 bg-slate-50 p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-900">
                  Destination Manager / Admin Controlled Update (FR-040, FR-041)
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={revisionRoute}
                    onChange={(e) => setRevisionRoute(e.target.value)}
                    placeholder="Proposed route note or variation..."
                    className="border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                  />
                  <input
                    type="text"
                    value={revisionSafety}
                    onChange={(e) => setRevisionSafety(e.target.value)}
                    placeholder="Seasonal or safety bulletin update..."
                    className="border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Appends a new rule version without retroactively invalidating existing credentials (FR-049).
                  </span>
                  <button
                    type="submit"
                    className="bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Record Versioned Update
                  </button>
                </div>
                {revisionSubmitted && (
                  <p className="text-xs font-medium text-emerald-700">
                    Versioned update appended to destination history and logged in the audit ledger.
                  </p>
                )}
              </form>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Lock className="h-3.5 w-3.5" />
                <span>
                  Destination requirements are locked against unauthorized edits (FR-041). Switch to Destination Manager role in Workspace to test versioned updates.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            onClick={onClose}
            className="border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              onStartSubmission(destination);
            }}
            className="flex items-center gap-2 bg-sky-700 px-5 py-2 text-xs font-semibold text-white hover:bg-sky-800 transition-colors"
          >
            <span>Submit Achievement for {destination.name}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
