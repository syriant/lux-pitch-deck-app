interface Step5Props {
  onBack: () => void;
  onNext: () => void;
}

export function Step5CaseStudies({ onBack, onNext }: Step5Props) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Case Studies</h2>
      <p className="text-sm text-gray-500 mb-6">
        Browse and select case studies for each property. The case study library will be available in a future milestone.
      </p>

      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center mb-6">
        <p className="text-gray-500">Case study library coming soon.</p>
        <p className="mt-1 text-sm text-gray-400">Skip this step for now — case studies can be added later.</p>
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
          Next: Marketing Assets
        </button>
      </div>
    </div>
  );
}
