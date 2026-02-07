/**
 * Navigation Module for Guides Hub
 * Handles sidebar navigation, expand/collapse, and mobile drawer
 */

(function() {
  'use strict';

  // Icons as inline SVG
  const icons = {
    chevronDown: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>',
    home: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
    menu: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line></svg>',
    close: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>'
  };

  let guidesData = null;
  let currentPath = '';
  let basePath = '';

  /**
   * Initialize the navigation
   */
  function init() {
    currentPath = normalizePath(window.location.pathname);
    basePath = getBasePath();

    try {
      // Use embedded data from data.js (window.GUIDES_DATA)
      guidesData = window.GUIDES_DATA;

      if (!guidesData) {
        console.error('GUIDES_DATA not found. Make sure data.js is loaded before nav.js');
        return;
      }

      const currentCategory = findCurrentCategory();

      if (currentCategory) {
        renderSidebar(currentCategory);
        setupMobileNav();
        highlightCurrentPage();
      }
    } catch (error) {
      console.error('Failed to initialize navigation:', error);
    }
  }

  /**
   * Get the base path to the guides root
   */
  function getBasePath() {
    const path = window.location.pathname;

    // Look for the guides subfolder pattern (guides/apps/, guides/github/, etc.)
    const match = path.match(/guides\/(apps|github|linux|webdev|my-apps)\//);

    if (match) {
      // Find where this match starts
      const matchIndex = path.indexOf(match[0]);
      // Get everything after "guides/"
      const afterGuides = path.substring(matchIndex + 7); // after "guides/"
      // Count slashes to determine depth
      const depth = (afterGuides.match(/\//g) || []).length;
      return '../'.repeat(depth + 1);
    }

    return './';
  }

  /**
   * Normalize a path for comparison - extract the guides-relative portion
   */
  function normalizePath(path) {
    // Remove query/hash first
    path = path.split(/[?#]/)[0];

    // For file:// URLs, extract the guides/category/... portion
    // Look for guides/(apps|github|linux|webdev|my-apps)/...
    const guidesMatch = path.match(/guides\/(apps|github|linux|webdev|my-apps)\/.*$/);
    if (guidesMatch) {
      return guidesMatch[0];
    }

    // Remove leading slash for other cases
    return path.replace(/^\//, '');
  }

  /**
   * Find which category the current page belongs to
   */
  function findCurrentCategory() {
    if (!guidesData || !guidesData.categories) return null;

    for (const category of guidesData.categories) {
      if (isInCategory(category, currentPath)) {
        return category;
      }
    }

    return null;
  }

  /**
   * Check if a path is within a category
   */
  function isInCategory(category, path) {
    // Check direct children
    if (category.children) {
      for (const child of category.children) {
        if (child.href && normalizePath(child.href) === path) {
          return true;
        }
        // Check nested children (guide pages)
        if (child.children) {
          for (const subchild of child.children) {
            if (subchild.href && normalizePath(subchild.href) === path) {
              return true;
            }
          }
        }
        // Recurse into subcategories
        if (isInCategory(child, path)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Render the sidebar navigation
   */
  function renderSidebar(category) {
    const sidebar = document.querySelector('.sidebar-nav');
    if (!sidebar) return;

    const html = renderCategory(category);
    sidebar.innerHTML = html;

    // Setup event listeners for expand/collapse
    setupCollapsibleSections();
  }

  /**
   * Render a category's navigation
   */
  function renderCategory(category) {
    let html = '';

    if (category.children && category.children.length > 0) {
      for (const item of category.children) {
        html += renderNavItem(item);
      }
    }

    return html;
  }

  /**
   * Render a navigation item (could be a guide or subcategory)
   */
  function renderNavItem(item) {
    // If item has children, it's either a multi-page guide or a subcategory
    if (item.children && item.children.length > 0) {
      return renderNavGroup(item);
    }

    // Simple link
    if (item.href) {
      const isActive = normalizePath(item.href) === currentPath;
      const href = basePath + item.href;
      return `
        <div class="nav-item">
          <a href="${href}" class="nav-link${isActive ? ' active' : ''}">${escapeHtml(item.label)}</a>
        </div>
      `;
    }

    // Placeholder (no href, no children)
    return `
      <div class="nav-item">
        <span class="nav-link text-muted">${escapeHtml(item.label)}</span>
      </div>
    `;
  }

  /**
   * Render a collapsible navigation group
   */
  function renderNavGroup(item) {
    const hasActiveChild = checkHasActiveChild(item);
    const isExpanded = hasActiveChild;

    // Check if this is a guide with pages or a subcategory
    const isGuide = item.href !== undefined;

    let html = `<div class="nav-group">`;

    if (isGuide) {
      // It's a guide with multiple pages
      const isMainActive = normalizePath(item.href) === currentPath;
      const href = basePath + item.href;

      html += `
        <div class="nav-group-header" data-expanded="${isExpanded}">
          <a href="${href}" class="nav-link${isMainActive ? ' active' : ''}" style="padding: 0; flex: 1;">${escapeHtml(item.label)}</a>
          <span class="nav-group-toggle${isExpanded ? '' : ' collapsed'}">${icons.chevronDown}</span>
        </div>
      `;
    } else {
      // It's a subcategory
      html += `
        <div class="nav-group-header" data-expanded="${isExpanded}">
          <span style="flex: 1;">${escapeHtml(item.label)}</span>
          <span class="nav-group-toggle${isExpanded ? '' : ' collapsed'}">${icons.chevronDown}</span>
        </div>
      `;
    }

    html += `<ul class="nav-sublist${isExpanded ? '' : ' collapsed'}">`;

    for (const child of item.children) {
      if (child.href) {
        const isActive = normalizePath(child.href) === currentPath;
        const href = basePath + child.href;
        html += `
          <li class="nav-item">
            <a href="${href}" class="nav-sublink${isActive ? ' active' : ''}">${escapeHtml(child.label)}</a>
          </li>
        `;
      } else if (child.children) {
        // Nested subcategory - recurse
        html += `<li>${renderNavItem(child)}</li>`;
      } else {
        html += `
          <li class="nav-item">
            <span class="nav-sublink text-muted">${escapeHtml(child.label)}</span>
          </li>
        `;
      }
    }

    html += '</ul></div>';
    return html;
  }

  /**
   * Check if a group has an active child
   */
  function checkHasActiveChild(item) {
    if (item.href && normalizePath(item.href) === currentPath) {
      return true;
    }

    if (item.children) {
      for (const child of item.children) {
        if (checkHasActiveChild(child)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Setup collapsible section event listeners
   */
  function setupCollapsibleSections() {
    const headers = document.querySelectorAll('.nav-group-header');

    headers.forEach(header => {
      const toggle = header.querySelector('.nav-group-toggle');
      const list = header.nextElementSibling;

      // Make toggle clickable (not the whole header, to allow link clicks)
      if (toggle) {
        toggle.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          const isExpanded = header.dataset.expanded === 'true';
          header.dataset.expanded = (!isExpanded).toString();
          toggle.classList.toggle('collapsed', isExpanded);
          list.classList.toggle('collapsed', isExpanded);
        });
      }

      // If header doesn't have a link, make whole header clickable
      if (!header.querySelector('a')) {
        header.addEventListener('click', (e) => {
          if (e.target === toggle || toggle.contains(e.target)) return;

          const isExpanded = header.dataset.expanded === 'true';
          header.dataset.expanded = (!isExpanded).toString();
          toggle.classList.toggle('collapsed', isExpanded);
          list.classList.toggle('collapsed', isExpanded);
        });
      }
    });
  }

  /**
   * Setup mobile navigation drawer
   */
  function setupMobileNav() {
    const sidebar = document.querySelector('.sidebar');
    const toggle = document.querySelector('.sidebar-toggle');
    const overlay = document.querySelector('.sidebar-overlay');

    if (!sidebar || !toggle) return;

    toggle.addEventListener('click', () => {
      const isOpen = sidebar.classList.contains('open');

      if (isOpen) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });

    if (overlay) {
      overlay.addEventListener('click', closeMobileNav);
    }

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) {
        closeMobileNav();
      }
    });
  }

  function openMobileNav() {
    const sidebar = document.querySelector('.sidebar');
    const toggle = document.querySelector('.sidebar-toggle');
    const overlay = document.querySelector('.sidebar-overlay');

    sidebar.classList.add('open');
    toggle.innerHTML = icons.close;
    toggle.setAttribute('aria-expanded', 'true');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileNav() {
    const sidebar = document.querySelector('.sidebar');
    const toggle = document.querySelector('.sidebar-toggle');
    const overlay = document.querySelector('.sidebar-overlay');

    sidebar.classList.remove('open');
    toggle.innerHTML = icons.menu;
    toggle.setAttribute('aria-expanded', 'false');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  /**
   * Highlight the current page in navigation
   */
  function highlightCurrentPage() {
    // Already handled during render, but this ensures it's correct
    const links = document.querySelectorAll('.nav-link, .nav-sublink');

    links.forEach(link => {
      if (link.tagName === 'A') {
        const href = link.getAttribute('href');
        const linkPath = normalizePath(new URL(href, window.location.origin).pathname);

        if (linkPath === currentPath) {
          link.classList.add('active');
        }
      }
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Export for use in other scripts
  window.GuidesNav = {
    init,
    getGuidesData: () => guidesData,
    getBasePath: () => basePath
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
