import { describe, it, expect } from 'vitest';
import NavigationProgressBar from './NavigationProgressBar.svelte';
import { render } from 'svelte/server';

describe('NavigationProgressBar Component', () => {
	it('exports NavigationProgressBar component', () => {
		expect(NavigationProgressBar).toBeDefined();
	});

	it('renders without error in SSR environment when navigating is idle', () => {
		const { html } = render(NavigationProgressBar);
		// In idle state, progress bar is invisible and does not output visible progressbar markup
		expect(html).not.toContain('role="progressbar"');
	});
});
