/**
 * Quetta Media Hijacking Injected Script Generator for Android TV
 *
 * Mengisolasi iframe pihak ketiga (JWPlayer, VideoJS, PlayerJS, Mega, VidHide, dll.)
 * dan menjembatani remote control D-Pad & telemetri ke React Native overlay pada Android TV.
 */

export interface QuettaScriptOptions {
  startTime?: number;
  totalDuration?: number;
}

export function buildQuettaInjectedScript(options: QuettaScriptOptions = {}): string {
  const ctxTime = options.startTime || 0;
  const fallbackMetaDuration = options.totalDuration || 0;

  return `
    (function() {
      if (window.__QUETTA_INITIALIZED__) return;
      window.__QUETTA_INITIALIZED__ = true;

      try {
        var meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=100%, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.head.appendChild(meta);
      } catch(e) {}

      var isVidhideHost = (window.location.href.indexOf('vidhide') !== -1 || window.location.href.indexOf('earnvids') !== -1);

      var hideStyleContent = [
        'html, body { width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: #000 !important; }',
        'video { width: 100% !important; height: 100% !important; max-height: 100% !important; max-width: 100% !important; object-fit: contain !important; border: none !important; }',
        'video ~ div:not([class*="play"]):not([id*="play"]):not([class*="viewer"]):not([class*="video"]):not([class*="timeline"]) { display: none !important; opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; }',
        'video::-webkit-media-controls, video::-webkit-media-controls-enclosure, video::-webkit-media-controls-panel, video::-webkit-media-controls-play-button, video::-webkit-media-controls-start-playback-button, video::-webkit-media-controls-clear-button, video::-webkit-media-controls-timeline, video::-webkit-media-controls-current-time-display, video::-webkit-media-controls-time-remaining-display, video::-webkit-media-controls-fullscreen-button, video::-webkit-media-controls-volume-slider, video::-webkit-media-controls-overlay-play-button { display: none !important; opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; -webkit-appearance: none !important; }',
        '[id^="pjs_"]:not(video), [id^="player_control_"], [id*="pjs_toolbar"], [id*="pjs_timeline"], .pjs_controls, .pjs_toolbar, .pjs-control, .pjs_play, .pjs_pause { display: none !important; opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; }',
        '.viewer-top-bar, .viewer-header, .video-top-bar, [class*="viewer-top"], [class*="video-top"], [class*="top-bar"], [class*="file-info"], [class*="file-name"], [class*="viewer-file"], [class*="mega-logo"], [class*="viewer-logo"], [class*="share-button"], [class*="share-icon"], [class*="btn-share"] { display: none !important; opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; }',
        '.viewer-video-controls, .viewer-bottom-bar, .video-bottom-controls, .mega-video-controls, .mega-controls, [class*="viewer-bottom"], [class*="video-bottom"], [class*="video-control"], .video-timeline, .video-progress-bar, [class*="video-timeline"], [class*="progress-bar"], .viewer-video-time, .video-time, .video-duration, [class*="duration"] { opacity: 0 !important; pointer-events: none !important; z-index: -10 !important; }',
        'div.play-video-button, .play-video-button, .viewer-play-button, .video-play-btn, .video-play-button, [class*="play-video"], button[class*="play"] { opacity: 0.001 !important; pointer-events: auto !important; z-index: 9999 !important; }',
        '.jw-controls, .jw-controlbar, .jw-controls-backdrop, .jw-display-icon-container, .jw-dock, .jw-overlays, .jw-preview, .vjs-control-bar, .vjs-big-play-button, .vjs-loading-spinner, .vjs-modal-dialog, .vjs-text-track-display, .vjs-poster, .art-controls, .art-bottom, .art-mask, .dplayer-controller, .dplayer-controller-mask, .plyr__controls, .video-player-controls, .bottom-control-bar, .controls-overlay, [class*="control-bar" i], [class*="controls-bar" i], [class*="bottom-controls" i], [class*="player-controls" i], [class*="vjs-control" i], [class*="pause-overlay" i], [class*="paused-overlay" i], [class*="pause_overlay" i] { display: none !important; opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; }',
        '.drive-viewer-toolstrip, .drive-viewer-popout-button, .drive-viewer-title, [class*="drive-viewer-toolstrip"], .ytp-chrome-top, .ytp-show-cards-title, .ytp-gradient-top { display: none !important; opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; }'
      ];

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
        } catch(e) {}
      }

      var capturedVideo = null;
      var userWantsPaused = false;
      var hasStartedPlayback = false;
      var fallbackMetaDuration = ${fallbackMetaDuration};
      window.__QUETTA_INITIAL_RESUMED__ = false;

      function detectDuration() {
        if (fallbackMetaDuration > 0) {
          if (capturedVideo && capturedVideo.duration && isFinite(capturedVideo.duration) && capturedVideo.duration >= fallbackMetaDuration * 0.8) {
            return capturedVideo.duration;
          }
          return fallbackMetaDuration;
        }
        if (capturedVideo && capturedVideo.duration && isFinite(capturedVideo.duration) && capturedVideo.duration > 0) return capturedVideo.duration;
        return 0;
      }

      function setupVideo(v) {
        if (!v || v.__quettaBound) return;
        v.__quettaBound = true;
        capturedVideo = v;
        v.controls = false;
        v.removeAttribute('controls');
        v.playsInline = true;
        v.preload = 'auto';
        isolateVideo(v);

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
          var dur = detectDuration();
          if (!v.dataset.quettaReady) {
            v.dataset.quettaReady = 'true';
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
          var dur = detectDuration();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'timeupdate',
            currentTime: e.target.currentTime,
            duration: dur,
            buffered: getBufferedEnd()
          }));
        });
        v.addEventListener('play', function() {
          userWantsPaused = false;
          isolateVideo(v);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'playstate', isPlaying: true }));
        });
        v.addEventListener('playing', function() {
          hasStartedPlayback = true;
          userWantsPaused = false;
          isolateVideo(v);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'playstate', isPlaying: true }));
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'buffering', isBuffering: false }));
        });
        v.addEventListener('pause', function() {
          isolateVideo(v);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'playstate', isPlaying: false }));
        });
        v.addEventListener('waiting', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'buffering', isBuffering: true }));
        });

        // Resume initial time
        var ctxTime = ${ctxTime};
        if (ctxTime > 2) {
          try {
            v.currentTime = ctxTime;
          } catch(e) {}
        }
      }

      window.__QUETTA_EXEC__ = function(action, val) {
        if (!capturedVideo) {
          var vids = document.getElementsByTagName('video');
          if (vids.length > 0) setupVideo(vids[0]);
        }

        if (capturedVideo) {
          isolateVideo(capturedVideo);
          if (action === 'PLAY') {
            userWantsPaused = false;
            capturedVideo.play().catch(function(){});
          } else if (action === 'PAUSE') {
            userWantsPaused = true;
            capturedVideo.pause();
          } else if (action === 'TOGGLE') {
            if (capturedVideo.paused) {
              userWantsPaused = false;
              capturedVideo.play().catch(function(){});
            } else {
              userWantsPaused = true;
              capturedVideo.pause();
            }
          } else if (action === 'SEEK' && typeof val === 'number') {
            try {
              capturedVideo.currentTime = val;
            } catch(e) {}
          }
        }
      };

      setInterval(function() {
        var videos = document.getElementsByTagName('video');
        for (var i = 0; i < videos.length; i++) {
          setupVideo(videos[i]);
          isolateVideo(videos[i]);
        }
      }, 1000);
    })();
    true;
  `;
}

