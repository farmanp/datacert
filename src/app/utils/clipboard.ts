/**
 * Clipboard utility for copying text with browser compatibility
 */

/**
 * Copies text to clipboard using modern Clipboard API with fallback
 */
export async function copyToClipboard(text: string): Promise<void> {
    try {
        // Modern Clipboard API (Chrome 63+, Firefox 53+, Safari 13.1+)
        await navigator.clipboard.writeText(text);
    } catch (err) {
        // Fallback for older browsers or permission issues
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.top = '0';
        textarea.style.left = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
            document.execCommand('copy');
        } catch (execErr) {
            console.error('Failed to copy to clipboard:', execErr);
            throw new Error('Clipboard copy failed');
        } finally {
            document.body.removeChild(textarea);
        }
    }
}
