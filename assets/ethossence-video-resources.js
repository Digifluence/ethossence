/**
 * ETHOSSENCE VIDEO RESOURCES
 * HANDLES LAZY LOADING OF YOUTUBE AND VIMEO VIDEOS
 * AND DEFERRED LOADING OF SHOPIFY CDN VIDEOS
 */

class EthossenceVideoResources {
  constructor() {
    this.init();
  }

  init() {
    // LOAD VIMEO THUMBNAILS
    this.loadVimeoThumbnails();

    // ADD CLICK HANDLERS FOR LAZY LOAD EXTERNAL VIDEOS
    this.attachExternalVideoHandlers();

    // INITIALIZE SHOPIFY CDN VIDEO DEFERRED MEDIA
    this.initializeDeferredMedia();
  }

  /**
   * LOAD THUMBNAILS FOR VIMEO VIDEOS VIA API
   */
  async loadVimeoThumbnails() {
    const vimeoThumbnails = document.querySelectorAll('.ethossence-video-resources__vimeo-thumbnail');
    
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
   * ATTACH CLICK HANDLERS TO EXTERNAL VIDEO PLACEHOLDERS
   */
  attachExternalVideoHandlers() {
    const placeholders = document.querySelectorAll('.ethossence-video-resources__placeholder');

    placeholders.forEach(placeholder => {
      placeholder.addEventListener('click', (e) => {
        this.loadExternalVideo(placeholder);
      });

      // KEYBOARD ACCESSIBILITY
      placeholder.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.loadExternalVideo(placeholder);
        }
      });
    });
  }

  /**
   * LOAD AND EMBED EXTERNAL VIDEO WHEN PLACEHOLDER IS CLICKED
   * @param {HTMLElement} placeholder - THE PLACEHOLDER ELEMENT
   */
  loadExternalVideo(placeholder) {
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
    iframe.className = 'ethossence-video-resources__iframe';

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

  /**
   * INITIALIZE DEFERRED MEDIA FOR SHOPIFY CDN VIDEOS
   * SIMILAR TO DAWN'S DEFERRED-MEDIA COMPONENT
   */
  initializeDeferredMedia() {
    const deferredMediaElements = document.querySelectorAll('.ethossence-video-resources__deferred-media');

    deferredMediaElements.forEach(element => {
      const poster = element.querySelector('.ethossence-video-resources__poster');
      if (!poster) return;

      poster.addEventListener('click', (e) => {
        e.preventDefault();
        this.loadDeferredMedia(element);
      });

      // KEYBOARD ACCESSIBILITY
      poster.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.loadDeferredMedia(element);
        }
      });
    });
  }

  /**
   * LOAD DEFERRED MEDIA (SHOPIFY CDN VIDEO)
   * @param {HTMLElement} element - THE DEFERRED MEDIA ELEMENT
   */
  loadDeferredMedia(element) {
    const content = document.createElement('div');
    content.appendChild(
      element.querySelector('template').content.firstElementChild.cloneNode(true)
    );

    element.setAttribute('loaded', true);
    
    // REPLACE POSTER WITH VIDEO
    const deferredElement = element.appendChild(content.querySelector('video, model-viewer, iframe'));
    
    // PLAY VIDEO IF IT'S A VIDEO ELEMENT
    if (deferredElement.tagName === 'VIDEO') {
      deferredElement.play();
    }

    // REMOVE POSTER BUTTON
    const poster = element.querySelector('.ethossence-video-resources__poster');
    if (poster) {
      poster.remove();
    }
  }
}

// INITIALIZE WHEN DOM IS READY
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new EthossenceVideoResources();
  });
} else {
  new EthossenceVideoResources();
}
