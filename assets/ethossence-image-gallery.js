/**
 * IMAGE GALLERY WITH LIGHTBOX
 * HANDLES MODAL DISPLAY, NAVIGATION, AND KEYBOARD CONTROLS
 */

class ImageGallery extends HTMLElement {
  constructor() {
    super();
    
    this.galleryId = this.dataset.galleryId;
    this.modal = this.querySelector('[data-gallery-modal]');
    this.modalImage = this.querySelector('[data-gallery-image]');
    this.counter = this.querySelector('[data-gallery-counter]');
    this.triggers = this.querySelectorAll('[data-gallery-trigger]');
    this.closeButtons = this.querySelectorAll('[data-gallery-close]');
    this.prevButton = this.querySelector('[data-gallery-prev]');
    this.nextButton = this.querySelector('[data-gallery-next]');
    
    this.currentIndex = 0;
    this.images = this.loadImageData();
    
    this.init();
  }

  init() {
    // BIND EVENT LISTENERS
    this.triggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.imageIndex);
        this.openModal(index);
      });
    });

    this.closeButtons.forEach(button => {
      button.addEventListener('click', () => this.closeModal());
    });

    this.prevButton?.addEventListener('click', () => this.showPrevImage());
    this.nextButton?.addEventListener('click', () => this.showNextImage());

    // KEYBOARD NAVIGATION
    document.addEventListener('keydown', (e) => {
      if (this.modal.getAttribute('aria-hidden') === 'false') {
        this.handleKeyPress(e);
      }
    });

    // PREVENT CLICKS INSIDE MODAL CONTENT FROM CLOSING
    this.querySelector('.image-gallery-modal__content')?.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  loadImageData() {
    const dataScript = document.querySelector(`[data-gallery-data="${this.galleryId}"]`);
    if (!dataScript) return [];
    
    try {
      return JSON.parse(dataScript.textContent);
    } catch (error) {
      console.error('ERROR PARSING GALLERY DATA:', error);
      return [];
    }
  }

  openModal(index) {
    this.currentIndex = index;
    this.updateModalImage();
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('image-gallery-modal-open');
    
    // TRAP FOCUS IN MODAL
    this.trapFocus();
  }

  closeModal() {
    this.modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('image-gallery-modal-open');
    
    // RETURN FOCUS TO TRIGGER THAT OPENED THE MODAL
    const trigger = this.triggers[this.currentIndex];
    if (trigger) {
      trigger.focus();
    }
  }

  showPrevImage() {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.updateModalImage();
  }

  showNextImage() {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.updateModalImage();
  }

  updateModalImage() {
    const image = this.images[this.currentIndex];
    if (!image) return;

    // UPDATE IMAGE
    this.modalImage.src = image.url;
    this.modalImage.alt = image.alt;
    
    // UPDATE COUNTER
    if (this.counter) {
      this.counter.textContent = `${this.currentIndex + 1} / ${this.images.length}`;
    }

    // UPDATE NAVIGATION BUTTON STATES
    this.updateNavigationButtons();
  }

  updateNavigationButtons() {
    // DISABLE BUTTONS IF ONLY ONE IMAGE
    if (this.images.length <= 1) {
      this.prevButton?.setAttribute('disabled', '');
      this.nextButton?.setAttribute('disabled', '');
    } else {
      this.prevButton?.removeAttribute('disabled');
      this.nextButton?.removeAttribute('disabled');
    }
  }

  handleKeyPress(e) {
    switch (e.key) {
      case 'Escape':
        this.closeModal();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.showPrevImage();
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.showNextImage();
        break;
    }
  }

  trapFocus() {
    const focusableElements = this.modal.querySelectorAll(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // FOCUS FIRST ELEMENT
    firstElement.focus();

    // TRAP FOCUS WITHIN MODAL
    this.modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // SHIFT + TAB
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // TAB
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    });
  }
}

// INITIALIZE ALL GALLERY INSTANCES
if (!customElements.get('image-gallery')) {
  customElements.define('image-gallery', ImageGallery);
}

// INITIALIZE GALLERIES ON PAGE LOAD
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-gallery-id]').forEach(gallery => {
    if (gallery.tagName.toLowerCase() !== 'image-gallery') {
      // WRAP IN CUSTOM ELEMENT IF NOT ALREADY
      const wrapper = document.createElement('image-gallery');
      wrapper.dataset.galleryId = gallery.dataset.galleryId;
      gallery.parentNode.insertBefore(wrapper, gallery);
      wrapper.appendChild(gallery);
    }
  });
});
