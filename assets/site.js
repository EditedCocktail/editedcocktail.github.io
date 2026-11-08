(() => {
  'use strict';

  const API = 'https://gitlab.com/api/v4/projects/editedcocktail1%2Fruntimely/releases?per_page=100';
  const FALLBACK = 'assets/releases.json';
  const LATEST = 'https://gitlab.com/editedcocktail1/runtimely/-/releases/permalink/latest/downloads/';
  const INSTALLER = 'Runtimely.zip';
  const PLUGINS = 'plugins.zip';
  const CATEGORY_KEYS = {
    new: 'releases.new',
    improvements: 'releases.improvements',
    fixes: 'releases.fixes',
  };

  const words = globalThis.RuntimelySiteWords ?? { en: {}, ru: {} };

  const state = {
    language: 'en',
    theme: 'dark',
    releases: [],
    loading: true,
    error: false,
    offline: false,
  };

  const nodes = {
    list: document.querySelector('#releases-list'),
    latestVersion: document.querySelector('#latest-version'),
    latestDate: document.querySelector('#latest-date'),
    latestSummary: document.querySelector('#latest-summary'),
    latestCounts: document.querySelector('#latest-counts'),
    latestDownload: document.querySelector('#latest-download'),
    latestPlugins: document.querySelector('#latest-plugins'),
    heroDownload: document.querySelector('#hero-download'),
    language: document.querySelector('#language'),
    metaTheme: document.querySelector('meta[name="theme-color"]'),
    metaDescription: document.querySelector('meta[name="description"]'),
  };

  function read(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // A browser that refuses storage still gets the choice for this visit.
    }
  }

  function initialLanguage() {
    const stored = read('runtimely-site-lang');
    if (stored === 'en' || stored === 'ru') return stored;
    return String(navigator.language ?? 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';
  }

  function initialTheme() {
    const stored = read('runtimely-site-theme');
    return stored === 'light' ? 'light' : 'dark';
  }

  function t(key) {
    return words[state.language]?.[key] ?? words.en?.[key] ?? key;
  }

  /**
   * A release-note category in the page's language, or the heading itself when it is not a known one.
   */
  function categoryLabel(name) {
    const key = CATEGORY_KEYS[name.toLowerCase()];
    return key === undefined ? name : t(key);
  }

  function applyLanguage(language, { persist = true, rerender = true } = {}) {
    state.language = language === 'ru' ? 'ru' : 'en';
    if (persist) write('runtimely-site-lang', state.language);
    document.documentElement.lang = state.language;
    document.title = t('meta.title');
    nodes.metaDescription?.setAttribute('content', t('meta.description'));
    for (const element of document.querySelectorAll('[data-i18n]')) {
      element.textContent = t(element.dataset.i18n);
    }
    for (const element of document.querySelectorAll('[data-i18n-aria]')) {
      element.setAttribute('aria-label', t(element.dataset.i18nAria));
    }
    for (const element of document.querySelectorAll('[data-i18n-title]')) {
      element.setAttribute('title', t(element.dataset.i18nTitle));
    }
    if (nodes.language !== null) nodes.language.value = state.language;
    if (rerender === true) {
      renderLatest(state.releases[0] ?? null);
      render();
    }
  }

  function applyTheme(theme, { persist = true } = {}) {
    state.theme = theme === 'light' ? 'light' : 'dark';
    if (persist) write('runtimely-site-theme', state.theme);
    document.documentElement.dataset.theme = state.theme;
    nodes.metaTheme?.setAttribute('content', state.theme === 'light' ? '#f0f2f5' : '#121212');
    for (const button of document.querySelectorAll('[data-theme-set]')) {
      button.setAttribute('aria-pressed', String(button.dataset.themeSet === state.theme));
    }
  }

  function formatDate(iso) {
    if (typeof iso !== 'string' || iso === '') return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(state.language === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  function linkNamed(release, name) {
    const links = Array.isArray(release?.assets?.links) ? release.assets.links : [];
    return links.find((one) => one?.name === name) ?? null;
  }

  /**
   * The newest release that carries a host bundle. A release that only moves plugins has no Runtimely.zip,
   * so the download stays with the last release that shipped the app itself.
   */
  function installerLink(releases) {
    for (const release of releases) {
      const link = linkNamed(release, INSTALLER);
      if (link !== null) return link;
    }
    return null;
  }

  function hrefOf(link) {
    if (link === null) return null;
    return link.direct_asset_url ?? link.url ?? null;
  }

  function inline(text) {
    const fragment = document.createDocumentFragment();
    const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
    let last = 0;
    for (const match of text.matchAll(pattern)) {
      if (match.index > last) fragment.append(document.createTextNode(text.slice(last, match.index)));
      const token = match[0];
      if (token.startsWith('**')) {
        const strong = document.createElement('strong');
        strong.textContent = token.slice(2, -2);
        fragment.append(strong);
      } else if (token.startsWith('`')) {
        const code = document.createElement('code');
        code.textContent = token.slice(1, -1);
        fragment.append(code);
      } else {
        const held = /^\[([^\]]+)\]\(([^)]+)\)$/u.exec(token);
        const href = held?.[2] ?? '';
        if (/^https?:\/\//iu.test(href) || href.startsWith('#')) {
          const link = document.createElement('a');
          link.href = href;
          link.textContent = held?.[1] ?? href;
          if (href.startsWith('http')) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
          }
          fragment.append(link);
        } else {
          fragment.append(document.createTextNode(token));
        }
      }
      last = match.index + token.length;
    }
    if (last < text.length) fragment.append(document.createTextNode(text.slice(last)));
    return fragment;
  }

  function renderNotes(description) {
    const fragment = document.createDocumentFragment();
    const lines = String(description ?? '').replace(/\r\n?/gu, '\n').split('\n');
    let paragraph = [];
    let list = null;
    let item = null;
    let code = null;
    let sawHeading = false;
    let summarySeen = false;

    function flushParagraph() {
      if (paragraph.length === 0) return;
      const text = paragraph.join(' ').trim();
      paragraph = [];
      if (text === '') return;
      const p = document.createElement('p');
      if (sawHeading === false && summarySeen === false) {
        p.className = 'release-summary';
        summarySeen = true;
      }
      p.append(inline(text));
      fragment.append(p);
    }

    function flushList() {
      list = null;
      item = null;
    }

    for (const raw of lines) {
      const line = raw.trim();
      if (code !== null) {
        if (line.startsWith('```')) {
          const pre = document.createElement('pre');
          const held = document.createElement('code');
          held.textContent = code.join('\n');
          pre.append(held);
          fragment.append(pre);
          code = null;
        } else {
          code.push(raw);
        }
        continue;
      }
      if (line.startsWith('```')) {
        flushParagraph();
        flushList();
        code = [];
        continue;
      }
      const heading = /^#{2,4}\s+(.*)$/u.exec(line);
      if (heading !== null) {
        flushParagraph();
        flushList();
        const held = document.createElement('h4');
        held.append(inline(categoryLabel(heading[1])));
        fragment.append(held);
        sawHeading = true;
        continue;
      }
      const bullet = /^[-*]\s+(.*)$/u.exec(line);
      if (bullet !== null) {
        flushParagraph();
        if (list === null) {
          list = document.createElement('ul');
          fragment.append(list);
        }
        item = document.createElement('li');
        item.append(inline(bullet[1]));
        list.append(item);
        continue;
      }
      if (line === '') {
        flushParagraph();
        flushList();
        continue;
      }
      if (item !== null) {
        item.append(document.createTextNode(' '));
        item.append(inline(line));
        continue;
      }
      paragraph.push(line);
    }
    if (code !== null) {
      const pre = document.createElement('pre');
      const held = document.createElement('code');
      held.textContent = code.join('\n');
      pre.append(held);
      fragment.append(pre);
    }
    flushParagraph();
    const body = document.createElement('div');
    body.className = 'release-notes';
    body.append(fragment);
    return body;
  }

  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#${name}`);
    svg.append(use);
    return svg;
  }

  function downloadButton(link, label, iconName, primary) {
    const anchor = document.createElement('a');
    anchor.className = primary ? 'btn btn-accent btn-sm' : 'btn btn-sm';
    anchor.href = hrefOf(link) ?? '#';
    anchor.append(icon(iconName));
    const held = document.createElement('span');
    held.textContent = label;
    anchor.append(held);
    return anchor;
  }

  function releaseCard(release, latest) {
    const article = document.createElement('article');
    article.className = 'release panel';
    article.id = `v${release.tag_name}`;

    const head = document.createElement('header');
    head.className = 'release-head';

    const version = document.createElement('div');
    version.className = 'release-version';
    const name = document.createElement('h3');
    name.textContent = release.tag_name;
    version.append(name);
    if (latest === true) {
      const chip = document.createElement('span');
      chip.className = 'chip chip-accent';
      chip.textContent = t('releases.latest');
      version.append(chip);
    }
    head.append(version);

    const date = document.createElement('time');
    date.className = 'release-date';
    date.dateTime = release.released_at ?? '';
    date.textContent = formatDate(release.released_at);
    head.append(date);

    const actions = document.createElement('div');
    actions.className = 'release-actions';
    const installer = linkNamed(release, INSTALLER);
    if (installer !== null) actions.append(downloadButton(installer, t('releases.download'), 'i-download', true));
    const plugins = linkNamed(release, PLUGINS);
    if (plugins !== null) actions.append(downloadButton(plugins, t('releases.plugins'), 'i-package', false));
    head.append(actions);

    article.append(head);
    article.append(renderNotes(release.description));
    return article;
  }

  function statusLine(text) {
    const p = document.createElement('p');
    p.className = 'status';
    p.textContent = text;
    return p;
  }

  /**
   * The release description's first line, when it is a headline rather than a section heading.
   */
  function headlineOf(description) {
    const first = String(description ?? '')
      .replace(/\r\n?/gu, '\n')
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line !== '');
    return first === undefined || first.startsWith('#') ? '' : first;
  }

  /**
   * How many list items each section of the release notes holds, in the order the sections appear.
   */
  function sectionCounts(description) {
    const sections = [];
    let section = null;
    for (const raw of String(description ?? '').replace(/\r\n?/gu, '\n').split('\n')) {
      const line = raw.trim();
      const heading = /^#{2,4}\s+(.*)$/u.exec(line);
      if (heading !== null) {
        section = { name: heading[1], count: 0 };
        sections.push(section);
        continue;
      }
      if (section !== null && /^[-*]\s+/u.test(line)) section.count += 1;
    }
    return sections.filter((one) => one.count > 0);
  }

  function renderLatestCounts(description) {
    const counts = sectionCounts(description);
    nodes.latestCounts.replaceChildren(...counts.map(({ name, count }) => {
      const item = document.createElement('li');
      item.className = 'latest-count';
      const label = document.createElement('span');
      label.textContent = `${categoryLabel(name)}:`;
      const value = document.createElement('strong');
      value.textContent = String(count);
      item.append(label, value);
      return item;
    }));
    nodes.latestCounts.hidden = counts.length === 0;
  }

  function renderLatest(release) {
    if (release === null || release === undefined) {
      nodes.latestVersion.textContent = '—';
      nodes.latestDate.textContent = '—';
      nodes.latestSummary.textContent = '';
      nodes.latestSummary.hidden = true;
      nodes.latestCounts.replaceChildren();
      nodes.latestCounts.hidden = true;
      nodes.latestDownload.href = `${LATEST}${INSTALLER}`;
      nodes.latestPlugins.href = `${LATEST}${PLUGINS}`;
      nodes.heroDownload.href = `${LATEST}${INSTALLER}`;
      return;
    }
    const summary = headlineOf(release.description);
    nodes.latestVersion.textContent = release.tag_name;
    nodes.latestDate.textContent = formatDate(release.released_at);
    nodes.latestSummary.textContent = summary;
    nodes.latestSummary.hidden = summary === '';
    renderLatestCounts(release.description);
    const installer = hrefOf(installerLink(state.releases)) ?? `${LATEST}${INSTALLER}`;
    const plugins = hrefOf(linkNamed(release, PLUGINS)) ?? `${LATEST}${PLUGINS}`;
    nodes.latestDownload.href = installer;
    nodes.heroDownload.href = installer;
    nodes.latestPlugins.href = plugins;
  }

  function render() {
    if (nodes.list === null) return;
    if (state.loading === true) {
      nodes.list.replaceChildren(statusLine(t('releases.loading')));
      return;
    }
    if (state.error === true) {
      const box = document.createElement('div');
      box.className = 'status status-error';
      const text = document.createElement('span');
      text.textContent = t('releases.error');
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'btn';
      retry.dataset.action = 'retry';
      retry.textContent = t('releases.retry');
      box.append(text, retry);
      nodes.list.replaceChildren(box);
      return;
    }
    if (state.releases.length === 0) {
      nodes.list.replaceChildren(statusLine(t('releases.empty')));
      return;
    }
    const held = [];
    if (state.offline === true) held.push(statusLine(t('releases.offline')));
    state.releases.forEach((release, index) => held.push(releaseCard(release, index === 0)));
    nodes.list.replaceChildren(...held);
  }

  function sorted(releases) {
    return releases
      .filter((release) => release !== null && typeof release === 'object' && typeof release.tag_name === 'string')
      .slice()
      .sort((left, right) => new Date(right.released_at ?? 0) - new Date(left.released_at ?? 0));
  }

  async function load() {
    state.loading = true;
    state.error = false;
    render();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(API, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (response.ok === false) throw new Error(`HTTP ${response.status}`);
      const held = await response.json();
      if (Array.isArray(held) === false) throw new Error('not a release list');
      state.releases = sorted(held);
      state.offline = false;
    } catch {
      try {
        const response = await fetch(FALLBACK, { headers: { Accept: 'application/json' } });
        if (response.ok === false) throw new Error(`HTTP ${response.status}`);
        const held = await response.json();
        if (Array.isArray(held) === false) throw new Error('not a release list');
        state.releases = sorted(held);
        state.offline = true;
      } catch {
        state.releases = [];
        state.offline = false;
        state.error = true;
      }
    } finally {
      clearTimeout(timer);
      state.loading = false;
      renderLatest(state.releases[0] ?? null);
      render();
    }
  }

  function start() {
    applyTheme(initialTheme(), { persist: false });
    applyLanguage(initialLanguage(), { persist: false, rerender: false });
    nodes.language?.addEventListener('change', (event) => applyLanguage(event.target.value));
    for (const button of document.querySelectorAll('[data-theme-set]')) {
      button.addEventListener('click', () => applyTheme(button.dataset.themeSet));
    }
    nodes.list?.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('[data-action="retry"]') !== null) load();
    });
    load();
  }

  start();
})();
