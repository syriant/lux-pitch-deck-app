const steps = [
  { number: 1, label: 'Hotels' },
  { number: 2, label: 'Pricing' },
  { number: 3, label: 'Images' },
  { number: 4, label: 'Objectives' },
  { number: 5, label: 'Case Studies' },
  { number: 6, label: 'Assets' },
];

export function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <nav className="flex items-center gap-1 mb-8">
      {steps.map((step, i) => {
        const isActive = step.number === currentStep;
        const isComplete = step.number < currentStep;

        return (
          <div key={step.number} className="flex items-center">
            {i > 0 && (
              <div className={`w-8 h-0.5 ${isComplete ? 'bg-blue-500' : 'bg-gray-200'}`} />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isComplete
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isComplete ? '✓' : step.number}
              </div>
              <span
                className={`text-xs ${
                  isActive ? 'font-semibold text-gray-900' : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
