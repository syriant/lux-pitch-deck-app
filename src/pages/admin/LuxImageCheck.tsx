import { useState, type FormEvent } from 'react';
import { luxImageDebug, type LuxDebugResult, type LuxDebugCandidate } from '@/api/image-library.api';

export function LuxImageCheck() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LuxDebugResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await luxImageDebug(query.trim()));
    } catch {
      setError('LUX search failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">LUX Image Check</h1>
      <p className="text-sm text-gray-500 mb-6">
        Probe the LUX API for a hotel name to see which properties match and how many images each
        actually has. Nothing is written to the library — this is read-only.
      </p>

      <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Hyatt Regency Brisbane"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#01B18B] focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-md bg-[#01B18B] px-6 py-2 text-sm text-white hover:bg-[#009977] disabled:opacity-50"
        >
          {loading ? 'Searching…' : 'Search LUX'}
        </button>
      </form>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {result && (
        <div className="space-y-6">
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            <span className="font-medium">{result.candidateCount}</span> propert
            {result.candidateCount === 1 ? 'y' : 'ies'} matched for “{result.query}”
            {result.matchedQuery && result.matchedQuery !== result.query && (
              <> (matched on backed-off query “{result.matchedQuery}”)</>
            )}
            {result.candidateCount === 0 && ' — LUX returned no property matches.'}
          </div>

          {result.candidates.map((cand) => (
            <CandidateCard key={cand.ref} cand={cand} />
          ))}

          <RawBlock label="Raw typeahead response" url={result.raw.typeahead.url} data={result.raw.typeahead.response} />
          {result.raw.offers && (
            <RawBlock label="Raw public-offers response" url={result.raw.offers.url} data={result.raw.offers.response} />
          )}
        </div>
      )}
    </div>
  );
}

function CandidateCard({ cand }: { cand: LuxDebugCandidate }) {
  const noImages = cand.imageCount === 0;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-gray-900">{cand.mainText}</div>
          <div className="text-sm text-gray-500">{cand.secondaryText}</div>
          <div className="mt-1 text-xs text-gray-400">
            {cand.source === 'property' ? `propertyId: ${cand.propertyId}` : `offerId: ${cand.offerId}`}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            noImages ? 'bg-red-100 text-red-700' : 'bg-[#E6F9F5] text-[#01806a]'
          }`}
        >
          {!cand.offerFound ? (cand.source === 'property' ? 'Property not found' : 'Offer not found') : noImages ? 'No images' : `${cand.imageCount} image${cand.imageCount === 1 ? '' : 's'}`}
        </span>
      </div>

      {cand.images.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {cand.images.map((img) => (
            <img
              key={img.id}
              src={img.thumbUrl}
              alt={img.title ?? ''}
              title={img.title ?? img.id}
              loading="lazy"
              className="h-20 w-full rounded object-cover border border-gray-100"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RawBlock({ label, url, data }: { label: string; url: string; data: unknown }) {
  return (
    <details className="rounded-lg border border-gray-200 bg-white">
      <summary className="cursor-pointer select-none px-4 py-2 text-sm font-medium text-gray-700">
        {label}
      </summary>
      <div className="border-t border-gray-100 px-4 py-3">
        {url && <div className="mb-2 break-all text-xs text-gray-400">{url}</div>}
        <pre className="max-h-96 overflow-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </details>
  );
}
