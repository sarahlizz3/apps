/**
 * Search Module for Guides Hub
 * Client-side search for guides by title and description
 */

(function() {
  'use strict';

  let guidesData = null;
  let searchIndex = [];
  let searchInput = null;
  let resultsContainer = null;
  let basePath = './';

  /**
   * Initialize search functionality
   */
  async function init() {
    searchInput = document.querySelector('.search-input');
    resultsContainer = document.querySelector('.search-results');

    if (!searchInput || !resultsContainer) return;

    basePath = getBasePath();

    try {
      guidesData = await fetchGuidesData();
      searchIndex = buildSearchIndex();
      setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize search:', error);
    }
  }

  /**
   * Get the base path for links
   */
  function getBasePath() {
    const path = window.location.pathname;
    const guidesIndex = path.indexOf('/guides/');

    if (guidesIndex !== -1) {
      const afterGuides = path.substring(guidesIndex + 8);
      const depth = (afterGuides.match(/\//g) || []).length;
      return '../'.repeat(depth + 1);
    }

    return './';
  }

  /**
   * Fetch guides data from JSON
   */
  async function fetchGuidesData() {
    const jsonPath = basePath + 'data/guides.json';
    const response = await fetch(jsonPath);

    if (!response.ok) {
      throw new Error(`Failed to load guides data: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Build a flat search index from guides data
   */
  function buildSearchIndex() {
    const index = [];

    if (!guidesData || !guidesData.categories) return index;

    for (const category of guidesData.categories) {
      indexCategory(category, [category.label], index);
    }

    return index;
  }

  /**
   * Recursively index a category and its children
   */
  function indexCategory(item, path, index) {
    // If item has an href, it's a searchable guide
    if (item.href) {
      index.push({
        title: item.label,
        description: item.description || '',
        href: item.href,
        path: path.join(' > '),
        category: path[0] || ''
      });
    }

    // Index children
    if (item.children) {
      for (const child of item.children) {
        const newPath = item.label && !item.href
          ? [...path, child.label]  // Add subcategory to path
          : path;  // Keep same path for guide pages

        indexCategory(child, newPath, index);
      }
    }
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        performSearch(e.target.value);
      }, 150);
    });

    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim()) {
        performSearch(searchInput.value);
      }
    });

    // Close results on click outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
        hideResults();
      }
    });

    // Keyboard navigation
    searchInput.addEventListener('keydown', handleKeyboard);

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideResults();
        searchInput.blur();
      }
    });
  }

  /**
   * Handle keyboard navigation in results
   */
  function handleKeyboard(e) {
    const items = resultsContainer.querySelectorAll('.search-result-item');
    const activeItem = resultsContainer.querySelector('.search-result-item.focused');
    let activeIndex = Array.from(items).indexOf(activeItem);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (activeIndex < items.length - 1) {
          if (activeItem) activeItem.classList.remove('focused');
          items[activeIndex + 1].classList.add('focused');
          items[activeIndex + 1].scrollIntoView({ block: 'nearest' });
        } else if (activeIndex === -1 && items.length > 0) {
          items[0].classList.add('focused');
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (activeIndex > 0) {
          if (activeItem) activeItem.classList.remove('focused');
          items[activeIndex - 1].classList.add('focused');
          items[activeIndex - 1].scrollIntoView({ block: 'nearest' });
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (activeItem) {
          const link = activeItem.querySelector('a') || activeItem;
          if (link.href) {
            window.location.href = link.href;
          }
        }
        break;
    }
  }

  /**
   * Perform search and display results
   */
  function performSearch(query) {
    query = query.trim().toLowerCase();

    if (!query) {
      hideResults();
      return;
    }

    const results = searchIndex.filter(item => {
      const titleMatch = item.title.toLowerCase().includes(query);
      const descMatch = item.description.toLowerCase().includes(query);
      const pathMatch = item.path.toLowerCase().includes(query);
      return titleMatch || descMatch || pathMatch;
    });

    // Sort results: title matches first, then description matches
    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(query);
      const bTitle = b.title.toLowerCase().includes(query);

      if (aTitle && !bTitle) return -1;
      if (!aTitle && bTitle) return 1;
      return 0;
    });

    displayResults(results, query);
  }

  /**
   * Display search results
   */
  function displayResults(results, query) {
    if (results.length === 0) {
      resultsContainer.innerHTML = `
        <div class="search-no-results">
          No guides found for "${escapeHtml(query)}"
        </div>
      `;
      showResults();
      return;
    }

    const html = results.slice(0, 10).map(result => `
      <a href="${basePath}${result.href}" class="search-result-item">
        <div class="search-result-title">${highlightMatch(result.title, query)}</div>
        <div class="search-result-path">${escapeHtml(result.path)}</div>
        ${result.description ? `<div class="search-result-description">${highlightMatch(result.description, query)}</div>` : ''}
      </a>
    `).join('');

    resultsContainer.innerHTML = html;
    showResults();
  }

  /**
   * Highlight matching text
   */
  function highlightMatch(text, query) {
    const escaped = escapeHtml(text);
    const queryEscaped = escapeHtml(query);
    const regex = new RegExp(`(${escapeRegex(queryEscaped)})`, 'gi');
    return escaped.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Escape special regex characters
   */
  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Show results container
   */
  function showResults() {
    resultsContainer.classList.add('active');
  }

  /**
   * Hide results container
   */
  function hideResults() {
    resultsContainer.classList.remove('active');
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Export for external use
  window.GuidesSearch = {
    init,
    search: performSearch
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
