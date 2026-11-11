import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  FileCheck,
  AlertTriangle,
  ShieldCheck,
  Lock,
  CheckCircle2,
  FileCode,
} from 'lucide-react';
import {
  Destination,
  PlatformUser,
  AchievementClassification,
  GpxAnalysisResult,
  AchievementSubmission,
} from '../types/mrs';
import { analyzeGpxContent, generateSampleGpxXml } from '../utils/gpxAnalyzer';

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDestination: Destination | null;
  destinations: Destination[];
  currentUser: PlatformUser | null;
  existingHashes: string[];
  onCreateSubmission: (submission: AchievementSubmission) => void;
  onRequireAdventurerAuth: () => void;
}

export const SubmissionModal: React.FC<SubmissionModalProps> = ({
  isOpen,
  onClose,
  initialDestination,
  destinations,
  currentUser,
  existingHashes,
  onCreateSubmission,
  onRequireAdventurerAuth,
}) => {
  const [selectedDestId, setSelectedDestId] = useState<string>(
    initialDestination?.id || 'DEST-001'
  );
  const [classification, setClassification] =
    useState<AchievementClassification>('COMPLETED_ACHIEVEMENT');
  const [startDate, setStartDate] = useState('2026-10-12');
  const [endDate, setEndDate] = useState('2026-10-15');
  const [routeTaken, setRouteTaken] = useState('');
  const [notes, setNotes] = useState('');
  const [publicConsent, setPublicConsent] = useState(true);
  const [exifIncluded, setExifIncluded] = useState(true);
  const [permitAttached, setPermitAttached] = useState(true);
  const [gpxAnalysis, setGpxAnalysis] = useState<GpxAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const selectedDest =
    destinations.find((d) => d.id === selectedDestId) || destinations[0];

  useEffect(() => {
    if (initialDestination) {
      setSelectedDestId(initialDestination.id);
      setRouteTaken(initialDestination.approvedRoute);
    } else if (selectedDest) {
      setRouteTaken(selectedDest.approvedRoute);
    }
  }, [initialDestination, selectedDestId]);

  if (!isOpen) return null;

  const handleLoadSampleGpx = async (
    mode: 'VALID_ASCENT' | 'SPOOFED_HELICOPTER' | 'TIMESTAMP_GAP'
  ) => {
    setAnalyzing(true);
    const sample = generateSampleGpxXml(
      mode,
      selectedDest.name,
      selectedDest.latitude,
      selectedDest.longitude,
      selectedDest.elevationMeters
    );
    const result = await analyzeGpxContent(
      sample.fileName,
      sample.xml,
      selectedDest.elevationMeters,
      selectedDest.activityType,
      existingHashes,
      exifIncluded
    );
    setGpxAnalysis(result);
    setAnalyzing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    const text = await file.text();
    const result = await analyzeGpxContent(
      file.name,
      text,
      selectedDest.elevationMeters,
      selectedDest.activityType,
      existingHashes,
      exifIncluded
    );
    setGpxAnalysis(result);
    setAnalyzing(false);
  };

  const handleSubmit = (asDraft: boolean) => {
    if (!currentUser || currentUser.role === 'PUBLIC_VISITOR') {
      onRequireAdventurerAuth();
      return;
    }
    if (!gpxAnalysis) return;

    const newId = `SUB-2026-${String(Math.floor(100 + Math.random() * 899))}`;
    const newSub: AchievementSubmission = {
      id: newId,
      adventurerId: currentUser.id,
      adventurerName: currentUser.name,
      destinationId: selectedDest.id,
      destinationName: selectedDest.name,
      elevationMeters: selectedDest.elevationMeters,
      classification,
      ruleVersion: selectedDest.ruleVersion,
      activityStartDate: startDate,
      activityEndDate: endDate,
      routeTaken: routeTaken || selectedDest.approvedRoute,
      adventurerNotes:
        notes ||
        `Submitted under ${selectedDest.ruleVersion} for ${selectedDest.name} (${selectedDest.elevationMeters}m).`,
      publicVisibilityConsent: publicConsent,
      state: asDraft ? 'DRAFT' : 'UNDER_REVIEW',
      submittedAt: new Date().toISOString(),
      AssignedReviewerId: 'USR-REV-01',
      gpxAnalysis,
      supportingDocuments: [
        {
          name: gpxAnalysis.fileName,
          type: 'GPX_TRACK',
          sha256: gpxAnalysis.sha256Hash,
          privateStorageRef: `vault://private-evidence/${newId}/${gpxAnalysis.fileName}`,
        },
        ...(exifIncluded
          ? [
              {
                name: 'summit_evidence_exif.jpg',
                type: 'SUMMIT_PHOTO_EXIF' as const,
                sha256: gpxAnalysis.sha256Hash.slice(0, 32) + '99887766554433221100aabbccddeeff',
                privateStorageRef: `vault://private-evidence/${newId}/summit_evidence_exif.jpg`,
              },
            ]
          : []),
        ...(permitAttached
          ? [
              {
                name: 'official_expedition_permit.pdf',
                type: 'PERMIT_DOCUMENT' as const,
                sha256: '11223344556677889900aabbccddeeff' + gpxAnalysis.sha256Hash.slice(0, 32),
                privateStorageRef: `vault://private-evidence/${newId}/official_expedition_permit.pdf`,
              },
            ]
          : []),
      ],
      decisionHistory: [],
      highRiskEscalated: gpxAnalysis.anomalies.some((a) => a.severity === 'HIGH_RISK'),
    };

    onCreateSubmission(newSub);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sub-modal-title"
    >
      <div className="relative my-8 w-full max-w-4xl border border-slate-300 bg-white text-slate-900 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div>
            <span className="font-mono text-xs text-sky-400">
              WORKFLOW B · MODULE F & MODULE G (FR-051 TO FR-079)
            </span>
            <h2 id="sub-modal-title" className="font-display text-2xl font-bold tracking-tight">
              Submit Adventure Achievement & Cryptographic Evidence
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white"
            aria-label="Close submission dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-6 space-y-6">
          {/* Role Guard Notice (Section 3.1) */}
          {(!currentUser || currentUser.role === 'PUBLIC_VISITOR') && (
            <div className="flex items-center justify-between border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
              <div>
                <strong>Public Visitor Restriction (Section 3.1):</strong> Public visitors cannot submit achievements without an active Registered Adventurer account.
              </div>
              <button
                onClick={onRequireAdventurerAuth}
                className="bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 whitespace-nowrap ml-4"
              >
                Activate Adventurer Session
              </button>
            </div>
          )}

          {/* Step 1: Select Destination & Classification */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                1. Featured Global Destination (100 Catalog — FR-052)
              </label>
              <select
                value={selectedDestId}
                onChange={(e) => {
                  setSelectedDestId(e.target.value);
                  setGpxAnalysis(null);
                }}
                className="w-full border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
              >
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.id} — {d.name} ({d.elevationMeters}m · {d.country})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                2. Achievement Classification (FR-045)
              </label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value as AchievementClassification)}
                className="w-full border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900"
              >
                <option value="COMPLETED_ACHIEVEMENT">
                  COMPLETED ACHIEVEMENT (Full Summit / Terminus Verification)
                </option>
                <option value="DOCUMENTED_ATTEMPT">
                  DOCUMENTED ATTEMPT (High-Point Verified Without Summit)
                </option>
                <option value="TRAINING_ASCENT">
                  TRAINING ASCENT (Acclimatization / Preparation Log)
                </option>
              </select>
            </div>
          </div>

          {/* Destination Requirements Box (FR-050) */}
          <div className="border border-slate-200 bg-slate-50 p-4 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">
                Requirements for {selectedDest.name} ({selectedDest.elevationMeters}m) · Rule {selectedDest.ruleVersion}
              </span>
              <span className="font-mono text-slate-500">
                Permit Authority: {selectedDest.permitAuthority}
              </span>
            </div>
            <p className="text-slate-600">{selectedDest.eligibilityRules}</p>
          </div>

          {/* Step 2: Activity Dates & Route */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Activity Start Date (FR-053)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Completion / High-Point Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Approved Route Taken
              </label>
              <input
                type="text"
                value={routeTaken}
                onChange={(e) => setRouteTaken(e.target.value)}
                className="w-full border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>
          </div>

          {/* Step 3: Evidence Upload & Anti-Fraud Telemetry Engine (FR-054 to FR-076) */}
          <div className="border border-slate-300 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <FileCode className="h-4 w-4 text-sky-700" />
                  <span>3. GPX Telemetry Upload & SHA-256 Anti-Fraud Verification (FR-054, FR-059, FR-066–076)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Upload a `.gpx` file or generate a realistic telemetry track below to inspect live SHA-256 hashing and anomaly rules.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap">
                <Upload className="h-3.5 w-3.5" />
                <span>Upload .GPX File</span>
                <input
                  type="file"
                  accept=".gpx,.xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Instant Telemetry Presets for Testing */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Test Presets:</span>
              <button
                type="button"
                onClick={() => handleLoadSampleGpx('VALID_ASCENT')}
                className="border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
              >
                Load Genuine Ascent GPX ({selectedDest.elevationMeters}m)
              </button>
              <button
                type="button"
                onClick={() => handleLoadSampleGpx('SPOOFED_HELICOPTER')}
                className="border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                Load High-Speed Anomaly GPX (FR-068 Spoof Test)
              </button>
              <button
                type="button"
                onClick={() => handleLoadSampleGpx('TIMESTAMP_GAP')}
                className="border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-200"
              >
                Load Non-Monotonic Timestamp GPX (FR-071 Test)
              </button>
            </div>

            {/* Supporting Metadata Toggles */}
            <div className="flex flex-wrap gap-6 pt-1 text-xs">
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={exifIncluded}
                  onChange={(e) => setExifIncluded(e.target.checked)}
                />
                <span>Include Summit Photo with EXIF Camera/Time Metadata (FR-055, FR-070)</span>
              </label>
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={permitAttached}
                  onChange={(e) => setPermitAttached(e.target.checked)}
                />
                <span>Attach Official Permit / Liaison Document (FR-056)</span>
              </label>
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={publicConsent}
                  onChange={(e) => setPublicConsent(e.target.checked)}
                />
                <span>Opt-in to display achievement on Public Leaderboard once verified (FR-026)</span>
              </label>
            </div>

            {/* Live GPX Analysis Output */}
            {analyzing && (
              <div className="p-4 text-xs text-slate-600 font-mono">
                Calculating SHA-256 digest and analyzing GPX trackpoints...
              </div>
            )}

            {gpxAnalysis && !analyzing && (
              <div className="border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-sky-700" />
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {gpxAnalysis.fileName} ({gpxAnalysis.fileSizeBytes} bytes)
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">
                    Trackpoints: {gpxAnalysis.trackpointCount}
                  </span>
                </div>

                <div className="font-mono text-[11px] text-slate-700 break-all">
                  <strong>SHA-256 Integrity Digest (FR-059):</strong> {gpxAnalysis.sha256Hash}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                  <div className="border border-slate-200 bg-white p-2.5">
                    <span className="block text-[11px] text-slate-500">Peak GPX Elevation</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {gpxAnalysis.maxElevationM} m
                    </span>
                  </div>
                  <div className="border border-slate-200 bg-white p-2.5">
                    <span className="block text-[11px] text-slate-500">Total Distance / Gain</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {gpxAnalysis.totalDistanceKm} km / +{gpxAnalysis.cumulativeElevationGainM}m
                    </span>
                  </div>
                  <div className="border border-slate-200 bg-white p-2.5">
                    <span className="block text-[11px] text-slate-500">Max Segment Speed</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {gpxAnalysis.maxSegmentSpeedKmh} km/h
                    </span>
                  </div>
                  <div className="border border-slate-200 bg-white p-2.5">
                    <span className="block text-[11px] text-slate-500">Route Continuity</span>
                    <span className="font-mono font-bold text-slate-900">
                      {gpxAnalysis.routeContinuityPass && gpxAnalysis.timestampMonotonicPass
                        ? 'PASS (Continuous)'
                        : 'FLAGGED FOR REVIEW'}
                    </span>
                  </div>
                </div>

                {gpxAnalysis.anomalies.length === 0 ? (
                  <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{gpxAnalysis.automatedSummary}</span>
                  </div>
                ) : (
                  <div className="border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
                      <span>{gpxAnalysis.automatedSummary}</span>
                    </div>
                    <ul className="space-y-1 pl-5 list-disc">
                      {gpxAnalysis.anomalies.map((anom, i) => (
                        <li key={i}>
                          <strong className="font-mono">[{anom.severity} · {anom.code}]</strong>{' '}
                          {anom.description} ({anom.ruleRef})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              4. Expedition Log & Reviewer Context Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detail camp timestamps, weather window, rope-fixing team or liaison officer reference..."
              className="w-full border border-slate-300 p-2.5 text-xs text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span>
              Privacy Guarantee (FR-078, FR-079): Uploaded GPX files, photos, and permits are accessible strictly to assigned Verification/Appeal Reviewers and never exposed publicly.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!gpxAnalysis}
              onClick={() => handleSubmit(true)}
              className="border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-40"
            >
              Save as DRAFT (Section 8)
            </button>
            <button
              type="button"
              disabled={!gpxAnalysis}
              onClick={() => handleSubmit(false)}
              className="flex items-center gap-1.5 bg-sky-700 px-5 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-40"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Submit to Verification Queue</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
