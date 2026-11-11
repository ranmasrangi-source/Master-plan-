import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  GitBranch,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import {
  ALL_REQUIREMENTS_TRACEABILITY,
  ROADMAP_21_PHASES,
  PERMITTED_SUBMISSION_TRANSITIONS,
  PERMITTED_APPEAL_TRANSITIONS,
  PERMITTED_CREDENTIAL_TRANSITIONS,
} from '../data/mrsSpecificationData';
import { RequirementItem } from '../types/mrs';

interface SpecificationTraceabilityViewProps {
  onNavigateTab: (
    tab: 'landing' | 'destinations' | 'verify' | 'leaderboards' | 'workspace' | 'specification'
  ) => void;
}

export const SpecificationTraceabilityView: React.FC<SpecificationTraceabilityViewProps> = ({
  onNavigateTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    'ALL' | 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'BUSINESS_RULE'
  >('ALL');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [activeView, setActiveView] = useState<
    'traceability' | 'roadmap' | 'statemachines' | 'policies'
  >('traceability');

  const uniqueModules = useMemo(() => {
    const set = new Set<string>();
    ALL_REQUIREMENTS_TRACEABILITY.forEach((r) => set.add(r.moduleCode));
    return ['ALL', ...Array.from(set)];
  }, []);

  const filteredRequirements = useMemo(() => {
    return ALL_REQUIREMENTS_TRACEABILITY.filter((req) => {
      if (selectedCategory !== 'ALL' && req.category !== selectedCategory) return false;
      if (selectedModule !== 'ALL' && req.moduleCode !== selectedModule) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          req.id.toLowerCase().includes(q) ||
          req.statement.toLowerCase().includes(q) ||
          req.moduleName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [searchQuery, selectedCategory, selectedModule]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Document Control Header */}
      <div className="border border-slate-300 bg-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-slate-500">
              <span>DOCUMENT ID: 01</span>
              <span aria-hidden="true">·</span>
              <span>VERSION 1.0 — FOUNDER REVIEW DRAFT</span>
              <span aria-hidden="true">·</span>
              <span>PARENT: DOCUMENT 00 (MASTER PROJECT CONSTITUTION)</span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 mt-1">
              0 TO 8848 — Master Requirements Specification & Traceability Matrix
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Official Domain: <code>https://0to8848official.com</code> · Repository: <code>0-TO-8848-Global-Adventure-Platform</code> · 100 Initial Featured Destinations · 21 Official Roadmap Phases
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center font-mono text-xs shrink-0">
            <div className="border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="block text-lg font-bold text-slate-900 tabular-nums">243</span>
              <span className="text-[11px] text-slate-500">FR-001..243</span>
            </div>
            <div className="border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="block text-lg font-bold text-slate-900 tabular-nums">40</span>
              <span className="text-[11px] text-slate-500">NFR-001..040</span>
            </div>
            <div className="border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="block text-lg font-bold text-slate-900 tabular-nums">17</span>
              <span className="text-[11px] text-slate-500">BR-001..017</span>
            </div>
          </div>
        </div>

        {/* Sub-navigation */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveView('traceability')}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${
              activeView === 'traceability'
                ? 'bg-slate-900 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Section 11: Full Requirements Traceability (300 Requirements)
          </button>
          <button
            onClick={() => setActiveView('roadmap')}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${
              activeView === 'roadmap'
                ? 'bg-slate-900 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            BR-015: Official 21-Phase Development Roadmap
          </button>
          <button
            onClick={() => setActiveView('statemachines')}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${
              activeView === 'statemachines'
                ? 'bg-slate-900 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Section 8: Required System States & Transitions
          </button>
          <button
            onClick={() => setActiveView('policies')}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${
              activeView === 'policies'
                ? 'bg-slate-900 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            FR-007 & Section 13: Policies, FAQ, Safety & Document Control
          </button>
        </div>
      </div>

      {/* VIEW 1: REQUIREMENTS TRACEABILITY MATRIX */}
      {activeView === 'traceability' && (
        <div className="border border-slate-300 bg-white p-6 space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Requirement ID (e.g., FR-031, FR-082, BR-001, NFR-014) or keyword..."
                className="w-full border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="w-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900"
              >
                <option value="ALL">All Categories (300 Total)</option>
                <option value="FUNCTIONAL">Functional Requirements (FR-001..243)</option>
                <option value="NON_FUNCTIONAL">Non-Functional Requirements (NFR-001..040)</option>
                <option value="BUSINESS_RULE">Critical Business Rules (BR-001..017)</option>
              </select>
            </div>
            <div>
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="w-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900"
              >
                {uniqueModules.map((mod) => (
                  <option key={mod} value={mod}>
                    {mod === 'ALL' ? 'All Modules (Module A – Module W)' : mod}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>
              Displaying <strong>{filteredRequirements.length}</strong> of 300 traceable requirements (No requirement silently removed — Section 11).
            </span>
            <span className="font-mono">
              Operational vs Fail-Closed Disabled clearly distinguished (FR-008)
            </span>
          </div>

          <div className="overflow-x-auto max-h-[640px] overflow-y-auto border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-slate-900 text-white">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Req ID</th>
                  <th className="py-2.5 px-3 font-semibold">Module</th>
                  <th className="py-2.5 px-3 font-semibold">Official Requirement Statement</th>
                  <th className="py-2.5 px-3 font-semibold">Phase</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Verify</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRequirements.map((req: RequirementItem) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {req.id}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-900">{req.moduleCode}</span>
                      <span className="block text-[11px] text-slate-500">{req.moduleName}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">{req.statement}</td>
                    <td className="py-2.5 px-3 font-mono whitespace-nowrap tabular-nums">
                      Phase {req.roadmapPhase}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {req.status === 'OPERATIONAL' ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          OPERATIONAL
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-red-800">
                          <Lock className="h-3.5 w-3.5" />
                          FAIL_CLOSED
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {req.interactiveTargetTab && (
                        <button
                          onClick={() => onNavigateTab(req.interactiveTargetTab!)}
                          className="inline-flex items-center gap-1 text-sky-700 font-semibold hover:underline"
                        >
                          <span>Inspect</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: 21-PHASE DEVELOPMENT ROADMAP (BR-015) */}
      {activeView === 'roadmap' && (
        <div className="border border-slate-300 bg-white p-6 space-y-5">
          <div>
            <span className="font-mono text-xs text-sky-700">
              CRITICAL BUSINESS RULE BR-015 · EXACTLY 21 OFFICIAL PHASES
            </span>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              0 TO 8848 — Official 21-Phase Development Roadmap
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {ROADMAP_21_PHASES.map((p) => (
              <div key={p.phase} className="border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-bold text-slate-900">
                    PHASE {String(p.phase).padStart(2, '0')} / 21
                  </span>
                  <span className="text-[11px] text-slate-600">{p.gateStatus}</span>
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900">{p.title}</h3>
                <p className="text-xs text-slate-600">{p.deliverables}</p>
                <p className="font-mono text-[11px] text-slate-500">
                  Modules: {p.modulesCovered.join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: REQUIRED SYSTEM STATES (SECTION 8) */}
      {activeView === 'statemachines' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="border border-slate-300 bg-white p-5 space-y-3">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-slate-800" />
              <h3 className="font-display text-xl font-bold text-slate-900">
                1. Submission State Machine (9 States)
              </h3>
            </div>
            <div className="space-y-2 text-xs">
              {Object.entries(PERMITTED_SUBMISSION_TRANSITIONS).map(([state, nextStates]) => (
                <div key={state} className="border border-slate-200 bg-slate-50 p-2.5">
                  <span className="font-mono font-bold text-slate-900 block">{state}</span>
                  <span className="text-slate-600 font-mono text-[11px]">
                    Permitted Next: {nextStates.length > 0 ? nextStates.join(' → ') : 'Terminal State'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-slate-300 bg-white p-5 space-y-3">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-slate-800" />
              <h3 className="font-display text-xl font-bold text-slate-900">
                2. Appeal State Machine (7 States)
              </h3>
            </div>
            <div className="space-y-2 text-xs">
              {Object.entries(PERMITTED_APPEAL_TRANSITIONS).map(([state, nextStates]) => (
                <div key={state} className="border border-slate-200 bg-slate-50 p-2.5">
                  <span className="font-mono font-bold text-slate-900 block">{state}</span>
                  <span className="text-slate-600 font-mono text-[11px]">
                    Permitted Next: {nextStates.length > 0 ? nextStates.join(' → ') : 'Terminal State'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-slate-300 bg-white p-5 space-y-3">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-slate-800" />
              <h3 className="font-display text-xl font-bold text-slate-900">
                3. Credential State Machine (5 States)
              </h3>
            </div>
            <div className="space-y-2 text-xs">
              {Object.entries(PERMITTED_CREDENTIAL_TRANSITIONS).map(([state, nextStates]) => (
                <div key={state} className="border border-slate-200 bg-slate-50 p-2.5">
                  <span className="font-mono font-bold text-slate-900 block">{state}</span>
                  <span className="text-slate-600 font-mono text-[11px]">
                    Permitted Next: {nextStates.length > 0 ? nextStates.join(' → ') : 'Terminal Revocation'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: POLICIES, SAFETY, FAQ & DOCUMENT CONTROL (FR-007, FR-190, SECTION 13) */}
      {activeView === 'policies' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="border border-slate-300 bg-white p-6 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-slate-900" />
              <h3 className="font-display text-xl font-bold text-slate-900">
                Privacy Policy & Evidence Protection Charter (Module R — FR-190 to FR-200)
              </h3>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>Privacy-by-Default (FR-191, BR-013):</strong> Personal contact details, raw GPX telemetry files, original EXIF photographs, and government permit numbers are stored in access-controlled evidence vaults. Public credential pages expose only the credential status, destination, completion date, rule version, and (where opted in) the adventurer’s display name.
            </p>
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>AI Data Protection (FR-224, FR-225):</strong> Private evidence files are never disclosed to unauthorized third-party AI training pipelines. Local Web Crypto SHA-256 and deterministic XML telemetry analysis run without external data leakage.
            </p>
          </div>

          <div className="border border-slate-300 bg-white p-6 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-900" />
              <h3 className="font-display text-xl font-bold text-slate-900">
                Document Control & Final Requirement Declaration (Section 12 & 13)
              </h3>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              <li>• Every feature has a defined purpose traceable to Document 00 & Document 01.</li>
              <li>• Every important action has an authorization rule across the 13 platform roles.</li>
              <li>• Every achievement requires verifiable GPX/EXIF/documentary evidence.</li>
              <li>• Every verification decision is accountable and requires written reasons.</li>
              <li>• Every commercial feature respects strict verification independence.</li>
              <li>• Standard digital badges remain free after successful verification (BR-002).</li>
              <li>• Previous Master-project repository preservation acknowledged (BR-017).</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
