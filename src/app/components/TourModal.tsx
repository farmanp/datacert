import { Component, createSignal, Show, For } from 'solid-js';

interface TourStep {
  icon: string;
  title: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    icon: '🔒',
    title: 'Welcome to DataCert',
    description:
      'Profile your data locally — nothing ever leaves your device. Fast, private, and secure.',
  },
  {
    icon: '📁',
    title: 'Import Your Data',
    description:
      'Drag and drop files or click to browse. We support CSV, JSON, Excel, Parquet, and Avro.',
  },
  {
    icon: '☁️',
    title: 'Remote Sources',
    description:
      'Connect to Google Cloud Storage or databases like PostgreSQL to profile data directly.',
  },
  {
    icon: '📊',
    title: 'Explore Results',
    description:
      'Get statistics, quality scores, histograms, and export to JSON Schema, Great Expectations, and more.',
  },
  {
    icon: '🚀',
    title: "You're Ready!",
    description:
      'Try our sample dataset to see DataCert in action, or import your own files to get started.',
  },
];

interface TourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TourModal: Component<TourModalProps> = (props) => {
  const [currentStep, setCurrentStep] = createSignal(0);

  const goNext = () => {
    if (currentStep() < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep() + 1);
    } else {
      handleFinish();
    }
  };

  const goPrev = () => {
    if (currentStep() > 0) {
      setCurrentStep(currentStep() - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('datacert-tour-completed', 'true');
    setCurrentStep(0);
    props.onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('datacert-tour-completed', 'true');
    setCurrentStep(0);
    props.onClose();
  };

  const step = () => TOUR_STEPS[currentStep()];
  const isLastStep = () => currentStep() === TOUR_STEPS.length - 1;

  return (
    <Show when={props.isOpen}>
      {/* Backdrop */}
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleSkip}
      >
        {/* Modal */}
        <div
          class="relative w-full max-w-md mx-4 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleSkip}
            class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 transition-colors z-10"
            aria-label="Close tour"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Step Counter */}
          <div class="absolute top-4 left-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
            Step {currentStep() + 1} of {TOUR_STEPS.length}
          </div>

          {/* Content */}
          <div class="pt-16 pb-8 px-8 text-center">
            {/* Icon */}
            <div class="text-6xl mb-6 animate-in zoom-in duration-300">{step().icon}</div>

            {/* Title */}
            <h2 class="text-2xl font-bold text-white mb-4 font-heading tracking-tight">
              {step().title}
            </h2>

            {/* Description */}
            <p class="text-slate-400 leading-relaxed mb-8 max-w-sm mx-auto">{step().description}</p>

            {/* Step Indicators */}
            <div class="flex justify-center gap-2 mb-8">
              <For each={TOUR_STEPS}>
                {(_, index) => (
                  <button
                    onClick={() => setCurrentStep(index())}
                    class={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      index() === currentStep()
                        ? 'bg-blue-500 scale-125'
                        : index() < currentStep()
                          ? 'bg-blue-500/50'
                          : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                    aria-label={`Go to step ${index() + 1}`}
                  />
                )}
              </For>
            </div>

            {/* Navigation Buttons */}
            <div class="flex items-center justify-center gap-3">
              <Show when={currentStep() > 0}>
                <button
                  onClick={goPrev}
                  class="px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white rounded-xl border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 transition-all"
                >
                  ← Previous
                </button>
              </Show>

              <button
                onClick={goNext}
                class="px-6 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-900/30"
              >
                {isLastStep() ? "Let's Go! 🎉" : 'Next →'}
              </button>
            </div>

            {/* Skip Link */}
            <button
              onClick={handleSkip}
              class="mt-6 text-xs font-medium text-slate-600 hover:text-slate-400 transition-colors"
            >
              Skip tour
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default TourModal;
