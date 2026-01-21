/**
 * Ethossence Accordion - Shared expand/collapse functionality
 * for Ethossence product sections
 */

(function() {
  'use strict';

  function initAccordions() {
    const accordions = document.querySelectorAll('[data-ethossence-accordion]');

    accordions.forEach(function(accordion) {
      const toggle = accordion.querySelector('[data-accordion-toggle]');
      const content = accordion.querySelector('[data-accordion-content]');

      if (!toggle || !content) return;

      // Set initial state - collapsed
      content.style.height = '0px';
      content.style.overflow = 'hidden';

      toggle.addEventListener('click', function(e) {
        e.preventDefault();

        const isExpanded = accordion.classList.contains('is-expanded');

        if (isExpanded) {
          // Collapse
          collapseContent(accordion, content, toggle);
        } else {
          // Expand
          expandContent(accordion, content, toggle);
        }
      });
    });
  }

  function expandContent(accordion, content, toggle) {
    // Get the full height of content
    content.style.height = 'auto';
    const fullHeight = content.scrollHeight + 'px';
    content.style.height = '0px';

    // Force reflow
    content.offsetHeight;

    // Animate to full height
    content.style.height = fullHeight;
    accordion.classList.add('is-expanded');

    // Update toggle text
    const expandText = toggle.querySelector('[data-expand-text]');
    const collapseText = toggle.querySelector('[data-collapse-text]');
    if (expandText) expandText.style.display = 'none';
    if (collapseText) collapseText.style.display = 'inline';

    // After animation, set height to auto for responsive
    content.addEventListener('transitionend', function handler() {
      if (accordion.classList.contains('is-expanded')) {
        content.style.height = 'auto';
      }
      content.removeEventListener('transitionend', handler);
    });
  }

  function collapseContent(accordion, content, toggle) {
    // Get current height and set it explicitly
    const currentHeight = content.scrollHeight + 'px';
    content.style.height = currentHeight;

    // Force reflow
    content.offsetHeight;

    // Animate to 0
    content.style.height = '0px';
    accordion.classList.remove('is-expanded');

    // Update toggle text
    const expandText = toggle.querySelector('[data-expand-text]');
    const collapseText = toggle.querySelector('[data-collapse-text]');
    if (expandText) expandText.style.display = 'inline';
    if (collapseText) collapseText.style.display = 'none';
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccordions);
  } else {
    initAccordions();
  }

  // Re-initialize on Shopify section load (for theme editor)
  document.addEventListener('shopify:section:load', function(event) {
    initAccordions();
  });
})();
