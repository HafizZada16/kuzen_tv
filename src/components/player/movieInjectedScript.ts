/**
 * Movie Media Hijacking Injected Script Generator
 * Khusus untuk Pemutar Film / Bioskop (FrameX TV Embed, Executioner, Bowler, Titan, VidSrc)
 */

export interface MovieScriptOptions {
  startTime?: number;
  totalDuration?: number;
}

export function buildMovieInjectedScript(options: MovieScriptOptions = {}): string {
  const ctxTime = options.startTime || 0;
  const fallbackMetaDuration = options.totalDuration || 0;

  return `
    (function() {
      if (window.__MOVIE_INJECTED_INITIALIZED__) return;
      window.__MOVIE_INJECTED_INITIALIZED__ = true;

      try {
        var meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=100%, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.head.appendChild(meta);
      } catch(e) {}

      // Safe telemetry dispatcher: posts directly if in main frame, or relays via window.parent if inside iframe
      function safePostMessage(data) {
        try {
          var payload = typeof data === 'string' ? data : JSON.stringify(data);
          if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
            window.ReactNativeWebView.postMessage(payload);
          } else if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'QUETTA_TELEMETRY', payload: data }, '*');
          }
        } catch(e) {}
      }

      // Main frame listens for telemetry forwarded by child iframes
      window.addEventListener('message', function(evt) {
        try {
          var d = evt.data;
          if (d && d.type === 'QUETTA_TELEMETRY' && d.payload) {
            if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
              window.ReactNativeWebView.postMessage(typeof d.payload === 'string' ? d.payload : JSON.stringify(d.payload));
            }
          }
        } catch(e) {}
      });

      // Isolasi CSS Khusus Movie Embed: Hilangkan overlay iklan & posisikan iframe/video full-size
      var hideStyleContent = [
        'html, body { width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: #000 !important; }',
        // Sembunyikan iframe iklan/banner
        'iframe[src*="ad"], iframe[src*="banner"], iframe[id*="ad"], iframe[id*="google_ads"], iframe[src*="doubleclick"] { display: none !important; width: 0 !important; height: 0 !important; opacity: 0 !important; pointer-events: none !important; }',
        // Buat iframe embed utama memenuhi layar
        'iframe:not([src*="ad"]):not([id*="ad"]):not([class*="ad"]):not([style*="display: none"]):not([style*="display:none"]) { width: 100% !important; height: 100% !important; border: none !important; }',
        // Buat elemen video full width & height
        'video { width: 100% !important; height: 100% !important; max-height: 100% !important; max-width: 100% !important; object-fit: contain !important; border: none !important; }',
        // Sembunyikan kontrol bawaan browser
        'video::-webkit-media-controls { display: none !important; }',
        // Sembunyikan bar tombol web player pihak ketiga
        '.jw-controls, .jw-controlbar, .jw-controls-backdrop, .jw-overlays, .vjs-control-bar, .vjs-big-play-button, .art-controls, .plyr__controls, .controls-overlay { display: none !important; opacity: 0 !important; pointer-events: none !important; }'
      ];

      function applyHideStyle() {
        try {
          var s = document.getElementById('__movie_style__');
          if (!s) {
            s = document.createElement('style');
            s.id = '__movie_style__';
            s.type = 'text/css';
            (document.head || document.documentElement).appendChild(s);
          }
          var joinedCss = hideStyleContent.join(' ');
          if (s.innerHTML !== joinedCss) {
            s.innerHTML = joinedCss;
          }
        } catch(e) {}
      }
      applyHideStyle();
      setInterval(applyHideStyle, 1000);

      var capturedVideo = null;
      var userWantsPaused = false;
      var hasStartedPlayback = false;
      var fallbackMetaDuration = ${fallbackMetaDuration};

      function setupVideo(v) {
        if (!v || v.__movieBound) return;
        v.__movieBound = true;
        capturedVideo = v;
        v.controls = false;
        v.removeAttribute('controls');
        v.playsInline = true;
        v.preload = 'auto';

        function sendReady() {
          var dur = (v.duration && isFinite(v.duration) && v.duration > 0) ? v.duration : fallbackMetaDuration;
          if (!v.dataset.movieReady) {
            v.dataset.movieReady = 'true';
            safePostMessage({
              type: 'video_ready',
              duration: dur,
              isPlaying: !v.paused
            });
          }
        }
        sendReady();
        v.addEventListener('loadedmetadata', sendReady);
        v.addEventListener('canplay', sendReady);
        v.addEventListener('timeupdate', function(e) {
          var dur = (e.target.duration && isFinite(e.target.duration) && e.target.duration > 0) ? e.target.duration : fallbackMetaDuration;
          safePostMessage({
            type: 'timeupdate',
            currentTime: e.target.currentTime,
            duration: dur
          });
        });
        v.addEventListener('play', function() {
          if (userWantsPaused) {
            try { v.pause(); } catch(e) {}
            return;
          }
          safePostMessage({ type: 'playstate', isPlaying: true });
        });
        v.addEventListener('pause', function() {
          safePostMessage({ type: 'playstate', isPlaying: false });
        });
        v.addEventListener('playing', function() {
          hasStartedPlayback = true;
          safePostMessage({ type: 'playstate', isPlaying: true });
          safePostMessage({ type: 'buffering', isBuffering: false });
        });
        v.addEventListener('waiting', function() {
          safePostMessage({ type: 'buffering', isBuffering: true });
        });

        // Resume playback if needed
        var ctxTime = ${ctxTime};
        if (ctxTime > 2) {
          setTimeout(function() {
            try { v.currentTime = ctxTime; } catch(e) {}
          }, 800);
        }
      }

      var existingVids = document.getElementsByTagName('video');
      for (var i = 0; i < existingVids.length; i++) setupVideo(existingVids[i]);

      function doPause() {
        userWantsPaused = true;
        if (clickInterval) {
          clearInterval(clickInterval);
          clickInterval = null;
        }
        if (capturedVideo) {
          try { capturedVideo.pause(); } catch(e) {}
        }
        try {
          var vs = document.getElementsByTagName('video');
          for (var j = 0; j < vs.length; j++) {
            try { vs[j].pause(); } catch(e) {}
          }
        } catch(e) {}
        try {
          if (window.playerjs && typeof window.playerjs.api === 'function') window.playerjs.api('pause');
          if (window.jwplayer && typeof window.jwplayer === 'function') {
            var jw = window.jwplayer();
            if (jw && typeof jw.pause === 'function') jw.pause();
          }
        } catch(e) {}
        try {
          for (var f = 0; f < window.frames.length; f++) {
            try {
              window.frames[f].postMessage(JSON.stringify({ type: 'QUETTA_CMD', action: 'PAUSE' }), '*');
            } catch(e) {}
          }
        } catch(e) {}
        safePostMessage({ type: 'playstate', isPlaying: false });
      }

      function doPlay() {
        userWantsPaused = false;
        hasStartedPlayback = true;
        if (clickInterval) {
          clearInterval(clickInterval);
          clickInterval = null;
        }
        if (capturedVideo) {
          capturedVideo.play().then(function() {
            safePostMessage({ type: 'playstate', isPlaying: true });
          }).catch(function(){});
        }
        try {
          var vs = document.getElementsByTagName('video');
          for (var j = 0; j < vs.length; j++) {
            try { vs[j].play().catch(function(){}); } catch(e) {}
          }
        } catch(e) {}
        try {
          if (window.playerjs && typeof window.playerjs.api === 'function') window.playerjs.api('play');
          if (window.jwplayer && typeof window.jwplayer === 'function') {
            var jw = window.jwplayer();
            if (jw && typeof jw.play === 'function') jw.play();
          }
        } catch(e) {}
        try {
          for (var f = 0; f < window.frames.length; f++) {
            try {
              window.frames[f].postMessage(JSON.stringify({ type: 'QUETTA_CMD', action: 'PLAY' }), '*');
            } catch(e) {}
          }
        } catch(e) {}
      }

      // Command Bridge
      window.__QUETTA_EXEC__ = function(action, val) {
        if (!capturedVideo) {
          var vs = document.getElementsByTagName('video');
          if (vs.length > 0) setupVideo(vs[0]);
        }
        if (action === 'PAUSE') {
          doPause();
        } else if (action === 'PLAY') {
          doPlay();
        } else if (action === 'TOGGLE') {
          if (userWantsPaused || (capturedVideo && capturedVideo.paused)) {
            doPlay();
          } else {
            doPause();
          }
        } else if (action === 'SEEK' && typeof val === 'number') {
          if (capturedVideo) capturedVideo.currentTime = val;
        } else if (action === 'SPEED' && typeof val === 'number') {
          if (capturedVideo) capturedVideo.playbackRate = val;
        }
      };

      // Message Event Listener for Frame-to-Frame Forwarding
      window.addEventListener('message', function(evt) {
        try {
          var data = evt.data;
          if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch(e) {}
          }
          if (data && data.type === 'QUETTA_CMD' && typeof window.__QUETTA_EXEC__ === 'function') {
            window.__QUETTA_EXEC__(data.action, data.val);
          }
        } catch(e) {}
      });

      // Background Auto-Clicker & Initiator for Movie Embeds
      var clickAttempts = 0;
      var clickInterval = setInterval(function() {
        if (userWantsPaused || hasStartedPlayback) {
          clearInterval(clickInterval);
          clickInterval = null;
          return;
        }
        if (capturedVideo && !capturedVideo.paused && capturedVideo.currentTime > 0) {
          hasStartedPlayback = true;
          clearInterval(clickInterval);
          clickInterval = null;
          return;
        }
        if (++clickAttempts > 60) {
          clearInterval(clickInterval);
          clickInterval = null;
          return;
        }

        // Try clicking any known play buttons
        var playSelectors = [
          'div.play-video-button',
          '.play-video-button',
          '.play-button',
          '.play-btn',
          '#play-button',
          '.vjs-big-play-button',
          '.jw-icon-display',
          '.jw-display-icon-container',
          '.jw-preview',
          '.player-poster',
          '.viewer-play-button',
          '.video-play-btn',
          '.video-play-button',
          'button.play-button',
          'button[class*="play"]',
          '[data-symbol="play"]',
          '.click-to-play'
        ];
        for (var s = 0; s < playSelectors.length; s++) {
          var btn = document.querySelector(playSelectors[s]);
          if (btn) {
            try {
              btn.click();
              ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function(t) {
                try { btn.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })); } catch(e) {}
              });
            } catch(e) {}
            break;
          }
        }

        // Try native video.play()
        try {
          var vids = document.getElementsByTagName('video');
          for (var v = 0; v < vids.length; v++) {
            setupVideo(vids[v]);
            if (vids[v].paused) {
              try { vids[v].play().catch(function(){}); } catch(e) {}
            }
          }
        } catch(e) {}

        // Try 3rd party player APIs
        try {
          if (window.playerjs && typeof window.playerjs.api === 'function') window.playerjs.api('play');
          if (window.jwplayer && typeof window.jwplayer === 'function') {
            var jw = window.jwplayer();
            if (jw && typeof jw.play === 'function') jw.play();
          }
          if (window.videojs && typeof window.videojs.getAllPlayers === 'function') {
            var vjs = window.videojs.getAllPlayers();
            if (vjs && vjs[0] && typeof vjs[0].play === 'function') vjs[0].play();
          }
        } catch(e) {}
      }, 350);

      // Scanner for dynamically loaded video
      setInterval(function() {
        var vList = document.getElementsByTagName('video');
        for (var k = 0; k < vList.length; k++) setupVideo(vList[k]);
      }, 1000);
    })();
    true;
  `;
}
