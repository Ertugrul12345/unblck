/*
 Basic in-page browser with search, URL input, engine selection, and an optional
 reader-unblock mode that attempts to fetch through public text-mode endpoints.
 It cannot bypass site CSP/x-frame-deny; when blocked, we present helpful options.
*/

(() => {
	const addressInput = document.getElementById('addressInput');
	const engineSelect = document.getElementById('engineSelect');
	const readerToggle = document.getElementById('readerToggle');
	const navForm = document.getElementById('navForm');
	const backBtn = document.getElementById('backBtn');
	const forwardBtn = document.getElementById('forwardBtn');
	const homeBtn = document.getElementById('homeBtn');
	const openTabBtn = document.getElementById('openTabBtn');
	const viewer = document.getElementById('viewer');
	const overlay = document.getElementById('overlay');

	const HOME = 'https://lite.duckduckgo.com/lite/';

	const engines = {
		duck: q => `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}`,
		brave: q => `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
		google: q => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
		bing: q => `https://www.bing.com/search?q=${encodeURIComponent(q)}`
	};

	function isProbablyUrl(input) {
		try {
			// Accept bare domains like example.com
			if (/^\w+:\/\//i.test(input)) return true;
			if (/^[\w.-]+\.[a-zA-Z]{2,}(?:[:/].*)?$/i.test(input)) return true;
			return false;
		} catch { return false; }
	}

	function normalizeToUrl(input) {
		if (/^\w+:\/\//i.test(input)) return input;
		if (/^[\w.-]+\.[a-zA-Z]{2,}(?:[:/].*)?$/i.test(input)) return `https://${input}`;
		return null;
	}

	function expandDuckRedirect(possibleUrl) {
		try {
			const u = new URL(possibleUrl);
			if (u.hostname.endsWith('duckduckgo.com') && u.pathname.startsWith('/l/')) {
				const uddg = u.searchParams.get('uddg');
				if (uddg) return decodeURIComponent(uddg);
			}
			return possibleUrl;
		} catch { return possibleUrl; }
	}

	function buildReaderUrl(targetUrlOrHref) {
		// Build a valid r.jina.ai reader URL: https://r.jina.ai/https://example.com/path
		try {
			const u = new URL(targetUrlOrHref);
			return `https://r.jina.ai/${u.protocol}//${u.host}${u.pathname}${u.search}${u.hash}`;
		} catch {
			// If we got a host/path without protocol
			const cleaned = String(targetUrlOrHref).replace(/^https?:\/\//i, '');
			return `https://r.jina.ai/https://${cleaned}`;
		}
	}

	function setOverlay(contentHtml) {
		overlay.innerHTML = contentHtml;
		overlay.classList.remove('hidden');
	}

	function hideOverlay() {
		overlay.classList.add('hidden');
		overlay.innerHTML = '';
	}

	function navigate(input) {
		const trimmed = (input || '').trim();
		if (!trimmed) return;

		const maybeUrl = normalizeToUrl(trimmed);
		let finalUrl;

		if (maybeUrl) {
			finalUrl = expandDuckRedirect(maybeUrl);
		} else {
			const engine = engines[engineSelect.value] || engines.duck;
			finalUrl = engine(trimmed);
		}

		// Apply reader mode only for direct URLs, not for search result pages
		if (readerToggle.checked && maybeUrl) {
			finalUrl = buildReaderUrl(finalUrl);
		}

		addressInput.value = finalUrl;
		loadInFrame(finalUrl);
	}

	function loadInFrame(url) {
		hideOverlay();
		viewer.src = 'about:blank';
		// Try to load; if blocked by x-frame-options/csp, the frame may not load content
		viewer.src = url;

		// Provide hint UI after a short delay
		const timeout = setTimeout(() => {
			setOverlay(`
				<div class="card">
					<h2>Embedding may be blocked by the site.</h2>
					<p>Some websites disallow being shown inside other pages. You can still open it directly or try reader mode.</p>
					<div class="actions">
						<a class="primary" href="${url}" target="_blank" rel="noopener noreferrer">Open in new tab</a>
						<button id="tryReaderBtn" type="button">Try Reader Unblock</button>
					</div>
				</div>
			`);
			const tryReaderBtn = document.getElementById('tryReaderBtn');
			if (tryReaderBtn) {
				tryReaderBtn.onclick = () => {
					readerToggle.checked = true;
					loadInFrame(buildReaderUrl(url));
				};
			}
		}, 1600);

		viewer.addEventListener('load', () => {
			clearTimeout(timeout);
			hideOverlay();
		}, { once: true });
	}

	// Navigation controls
	backBtn.onclick = () => history.back();
	forwardBtn.onclick = () => history.forward();
	homeBtn.onclick = () => {
		addressInput.value = '';
		viewer.src = HOME;
		hideOverlay();
	};
	openTabBtn.onclick = () => {
		const current = viewer?.src;
		if (current && current !== 'about:blank') window.open(current, '_blank', 'noopener');
	};

	navForm.addEventListener('submit', e => {
		e.preventDefault();
		navigate(addressInput.value);
	});

	// Improve UX: Ctrl+L / focus
	document.addEventListener('keydown', e => {
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
			e.preventDefault();
			addressInput.select();
		}
	});

	// Initialize
	viewer.src = HOME;
})();


