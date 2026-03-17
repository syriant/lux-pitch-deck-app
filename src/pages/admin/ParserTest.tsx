import { useState, useRef, type ChangeEvent } from 'react';
import { parsePricingTool, type ParsedPricingTool } from '@/api/parser.api';

export function ParserTest() {
  const [result, setResult] = useState<ParsedPricingTool | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      setResult(await parsePricingTool(file));
    } catch {
      setError('Failed to parse file');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pricing Tool Parser Test</h1>

      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xlsm,.xls"
          onChange={handleFileChange}
          className="block text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-blue-700"
        />
      </div>

      {loading && <div className="text-gray-500">Parsing...</div>}
      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {result && (
        <div className="space-y-6">
          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
              <h3 className="text-sm font-semibold text-amber-800 mb-1">Warnings</h3>
              <ul className="list-disc list-inside text-sm text-amber-700">
                {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* Metadata */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-lg font-semibold mb-3">Metadata</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-gray-500">Version</dt><dd className="font-medium">{result.version}</dd>
              <dt className="text-gray-500">Hotel Name</dt><dd className="font-medium">{result.metadata.hotelName ?? <span className="text-amber-600 italic">blank</span>}</dd>
              <dt className="text-gray-500">Destination</dt><dd className="font-medium">{result.metadata.destination ?? '-'}</dd>
              <dt className="text-gray-500">Sub-destination</dt><dd className="font-medium">{result.metadata.destinationDetail ?? '-'}</dd>
              <dt className="text-gray-500">Currency</dt><dd className="font-medium">{result.metadata.currency ?? '-'}</dd>
              <dt className="text-gray-500">FX Rate</dt><dd className="font-medium">{result.metadata.fxRate ?? '-'}</dd>
              <dt className="text-gray-500">Travel From</dt><dd className="font-medium">{result.metadata.travelFrom ?? '-'}</dd>
              <dt className="text-gray-500">Travel To</dt><dd className="font-medium">{result.metadata.travelTo ?? '-'}</dd>
            </dl>
          </div>

          {/* Options */}
          {result.options.map((opt) => (
            <div key={opt.optionNumber} className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-lg font-semibold mb-1">
                Option {opt.optionNumber} — {opt.tierLabel}
              </h2>
              <p className="text-sm text-gray-500 mb-3">
                GM: ${opt.grossMargin != null ? Math.round(opt.grossMargin).toLocaleString() : '-'}
                {' | '}Tier: {opt.tier ?? '-'}
                {' | '}{opt.dealOptions.length} deal options
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-2 pr-3">Room Type</th>
                    <th className="pb-2 pr-3">Nights</th>
                    <th className="pb-2 pr-3 text-right">Sell</th>
                    <th className="pb-2 pr-3 text-right">Cost</th>
                    <th className="pb-2 pr-3 text-right">Nightly Cost</th>
                    <th className="pb-2 pr-3 text-right">Alloc</th>
                  </tr>
                </thead>
                <tbody>
                  {opt.dealOptions.map((d, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-1.5 pr-3">{d.roomType}</td>
                      <td className="py-1.5 pr-3">{d.nights}</td>
                      <td className="py-1.5 pr-3 text-right font-mono">${d.sellPrice}</td>
                      <td className="py-1.5 pr-3 text-right font-mono">${d.costPrice}</td>
                      <td className="py-1.5 pr-3 text-right font-mono">${d.nightlyCostPrice}</td>
                      <td className="py-1.5 pr-3 text-right">{d.allocationPerDay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* Inclusions */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-lg font-semibold mb-3">Inclusions ({result.inclusions.length})</h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 pr-3">Asset Name</th>
                  <th className="pb-2 pr-3 text-right">PRV</th>
                  <th className="pb-2 pr-3 text-right">RRP</th>
                </tr>
              </thead>
              <tbody>
                {result.inclusions.map((inc, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1.5 pr-3">{inc.assetName}</td>
                    <td className="py-1.5 pr-3 text-right font-mono">{inc.prv != null ? `$${inc.prv}` : '-'}</td>
                    <td className="py-1.5 pr-3 text-right font-mono">{inc.rrp != null ? `$${inc.rrp}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Surcharges */}
          {(result.surcharges.seasonal.length > 0 || result.surcharges.dayOfWeek.length > 0) && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-lg font-semibold mb-3">Surcharges</h2>
              {result.surcharges.seasonal.length > 0 && (
                <>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Seasonal</h3>
                  <table className="w-full text-sm border-collapse mb-4">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th className="pb-2 pr-3">Option</th>
                        <th className="pb-2 pr-3">Period</th>
                        <th className="pb-2 pr-3">Dates</th>
                        <th className="pb-2 pr-3 text-right">Supplement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.surcharges.seasonal.map((s, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-1.5 pr-3">{s.optionNumber}</td>
                          <td className="py-1.5 pr-3">{s.period}</td>
                          <td className="py-1.5 pr-3">{s.dates}</td>
                          <td className="py-1.5 pr-3 text-right font-mono">{s.supplement != null ? `$${s.supplement}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              {result.surcharges.dayOfWeek.length > 0 && (
                <>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Day of Week</h3>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th className="pb-2 pr-3">Option</th>
                        <th className="pb-2 pr-3">Day</th>
                        <th className="pb-2 pr-3 text-right">All Year</th>
                        <th className="pb-2 pr-3 text-right">High</th>
                        <th className="pb-2 pr-3 text-right">Shoulder</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.surcharges.dayOfWeek.map((d, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-1.5 pr-3">{d.optionNumber}</td>
                          <td className="py-1.5 pr-3">{d.day}</td>
                          <td className="py-1.5 pr-3 text-right font-mono">${d.allYear}</td>
                          <td className="py-1.5 pr-3 text-right font-mono">${d.high}</td>
                          <td className="py-1.5 pr-3 text-right font-mono">${d.shoulder}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
