'use client';

export type PlanningStage = 'prepare' | 'draft' | 'review' | 'select' | 'adjust';

const STAGES: { key: 'prepare' | 'draft' | 'review'; label: string }[] = [
  { key: 'prepare', label: '1. Prepare' },
  { key: 'draft', label: '2. Review Draft' },
  { key: 'review', label: '3. Review & Release' },
];

/** Stepper navigation for Planning stages. Preserves selection and state when navigating between stages. */
export default function PlanningStageNav({
  stage,
  canContinue,
  onBack,
  onContinue,
  onSelectStage,
}: {
  stage: PlanningStage;
  canContinue: boolean;
  onBack: () => void;
  onContinue: () => void;
  onSelectStage?: (stage: 'prepare' | 'draft' | 'review') => void;
}) {
  const normalizedKey: 'prepare' | 'draft' | 'review' =
    stage === 'select' ? 'prepare' : stage === 'adjust' ? 'draft' : (stage as 'prepare' | 'draft' | 'review');

  const index = STAGES.findIndex((s) => s.key === normalizedKey);

  return (
    <div className="flex flex-col gap-2.5 border-b border-[#E2E8F0] bg-white px-4 py-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          {STAGES.map((s, i) => {
            const isCurrent = i === index;
            const isCompleted = i < index;

            return (
              <button
                key={s.key}
                type="button"
                onClick={() => onSelectStage?.(s.key)}
                className={`flex items-center gap-2 text-xs font-semibold transition-colors ${
                  isCurrent
                    ? 'text-[#F97316]'
                    : isCompleted
                    ? 'text-[#202D2D] hover:text-[#F97316]'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isCurrent
                      ? 'bg-[#F97316] text-white shadow-xs'
                      : isCompleted
                      ? 'bg-[#202D2D] text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {i + 1}
                </span>
                <span>{s.label}</span>
                {i < STAGES.length - 1 && <span className="hidden sm:inline-block h-px w-4 bg-gray-300 ml-2" />}
              </button>
            );
          })}
        </div>

        {/* Mobile quick next/back */}
        <div className="flex sm:hidden items-center gap-1.5">
          <button
            type="button"
            onClick={onBack}
            disabled={index === 0}
            className="rounded border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 disabled:opacity-30"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={!canContinue || index === STAGES.length - 1}
            className="rounded bg-[#F97316] px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
