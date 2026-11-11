/**
 * Donghua Media Hijacking Injected Script Generator
 * Khusus untuk Donghua (Anichin, Animexin, Desustream, Odstream, Kuramadrive)
 */

export interface DonghuaScriptOptions {
  startTime?: number;
  totalDuration?: number;
}

export function buildDonghuaInjectedScript(options: DonghuaScriptOptions = {}): string {
  const ctxTime = options.startTime || 0;
  const fallbackMetaDuration = options.totalDuration || 0;

  return `
    (function() {
      if (window.__DONGHUA_INITIALIZED__) return;
      window.__DONGHUA_INITIALIZED__ = true;

      // Disable pinch-to-zoom
      try {
        var meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=100%, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.head.appendChild(meta);
      } catch(e) {}

      // Inject styling for Donghua Web Players (PlayerJS, Anichin, Odstream)
      var hideStyleContent = [
        'html, body { width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: #000 !important; }',
        'video { width: 100% !important; height: 100% !important; max-height: 100% !important; max-width: 100% !important; object-fit: contain !important; border: none !important; }',
        // Hide control overlays
        'video ~ div:not([class*="play"]):not([id*="play"]):not([class*="viewer"]):not([class*="video"]):not([class*="timeline"]) { display: none !important; opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; }',
        // Native WebKit / Android media controls
        'video::-webkit-media-controls, video::-webkit-media-controls-enclosure, video::-webkit-media-controls-panel, video::-webkit-media-controls-play-button, video::-webkit-media-controls-start-playback-button, video::-webkit-media-controls-clear-button, video::-webkit-media-controls-timeline, video::-webkit-media-controls-current-time-display, video::-webkit-media-controls-time-remaining-display, video::-webkit-media-controls-fullscreen-button, video::-webkit-media-controls-volume-slider, video::-webkit-media-controls-overlay-play-button { display: none !important; opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; -webkit-appearance: none !important; }',
        // PlayerJS toolbar, timeline, progress & buttons (ODSTREAM, ODCDN, Desustream)
        '[id^="pjs_"]:not(video), [id^="player_control_"], [id*="pjs_toolbar"], [id*="pjs_timeline"], .pjs_controls, .pjs_toolbar, .pjs-control, .pjs_play, .pjs_pause { display: none !important; opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; }',
        // Video.js & other web players
        '.vjs-control-bar, .vjs-big-play-button, .vjs-loading-spinner, .vjs-modal-dialog, .vjs-text-track-display, .vjs-poster, .art-controls, .art-bottom, .art-mask, .dplayer-controller, .dplayer-controller-mask, .plyr__controls, .video-player-controls, .bottom-control-bar, .controls-overlay { display: none !important; opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; }'
      ];

      function applyHideStyle() {
        try {
          var s = document.getElementById('__donghua_style__');
          if (!s) {
            s = document.createElement('style');
            s.id = '__donghua_style__';
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

      function isolateVideo(v) {
        if (!v) return;
        try {
          v.style.setProperty('width', '100%', 'important');
          v.style.setProperty('height', '100%', 'important');
          v.style.setProperty('max-width', '100%', 'important');
          v.style.setProperty('max-height', '100%', 'important');
          v.style.setProperty('object-fit', window.__QUETTA_ASPECT_RATIO__ || 'contain', 'important');
        } catch(e) {}
      }

      var capturedVideo = null;
      var userWantsPaused = false;
      var hasStartedPlayback = false;
      var fallbackMetaDuration = ${fallbackMetaDuration};

      function setupVideo(v) {
        if (!v || v.__donghuaBound) return;
        v.__donghuaBound = true;
        capturedVideo = v;
        v.controls = false;
        v.removeAttribute('controls');
        v.playsInline = true;
        v.preload = 'auto';
        isolateVideo(v);

        function sendReady() {
          var dur = (v.duration && isFinite(v.duration) && v.duration > 0) ? v.duration : fallbackMetaDuration;
          if (!v.dataset.donghuaReady) {
            v.dataset.donghuaReady = 'true';
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'video_ready',
              duration: dur,
              isPlaying: !v.paused
            }));
          }
        }
        sendReady();
        v.addEventListener('loadedmetadata', sendReady);
        v.addEventListener('canplay', sendReady);
        v.addEventListener('timeupdate', function(e) {
          isolateVideo(e.target);
          var dur = (e.target.duration && isFinite(e.target.duration) && e.target.duration > 0) ? e.target.duration : fallbackMetaDuration;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'timeupdate',
            currentTime: e.target.currentTime,
            duration: dur
          }));
        });
        v.addEventListener('play', function() {
          if (userWantsPaused) {
            try { v.pause(); } catch(e) {}
            return;
          }
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'playstate', isPlaying: true }));
        });
        v.addEventListener('pause', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'playstate', isPlaying: false }));
        });
        v.addEventListener('waiting', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'buffering', isBuffering: true }));
        });
        v.addEventListener('playing', function() {
          hasStartedPlayback = true;
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'playstate', isPlaying: true }));
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'buffering', isBuffering: false }));
        });

        // Resume if needed
        var ctxTime = ${ctxTime};
        if (ctxTime > 2) {
          setTimeout(function() {
            try { v.currentTime = ctxTime; } catch(e) {}
          }, 500);
        }
      }

      var vids = document.getElementsByTagName('video');
      for (var i = 0; i < vids.length; i++) setupVideo(vids[i]);

      // Direct Command Executor
      window.__QUETTA_EXEC__ = function(action, val) {
        if (!capturedVideo) {
          var vs = document.getElementsByTagName('video');
          if (vs.length > 0) setupVideo(vs[0]);
        }
        if (action === 'PLAY') {
          userWantsPaused = false;
          if (capturedVideo) capturedVideo.play().catch(function(){});
          if (window.playerjs && typeof window.playerjs.api === 'function') {
            try { window.playerjs.api('play'); } catch(e) {}
          }
        } else if (action === 'PAUSE') {
          userWantsPaused = true;
          if (capturedVideo) capturedVideo.pause();
          if (window.playerjs && typeof window.playerjs.api === 'function') {
            try { window.playerjs.api('pause'); } catch(e) {}
          }
        } else if (action === 'TOGGLE') {
          if (userWantsPaused || (capturedVideo && capturedVideo.paused)) {
            userWantsPaused = false;
            if (capturedVideo) capturedVideo.play().catch(function(){});
          } else {
            userWantsPaused = true;
            if (capturedVideo) capturedVideo.pause();
          }
        } else if (action === 'SEEK' && typeof val === 'number') {
          if (capturedVideo) capturedVideo.currentTime = val;
          if (window.playerjs && typeof window.playerjs.api === 'function') {
            try { window.playerjs.api('seek', val); } catch(e) {}
          }
        } else if (action === 'SPEED' && typeof val === 'number') {
          if (capturedVideo) capturedVideo.playbackRate = val;
        }
      };

      // Periodic Scanner
      setInterval(function() {
        var vList = document.getElementsByTagName('video');
        for (var j = 0; j < vList.length; j++) setupVideo(vList[j]);
      }, 1000);
    })();
    true;
  `;
}

