interface Step3Props {
  onBack: () => void;
  onNext: () => void;
}

export function Step3Images({ onBack, onNext }: Step3Props) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Images</h2>
      <p className="text-sm text-gray-500 mb-6">
        Cover hero and destination images. Image upload will be available once file storage is configured.
      </p>

      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center mb-6">
        <p className="text-gray-500">Image upload coming soon.</p>
        <p className="mt-1 text-sm text-gray-400">Skip this step for now — images can be added later.</p>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="rounded-md border border-gray-300 px-6 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700"
        >
          Next: Objectives
        </button>
      </div>
    </div>
  );
}
