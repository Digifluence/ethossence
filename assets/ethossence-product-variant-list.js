/**
 * ETHOSSENCE Product Variant List Modal
 * Handles modal open/close functionality for product variant list display
 */

class VariantListModal {
  constructor(sectionId) {
    this.sectionId = sectionId;
    this.modalOpener = document.querySelector(`[data-modal="#VariantListModal-${sectionId}"]`);
    this.modal = document.getElementById(`VariantListModal-${sectionId}`);
    this.closeButton = document.getElementById(`VariantListModalClose-${sectionId}`);

    if (!this.modalOpener || !this.modal) return;

    this.init();
  }

  init() {
    // Open modal on click
    this.modalOpener.addEventListener('click', (e) => {
      e.preventDefault();
      this.openModal();
    });

    // Open modal on keyboard (Enter or Space) for accessibility
    this.modalOpener.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.openModal();
      }
    });

    // Close modal button
    if (this.closeButton) {
      this.closeButton.addEventListener('click', () => this.closeModal());
    }

    // Close modal when clicking outside the content
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.hasAttribute('open')) {
        this.closeModal();
      }
    });
  }

  openModal() {
    this.modal.setAttribute('open', '');
  }

  closeModal() {
    this.modal.removeAttribute('open');
  }
}

// Initialize modal when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Find all variant list modals on the page
  const modals = document.querySelectorAll('.variant-list-modal');
  modals.forEach((modal) => {
    const sectionId = modal.id.replace('VariantListModal-', '');
    new VariantListModal(sectionId);
  });
});
