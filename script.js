const form = document.querySelector('#search-form');
const input = document.querySelector('#search-input');
const resultsContainer = document.querySelector('#results');
const statusMessage = document.querySelector('#status-message');
const searchButton = form.querySelector('.search__button');

const endpoint = 'https://api.duckduckgo.com/';

showWelcomeState();
notify('Enter a query to get started.');

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const query = input.value.trim();
    if (!query) {
        notify('Type something to search the open web.');
        input.focus();
        return;
    }

    setLoading(true);
    notify('Searching the privacy-friendly index...');

    try {
        const url = `${endpoint}?${new URLSearchParams({
            q: query,
            format: 'json',
            no_redirect: '1',
            no_html: '1',
        }).toString()}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        const assembled = assembleResults(data, query);

        if (assembled.length === 0) {
            showEmptyState(query);
            notify(`No unblocked results for "${query}". Try a broader phrase.`);
            return;
        }

        renderResults(assembled);
        notify(`Showing ${assembled.length} ready-to-open result${assembled.length === 1 ? '' : 's'}.`);
    } catch (error) {
        console.error(error);
        resultsContainer.innerHTML = '';
        notify('Something went wrong reaching the search index. Check your connection and try again.');
    } finally {
        setLoading(false);
    }
});

function assembleResults(data, query) {
    const results = [];

    if (data.AbstractURL && data.AbstractText) {
        results.push({
            title: data.Heading || query,
            description: data.AbstractText,
            url: data.AbstractURL,
        });
    }

    if (Array.isArray(data.Results)) {
        for (const item of data.Results) {
            const title = stripHtml(item.Text || item.Result || '');
            const url = item.FirstURL;
            if (title && url) {
                results.push({
                    title,
                    description: title,
                    url,
                });
            }
        }
    }

    if (Array.isArray(data.RelatedTopics)) {
        results.push(...flattenTopics(data.RelatedTopics));
    }

    const seen = new Set();
    return results.filter((result) => {
        if (seen.has(result.url)) {
            return false;
        }
        seen.add(result.url);
        return true;
    });
}

function flattenTopics(topics) {
    const collected = [];

    for (const topic of topics) {
        if (Array.isArray(topic.Topics)) {
            collected.push(...flattenTopics(topic.Topics));
            continue;
        }

        const rawText = stripHtml(topic.Text || topic.Result || '');
        const url = topic.FirstURL;
        if (!rawText || !url) {
            continue;
        }

        const dash = rawText.indexOf(' - ');
        const title = dash > -1 ? rawText.slice(0, dash).trim() : rawText;
        const description = dash > -1 ? rawText.slice(dash + 3).trim() : rawText;

        collected.push({
            title: title || rawText,
            description: description || rawText,
            url,
        });
    }

    return collected;
}

function renderResults(results) {
    resultsContainer.innerHTML = '';

    results.forEach((result) => {
        const card = document.createElement('article');
        card.className = 'result-card';

        const heading = document.createElement('h2');
        heading.className = 'result-card__title';
        heading.textContent = result.title;

        const snippet = document.createElement('p');
        snippet.className = 'result-card__description';
        snippet.textContent = result.description;

        const link = document.createElement('a');
        link.className = 'result-card__link';
        link.href = result.url;
        link.textContent = 'Open result';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        card.append(heading, snippet, link);
        resultsContainer.appendChild(card);
    });
}

function showWelcomeState() {
    resultsContainer.innerHTML = '';

    const intro = document.createElement('article');
    intro.className = 'result-card result-card--intro';

    const heading = document.createElement('h2');
    heading.className = 'result-card__title';
    heading.textContent = 'Search without roadblocks';

    const body = document.createElement('p');
    body.className = 'result-card__description';
    body.textContent = 'ClearPath routes your query through DuckDuckGo instant answers. No login, no tracking.';

    const tips = document.createElement('ul');
    tips.className = 'result-card__tips';
    const hints = [
        'Use natural language or short keywords for best matches.',
        'Results open in a new tab so this page stays available.',
        'If nothing appears, try another phrasing or check your connection.'
    ];

    hints.forEach((text) => {
        const item = document.createElement('li');
        item.textContent = text;
        tips.appendChild(item);
    });

    intro.append(heading, body, tips);
    resultsContainer.appendChild(intro);
}

function showEmptyState(query) {
    resultsContainer.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'result-card';

    const title = document.createElement('h2');
    title.className = 'result-card__title';
    title.textContent = 'No direct hits yet';

    const body = document.createElement('p');
    body.className = 'result-card__description';
    body.textContent = `We could not find instant answers for "${query}". Try using fewer words or a different spelling.`;

    empty.append(title, body);
    resultsContainer.appendChild(empty);
}

function notify(message) {
    statusMessage.textContent = message;
}

function setLoading(state) {
    searchButton.disabled = state;
    searchButton.textContent = state ? 'Searching...' : 'Search';
}

function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}
