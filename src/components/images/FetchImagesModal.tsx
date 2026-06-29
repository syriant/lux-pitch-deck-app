import { FetchImagesPanel } from './FetchImagesPanel';

interface FetchImagesModalProps {
  hotelName: string;
  destination: string | null;
  existingUrls: Set<string>;
  onClose: () => void;
  onAdd: (urls: string[]) => Promise<void>;
  /** Noun for the add button, e.g. "gallery" (default) or "case study". */
  addTargetLabel?: string;
}

/**
 * Shared image-fetch modal: searches the library, LUX and Google for a hotel,
 * lets the user disambiguate LUX matches or skip to Google, and returns the
 * selected image URLs via onAdd. Used by the deck wizard (gallery) and the
 * case-study summary review. The search/select body lives in FetchImagesPanel
 * so the case-study ImagePicker can reuse it inside a "Find images" tab.
 */
export function FetchImagesModal({ hotelName, destination, existingUrls, onClose, onAdd, addTargetLabel = 'gallery' }: FetchImagesModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-lg bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Fetch Images for {hotelName}</h3>
            {destination && <p className="text-xs text-gray-500">{destination}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <FetchImagesPanel
          hotelName={hotelName}
          destination={destination}
          existingUrls={existingUrls}
          onClose={onClose}
          onAdd={onAdd}
          addTargetLabel={addTargetLabel}
        />
      </div>
    </div>
  );
}
