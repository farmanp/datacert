import { render, fireEvent, screen } from '@solidjs/testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from './Home';
import { fileStore } from '../stores/fileStore';
import { profileStore } from '../stores/profileStore';
import { Router } from '@solidjs/router';

vi.mock('@solidjs/router', () => ({
    A: (props: any) => <a {...props}>{props.children}</a>,
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    useNavigate: () => vi.fn(),
    useParams: () => ({}),
    useSearchParams: () => [() => ({}), vi.fn()],
    Router: (props: any) => <>{props.children}</>,
}));

// Mock engine store to be ready
vi.mock('../stores/engine.store', () => ({
    engineStore: {
        state: { isReady: true, isLoading: false, error: null },
        init: vi.fn(),
    },
}));

describe('Home Page Drag & Drop', () => {
    beforeEach(() => {
        fileStore.reset();
        profileStore.reset();
    });

    it('shows the global drag overlay when dragging a file', async () => {
        const { getByText, queryByText } = render(() => (
            <Router>
                <Home />
            </Router>
        ));

        // Background check: overlay should NOT be visible initially
        expect(queryByText(/Drop to Profile/i)).not.toBeInTheDocument();

        // Simulate drag enter with files
        const dragEvent = new CustomEvent('dragenter', { bubbles: true }) as any;
        dragEvent.dataTransfer = {
            types: ['Files'],
            items: [{ kind: 'file' }]
        };

        const container = document.querySelector('div.min-h-screen');
        fireEvent(container!, dragEvent);

        // Overlay should now be visible
        expect(getByText(/Drop to Profile/i)).toBeInTheDocument();
        expect(getByText(/Release your file to start the instant analysis/i)).toBeInTheDocument();
    });

    it('hides the overlay when drag leaves the window', async () => {
        const { queryByText } = render(() => (
            <Router>
                <Home />
            </Router>
        ));

        // Start drag
        fileStore.setHover(true);
        expect(queryByText(/Drop to Profile/i)).toBeInTheDocument();

        // Simulate drag leave window
        const leaveEvent = new CustomEvent('dragleave', { bubbles: true }) as any;
        leaveEvent.clientX = -1; // Outside window
        leaveEvent.clientY = -1;

        const container = document.querySelector('div.min-h-screen');
        fireEvent(container!, leaveEvent);

        // Overlay should be gone
        expect(queryByText(/Drop to Profile/i)).not.toBeInTheDocument();
    });

    it('displays an error if an invalid file type is dropped', async () => {
        render(() => (
            <Router>
                <Home />
            </Router>
        ));

        // Simulate dropping a .jpg file
        const dropEvent = new CustomEvent('drop', { bubbles: true }) as any;
        const mockFile = new File([''], 'photo.jpg', { type: 'image/jpeg' });
        dropEvent.dataTransfer = {
            files: [mockFile],
            types: ['Files']
        };

        const container = document.querySelector('div.min-h-screen');
        fireEvent(container!, dropEvent);

        // Error overlay should appear
        const errorDisplays = screen.queryAllByText(/Unsupported file format/i);
        expect(errorDisplays.length).toBeGreaterThan(0);
        expect(errorDisplays[0]).toBeInTheDocument();
    });
});
