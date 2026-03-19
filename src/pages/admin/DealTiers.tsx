import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import {
  getDealTierRules,
  uploadDealTiers,
  type DealTierRule,
} from '@/api/deal-tiers.api';

interface DestinationGroup {
  destination: string;
  subDestination: string | null;
  grade: string;
  tiers: DealTierRule[];
}

function groupByDestination(rules: DealTierRule[]): DestinationGroup[] {
  const map = new Map<string, DestinationGroup>();

  for (const rule of rules) {
    const key = `${rule.destination}|${rule.subDestination ?? ''}`;
    if (!map.has(key)) {
      map.set(key, {
        destination: rule.destination,
        subDestination: rule.subDestination,
        grade: rule.grade,
        tiers: [],
      });
    }
    map.get(key)!.tiers.push(rule);
  }

  return Array.from(map.values());
}

function formatGm(val: string | null): string {
  if (!val) return '-';
  const num = Number(val);
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
  return `$${num}`;
}

const gradeColors: Record<string, string> = {
  A: 'bg-[#E6F9F5] text-[#009977]',
  B: 'bg-amber-100 text-amber-700',
};

export function DealTiers() {
  const [rules, setRules] = useState<DealTierRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      setRules(await getDealTierRules());
    } catch {
      setError('Failed to load deal tier rules');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setUploadMessage('');

    try {
      const result = await uploadDealTiers(file);
      setUploadMessage(`Successfully imported ${result.rulesImported} rules`);
      setLoading(true);
      await load();
    } catch {
      setError('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const groups = groupByDestination(rules);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Deal Tiers</h1>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977] disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload Deal Tiers MASTER'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {uploadMessage && <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">{uploadMessage}</div>}

      {rules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No deal tier rules loaded yet.</p>
          <p className="mt-1 text-sm text-gray-400">Upload the Deal Tiers MASTER spreadsheet to get started.</p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-gray-500">
            {groups.length} destinations, {rules.length} rules
          </p>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm font-medium text-gray-500">
                <th className="pb-3 pr-4">Destination</th>
                <th className="pb-3 pr-4">Sub-Destination</th>
                <th className="pb-3 pr-4 w-16">Grade</th>
                <th className="pb-3 pr-4 text-right">Tier 1 Min GM</th>
                <th className="pb-3 pr-4 text-right">Tier 2 Range</th>
                <th className="pb-3 text-right">Tier 3 Max GM</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const key = `${group.destination}|${group.subDestination ?? ''}`;
                const isExpanded = expandedRow === key;
                const tier1 = group.tiers.find((t) => t.tier === 1);
                const tier2 = group.tiers.find((t) => t.tier === 2);
                const tier3 = group.tiers.find((t) => t.tier === 3);

                return (
                  <tr
                    key={key}
                    className="border-b border-gray-100 text-sm cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedRow(isExpanded ? null : key)}
                  >
                    <td className="py-3 pr-4 font-medium text-gray-900">{group.destination}</td>
                    <td className="py-3 pr-4 text-gray-600">{group.subDestination ?? 'All'}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${gradeColors[group.grade] ?? 'bg-gray-100 text-gray-700'}`}>
                        {group.grade}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-gray-700">
                      {formatGm(tier1?.gmThresholdLow ?? null)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-gray-700">
                      {formatGm(tier2?.gmThresholdLow ?? null)} – {formatGm(tier2?.gmThresholdHigh ?? null)}
                    </td>
                    <td className="py-3 text-right font-mono text-gray-700">
                      {formatGm(tier3?.gmThresholdHigh ?? null)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {expandedRow && (() => {
        const group = groups.find(
          (g) => `${g.destination}|${g.subDestination ?? ''}` === expandedRow,
        );
        if (!group) return null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setExpandedRow(null)}>
            <div className="w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {group.destination} – {group.subDestination ?? 'All'}
                  <span className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${gradeColors[group.grade] ?? 'bg-gray-100 text-gray-700'}`}>
                    Grade {group.grade}
                  </span>
                </h3>
                <button onClick={() => setExpandedRow(null)} className="text-gray-400 hover:text-gray-600 text-xl">
                  ×
                </button>
              </div>

              {group.tiers.map((tier) => (
                <div key={tier.tier} className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">
                    Tier {tier.tier}
                    <span className="ml-2 font-normal text-gray-500">
                      {tier.gmThresholdLow && tier.gmThresholdHigh
                        ? `${formatGm(tier.gmThresholdLow)} – ${formatGm(tier.gmThresholdHigh)}`
                        : tier.gmThresholdLow
                          ? `≥ ${formatGm(tier.gmThresholdLow)}`
                          : tier.gmThresholdHigh
                            ? `≤ ${formatGm(tier.gmThresholdHigh)}`
                            : ''}
                    </span>
                  </h4>
                  {tier.examples && (
                    <p className="text-xs text-gray-500 mb-2">Examples: {tier.examples}</p>
                  )}
                  {Object.keys(tier.assetEntitlements).length > 0 ? (
                    <div className="rounded-md border border-gray-200 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500">
                            <th className="px-3 py-1.5 font-medium">Marketing Channel</th>
                            <th className="px-3 py-1.5 font-medium">Entitlement</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(tier.assetEntitlements).map(([channel, value]) => (
                            <tr key={channel} className="border-t border-gray-100">
                              <td className="px-3 py-1.5 font-medium text-gray-700">{channel}</td>
                              <td className="px-3 py-1.5 text-gray-600">{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No asset entitlements</p>
                  )}
                </div>
              ))}

              {group.tiers[0]?.notes && (
                <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                  <span className="font-medium">Notes:</span> {group.tiers[0].notes}
                </p>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
