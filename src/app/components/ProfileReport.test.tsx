import { render } from '@solidjs/testing-library';
import { describe, it, expect, vi } from 'vitest';
import ProfileReport from './ProfileReport';
import { profileStore } from '../stores/profileStore';
import { fileStore } from '../stores/fileStore';
import { Router } from '@solidjs/router';

vi.mock('@solidjs/router', () => ({
    A: (props: any) => <a {...props}>{props.children}</a>,
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    useNavigate: () => vi.fn(),
    useParams: () => ({}),
    useSearchParams: () => [() => ({}), vi.fn()],
    Router: (props: any) => <>{props.children}</>,
}));

// Mock the stores if needed, or just set their state
describe('ProfileReport', () => {
    it('renders performance metrics when available', () => {
        // Setup store state
        fileStore.selectFile(new File(['test content'], 'test.csv', { type: 'text/csv' }));

        // Manually set results and metrics to skip actual profiling
        profileStore.setStore({
            results: {
                column_profiles: [],
                total_rows: 100,
                duplicate_issues: [],
                avro_schema: null
            },
            performanceMetrics: {
                durationSeconds: 0.52,
                fileSizeBytes: 52428800 // 50MB
            }
        });

        const { getByText } = render(() => (
            <Router>
                <ProfileReport />
            </Router>
        ));

        // Check for the "Processed 50MB in 0.52s" message
        // Note: formatFileSize might return "50 MB" or "50.00 MB"
        expect(getByText(/Processed/i)).toBeInTheDocument();
        expect(getByText(/50/i)).toBeInTheDocument();
        expect(getByText(/0.52s/i)).toBeInTheDocument();
    });

    it('renders time in milliseconds for very fast processing', () => {
        profileStore.setStore({
            performanceMetrics: {
                durationSeconds: 0.045,
                fileSizeBytes: 1024
            }
        });

        const { getByText } = render(() => (
            <Router>
                <ProfileReport />
            </Router>
        ));

        expect(getByText(/45ms/i)).toBeInTheDocument();
    });
});
