import { render } from '@solidjs/testing-library';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders "DataLens Profiler" text', () => {
    const { getByText } = render(() => <App />);
    expect(getByText(/DataLens Profiler/i)).toBeInTheDocument();
  });
});
