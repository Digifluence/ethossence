/**
 * Variant Cascade Filter
 * Filters product variant options based on previous selections
 * Shows only Option 2 values available with Option 1 selection
 * Shows only Option 3 values available with Option 1 + Option 2 selection
 */

class VariantCascadeFilter {
  constructor(variantSelectsElement) {
    this.variantSelects = variantSelectsElement;
    this.productVariants = this.getProductVariants();
    this.authorizedVariants = this.getAuthorizedVariants();
    this.optionFields = this.getOptionFields();

    if (this.optionFields.length > 1) {
      this.init();
    }
  }

  init() {
    // Listen for changes to any option
    this.variantSelects.addEventListener('change', (event) => {
      this.handleOptionChange(event);
    });

    // Initial filter on page load
    this.filterOptions();
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

    // For pill/button style (fieldsets with radio inputs)
    const fieldsets = this.variantSelects.querySelectorAll('fieldset.product-form__input');
    fieldsets.forEach(fieldset => {
      fields.push({
        container: fieldset,
        type: 'fieldset',
        position: fields.length + 1
      });
    });

    // For dropdown style (select elements)
    const selects = this.variantSelects.querySelectorAll('.product-form__input--dropdown select');
    selects.forEach(select => {
      fields.push({
        container: select.closest('.product-form__input--dropdown'),
        select: select,
        type: 'dropdown',
        position: fields.length + 1
      });
    });

    return fields;
  }

  handleOptionChange(event) {
    // Filter subsequent options based on the change
    this.filterOptions();
  }

  filterOptions() {
    const selectedValues = this.getSelectedValues();

    // Filter Option 2 based on Option 1
    if (this.optionFields.length > 1) {
      this.filterOption(2, selectedValues);
    }

    // Filter Option 3 based on Option 1 + Option 2
    if (this.optionFields.length > 2) {
      this.filterOption(3, selectedValues);
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

    if (!field) return;

    // Get available values for this option based on previous selections
    const availableValues = this.getAvailableValuesForOption(optionPosition, selectedValues);

    if (field.type === 'fieldset') {
      this.filterFieldsetOptions(field.container, availableValues, optionPosition);
    } else if (field.type === 'dropdown') {
      this.filterDropdownOptions(field.select, availableValues, optionPosition);
    }
  }

  getAvailableValuesForOption(optionPosition, selectedValues) {
    const availableValues = new Set();
    const optionKey = `option${optionPosition}`;

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

    inputs.forEach(input => {
      const wrapper = input.closest('.variant-option');
      const label = input.nextElementSibling;

      if (availableValues.has(input.value)) {
        // Show this option
        if (wrapper) wrapper.style.display = '';
        if (label) label.style.display = '';
        input.style.display = '';
        hasVisibleOption = true;

        if (!firstAvailableInput) {
          firstAvailableInput = input;
        }
      } else {
        // Hide this option
        if (wrapper) wrapper.style.display = 'none';
        if (label) label.style.display = 'none';
        input.style.display = 'none';

        // If this was selected, we need to select another option
        if (input.checked) {
          input.checked = false;
        }
      }
    });

    // If current selection is no longer available, select first available option
    const currentlyChecked = fieldset.querySelector('input[type="radio"]:checked');
    if (!currentlyChecked && firstAvailableInput && hasVisibleOption) {
      firstAvailableInput.checked = true;
      // Trigger change event to update product info
      firstAvailableInput.dispatchEvent(new Event('change', { bubbles: true }));
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
      // Trigger change event to update product info
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}

// Initialize when variant-selects elements are added to the page
if (!customElements.get('variant-selects')) {
  // Wait for variant-selects to be defined
  customElements.whenDefined('variant-selects').then(() => {
    initializeCascadeFilters();
  });
} else {
  // Already defined, initialize now
  document.addEventListener('DOMContentLoaded', () => {
    initializeCascadeFilters();
  });
}

function initializeCascadeFilters() {
  const variantSelectsElements = document.querySelectorAll('variant-selects');
  variantSelectsElements.forEach(element => {
    // Check if already initialized
    if (!element.hasAttribute('data-cascade-initialized')) {
      new VariantCascadeFilter(element);
      element.setAttribute('data-cascade-initialized', 'true');
    }
  });
}

// Also initialize when product info is loaded (for AJAX updates)
document.addEventListener('product-info:loaded', () => {
  initializeCascadeFilters();
});
