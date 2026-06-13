import { uploadUrl } from '@/api/upload.api';

/**
 * A PCM-uploaded one-pager. The image is pre-letterboxed to 16:9 on upload
 * (PDF pages rasterized onto a white 16:9 canvas), so it fills the slide
 * exactly with no distortion.
 */
export function CustomPageSlide({ imageKey }: { imageKey?: string }) {
  const src = imageKey ? uploadUrl(imageKey) : null;
  return (
    <div className="h-full w-full bg-white">
      {src ? (
        <img src={src} alt="Custom page" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-sm text-gray-400">
          Custom page image missing
        </div>
      )}
    </div>
  );
}
