/**
 * ETHOSSENCE VIDEO GALLERY
 * HANDLES LAZY LOADING OF YOUTUBE AND VIMEO VIDEOS
 */

class EthossenceVideoGallery {
  constructor() {
    this.init();
  }

  init() {
    // LOAD VIMEO THUMBNAILS
    this.loadVimeoThumbnails();

    // ADD CLICK HANDLERS FOR LAZY LOAD
    this.attachPlayHandlers();
  }

  /**
   * LOAD THUMBNAILS FOR VIMEO VIDEOS VIA API
   */
  async loadVimeoThumbnails() {
    const vimeoThumbnails = document.querySelectorAll('.ethossence-video-gallery__vimeo-thumbnail');
    
    for (const thumbnail of vimeoThumbnails) {
      const vimeoId = thumbnail.dataset.vimeoId;
      if (!vimeoId) continue;

      try {
        const response = await fetch(`https://vimeo.com/api/v2/video/${vimeoId}.json`);
        const data = await response.json();
        
        if (data && data[0] && data[0].thumbnail_large) {
          thumbnail.style.backgroundImage = `url(${data[0].thumbnail_large})`;
        }
      } catch (error) {
        console.error('FAILED TO LOAD VIMEO THUMBNAIL:', error);
      }
    }
  }

  /**
   * ATTACH CLICK HANDLERS TO VIDEO PLACEHOLDERS
   */
  attachPlayHandlers() {
    const placeholders = document.querySelectorAll('.ethossence-video-gallery__placeholder');

    placeholders.forEach(placeholder => {
      placeholder.addEventListener('click', (e) => {
        this.loadVideo(placeholder);
      });

      // KEYBOARD ACCESSIBILITY
      placeholder.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.loadVideo(placeholder);
        }
      });
    });
  }

  /**
   * LOAD AND EMBED VIDEO WHEN PLACEHOLDER IS CLICKED
   * @param {HTMLElement} placeholder - THE PLACEHOLDER ELEMENT
   */
  loadVideo(placeholder) {
    const embedUrl = placeholder.dataset.embedUrl;
    const platform = placeholder.dataset.videoPlatform;
    
    if (!embedUrl) return;

    // ADD LOADING STATE
    placeholder.classList.add('loading');

    // CREATE IFRAME
    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.frameBorder = '0';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.className = 'ethossence-video-gallery__iframe';

    // ADD AUTOPLAY TO URL IF YOUTUBE
    if (platform === 'youtube' && !embedUrl.includes('autoplay')) {
      iframe.src = embedUrl + '&autoplay=1';
    } else if (platform === 'vimeo' && !embedUrl.includes('autoplay')) {
      iframe.src = embedUrl + '&autoplay=1';
    }

    // REPLACE PLACEHOLDER WITH IFRAME
    const wrapper = placeholder.parentElement;
    placeholder.remove();
    wrapper.appendChild(iframe);
  }
}

// INITIALIZE WHEN DOM IS READY
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new EthossenceVideoGallery();
  });
} else {
  new EthossenceVideoGallery();
}
