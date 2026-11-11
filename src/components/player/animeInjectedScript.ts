/**
 * Anime Media Hijacking Injected Script Generator (100% Stable for Otakudesu & Anime Providers)
 */

export interface AnimeScriptOptions {
  startTime?: number;
  totalDuration?: number;
}

export function buildAnimeInjectedScript(options: AnimeScriptOptions = {}): string {
  const ctxTime = options.startTime || 0;
  const fallbackMetaDuration = options.totalDuration || 0;

  return `
    (function() {
      if (window.__QUETTA_INITIALIZED__) return;
      window.__QUETTA_INITIALIZED__ = true;

      // Disable pinch-to-zoom
      try {
        var meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=100%, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.head.appendChild(meta);
      } catch(e) {}

      var isVidhideHost = (window.location.href.indexOf('vidhide') !== -1 || window.location.href.indexOf('earnvids') !== -1);

      // Inject full-size styling & comprehensive isolation of web player controls
      var hideStyleContent = [
        'html, body { width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: #000 !important; }',
        'video { width: 100% !important; height: 100% !important; max-height: 100% !important; max-width: 100% !important; object-fit: contain !important; border: none !important; }',
        // Universal video sibling hide - hides control overlays rendered alongside video (excluding canvases or decoding engines)
        'video ~ div:not([class*="play"]):not([id*="play"]):not([class*="viewer"]):not([class*="video"]):not([class*="timeline"]) { display: none !important; opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; }',
        // Native WebKit / Android media controls
        'video::-webkit-media-controls, video::-webkit-media-controls-enclosure, video::-webkit-media-controls-panel, video::-webkit-media-controls-play-button, video::-webkit-media-controls-start-playback-button, video::-webkit-media-controls-clear-button, video::-webkit-media-controls-timeline, video::-webkit-media-controls-current-time-display, video::-webkit-media-controls-time-remaining-display, video::-webkit-media-controls-fullscreen-button, video::-webkit-media-controls-volume-slider, video::-webkit-media-controls-overlay-play-button { display: none !important; opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; -webkit-appearance: none !important; }',
        // PlayerJS toolbar, timeline, progress & buttons (ODSTREAM, ODCDN, Desustream)
        '[id^="pjs_"]:not(video), [id^="player_control_"], [id*="pjs_toolbar"], [id*="pjs_timeline"], .pjs_controls, .pjs_toolbar, .pjs-control, .pjs_play, .pjs_pause { display: none !important; opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; }',
        // Mega top bar (filename, logo, share button) & controls - hide completely
        '.viewer-top-bar, .viewer-header, .video-top-bar, [class*="viewer-top"], [class*="video-top"], [class*="top-bar"], [class*="file-info"], [class*="file-name"], [class*="viewer-file"], [class*="mega-logo"], [class*="viewer-logo"], [class*="share-button"], [class*="share-icon"], [class*="btn-share"] { display: none !important; opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; }',
        // Mega timeline, controls, and bottom bar: hidden visually, but preserves DOM layout geometry so synthetic events trigger seeking
        '.viewer-video-controls, .viewer-bottom-bar, .video-bottom-controls, .mega-video-controls, .mega-controls, [class*="viewer-bottom"], [class*="video-bottom"], [class*="video-control"], .video-timeline, .video-progress-bar, [class*="video-timeline"], [class*="progress-bar"], .viewer-video-time, .video-time, .video-duration, [class*="duration"] { opacity: 0 !important; pointer-events: none !important; z-index: -10 !important; }',
        // Mega center play button: invisible to human eye, but retains layout box so auto-clicker can trigger it
        'div.play-video-button, .play-video-button, .viewer-play-button, .video-play-btn, .video-play-button, [class*="play-video"], button[class*="play"] { opacity: 0.001 !important; pointer-events: auto !important; z-index: 9999 !important; }',
        // JW Player, Video.js, ArtPlayer, DPlayer, Plyr, Mega, VidHide controls, pause overlays & seekbars
        '.jw-controls, .jw-controlbar, .jw-controls-backdrop, .jw-display-icon-container, .jw-dock, .jw-overlays, .jw-preview, .vjs-control-bar, .vjs-big-play-button, .vjs-loading-spinner, .vjs-modal-dialog, .vjs-text-track-display, .vjs-poster, .art-controls, .art-bottom, .art-mask, .dplayer-controller, .dplayer-controller-mask, .plyr__controls, .video-player-controls, .bottom-control-bar, .controls-overlay, [class*="control-bar" i], [class*="controls-bar" i], [class*="bottom-controls" i], [class*="player-controls" i], [class*="vjs-control" i], [class*="pause-overlay" i], [class*="paused-overlay" i], [class*="pause_overlay" i] { display: none !important; opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; }',
        // Google Drive preview top toolstrip, popout & title overlays
        '.drive-viewer-toolstrip, .drive-viewer-popout-button, .drive-viewer-title, [class*="drive-viewer-toolstrip"], .ytp-chrome-top, .ytp-show-cards-title, .ytp-gradient-top { display: none !important; opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; }'
      ];

      // Add Vidhide-specific isolation ONLY on Vidhide/Earnvids domains
      if (isVidhideHost) {
        hideStyleContent.push(
          'header, nav, footer, .navbar, [class*="header" i], [class*="logo" i], [class*="earnvids" i] { display: none !important; height: 0 !important; max-height: 0 !important; overflow: hidden !important; }',
          '#player, #vplayer, .jwplayer, [id*="player" i] { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 999999 !important; background: #000 !important; }'
        );
      }

      function applyHideStyle() {
        try {
          var s = document.getElementById('__quetta_style__');
          if (!s) {
            s = document.createElement('style');
            s.id = '__quetta_style__';
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
          v.style.setProperty('position', 'absolute', 'important');
          v.style.setProperty('top', '0', 'important');
          v.style.setProperty('left', '0', 'important');
          v.style.setProperty('z-index', '1', 'important');

          if (isVidhideHost) {
            try {
              var playerBox = v.closest('#player, #vplayer, .jwplayer, [id*="player" i]');
              if (playerBox) {
                playerBox.style.setProperty('position', 'fixed', 'important');
                playerBox.style.setProperty('top', '0', 'important');
                playerBox.style.setProperty('left', '0', 'important');
                playerBox.style.setProperty('width', '100vw', 'important');
                playerBox.style.setProperty('height', '100vh', 'important');
                playerBox.style.setProperty('z-index', '999999', 'important');
              }
              var navHeaders = document.querySelectorAll('header, nav, .navbar, [class*="header" i], [class*="logo" i], [class*="earnvids" i]');
              for (var h = 0; h < navHeaders.length; h++) {
                navHeaders[h].style.setProperty('display', 'none', 'important');
              }
            } catch(e) {}
          }

          // Hide direct siblings of video that are control wrappers (do not touch parent containers or engines)
          var parent = v.parentElement;
          if (parent) {
            var children = parent.children;
            for (var i = 0; i < children.length; i++) {
              var child = children[i];
              if (child !== v && child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE' && child.tagName !== 'CANVAS') {
                var cls = (child.className || '').toString().toLowerCase();
                var id = (child.id || '').toString().toLowerCase();
                if (cls.includes('control') || cls.includes('toolbar') || cls.includes('bar') || cls.includes('header') || cls.includes('top') || cls.includes('info') || id.includes('pjs_')) {
                  if (cls.includes('timeline') || cls.includes('progress') || cls.includes('viewer-bottom') || cls.includes('video-bottom') || cls.includes('mega-video-controls') || cls.includes('mega-controls')) {
                    child.style.setProperty('opacity', '0', 'important');
                    child.style.setProperty('pointer-events', 'none', 'important');
                    child.style.setProperty('z-index', '-10', 'important');
                  } else {
                    child.style.setProperty('display', 'none', 'important');
                    child.style.setProperty('opacity', '0', 'important');
                    child.style.setProperty('pointer-events', 'none', 'important');
                    child.style.setProperty('visibility', 'hidden', 'important');
                  }
                }
              }
            }
          }

          // Isolate PlayerJS: hide controls in oframe (toolbar, bg2, buttons) while preserving mediacontainer & video
          try {
            var oframe = (v.closest && v.closest('[id^="oframe"]')) || (parent && parent.parentElement && (parent.parentElement.id || '').indexOf('oframe') === 0 ? parent.parentElement : null);
            if (oframe) {
              for (var oi = 0; oi < oframe.children.length; oi++) {
                var oc = oframe.children[oi];
                if (!oc.contains(v) && oc.tagName !== 'SCRIPT' && oc.tagName !== 'STYLE') {
                  oc.style.setProperty('display', 'none', 'important');
                  oc.style.setProperty('opacity', '0', 'important');
                  oc.style.setProperty('pointer-events', 'none', 'important');
                  oc.style.setProperty('visibility', 'hidden', 'important');
                }
              }
            }
          } catch(e) {}

          // 1. Controls that can be safely hidden with display: none (headers, logos, standard players)
          var displayNoneSelectors = [
            '.viewer-top-bar',
            '.viewer-header',
            '.video-top-bar',
            '[class*="viewer-top"]',
            '[class*="video-top"]',
            '[class*="top-bar"]',
            '[class*="file-info"]',
            '[class*="file-name"]',
            '[class*="viewer-file"]',
            '[class*="mega-logo"]',
            '[class*="viewer-logo"]',
            '[class*="share-button"]',
            '[class*="share-icon"]',
            '[id^="pjs_"]:not(video)',
            '.pjs_controls',
            '.pjs_toolbar',
            '.pjs-control',
            '.pjs_pause',
            '.pjs_play',
            '.jw-controls',
            '.vjs-control-bar',
            '.vjs-big-play-button'
          ];
          var nodes = document.querySelectorAll(displayNoneSelectors.join(','));
          for (var j = 0; j < nodes.length; j++) {
            nodes[j].style.setProperty('display', 'none', 'important');
            nodes[j].style.setProperty('opacity', '0', 'important');
            nodes[j].style.setProperty('pointer-events', 'none', 'important');
            nodes[j].style.setProperty('visibility', 'hidden', 'important');
          }

          // 2. Mega bottom bar & controls: MUST retain geometry for synthetic seek events, only hide visually
          var preserveLayoutSelectors = [
            '.viewer-video-controls',
            '.viewer-bottom-bar',
            '.video-bottom-controls',
            '.mega-video-controls',
            '.mega-controls',
            '[class*="viewer-bottom"]',
            '[class*="video-bottom"]',
            '[class*="video-control"]',
            '.video-timeline',
            '.video-progress-bar',
            '[class*="video-timeline"]',
            '[class*="progress-bar"]'
          ];
          var layoutNodes = document.querySelectorAll(preserveLayoutSelectors.join(','));
          for (var k = 0; k < layoutNodes.length; k++) {
            layoutNodes[k].style.setProperty('opacity', '0', 'important');
            layoutNodes[k].style.setProperty('pointer-events', 'none', 'important');
            layoutNodes[k].style.setProperty('z-index', '-10', 'important');
          }
        } catch(e) {}
      }

      // Buffer Optimization: Tune HLS parameters if iframe uses Hls.js
      try {
        function tuneHls() {
          if (window.Hls && window.Hls.DefaultConfig) {
            window.Hls.DefaultConfig.maxBufferLength = 60; // Buffer 60 detik kedepan (sebelumnya default 30s)
            window.Hls.DefaultConfig.maxMaxBufferLength = 180; // Maksimal hingga 3 menit buffer
            window.Hls.DefaultConfig.maxBufferSize = 120 * 1024 * 1024; // 120 MB
            window.Hls.DefaultConfig.backBufferLength = 60;
          }
        }
        tuneHls();
        var hlsInterval = setInterval(function() {
          if (window.Hls) {
            tuneHls();
            clearInterval(hlsInterval);
          }
        }, 500);
      } catch (e) {}

      var capturedVideo = null;
      var userWantsPaused = false;
      var hasStartedPlayback = false;
      var fallbackMetaDuration = ${fallbackMetaDuration};
      window.__QUETTA_INITIAL_RESUMED__ = false;
      window.__QUETTA_RESUME_TIMER__ = null;

      // Bulletproof Play Guard: When user explicitly pauses, intercept and reject ANY rogue
      // third-party embed script or internal timer attempting to force HTMLMediaElement.play()
      try {
        if (!window.__quetta_play_guard_installed__) {
          window.__quetta_play_guard_installed__ = true;
          var origMediaPlay = HTMLMediaElement.prototype.play;
          HTMLMediaElement.prototype.play = function() {
            if (userWantsPaused) {
              return Promise.reject(new Error('Playback paused by user'));
            }
            return origMediaPlay.apply(this, arguments);
          };
        }
      } catch(e) {}

      // MediaSource duration patch: Prevent browser HTML5 engine from clamping seek to partial MSE buffer length
      try {
        if (window.MediaSource && fallbackMetaDuration > 0) {
          var origAddSourceBuffer = MediaSource.prototype.addSourceBuffer;
          MediaSource.prototype.addSourceBuffer = function() {
            var ms = this;
            try {
              if (ms.readyState === 'open' && (!ms.duration || !isFinite(ms.duration) || ms.duration < fallbackMetaDuration)) {
                ms.duration = fallbackMetaDuration;
              }
            } catch(e) {}
            return origAddSourceBuffer.apply(this, arguments);
          };
        }
      } catch(e) {}

      // Safety timeout: cancel initial resume retries after 12s if video didn't catch seek
      setTimeout(function() {
        window.__QUETTA_INITIAL_RESUMED__ = true;
        if (window.__QUETTA_RESUME_TIMER__) {
          clearInterval(window.__QUETTA_RESUME_TIMER__);
          window.__QUETTA_RESUME_TIMER__ = null;
        }
      }, 12000);

      function detectDuration() {
        // Prefer known total episode duration over partial MSE progressive buffer length
        if (fallbackMetaDuration > 0) {
          if (capturedVideo && capturedVideo.duration && isFinite(capturedVideo.duration) && capturedVideo.duration >= fallbackMetaDuration * 0.8) {
            return capturedVideo.duration;
          }
          return fallbackMetaDuration;
        }
        if (capturedVideo && capturedVideo.duration && isFinite(capturedVideo.duration) && capturedVideo.duration > 0) return capturedVideo.duration;
        try {
          if (window.jwplayer && typeof window.jwplayer === 'function') {
            var jw = window.jwplayer();
            if (!jw || typeof jw.getDuration !== 'function') {
              jw = (typeof window.jwplayer === 'function' && window.jwplayer(0)) || 
                   (typeof window.jwplayer === 'function' && window.jwplayer('vplayer')) || 
                   (typeof window.jwplayer === 'function' && window.jwplayer('player'));
            }
            if (jw && typeof jw.getDuration === 'function') {
              var jd = jw.getDuration();
              if (isFinite(jd) && jd > 0) return jd;
            }
          }
        } catch(e) {}
        try {
          if (window.videojs && typeof window.videojs.getAllPlayers === 'function') {
            var vjsList = window.videojs.getAllPlayers();
            if (vjsList && vjsList[0] && typeof vjsList[0].duration === 'function') {
              var vd = vjsList[0].duration();
              if (isFinite(vd) && vd > 0) return vd;
            }
          }
        } catch(e) {}
        try {
          if (window.player && typeof window.player.duration === 'number' && window.player.duration > 0) {
            return window.player.duration;
          }
        } catch(e) {}
        try {
          var timeNodes = document.querySelectorAll('.video-duration, [class*="duration"], .viewer-video-time, .video-time, [class*="total-time"]');
          for (var i = 0; i < timeNodes.length; i++) {
            var txt = (timeNodes[i].textContent || '').trim();
            var match = txt.match(/(?:(?:\d{1,2}:)?\d{1,2}:\d{2})/g);
            if (match && match.length > 0) {
              var lastMatch = match[match.length - 1];
              var parts = lastMatch.split(':').map(Number);
              var secs = 0;
              if (parts.length === 2) secs = parts[0] * 60 + parts[1];
              else if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
              if (secs > 0) return secs;
            }
          }
        } catch(e) {}
        if (fallbackMetaDuration > 0) return fallbackMetaDuration;
        return 0;
      }

      function triggerMegaSeek(targetTime) {
        if (!capturedVideo) return false;
        var dur = detectDuration();
        if (dur <= 0) return false;

        // 1. Try internal Mega / custom player JS APIs if available
        try {
          if (window.videoPlayer && typeof window.videoPlayer.seek === 'function') {
            window.videoPlayer.seek(targetTime);
          }
        } catch(e) {}
        try {
          if (window.mPlayer && typeof window.mPlayer.seek === 'function') {
            window.mPlayer.seek(targetTime);
          }
        } catch(e) {}
        try {
          if (window.player && typeof window.player.seek === 'function') {
            window.player.seek(targetTime);
          }
        } catch(e) {}

        // 2. Timeline element search across all known Mega player UI patterns
        var timeline = document.querySelector('.viewer-bottom-bar .timeline') ||
                       document.querySelector('.viewer-bottom-bar [class*="timeline"]') ||
                       document.querySelector('.mega-video-controls .timeline') ||
                       document.querySelector('.mega-video-controls [class*="timeline"]') ||
                       document.querySelector('.video-timeline') || 
                       document.querySelector('.video-progress-bar') || 
                       document.querySelector('[class*="video-timeline"]') ||
                       document.querySelector('[class*="progress-bar"]') ||
                       document.querySelector('[class*="seekbar"]') ||
                       document.querySelector('[class*="slider"]');
        if (timeline) {
          var rect = timeline.getBoundingClientRect();
          if (rect.width > 0) {
            var ratio = Math.max(0, Math.min(1, targetTime / dur));
            var targetX = rect.left + ratio * rect.width;
            var targetY = rect.top + (rect.height > 0 ? rect.height / 2 : 5);
            ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function(evtType) {
              var evt = new MouseEvent(evtType, {
                bubbles: true,
                cancelable: true,
                clientX: targetX,
                clientY: targetY,
                pageX: targetX,
                pageY: targetY,
                view: window
              });
              timeline.dispatchEvent(evt);
            });
            return true;
          }
        }
        return false;
      }

      function setupVideo(v) {
        if (!v || v.__quettaBound) return;
        v.__quettaBound = true;
        capturedVideo = v;
        v.controls = false;
        v.removeAttribute('controls');
        v.playsInline = true;
        v.preload = 'auto';
        v.setAttribute('preload', 'auto');
        v.setAttribute('playsinline', '');
        v.setAttribute('webkit-playsinline', '');
        isolateVideo(v);

        // Instance play guard
        if (!v.__quetta_instance_play_guarded__) {
          v.__quetta_instance_play_guarded__ = true;
          var origVPlay = v.play;
          v.play = function() {
            if (userWantsPaused) {
              return Promise.reject(new Error('Playback paused by user'));
            }
            return origVPlay.apply(this, arguments);
          };
        }

        try {
          var obs = new MutationObserver(function() {
            if (v.hasAttribute('controls')) v.removeAttribute('controls');
            if (v.controls) v.controls = false;
            isolateVideo(v);
          });
          obs.observe(v, { attributes: true, attributeFilter: ['controls', 'style', 'class'] });
        } catch(e) {}

        function getBufferedEnd() {
          if (!v.buffered || v.buffered.length === 0) return 0;
          var ct = v.currentTime;
          for (var i = 0; i < v.buffered.length; i++) {
            if (v.buffered.start(i) <= ct && ct <= v.buffered.end(i)) {
              return v.buffered.end(i);
            }
          }
          return v.buffered.end(v.buffered.length - 1);
        }

        function sendReady() {
          isolateVideo(v);
          if (window.__QUETTA_SPEED__ && window.__QUETTA_SPEED__ !== 1.0) {
            try { v.playbackRate = window.__QUETTA_SPEED__; } catch(e) {}
          }
          if (window.__QUETTA_ASPECT_RATIO__) {
            try { v.style.setProperty('object-fit', window.__QUETTA_ASPECT_RATIO__, 'important'); } catch(e) {}
          }
          var dur = detectDuration();
          if (!v.dataset.quettaReady) {
            v.dataset.quettaReady = 'true';
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'video_ready',
              duration: dur,
              videoWidth: v.videoWidth || 0,
              videoHeight: v.videoHeight || 0,
              isPlaying: !v.paused
            }));
          }
        }
        sendReady();
        v.addEventListener('loadedmetadata', sendReady);
        v.addEventListener('canplay', sendReady);
        v.addEventListener('canplaythrough', sendReady);
        v.addEventListener('durationchange', sendReady);
        v.addEventListener('timeupdate', sendReady);

        // Immediately notify initial playback state
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'playstate',
          isPlaying: !v.paused
        }));

        v.addEventListener('progress', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'progress',
            buffered: getBufferedEnd()
          }));
        });
        v.addEventListener('timeupdate', function(e) {
          isolateVideo(e.target);
          var dur = detectDuration();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'timeupdate',
            currentTime: e.target.currentTime,
            duration: dur,
            buffered: getBufferedEnd()
          }));
        });
        v.addEventListener('play', function() {
          if (userWantsPaused) {
            try { v.pause(); } catch(e) {}
            return;
          }
          isolateVideo(v);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'playstate', isPlaying: true }));
        });
        v.addEventListener('playing', function() {
          if (userWantsPaused) {
            try { v.pause(); } catch(e) {}
            return;
          }
          hasStartedPlayback = true;
          if (clickInterval) { clearInterval(clickInterval); clickInterval = null; }
          isolateVideo(v);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'playstate', isPlaying: true }));
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'buffering', isBuffering: false }));
        });
        v.addEventListener('pause', function() {
          isolateVideo(v);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'playstate', isPlaying: false }));
        });
        v.addEventListener('ended', function() {
          isolateVideo(v);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'playstate', isPlaying: false }));
        });
        v.addEventListener('waiting', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'buffering', isBuffering: true }));
        });
        v.addEventListener('stalled', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'buffering', isBuffering: true }));
        });
        v.addEventListener('seeking', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'buffering', isBuffering: true }));
        });
        v.addEventListener('canplay', function() {
          if (!v.paused) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'buffering', isBuffering: false }));
          }
        });
        v.addEventListener('canplaythrough', function() {
          if (!v.paused) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'buffering', isBuffering: false }));
          }
        });
        function reportMediaError(msg) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'media_error',
            message: msg || 'Gagal memuat video atau stream tidak tersedia.'
          }));
        }

        v.addEventListener('error', function() {
          reportMediaError('Video failed to load');
        }, true);

        try {
          var sList = v.getElementsByTagName('source');
          for (var si = 0; si < sList.length; si++) {
            sList[si].addEventListener('error', function() {
              if (v.networkState === 3 || v.error) { reportMediaError('Source failed to load'); }
            });
          }
        } catch(e) {}
        v.addEventListener('seeked', function() {
          isolateVideo(v);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'seeked', currentTime: v.currentTime }));
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'buffering', isBuffering: false }));
        });

        // Resume from previous time if available
        var ctxTime = ${ctxTime};
        var resumeRetryCount = 0;

        function applyResumeTime() {
          if (window.__QUETTA_INITIAL_RESUMED__ || ctxTime <= 2 || !v) return;

          // 1. Dispatch timeline simulated click first for Mega MKV
          triggerMegaSeek(ctxTime);

          // 2. Native currentTime attempt (triggers MSE videostream seeking on Mega and standard HTML5)
          try {
            if (typeof v.fastSeek === 'function') {
              v.fastSeek(ctxTime);
            } else if (!v.duration || !isFinite(v.duration) || v.duration >= ctxTime) {
              v.currentTime = ctxTime;
            }
          } catch(e) {}

          // 3. PlayerJS seek API (Odstream, Odcdn, Desustream)
          try {
            if (window.playerjs && typeof window.playerjs.api === 'function') {
              window.playerjs.api('seek', ctxTime);
            }
          } catch(e) {}

          // 4. JWPlayer seek API (Vidhide, Earnvids)
          try {
            if (window.jwplayer && typeof window.jwplayer === 'function') {
              var jw = window.jwplayer();
              if (jw && typeof jw.seek === 'function') jw.seek(ctxTime);
            }
          } catch(e) {}

          // 5. Video.js seek API
          try {
            if (window.videojs && typeof window.videojs.getAllPlayers === 'function') {
              var allP = window.videojs.getAllPlayers();
              if (allP && allP[0] && typeof allP[0].currentTime === 'function') {
                allP[0].currentTime(ctxTime);
              }
            }
          } catch(e) {}

          resumeRetryCount++;
          // If video successfully caught the seek position (within 3.5s) or reached max retries
          if (Math.abs(v.currentTime - ctxTime) < 3.5 || resumeRetryCount >= 25) {
            window.__QUETTA_INITIAL_RESUMED__ = true;
            if (window.__QUETTA_RESUME_TIMER__) {
              clearInterval(window.__QUETTA_RESUME_TIMER__);
              window.__QUETTA_RESUME_TIMER__ = null;
            }
          }
        }

        if (!window.__QUETTA_INITIAL_RESUMED__ && ctxTime > 2) {
          // Multi-stage watcher for Mega WebAssembly MKV decoder initialization
          if (!window.__QUETTA_RESUME_TIMER__) {
            window.__QUETTA_RESUME_TIMER__ = setInterval(function() {
              if (window.__QUETTA_INITIAL_RESUMED__ || resumeRetryCount >= 25) {
                if (window.__QUETTA_RESUME_TIMER__) {
                  clearInterval(window.__QUETTA_RESUME_TIMER__);
                  window.__QUETTA_RESUME_TIMER__ = null;
                }
                return;
              }
              if (v.readyState >= 1 || v.currentTime > 0) {
                applyResumeTime();
              }
            }, 400);
          }

          var onCanPlayResume = function() {
            try { v.removeEventListener('canplay', onCanPlayResume); } catch(e) {}
            applyResumeTime();
          };
          v.addEventListener('canplay', onCanPlayResume);

          var onLoadedDataResume = function() {
            try { v.removeEventListener('loadeddata', onLoadedDataResume); } catch(e) {}
            applyResumeTime();
          };
          v.addEventListener('loadeddata', onLoadedDataResume);

          var onPlayingResume = function() {
            try { v.removeEventListener('playing', onPlayingResume); } catch(e) {}
            applyResumeTime();
          };
          v.addEventListener('playing', onPlayingResume);
        }
      }

      // Initial video detection & setup
      var existing = document.getElementsByTagName('video');
      for (var i = 0; i < existing.length; i++) {
        setupVideo(existing[i]);
      }

      // 1. Synthetic User Input Dispatcher (Bypasses programmatic click restrictions)
      function triggerClick(el) {
        if (!el) return;
        try {
          var rect = el.getBoundingClientRect();
          var clientX = rect.left + (rect.width > 0 ? rect.width / 2 : 10);
          var clientY = rect.top + (rect.height > 0 ? rect.height / 2 : 10);

          ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function(type) {
            var evt;
            try {
              evt = new PointerEvent(type, {
                bubbles: true,
                cancelable: true,
                isTrusted: true,
                view: window,
                clientX: clientX,
                clientY: clientY
              });
            } catch (err) {
              evt = new MouseEvent(type, {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: clientX,
                clientY: clientY
              });
            }
            el.dispatchEvent(evt);
          });
        } catch(e) {}
      }

      // Unified Pause Action: Pauses native video AND all known 3rd-party web players
      function doPause() {
        userWantsPaused = true;
        if (clickInterval) {
          clearInterval(clickInterval);
          clickInterval = null;
        }
        if (window.__QUETTA_RESUME_TIMER__) {
          clearInterval(window.__QUETTA_RESUME_TIMER__);
          window.__QUETTA_RESUME_TIMER__ = null;
        }

        // 1. Pause captured video & all video elements
        if (capturedVideo) {
          try { capturedVideo.pause(); } catch(e) {}
          isolateVideo(capturedVideo);
        }
        try {
          var vids = document.getElementsByTagName('video');
          for (var vi = 0; vi < vids.length; vi++) {
            try { vids[vi].pause(); } catch(e) {}
          }
        } catch(e) {}

        // 2. Command 3rd party video player engines explicitly to pause
        try {
          // PlayerJS (Odstream, StreamHide, VidHide, Desustream)
          if (window.playerjs && typeof window.playerjs.api === 'function') {
            try { window.playerjs.api('pause'); } catch(e) {}
          }
          if (window.pljssglobal && Array.isArray(window.pljssglobal)) {
            window.pljssglobal.forEach(function(p) {
              if (p && typeof p.api === 'function') try { p.api('pause'); } catch(e) {}
            });
          }

          // JWPlayer (VidHide, Earnvids, Doodstream)
          if (window.jwplayer && typeof window.jwplayer === 'function') {
            try {
              var jw = window.jwplayer();
              if (!jw || typeof jw.pause !== 'function') {
                jw = (typeof window.jwplayer === 'function' && window.jwplayer(0)) || 
                     (typeof window.jwplayer === 'function' && window.jwplayer('vplayer')) || 
                     (typeof window.jwplayer === 'function' && window.jwplayer('player'));
              }
              if (jw && typeof jw.pause === 'function') jw.pause();
            } catch(e) {}
          }

          // Video.js
          if (window.videojs && typeof window.videojs.getAllPlayers === 'function') {
            try {
              var allP = window.videojs.getAllPlayers();
              for (var pi = 0; pi < allP.length; pi++) {
                if (allP[pi] && typeof allP[pi].pause === 'function') allP[pi].pause();
              }
            } catch(e) {}
          }

          // Mega.nz Player
          if (window.megaPlayer && typeof window.megaPlayer.pause === 'function') {
            try { window.megaPlayer.pause(); } catch(e) {}
          }
        } catch(e) {}

        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'playstate', isPlaying: false }));
        } catch(e) {}
      }

      // Unified Play Action: Resumes native video AND all known 3rd-party web players
      function doPlay() {
        userWantsPaused = false;
        hasStartedPlayback = true;
        if (clickInterval) {
          clearInterval(clickInterval);
          clickInterval = null;
        }

        if (capturedVideo) {
          capturedVideo.play().then(function() {
            isolateVideo(capturedVideo);
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'playstate', isPlaying: true }));
            if (!window.__QUETTA_INITIAL_RESUMED__ && ${ctxTime} > 2) {
              try {
                if (typeof capturedVideo.fastSeek === 'function') {
                  capturedVideo.fastSeek(${ctxTime});
                } else {
                  capturedVideo.currentTime = ${ctxTime};
                }
              } catch(e) {}
              triggerMegaSeek(${ctxTime});
            }
          }).catch(function(){});
        }

        // Also trigger 3rd party engines
        try {
          if (window.playerjs && typeof window.playerjs.api === 'function') {
            try { window.playerjs.api('play'); } catch(e) {}
          }
          if (window.pljssglobal && Array.isArray(window.pljssglobal)) {
            window.pljssglobal.forEach(function(p) {
              if (p && typeof p.api === 'function') try { p.api('play'); } catch(e) {}
            });
          }
          if (window.jwplayer && typeof window.jwplayer === 'function') {
            try {
              var jw = window.jwplayer();
              if (!jw || typeof jw.play !== 'function') {
                jw = (typeof window.jwplayer === 'function' && window.jwplayer(0)) || 
                     (typeof window.jwplayer === 'function' && window.jwplayer('vplayer')) || 
                     (typeof window.jwplayer === 'function' && window.jwplayer('player'));
              }
              if (jw && typeof jw.play === 'function') jw.play();
            } catch(e) {}
          }
          if (window.videojs && typeof window.videojs.getAllPlayers === 'function') {
            try {
              var allP = window.videojs.getAllPlayers();
              for (var pj = 0; pj < allP.length; pj++) {
                if (allP[pj] && typeof allP[pj].play === 'function') allP[pj].play();
              }
            } catch(e) {}
          }
          if (window.megaPlayer && typeof window.megaPlayer.play === 'function') {
            try { window.megaPlayer.play(); } catch(e) {}
          }
        } catch(e) {}
      }

      // 2. Direct command executor
      window.__QUETTA_EXEC__ = function(action, val) {
        if (action === 'SEEK') {
          // Manual user seek: cancel initial resume permanently
          window.__QUETTA_INITIAL_RESUMED__ = true;
          if (window.__QUETTA_RESUME_TIMER__) {
            clearInterval(window.__QUETTA_RESUME_TIMER__);
            window.__QUETTA_RESUME_TIMER__ = null;
          }
        }

        if (clickInterval) {
          clearInterval(clickInterval); // Stop auto-clicker immediately on any manual user command
          clickInterval = null;
        }

        if (!capturedVideo) {
          var vids = document.getElementsByTagName('video');
          if (vids.length > 0) setupVideo(vids[0]);
        }

        if (action === 'PLAY') {
          doPlay();
          return;
        } else if (action === 'PAUSE') {
          doPause();
          return;
        } else if (action === 'TOGGLE') {
          if (userWantsPaused || (capturedVideo && capturedVideo.paused)) {
            doPlay();
          } else {
            doPause();
          }
          return;
        } else if (action === 'SEEK' && typeof val === 'number') {
          window.__QUETTA_INITIAL_RESUMED__ = true;
          if (window.__QUETTA_RESUME_TIMER__) {
            clearInterval(window.__QUETTA_RESUME_TIMER__);
            window.__QUETTA_RESUME_TIMER__ = null;
          }

          // 1. Native HTML5 video currentTime (always applied for MSE videostream and standard HTML5)
          if (capturedVideo) {
            try {
              if (typeof capturedVideo.fastSeek === 'function') {
                capturedVideo.fastSeek(val);
              } else {
                capturedVideo.currentTime = val;
              }
            } catch(e) {}
            isolateVideo(capturedVideo);
          }

          // 2. JWPlayer seek API (Vidhide / Earnvids native engine)
          try {
            if (window.jwplayer && typeof window.jwplayer === 'function') {
              var jw = window.jwplayer();
              if (!jw || typeof jw.seek !== 'function') {
                jw = (typeof window.jwplayer === 'function' && window.jwplayer(0)) || 
                     (typeof window.jwplayer === 'function' && window.jwplayer('vplayer')) || 
                     (typeof window.jwplayer === 'function' && window.jwplayer('player'));
              }
              if (jw && typeof jw.seek === 'function') {
                jw.seek(val);
              }
            }
          } catch(e) {}

          // 3. Video.js seek API
          try {
            if (window.videojs && typeof window.videojs.getAllPlayers === 'function') {
              var allP = window.videojs.getAllPlayers();
              for (var si = 0; si < allP.length; si++) {
                if (allP[si] && typeof allP[si].currentTime === 'function') {
                  allP[si].currentTime(val);
                }
              }
            }
          } catch(e) {}

          // 4. PlayerJS API
          try {
            if (window.playerjs && typeof window.playerjs.api === 'function') {
              window.playerjs.api('seek', val);
            }
            if (window.pljssglobal && Array.isArray(window.pljssglobal)) {
              window.pljssglobal.forEach(function(p) {
                if (p && typeof p.api === 'function') try { p.api('seek', val); } catch(e) {}
              });
            }
          } catch(e) {}

          // 5. Timeline simulated click for Mega MKV
          triggerMegaSeek(val);
          return;
        } else if (action === 'SPEED' && typeof val === 'number') {
          try {
            window.__QUETTA_SPEED__ = val;
            if (capturedVideo) {
              capturedVideo.playbackRate = val;
            }
            var allVids = document.getElementsByTagName('video');
            for (var vi = 0; vi < allVids.length; vi++) {
              allVids[vi].playbackRate = val;
            }
            if (window.jwplayer && typeof window.jwplayer === 'function') {
              var jwSpeed = window.jwplayer();
              if (!jwSpeed || typeof jwSpeed.setPlaybackRate !== 'function') {
                jwSpeed = (typeof window.jwplayer === 'function' && window.jwplayer(0)) || 
                          (typeof window.jwplayer === 'function' && window.jwplayer('vplayer')) || 
                          (typeof window.jwplayer === 'function' && window.jwplayer('player'));
              }
              if (jwSpeed && typeof jwSpeed.setPlaybackRate === 'function') jwSpeed.setPlaybackRate(val);
            }
            if (window.videojs && typeof window.videojs.getAllPlayers === 'function') {
              var allVjs = window.videojs.getAllPlayers();
              for (var vj = 0; vj < allVjs.length; vj++) {
                if (allVjs[vj] && typeof allVjs[vj].playbackRate === 'function') allVjs[vj].playbackRate(val);
              }
            }
          } catch(e) {}
          return;
        } else if (action === 'ASPECT_RATIO' && typeof val === 'string') {
          try {
            window.__QUETTA_ASPECT_RATIO__ = val;
            var styleEl = document.getElementById('__quetta_aspect_style__');
            if (!styleEl) {
              styleEl = document.createElement('style');
              styleEl.id = '__quetta_aspect_style__';
              (document.head || document.documentElement).appendChild(styleEl);
            }
            styleEl.innerHTML = 'video { object-fit: ' + val + ' !important; }';
            if (capturedVideo) {
              capturedVideo.style.setProperty('object-fit', val, 'important');
            }
          } catch(e) {}
          return;
        }
      };

      function triggerMegaPlay() {
        if (!window.location.hostname.includes('mega.nz')) return;
        try {
          var mBtns = document.querySelectorAll('button.play-button, button.viewer-play-button, .video-play-btn, .video-play-button, button[class*="play"], .viewer-video-container button, .play-button, .play-btn');
          for (var mi = 0; mi < mBtns.length; mi++) {
            var mb = mBtns[mi];
            try { mb.style.setProperty('pointer-events', 'auto', 'important'); } catch(e) {}
            try { mb.click(); } catch(e) {}
            triggerClick(mb);
          }
        } catch(e) {}
        try {
          if (window.megaPlayer && typeof window.megaPlayer.play === 'function') {
            window.megaPlayer.play();
          }
        } catch(e) {}
      }

      // 3. Background Auto-Clicker & Initializer
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
          isolateVideo(capturedVideo);
          return;
        }
        if (++clickAttempts > 50) {
          clearInterval(clickInterval);
          clickInterval = null;
          return;
        }

        triggerMegaPlay();
        if (userWantsPaused) return;

        // Trigger PlayerJS / JWPlayer / VideoJS APIs directly
        try {
          if (window.playerjs && typeof window.playerjs.api === 'function') {
            window.playerjs.api('play');
          }
          if (window.pljssglobal && Array.isArray(window.pljssglobal)) {
            window.pljssglobal.forEach(function(p) {
              if (p && typeof p.api === 'function') {
                try { p.api('play'); } catch(e) {}
              }
            });
          }
          if (window.jwplayer && typeof window.jwplayer === 'function') {
            try { var jw = window.jwplayer(); if (jw && typeof jw.play === 'function') jw.play(); } catch(e) {}
          }
          if (window.videojs && typeof window.videojs.getAllPlayers === 'function') {
            try { var vjsList = window.videojs.getAllPlayers(); if (vjsList && vjsList[0] && typeof vjsList[0].play === 'function') vjsList[0].play(); } catch(e) {}
          }
        } catch(e) {}

        var selectors = [
          'div.play-video-button',
          '#playerjs',
          '#playerjs_start',
          '[id^="pjs_"]',
          '.vjs-big-play-button',
          '.jw-icon-display',
          '.jw-display-icon-container',
          '.jw-preview',
          '#play-button',
          '.play-button',
          '.play-btn',
          '.player-poster',
          '.viewer-play-button',
          '.video-play-btn',
          '.video-play-button',
          'button.play-button',
          'button[class*="play"]',
          '[data-symbol="play"]',
          '.click-to-play'
        ];
        for (var s = 0; s < selectors.length; s++) {
          var btn = document.querySelector(selectors[s]);
          if (btn) {
            triggerClick(btn);
            break;
          }
        }

        // Only try initial play if playback has not started and user has not asked to pause
        if (!userWantsPaused && !hasStartedPlayback) {
          try {
            var vids = document.getElementsByTagName('video');
            for (var v = 0; v < vids.length; v++) {
              setupVideo(vids[v]);
              if (vids[v].paused) {
                try { vids[v].play().catch(function(){}); } catch(e) {}
              }
            }
          } catch(e) {}
        }
      }, 350);

      // Mega Quota Watcher: Detects IP bandwidth limit dialog from Mega.nz ONLY on Mega domains
      function checkMegaQuota() {
        try {
          if (!window.location.hostname.includes('mega.nz')) return;
          if (document.body && !window.__megaQuotaNotified) {
            var quotaEl = document.querySelector('.transfer-quota-dialog, [class*="transfer-quota" i], [class*="quota-exceeded" i]');
            var bodyText = (document.body.innerText || '').toLowerCase();
            if (quotaEl || bodyText.indexOf('transfer quota exceeded') !== -1 || bodyText.indexOf('transfer allowance for your ip') !== -1) {
              window.__megaQuotaNotified = true;
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'quota_exceeded',
                provider: 'mega',
                message: 'Batas kuota transfer Mega telah habis untuk IP ini. Silakan pilih server/resolusi lain.'
              }));
            }
          }
        } catch(e) {}
      }

      // 4. Scanning interval fallback
      var checkInterval = setInterval(function() {
        checkMegaQuota();
        var videos = document.getElementsByTagName('video');
        for (var i = 0; i < videos.length; i++) {
          setupVideo(videos[i]);
          isolateVideo(videos[i]);
          if (videos[i].controls) {
            videos[i].controls = false;
            videos[i].removeAttribute('controls');
          }
        }
        if (capturedVideo) {
          isolateVideo(capturedVideo);
          if (capturedVideo.error) {
            reportMediaError('Video playback error');
          }
        }
      }, 1000);

      // 5. Continuous DOM Mutation Observer to re-isolate dynamically rendered controls
      try {
        var domObserver = new MutationObserver(function() {
          applyHideStyle();
          checkMegaQuota();
          if (capturedVideo) {
            isolateVideo(capturedVideo);
          }
        });
        domObserver.observe(document.documentElement || document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'style', 'id']
        });
      } catch(e) {}

      // 6. Intelligent Stall & Freeze Watchdog (Fast & Sensitive Lag Detection)
      var lastPlayTime = -1;
      var stallTicks = 0;
      var isWatchdogBuffering = false;
      setInterval(function() {
        if (!capturedVideo) return;
        if (!capturedVideo.paused && !capturedVideo.ended && !capturedVideo.seeking && !userWantsPaused) {
          var ct = capturedVideo.currentTime;
          // If video is supposed to play but currentTime is completely frozen for >= 1.2s
          if (ct === lastPlayTime) {
            stallTicks++;
            if (stallTicks >= 2) {
              if (!isWatchdogBuffering) {
                isWatchdogBuffering = true;
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'buffering', isBuffering: true }));
              }
              // Attempt gentle unstick if stalled for > 3s
              if (stallTicks >= 5) {
                capturedVideo.play().catch(function(){});
              }
            }
          } else {
            stallTicks = 0;
            lastPlayTime = ct;
            if (isWatchdogBuffering) {
              isWatchdogBuffering = false;
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'buffering', isBuffering: false }));
            }
          }
        } else {
          stallTicks = 0;
        }
      }, 600);
    })();
    true;
  `;
}
