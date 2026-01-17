import { render } from '@solidjs/testing-library';
import { describe, it, expect } from 'vitest';
import PrivacyBadge from './PrivacyBadge';

describe('PrivacyBadge', () => {
  it('renders the "Local Processing" text', () => {
    const { getByText } = render(() => <PrivacyBadge />);
    expect(getByText(/local processing/i)).toBeInTheDocument();
  });

  it('has the correct aria-label for accessibility', () => {
    const { getByLabelText } = render(() => <PrivacyBadge />);
    expect(getByLabelText(/data never leaves your device/i)).toBeInTheDocument();
  });

  it('contains the tooltip text', () => {
    const { getByText } = render(() => <PrivacyBadge />);
    expect(getByText(/never uploaded to any server/i)).toBeInTheDocument();
  });
});
