import { useEffect, useState } from 'react';
import { getDealTiersMasterFile, type MasterFileInfo } from '@/api/deal-tiers.api';
import { uploadUrl } from '@/api/upload.api';

// Rendered by wizard steps that depend on deal-tier destinations whenever the
// API returns an empty list. Tells the user nothing is loaded yet, offers a
// Download MASTER button (if a previous file is on record) and points admins
// at /admin/deal-tiers to upload a fresh sheet.
export function DealTiersMissingBanner() {
  const [masterFile, setMasterFile] = useState<MasterFileInfo | null>(null);

  useEffect(() => {
    getDealTiersMasterFile()
      .then(setMasterFile)
      .catch(() => {});
  }, []);

  return (
    <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs flex items-center justify-between gap-3">
      <div className="text-amber-800">
        <span className="font-medium">No deal-tier destinations available.</span>{' '}
        Upload the Deal Tiers MASTER spreadsheet in{' '}
        <a href="/admin/deal-tiers" className="underline">/admin/deal-tiers</a>{' '}
        to populate destination lookups.
      </div>
      {masterFile && (
        <a
          href={uploadUrl(masterFile.fileUrl) ?? '#'}
          download={masterFile.originalName}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-amber-500 px-3 py-1 text-xs text-amber-800 hover:bg-amber-100"
          title={`Last uploaded ${new Date(masterFile.uploadedAt).toLocaleString()}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download MASTER
        </a>
      )}
    </div>
  );
}
