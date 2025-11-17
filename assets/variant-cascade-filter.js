/**
 * Variant Cascade Filter
 * Filters product variant options based on previous selections
 * Shows only Option 2 values available with Option 1 selection
 * Shows only Option 3 values available with Option 1 + Option 2 selection
 *
 * VERSION: 1.1.0
 */

const VARIANT_CASCADE_VERSION = '1.1.0';

class VariantCascadeFilter {
  constructor(variantSelectsElement) {
    console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Initializing filter...`);

    this.variantSelects = variantSelectsElement;
    this.productVariants = this.getProductVariants();
    this.authorizedVariants = this.getAuthorizedVariants();
    this.optionFields = this.getOptionFields();
    this.isFiltering = false; // Prevent infinite loops

    console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Found ${this.productVariants.length} variants`);
    console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Found ${this.optionFields.length} option fields`);
    console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Authorized variants:`, Array.from(this.authorizedVariants));

    if (this.optionFields.length > 1) {
      this.init();
    } else {
      console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Not enough options to filter (need 2+)`);
    }
  }

  init() {
    console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Setting up change listener...`);

    // Listen for changes to any option - use capture phase to run before other handlers
    this.variantSelects.addEventListener('change', (event) => {
      console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Change event detected on:`, event.target);
      this.handleOptionChange(event);
    }, true);

    // Initial filter on page load
    console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Scheduling initial filter...`);
    setTimeout(() => {
      console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Running initial filter...`);
      this.filterOptions();
    }, 0);
  }

  getProductVariants() {
    const variantsScript = this.variantSelects.querySelector('[data-product-variants]');
    if (variantsScript) {
      try {
        return JSON.parse(variantsScript.textContent);
      } catch (e) {
        console.error('Error parsing product variants:', e);
        return [];
      }
    }
    return [];
  }

  getAuthorizedVariants() {
    const authorizedScript = this.variantSelects.querySelector('[data-authorized-variants]');
    if (authorizedScript) {
      try {
        const authorized = JSON.parse(authorizedScript.textContent);
        // Convert to Set for faster lookups
        return new Set(authorized.map(id => String(id)));
      } catch (e) {
        console.error('Error parsing authorized variants:', e);
        return new Set();
      }
    }
    return new Set();
  }

  getOptionFields() {
    // Get all option fieldsets/select containers in order (option1, option2, option3)
    const fields = [];

    // Look for elements with data-option-position attribute in order
    const allContainers = this.variantSelects.querySelectorAll('[data-option-position]');

    allContainers.forEach(container => {
      const position = parseInt(container.getAttribute('data-option-position'));

      // Check if it's a fieldset or dropdown
      if (container.tagName === 'FIELDSET') {
        fields.push({
          container: container,
          type: 'fieldset',
          position: position
        });
      } else if (container.classList.contains('product-form__input--dropdown')) {
        const select = container.querySelector('select');
        fields.push({
          container: container,
          select: select,
          type: 'dropdown',
          position: position
        });
      }
    });

    // Sort by position to ensure correct order
    fields.sort((a, b) => a.position - b.position);

    return fields;
  }

  handleOptionChange(event) {
    // Prevent infinite loops from auto-selecting options
    if (this.isFiltering) {
      console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Skipping change - already filtering`);
      return;
    }

    console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Scheduling filter after change...`);
    // Use setTimeout to ensure the change is processed before filtering
    setTimeout(() => {
      this.filterOptions();
    }, 10);
  }

  filterOptions() {
    if (this.isFiltering) {
      console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Already filtering, skipping...`);
      return;
    }

    console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Starting filter process...`);
    this.isFiltering = true;

    try {
      const selectedValues = this.getSelectedValues();
      console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Selected values:`, selectedValues);

      // Filter Option 2 based on Option 1
      if (this.optionFields.length > 1) {
        console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Filtering Option 2...`);
        this.filterOption(2, selectedValues);
      }

      // Filter Option 3 based on Option 1 + Option 2
      if (this.optionFields.length > 2) {
        console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Filtering Option 3...`);
        this.filterOption(3, selectedValues);
      }

      console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Filter process complete`);
    } finally {
      this.isFiltering = false;
    }
  }

  getSelectedValues() {
    const values = [];

    this.optionFields.forEach((field, index) => {
      let selectedValue = null;

      if (field.type === 'fieldset') {
        const checkedInput = field.container.querySelector('input[type="radio"]:checked');
        if (checkedInput) {
          selectedValue = checkedInput.value;
        }
      } else if (field.type === 'dropdown') {
        selectedValue = field.select.value;
      }

      values.push(selectedValue);
    });

    return values;
  }

  filterOption(optionPosition, selectedValues) {
    const optionIndex = optionPosition - 1;
    const field = this.optionFields[optionIndex];

    if (!field) {
      console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] No field found for option ${optionPosition}`);
      return;
    }

    console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Filtering option ${optionPosition} (type: ${field.type})`);

    // Get available values for this option based on previous selections
    const availableValues = this.getAvailableValuesForOption(optionPosition, selectedValues);

    console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Available values for option ${optionPosition}:`, Array.from(availableValues));

    if (field.type === 'fieldset') {
      this.filterFieldsetOptions(field.container, availableValues, optionPosition);
    } else if (field.type === 'dropdown') {
      this.filterDropdownOptions(field.select, availableValues, optionPosition);
    }
  }

  getAvailableValuesForOption(optionPosition, selectedValues) {
    const availableValues = new Set();
    const optionKey = `option${optionPosition}`;

    console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Getting available values for ${optionKey} with selections:`, selectedValues);

    // Filter variants based on previous selections and authorization
    const filteredVariants = this.productVariants.filter(variant => {
      // Check if variant is authorized
      if (this.authorizedVariants.size > 0 && !this.authorizedVariants.has(String(variant.id))) {
        return false;
      }

      // Check if variant matches previously selected options
      for (let i = 0; i < optionPosition - 1; i++) {
        const selectedValue = selectedValues[i];
        if (selectedValue) {
          const variantOptionKey = `option${i + 1}`;
          if (variant[variantOptionKey] !== selectedValue) {
            return false;
          }
        }
      }

      return true;
    });

    // Collect all unique values for this option from filtered variants
    filteredVariants.forEach(variant => {
      if (variant[optionKey]) {
        availableValues.add(variant[optionKey]);
      }
    });

    return availableValues;
  }

  filterFieldsetOptions(fieldset, availableValues, optionPosition) {
    const inputs = fieldset.querySelectorAll('input[type="radio"]');
    let hasVisibleOption = false;
    let firstAvailableInput = null;
    let needsAutoSelect = false;

    inputs.forEach(input => {
      const wrapper = input.closest('.variant-option');
      const label = input.nextElementSibling;

      if (availableValues.has(input.value)) {
        // Show this option
        if (wrapper) wrapper.style.display = '';
        if (label) label.style.display = '';
        input.style.display = '';
        input.disabled = false;
        hasVisibleOption = true;

        if (!firstAvailableInput) {
          firstAvailableInput = input;
        }
      } else {
        // Hide this option
        if (wrapper) wrapper.style.display = 'none';
        if (label) label.style.display = 'none';
        input.style.display = 'none';
        input.disabled = true;

        // If this was selected, we need to select another option
        if (input.checked) {
          input.checked = false;
          needsAutoSelect = true;
        }
      }
    });

    // If current selection is no longer available, select first available option
    const currentlyChecked = fieldset.querySelector('input[type="radio"]:checked:not([disabled])');
    if ((!currentlyChecked || needsAutoSelect) && firstAvailableInput && hasVisibleOption) {
      firstAvailableInput.checked = true;

      // Trigger change event to update product info after filtering is done
      setTimeout(() => {
        this.isFiltering = false;
        firstAvailableInput.dispatchEvent(new Event('change', { bubbles: true }));
        this.isFiltering = true;
      }, 0);
    }
  }

  filterDropdownOptions(select, availableValues, optionPosition) {
    const options = select.querySelectorAll('option');
    let hasVisibleOption = false;
    let firstAvailableOption = null;
    const currentValue = select.value;

    options.forEach(option => {
      // Skip the placeholder option if it exists
      if (!option.value) {
        return;
      }

      if (availableValues.has(option.value)) {
        // Show this option
        option.style.display = '';
        option.disabled = false;
        hasVisibleOption = true;

        if (!firstAvailableOption) {
          firstAvailableOption = option;
        }
      } else {
        // Hide this option
        option.style.display = 'none';
        option.disabled = true;
      }
    });

    // If current selection is no longer available, select first available option
    if (!availableValues.has(currentValue) && firstAvailableOption) {
      select.value = firstAvailableOption.value;
      firstAvailableOption.setAttribute('selected', 'selected');

      // Trigger change event to update product info after filtering is done
      setTimeout(() => {
        this.isFiltering = false;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        this.isFiltering = true;
      }, 0);
    }
  }
}

// Initialize cascade filters
function initializeCascadeFilters() {
  console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Initializing cascade filters...`);
  const variantSelectsElements = document.querySelectorAll('variant-selects');
  console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Found ${variantSelectsElements.length} variant-selects elements`);

  variantSelectsElements.forEach(element => {
    // Check if already initialized
    if (!element.hasAttribute('data-cascade-initialized')) {
      console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Initializing new filter for element:`, element);
      new VariantCascadeFilter(element);
      element.setAttribute('data-cascade-initialized', 'true');
    } else {
      console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Element already initialized, skipping`);
    }
  });

  if (variantSelectsElements.length === 0) {
    console.warn(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] No variant-selects elements found on page!`);
  }
}

