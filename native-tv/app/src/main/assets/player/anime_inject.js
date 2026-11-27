(function() {
  if (window.__QUETTA_INITIALIZED__) return;
  window.__QUETTA_INITIALIZED__ = true;

  var ctxTime = typeof window.__KUZEN_START_TIME__ === 'number' ? window.__KUZEN_START_TIME__ : 0;
  var fallbackMetaDuration = typeof window.__KUZEN_TOTAL_DURATION__ === 'number' ? window.__KUZEN_TOTAL_DURATION__ : 0;

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

  function postMsg(obj) {
    try {
      if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
        window.ReactNativeWebView.postMessage(JSON.stringify(obj));
      }
    } catch(e) {}
  }

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

      var displayNoneSelectors = [
        '.viewer-top-bar', '.viewer-header', '.video-top-bar', '[class*="viewer-top"]',
        '[class*="video-top"]', '[class*="top-bar"]', '[class*="file-info"]', '[class*="file-name"]',
        '[class*="viewer-file"]', '[class*="mega-logo"]', '[class*="viewer-logo"]',
        '[class*="share-button"]', '[class*="share-icon"]', '[id^="pjs_"]:not(video)',
        '.pjs_controls', '.pjs_toolbar', '.pjs-control', '.pjs_pause', '.pjs_play',
        '.jw-controls', '.vjs-control-bar', '.vjs-big-play-button'
      ];
      var nodes = document.querySelectorAll(displayNoneSelectors.join(','));
      for (var j = 0; j < nodes.length; j++) {
        nodes[j].style.setProperty('display', 'none', 'important');
        nodes[j].style.setProperty('opacity', '0', 'important');
        nodes[j].style.setProperty('pointer-events', 'none', 'important');
        nodes[j].style.setProperty('visibility', 'hidden', 'important');
      }

      var preserveLayoutSelectors = [
        '.viewer-video-controls', '.viewer-bottom-bar', '.video-bottom-controls',
        '.mega-video-controls', '.mega-controls', '[class*="viewer-bottom"]',
        '[class*="video-bottom"]', '[class*="video-control"]', '.video-timeline',
        '.video-progress-bar', '[class*="video-timeline"]', '[class*="progress-bar"]'
      ];
      var layoutNodes = document.querySelectorAll(preserveLayoutSelectors.join(','));
      for (var k = 0; k < layoutNodes.length; k++) {
        layoutNodes[k].style.setProperty('opacity', '0', 'important');
        layoutNodes[k].style.setProperty('pointer-events', 'none', 'important');
        layoutNodes[k].style.setProperty('z-index', '-10', 'important');
      }
    } catch(e) {}
  }

  try {
    function tuneHls() {
      if (window.Hls && window.Hls.DefaultConfig) {
        window.Hls.DefaultConfig.maxBufferLength = 60;
        window.Hls.DefaultConfig.maxMaxBufferLength = 180;
        window.Hls.DefaultConfig.maxBufferSize = 120 * 1024 * 1024;
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
  } catch(e) {}

  var capturedVideo = null;
  window.__QUETTA_USER_WANTS_PAUSED__ = false;
  window.__quetta_allow_pause__ = false;
  var userWantsPaused = false;
  var hasStartedPlayback = false;
  window.__QUETTA_INITIAL_RESUMED__ = false;
  window.__QUETTA_RESUME_TIMER__ = null;

  try {
    if (!window.__quetta_play_guard_installed__) {
      window.__quetta_play_guard_installed__ = true;
      var origMediaPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function() {
        if (window.__QUETTA_USER_WANTS_PAUSED__) {
          return Promise.reject(new Error('Playback paused by user'));
        }
        return origMediaPlay.apply(this, arguments);
      };
    }
  } catch(e) {}

  try {
    if (!window.__quetta_pause_guard_installed__) {
      window.__quetta_pause_guard_installed__ = true;
      var origMediaPause = HTMLMediaElement.prototype.pause;
      HTMLMediaElement.prototype.pause = function() {
        if (!window.__QUETTA_USER_WANTS_PAUSED__ && hasStartedPlayback && !window.__quetta_allow_pause__) {
          return;
        }
        return origMediaPause.apply(this, arguments);
      };
    }
  } catch(e) {}

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

  setTimeout(function() {
    window.__QUETTA_INITIAL_RESUMED__ = true;
    if (window.__QUETTA_RESUME_TIMER__) {
      clearInterval(window.__QUETTA_RESUME_TIMER__);
      window.__QUETTA_RESUME_TIMER__ = null;
    }
  }, 12000);

  function detectDuration() {
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
          jw = window.jwplayer(0) || window.jwplayer('vplayer') || window.jwplayer('player');
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
          var parts = match[match.length - 1].split(':').map(Number);
          var secs = parts.length === 2 ? parts[0] * 60 + parts[1] : parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : 0;
          if (secs > 0) return secs;
        }
      }
    } catch(e) {}
    return fallbackMetaDuration > 0 ? fallbackMetaDuration : 0;
  }

  function triggerMegaSeek(targetTime) {
    if (!capturedVideo) return false;
    var dur = detectDuration();
    if (dur <= 0) return false;
    try { if (window.videoPlayer && typeof window.videoPlayer.seek === 'function') window.videoPlayer.seek(targetTime); } catch(e) {}
    try { if (window.mPlayer && typeof window.mPlayer.seek === 'function') window.mPlayer.seek(targetTime); } catch(e) {}
    try { if (window.player && typeof window.player.seek === 'function') window.player.seek(targetTime); } catch(e) {}

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
          timeline.dispatchEvent(new MouseEvent(evtType, {
            bubbles: true, cancelable: true, clientX: targetX, clientY: targetY, pageX: targetX, pageY: targetY, view: window
          }));
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

    if (!v.__quetta_instance_play_guarded__) {
      v.__quetta_instance_play_guarded__ = true;
      var origVPlay = v.play;
      v.play = function() {
        if (window.__QUETTA_USER_WANTS_PAUSED__) return Promise.reject(new Error('Playback paused by user'));
        return origVPlay.apply(this, arguments);
      };
    }

    if (!v.__quetta_instance_pause_guarded__) {
      v.__quetta_instance_pause_guarded__ = true;
      var origVPause = v.pause;
      v.pause = function() {
        if (!window.__QUETTA_USER_WANTS_PAUSED__ && hasStartedPlayback && !window.__quetta_allow_pause__) return;
        return origVPause.apply(this, arguments);
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
        if (v.buffered.start(i) <= ct && ct <= v.buffered.end(i)) return v.buffered.end(i);
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
        postMsg({ type: 'video_ready', duration: dur, videoWidth: v.videoWidth || 0, videoHeight: v.videoHeight || 0, isPlaying: !v.paused });
      }
    }
    sendReady();
    v.addEventListener('loadedmetadata', sendReady);
    v.addEventListener('canplay', sendReady);
    v.addEventListener('canplaythrough', sendReady);
    v.addEventListener('durationchange', sendReady);
    v.addEventListener('timeupdate', sendReady);

    postMsg({ type: 'playstate', isPlaying: !v.paused });

    v.addEventListener('progress', function() {
      postMsg({ type: 'progress', buffered: getBufferedEnd() });
    });
    v.addEventListener('timeupdate', function(e) {
      isolateVideo(e.target);
      postMsg({ type: 'timeupdate', currentTime: e.target.currentTime, duration: detectDuration(), buffered: getBufferedEnd() });
    });
    v.addEventListener('play', function() {
      if (window.__QUETTA_USER_WANTS_PAUSED__) {
        window.__quetta_allow_pause__ = true;
        try { v.pause(); } catch(e) {}
        window.__quetta_allow_pause__ = false;
        return;
      }
      isolateVideo(v);
      postMsg({ type: 'playstate', isPlaying: true });
    });
    v.addEventListener('playing', function() {
      if (window.__QUETTA_USER_WANTS_PAUSED__) {
        window.__quetta_allow_pause__ = true;
        try { v.pause(); } catch(e) {}
        window.__quetta_allow_pause__ = false;
        return;
      }
      hasStartedPlayback = true;
      if (clickInterval) { clearInterval(clickInterval); clickInterval = null; }
      isolateVideo(v);
      postMsg({ type: 'playstate', isPlaying: true });
      postMsg({ type: 'buffering', isBuffering: false });
    });
    v.addEventListener('pause', function() {
      if (!window.__QUETTA_USER_WANTS_PAUSED__ && hasStartedPlayback && !window.__quetta_allow_pause__) {
        try { v.play().catch(function(){}); } catch(e) {}
        return;
      }
      isolateVideo(v);
      postMsg({ type: 'playstate', isPlaying: false });
    });
    v.addEventListener('ended', function() {
      window.__QUETTA_USER_WANTS_PAUSED__ = true;
      window.__quetta_allow_pause__ = true;
      try { v.pause(); } catch(e) {}
      window.__quetta_allow_pause__ = false;
      isolateVideo(v);
      postMsg({ type: 'playstate', isPlaying: false });
      postMsg({ type: 'ended' });
    });
    v.addEventListener('waiting', function() { postMsg({ type: 'buffering', isBuffering: true }); });
    v.addEventListener('stalled', function() { postMsg({ type: 'buffering', isBuffering: true }); });
    v.addEventListener('seeking', function() { postMsg({ type: 'buffering', isBuffering: true }); });
    v.addEventListener('canplay', function() { if (!v.paused) postMsg({ type: 'buffering', isBuffering: false }); });
    v.addEventListener('canplaythrough', function() { if (!v.paused) postMsg({ type: 'buffering', isBuffering: false }); });
    v.addEventListener('error', function() { postMsg({ type: 'media_error', message: 'Video failed to load' }); }, true);
    v.addEventListener('seeked', function() {
      isolateVideo(v);
      postMsg({ type: 'seeked', currentTime: v.currentTime });
      postMsg({ type: 'buffering', isBuffering: false });
    });

    var resumeRetryCount = 0;
    function applyResumeTime() {
      if (window.__QUETTA_INITIAL_RESUMED__ || ctxTime <= 2 || !v) return;
      triggerMegaSeek(ctxTime);
      try {
        if (typeof v.fastSeek === 'function') v.fastSeek(ctxTime);
        else if (!v.duration || !isFinite(v.duration) || v.duration >= ctxTime) v.currentTime = ctxTime;
      } catch(e) {}
      try { if (window.playerjs && typeof window.playerjs.api === 'function') window.playerjs.api('seek', ctxTime); } catch(e) {}
      try { if (window.jwplayer && typeof window.jwplayer === 'function') { var jw = window.jwplayer(); if (jw && typeof jw.seek === 'function') jw.seek(ctxTime); } } catch(e) {}
      resumeRetryCount++;
      if (Math.abs(v.currentTime - ctxTime) < 3.5 || resumeRetryCount >= 25) {
        window.__QUETTA_INITIAL_RESUMED__ = true;
        if (window.__QUETTA_RESUME_TIMER__) { clearInterval(window.__QUETTA_RESUME_TIMER__); window.__QUETTA_RESUME_TIMER__ = null; }
      }
    }

    if (!window.__QUETTA_INITIAL_RESUMED__ && ctxTime > 2) {
      if (!window.__QUETTA_RESUME_TIMER__) {
        window.__QUETTA_RESUME_TIMER__ = setInterval(function() {
          if (window.__QUETTA_INITIAL_RESUMED__ || resumeRetryCount >= 25) {
            clearInterval(window.__QUETTA_RESUME_TIMER__);
            window.__QUETTA_RESUME_TIMER__ = null;
            return;
          }
          if (v.readyState >= 1 || v.currentTime > 0) applyResumeTime();
        }, 400);
      }
      v.addEventListener('canplay', applyResumeTime, { once: true });
      v.addEventListener('playing', applyResumeTime, { once: true });
    }
  }

  var existing = document.getElementsByTagName('video');
  for (var i = 0; i < existing.length; i++) setupVideo(existing[i]);

  function triggerClick(el) {
    if (!el) return;
    try {
      var rect = el.getBoundingClientRect();
      var clientX = rect.left + (rect.width > 0 ? rect.width / 2 : 10);
      var clientY = rect.top + (rect.height > 0 ? rect.height / 2 : 10);
      ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function(type) {
        var evt;
        try {
          evt = new PointerEvent(type, { bubbles: true, cancelable: true, view: window, clientX: clientX, clientY: clientY });
        } catch(err) {
          evt = new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: clientX, clientY: clientY });
        }
        el.dispatchEvent(evt);
      });
    } catch(e) {}
  }

  function doPause() {
    window.__QUETTA_USER_WANTS_PAUSED__ = true;
    window.__quetta_allow_pause__ = true;
    userWantsPaused = true;
    if (clickInterval) { clearInterval(clickInterval); clickInterval = null; }
    if (window.__QUETTA_RESUME_TIMER__) { clearInterval(window.__QUETTA_RESUME_TIMER__); window.__QUETTA_RESUME_TIMER__ = null; }
    if (capturedVideo) { try { capturedVideo.pause(); } catch(e) {} isolateVideo(capturedVideo); }
    try {
      var vids = document.getElementsByTagName('video');
      for (var vi = 0; vi < vids.length; vi++) { try { vids[vi].pause(); } catch(e) {} }
    } catch(e) {}
    try {
      if (window.playerjs && typeof window.playerjs.api === 'function') window.playerjs.api('pause');
      if (window.pljssglobal && Array.isArray(window.pljssglobal)) {
        window.pljssglobal.forEach(function(p) { if (p && typeof p.api === 'function') try { p.api('pause'); } catch(e) {} });
      }
      if (window.jwplayer && typeof window.jwplayer === 'function') {
        var jw = window.jwplayer();
        if (jw && typeof jw.pause === 'function') jw.pause();
      }
      if (window.videojs && typeof window.videojs.getAllPlayers === 'function') {
        var allP = window.videojs.getAllPlayers();
        for (var pi = 0; pi < allP.length; pi++) { if (allP[pi] && typeof allP[pi].pause === 'function') allP[pi].pause(); }
      }
      if (window.megaPlayer && typeof window.megaPlayer.pause === 'function') window.megaPlayer.pause();
    } catch(e) {}
    window.__quetta_allow_pause__ = false;
    postMsg({ type: 'playstate', isPlaying: false });
  }

  function doPlay() {
    window.__QUETTA_USER_WANTS_PAUSED__ = false;
    window.__quetta_allow_pause__ = false;
    userWantsPaused = false;
    hasStartedPlayback = true;
    if (clickInterval) { clearInterval(clickInterval); clickInterval = null; }
    if (capturedVideo) {
      try {
        capturedVideo.play().then(function() {
          isolateVideo(capturedVideo);
          postMsg({ type: 'playstate', isPlaying: true });
        }).catch(function() {});
      } catch(e) {}
    }
    try {
      if (window.playerjs && typeof window.playerjs.api === 'function') window.playerjs.api('play');
      if (window.pljssglobal && Array.isArray(window.pljssglobal)) {
        window.pljssglobal.forEach(function(p) { if (p && typeof p.api === 'function') try { p.api('play'); } catch(e) {} });
      }
      if (window.jwplayer && typeof window.jwplayer === 'function') {
        var jw = window.jwplayer();
        if (jw && typeof jw.play === 'function') jw.play();
      }
      if (window.videojs && typeof window.videojs.getAllPlayers === 'function') {
        var allP = window.videojs.getAllPlayers();
        for (var pj = 0; pj < allP.length; pj++) { if (allP[pj] && typeof allP[pj].play === 'function') allP[pj].play(); }
      }
      if (window.megaPlayer && typeof window.megaPlayer.play === 'function') window.megaPlayer.play();
    } catch(e) {}
  }

  window.__QUETTA_EXEC__ = function(action, val) {
    if (action === 'SEEK') {
      window.__QUETTA_INITIAL_RESUMED__ = true;
      if (window.__QUETTA_RESUME_TIMER__) { clearInterval(window.__QUETTA_RESUME_TIMER__); window.__QUETTA_RESUME_TIMER__ = null; }
    }
    if (clickInterval) { clearInterval(clickInterval); clickInterval = null; }
    if (!capturedVideo) {
      var vids = document.getElementsByTagName('video');
      if (vids.length > 0) setupVideo(vids[0]);
    }
    if (action === 'PLAY') {
      doPlay();
    } else if (action === 'PAUSE') {
      doPause();
    } else if (action === 'TOGGLE') {
      if (window.__QUETTA_USER_WANTS_PAUSED__ || (capturedVideo && capturedVideo.paused)) doPlay();
      else doPause();
    } else if (action === 'SEEK' && typeof val === 'number') {
      if (capturedVideo) {
        try {
          if (typeof capturedVideo.fastSeek === 'function') capturedVideo.fastSeek(val);
          else capturedVideo.currentTime = val;
        } catch(e) {}
        isolateVideo(capturedVideo);
      }
      try { if (window.jwplayer && typeof window.jwplayer === 'function') { var jw = window.jwplayer(); if (jw && typeof jw.seek === 'function') jw.seek(val); } } catch(e) {}
      try { if (window.playerjs && typeof window.playerjs.api === 'function') window.playerjs.api('seek', val); } catch(e) {}
      triggerMegaSeek(val);
    } else if (action === 'SPEED' && typeof val === 'number') {
      window.__QUETTA_SPEED__ = val;
      try {
        if (capturedVideo) capturedVideo.playbackRate = val;
        var allVids = document.getElementsByTagName('video');
        for (var vi = 0; vi < allVids.length; vi++) allVids[vi].playbackRate = val;
      } catch(e) {}
    } else if (action === 'ASPECT_RATIO' && typeof val === 'string') {
      window.__QUETTA_ASPECT_RATIO__ = val;
      if (capturedVideo) capturedVideo.style.setProperty('object-fit', val, 'important');
    }
  };

  function triggerMegaPlay() {
    if (!window.location.hostname.includes('mega.nz')) return;
    try {
      var mBtns = document.querySelectorAll('button.play-button, button.viewer-play-button, .video-play-btn, .video-play-button, button[class*="play"], .viewer-video-container button, .play-button, .play-btn');
      for (var mi = 0; mi < mBtns.length; mi++) {
        try { mBtns[mi].style.setProperty('pointer-events', 'auto', 'important'); } catch(e) {}
        try { mBtns[mi].click(); } catch(e) {}
        triggerClick(mBtns[mi]);
      }
    } catch(e) {}
  }

  var clickAttempts = 0;
  var clickInterval = setInterval(function() {
    if (window.__QUETTA_USER_WANTS_PAUSED__ || hasStartedPlayback) {
      clearInterval(clickInterval); clickInterval = null; return;
    }
    if (capturedVideo && !capturedVideo.paused && capturedVideo.currentTime > 0) {
      hasStartedPlayback = true;
      clearInterval(clickInterval); clickInterval = null;
      isolateVideo(capturedVideo);
      return;
    }
    if (++clickAttempts > 50) { clearInterval(clickInterval); clickInterval = null; return; }
    triggerMegaPlay();
    if (window.__QUETTA_USER_WANTS_PAUSED__) return;
    try {
      if (window.playerjs && typeof window.playerjs.api === 'function') window.playerjs.api('play');
      if (window.jwplayer && typeof window.jwplayer === 'function') { var jw = window.jwplayer(); if (jw && typeof jw.play === 'function') jw.play(); }
      if (window.videojs && typeof window.videojs.getAllPlayers === 'function') { var vjs = window.videojs.getAllPlayers(); if (vjs && vjs[0] && typeof vjs[0].play === 'function') vjs[0].play(); }
    } catch(e) {}
    var selectors = [
      'div.play-video-button', '#playerjs', '#playerjs_start', '[id^="pjs_"]',
      '.vjs-big-play-button', '.jw-icon-display', '.jw-display-icon-container',
      '.jw-preview', '#play-button', '.play-button', '.play-btn', '.player-poster',
      '.viewer-play-button', '.video-play-btn', '.video-play-button', 'button[class*="play"]', '.click-to-play'
    ];
    for (var s = 0; s < selectors.length; s++) {
      var btn = document.querySelector(selectors[s]);
      if (btn) { triggerClick(btn); break; }
    }
    if (!window.__QUETTA_USER_WANTS_PAUSED__ && !hasStartedPlayback) {
      var vids = document.getElementsByTagName('video');
      for (var v = 0; v < vids.length; v++) {
        setupVideo(vids[v]);
        if (vids[v].paused) { try { vids[v].play().catch(function(){}); } catch(e) {} }
      }
    }
  }, 350);

  setInterval(function() {
    var videos = document.getElementsByTagName('video');
    for (var i = 0; i < videos.length; i++) {
      setupVideo(videos[i]);
      isolateVideo(videos[i]);
      if (videos[i].controls) { videos[i].controls = false; videos[i].removeAttribute('controls'); }
    }
    if (capturedVideo) isolateVideo(capturedVideo);
  }, 1000);

  try {
    var domObserver = new MutationObserver(function() {
      applyHideStyle();
      if (capturedVideo) isolateVideo(capturedVideo);
    });
    domObserver.observe(document.documentElement || document.body, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'id']
    });
  } catch(e) {}

  var lastPlayTime = -1;
  var stallTicks = 0;
  var isWatchdogBuffering = false;
  setInterval(function() {
    if (!capturedVideo) return;
    if (!capturedVideo.paused && !capturedVideo.ended && !capturedVideo.seeking && !window.__QUETTA_USER_WANTS_PAUSED__) {
      var ct = capturedVideo.currentTime;
      if (ct === lastPlayTime) {
        stallTicks++;
        if (stallTicks >= 2 && !isWatchdogBuffering) {
          isWatchdogBuffering = true;
          postMsg({ type: 'buffering', isBuffering: true });
        }
        if (stallTicks >= 5) capturedVideo.play().catch(function(){});
      } else {
        stallTicks = 0;
        lastPlayTime = ct;
        if (isWatchdogBuffering) {
          isWatchdogBuffering = false;
          postMsg({ type: 'buffering', isBuffering: false });
        }
      }
    } else {
      stallTicks = 0;
    }
  }, 600);
})();
