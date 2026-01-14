import { createStore } from 'solid-js/store';

export interface ValidationResult {
    expectationType: string;
    column?: string;
    status: 'pass' | 'fail' | 'skipped';
    observed?: string;
    expected?: string;
    reason?: string;
    raw?: string;
}

export interface ValidationSummary {
    fileName: string;
    format: 'gx' | 'soda' | 'json-schema';
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    results: ValidationResult[];
}

interface ValidationState {
    summaries: ValidationSummary[];
    isEvaluating: boolean;
    error: string | null;
}

const [store, setStore] = createStore<ValidationState>({
    summaries: [],
    isEvaluating: false,
    error: null,
});

export const validationStore = {
    store,

    addSummary(summary: ValidationSummary) {
        setStore('summaries', (prev) => [summary, ...prev]);
    },

    clearSummaries() {
        setStore('summaries', []);
    },

    setError(error: string | null) {
        setStore('error', error);
    },

    setEvaluating(isEvaluating: boolean) {
        setStore('isEvaluating', isEvaluating);
    },

    removeSummary(index: number) {
        setStore('summaries', (prev) => prev.filter((_, i) => i !== index));
    }
};
