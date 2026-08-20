/**
 * Anti-Detection Injection Engine Core
 * This script is injected on page initialization (evaluateOnNewDocument)
 * @param {string} seed - A profile-specific unique hash (e.g., profileId) to ensure deterministic noise
 * @param {object} config - Custom spoofing config values
 */
module.exports = function injectAntiDetectEngine(seed, config) {
  // 1. Config Object Fallback (Prevent undefined errors)
  config = config || {};

  // Helper: Deterministic Pseudo-Random Generator (Mulberry32)
  function createRandom(seedStr) {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    let state = hash;
    return function() {
      let t = state += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const random = createRandom(seed || 'default-seed');

  // 2. WebGL & WebGL2 Hardware Spoofing (Handled dynamic fallbacks securely)
  const webglConfig = config.webgl || {};
  const glVendor = webglConfig.vendor || 'Google Inc. (NVIDIA)';
  const glRenderer = webglConfig.renderer || 'ANGLE (NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0)';
  const glVersion = webglConfig.glVersion || 'WebGL 2.0 (OpenGL ES 3.0 Chromium)';
  const shadingLanguage = webglConfig.shadingLanguage || 'WebGL GLSL ES 3.00 (OpenGL ES GLSL ES 3.0 Chromium)';

  const getParameterProxy = function(originalFn) {
    return function(parameter) {
      if (parameter === 37445) return glVendor; // UNMASKED_VENDOR_WEBGL (0x9245)
      if (parameter === 37446) return glRenderer; // UNMASKED_RENDERER_WEBGL (0x9246)
      if (parameter === 7938) return glVersion; // VERSION
      if (parameter === 35724) return shadingLanguage; // SHADING_LANGUAGE_VERSION
      if (parameter === 7936) return glVendor; // VENDOR
      
      return originalFn.apply(this, [parameter]);
    };
  };

  if (window.WebGLRenderingContext) {
    WebGLRenderingContext.prototype.getParameter = getParameterProxy(WebGLRenderingContext.prototype.getParameter);
  }
  if (window.WebGL2RenderingContext) {
    WebGL2RenderingContext.prototype.getParameter = getParameterProxy(WebGL2RenderingContext.prototype.getParameter);
  }

// 3. Consistent Canvas Fingerprint Noise (Checking config.canvas)
  if (config.canvas !== 'off') {
    const rNoise = (random() - 0.5) * 1.5;
    const gNoise = (random() - 0.5) * 1.5;
    const bNoise = (random() - 0.5) * 1.5;

    // A. Intercept getImageData
    if (window.CanvasRenderingContext2D) {
      const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function(x, y, width, height) {
        const imgData = originalGetImageData.apply(this, [x, y, width, height]);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > 0) data[i] = Math.min(255, Math.max(0, data[i] + rNoise));
          if (data[i+1] > 0) data[i+1] = Math.min(255, Math.max(0, data[i+1] + gNoise));
          if (data[i+2] > 0) data[i+2] = Math.min(255, Math.max(0, data[i+2] + bNoise));
        }
        return imgData;
      };
    }

    // Helper Function to inject deterministic invisible noise before extracting DataURL/Blob
    const injectCanvasMutation = (canvas) => {
      try {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const prevFillStyle = ctx.fillStyle;
          // Generating pseudo-random RGB values using our Mulberry32 seed
          const r = Math.abs(Math.floor(random() * 255));
          const g = Math.abs(Math.floor(random() * 255));
          const b = Math.abs(Math.floor(random() * 255));
          
          // Draw a practically invisible 1x1 pixel with 0.01 opacity
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.01)`;
          ctx.fillRect(0, 0, 1, 1);
          
          // Restore original style
          ctx.fillStyle = prevFillStyle;
        }
      } catch (e) {
        // Context might be WebGL, ignore 2d mutation
      }
    };

    // B. Intercept toDataURL
    if (window.HTMLCanvasElement) {
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function() {
        injectCanvasMutation(this);
        return originalToDataURL.apply(this, arguments);
      };

      // C. Intercept toBlob
      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function() {
        injectCanvasMutation(this);
        return originalToBlob.apply(this, arguments);
      };
    }
  }

  // 4. AudioContext Fingerprint Spoofing
  if (window.OfflineAudioContext) {
    const originalStartRendering = OfflineAudioContext.prototype.startRendering;
    OfflineAudioContext.prototype.startRendering = function() {
      return originalStartRendering.apply(this).then((renderedBuffer) => {
        const audioNoise = (random() - 0.5) * 0.00000001; 
        for (let channel = 0; channel < renderedBuffer.numberOfChannels; channel++) {
          const channelData = renderedBuffer.getChannelData(channel);
          for (let i = 0; i < channelData.length; i += 50) {
            channelData[i] += audioNoise;
          }
        }
        return renderedBuffer;
      });
    };
  }

  // 5. ClientRects Font Measurement Spoofing
  const originalGetClientRects = Element.prototype.getClientRects;
  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  const rectNoise = (random() - 0.5) * 0.0001; 

  Element.prototype.getClientRects = function() {
    const rects = originalGetClientRects.apply(this);
    if (rects.length > 0) {
      try {
        Object.defineProperty(rects[0], 'width', { value: rects[0].width + rectNoise });
        Object.defineProperty(rects[0], 'height', { value: rects[0].height + rectNoise });
      } catch (e) { /* Ignore if object is sealed in strict environments */ }
    }
    return rects;
  };

  Element.prototype.getBoundingClientRect = function() {
    const rect = originalGetBoundingClientRect.apply(this);
    return {
      x: rect.x, y: rect.y,
      top: rect.top, bottom: rect.bottom,
      left: rect.left, right: rect.right,
      width: rect.width + rectNoise,
      height: rect.height + rectNoise,
      toJSON: () => rect.toJSON()
    };
  };

  // 6. WebRTC Network Interface Spoofing (Checking config.webrtc & added full Private IP Regex)
  if (config.webrtc !== 'off') {
    if (window.RTCPeerConnection) {
      const originalCreateOffer = RTCPeerConnection.prototype.createOffer;
      RTCPeerConnection.prototype.createOffer = function(options) {
        return originalCreateOffer.apply(this, [options]).then((offer) => {
          if (offer && offer.sdp) {
            const sdpLines = offer.sdp.split('\r\n');
            const cleanSdp = sdpLines.map(line => {
              // Enhanced Regex: Drop 192.168.x.x, 10.x.x.x, AND 172.16.x.x - 172.31.x.x
              if (line.includes('candidate') && line.match(/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/)) {
                return ''; 
              }
              return line;
            }).filter(Boolean).join('\r\n');

            Object.defineProperty(offer, 'sdp', { value: cleanSdp });
          }
          return offer;
        });
      };
    }
  }

  // 7. Font Enumeration Defense (Cleaned Unused variables)
  if (document.fonts) {
    const blockedFonts = ['MS Outlook', 'Calibri', 'Century Gothic', 'Consolas', 'Segoe UI Semibold'];
    const originalMatch = window.matchMedia;
    window.matchMedia = function(query) {
      if (blockedFonts.some(font => query.includes(font))) {
        return { matches: false, media: query, addListener: () => {}, removeListener: () => {} };
      }
      return originalMatch.apply(this, [query]);
    };
  }

  // 8. NEW: Locale & Language Spoofing (From backend configuration)
  if (config.locale) {
    Object.defineProperty(navigator, 'language', { get: () => config.locale });
    Object.defineProperty(navigator, 'languages', { 
      get: () => [config.locale, config.locale.split('-')[0], 'en-US', 'en'] 
    });
  }

  // 9. NEW: Timezone Spoofing (From backend configuration)
  if (config.timezone) {
    const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = function() {
      const options = originalResolvedOptions.call(this);
      options.timeZone = config.timezone;
      return options;
    };
  }
};