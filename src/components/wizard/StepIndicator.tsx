const steps = [
  { number: 1, label: 'Hotels' },
  { number: 2, label: 'Pricing' },
  { number: 3, label: 'Images' },
  { number: 4, label: 'Objectives' },
  { number: 5, label: 'Case Studies' },
  { number: 6, label: 'Assets' },
];

interface StepIndicatorProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <nav className="flex items-center gap-1 mb-8">
      {steps.map((step, i) => {
        const isActive = step.number === currentStep;
        const isComplete = step.number < currentStep;
        const canClick = onStepClick && step.number !== currentStep;

        return (
          <div key={step.number} className="flex items-center">
            {i > 0 && (
              <div className={`w-8 h-0.5 ${isComplete ? 'bg-[#01B18B]' : 'bg-gray-200'}`} />
            )}
            <button
              type="button"
              disabled={!canClick}
              onClick={() => canClick && onStepClick(step.number)}
              className={`flex items-center gap-1.5 ${canClick ? 'cursor-pointer hover:opacity-80' : ''} disabled:cursor-default`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  isActive
                    ? 'bg-[#01B18B] text-white'
                    : isComplete
                      ? 'bg-[#01B18B] text-white'
                      : 'bg-gray-200 text-[#7E8188]'
                }`}
              >
                {isComplete ? '\u2713' : step.number}
              </div>
              <span
                className={`text-xs ${
                  isActive ? 'font-semibold text-[#363A45]' : 'text-[#7E8188]'
                }`}
              >
                {step.label}
              </span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