// Wait for both custom element definition and DOM ready
function initWhenReady() {
  console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] DOM state: ${document.readyState}`);
  if (document.readyState === 'loading') {
    console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Waiting for DOMContentLoaded...`);
    document.addEventListener('DOMContentLoaded', () => {
      console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] DOMContentLoaded fired`);
      setTimeout(initializeCascadeFilters, 100);
    });
  } else {
    console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] DOM already ready, initializing now`);
    setTimeout(initializeCascadeFilters, 100);
  }
}

// Announce script load
console.log(`%c🔄 Variant Cascade Filter v${VARIANT_CASCADE_VERSION} loaded`, 'font-weight: bold; font-size: 14px; color: #00aa00;');

// Check if variant-selects custom element is defined
if (customElements.get('variant-selects')) {
  console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] variant-selects custom element already defined`);
  // Already defined, just wait for DOM
  initWhenReady();
} else {
  console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] Waiting for variant-selects custom element to be defined...`);
  // Wait for it to be defined, then initialize
  customElements.whenDefined('variant-selects').then(() => {
    console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] variant-selects custom element now defined`);
    initWhenReady();
  });
}

// Also initialize when product info is loaded (for AJAX updates)
document.addEventListener('product-info:loaded', () => {
  console.log(`[Variant Cascade v${VARIANT_CASCADE_VERSION}] product-info:loaded event fired, re-initializing...`);
  setTimeout(initializeCascadeFilters, 100);
});
