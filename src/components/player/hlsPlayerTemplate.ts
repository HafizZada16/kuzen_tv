/**
 * Standalone HTML5 + HLS.js Player Template for Kuramadrive & direct .m3u8 streams
 * Features:
 * 1. Embedded Hls.js with native fallback
 * 2. Complete telemetry bridge via window.ReactNativeWebView.postMessage (video_ready, timeupdate, playstate, buffering, progress, seeked)
 * 3. Remote control bridge via window.__QUETTA_EXEC__(action, value) for native Kuzen controls
 * 4. Tap-highlight elimination & full-bleed responsive layout
 */

export interface HlsPlayerTemplateOptions {
  streamUrl: string;
  initTime?: number;
}

export function buildHlsPlayerHtml(options: HlsPlayerTemplateOptions): string {
  const { streamUrl, initTime = 0 } = options;

  let actualHlsUrl = streamUrl;
  if (actualHlsUrl.includes('kurama') && !actualHlsUrl.includes('/cors-proxy')) {
    actualHlsUrl = `https://kuzen.web.id/api/cors-proxy?url=${encodeURIComponent(actualHlsUrl)}`;
  }

  return `<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            outline: none !important;
            -webkit-tap-highlight-color: transparent !important;
            -webkit-touch-callout: none !important;
            user-select: none !important;
            -webkit-user-select: none !important;
        }
        html, body {
            width: 100% !important;
            height: 100% !important;
            background: #000000 !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
        #kuzen-video {
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            object-fit: contain !important;
            background: #000000 !important;
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js"></script>
</head>
<body>
    <video id="kuzen-video" playsinline webkit-playsinline x5-playsinline preload="auto" autoplay></video>
    <script>
        (function() {
            var video = document.getElementById('kuzen-video');
            try {
                video.setAttribute('playsinline', 'true');
                video.setAttribute('webkit-playsinline', 'true');
                video.setAttribute('x5-playsinline', 'true');
            } catch(e) {}
            var streamUrl = ${JSON.stringify(actualHlsUrl)};
            var initTime = ${initTime > 0 ? initTime : 0};
            var hlsInstance = null;
            var userWantsPaused = false;

            // Intercept rogue .play() calls when user paused
            var origPlay = video.play;
            video.play = function() {
                if (userWantsPaused) {
                    return Promise.reject(new Error('User paused playback'));
                }
                return origPlay.apply(this, arguments);
            };

            function postMsg(data) {
                try {
                    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                        window.ReactNativeWebView.postMessage(JSON.stringify(data));
                    }
                } catch(e) {}
            }

            // Expose Remote Control untuk Native Quetta Controls
            window.__QUETTA_EXEC__ = function(action, val) {
                try {
                    if (action === 'PLAY') {
                        userWantsPaused = false;
                        if (hlsInstance) {
                            try { hlsInstance.startLoad(); } catch(e) {}
                        }
                        video.play().catch(function() {});
                        postMsg({
                            type: 'playstate',
                            isPlaying: true
                        });
                    } else if (action === 'PAUSE') {
                        userWantsPaused = true;
                        video.pause();
                        postMsg({
                            type: 'playstate',
                            isPlaying: false
                        });
                    } else if (action === 'TOGGLE') {
                        if (userWantsPaused || video.paused) {
                            userWantsPaused = false;
                            if (hlsInstance) {
                                try { hlsInstance.startLoad(); } catch(e) {}
                            }
                            video.play().catch(function() {});
                            postMsg({
                                type: 'playstate',
                                isPlaying: true
                            });
                        } else {
                            userWantsPaused = true;
                            video.pause();
                            postMsg({
                                type: 'playstate',
                                isPlaying: false
                            });
                        }
                    } else if (action === 'SEEK') {
                        if (typeof val === 'number') {
                            video.currentTime = val;
                        }
                    } else if (action === 'SPEED') {
                        if (typeof val === 'number') {
                            video.playbackRate = val;
                        }
                    } else if (action === 'ASPECT' || action === 'ASPECT_RATIO') {
                        if (val === 'fill') {
                            video.style.objectFit = 'fill';
                        } else if (val === 'cover' || val === '16:9') {
                            video.style.objectFit = 'cover';
                        } else {
                            video.style.objectFit = 'contain';
                        }
                    } else if (action === 'QUALITY') {
                        if (hlsInstance) {
                            var targetLvl = typeof val === 'number' ? val : -1;
                            hlsInstance.currentLevel = targetLvl;
                            hlsInstance.loadLevel = targetLvl;
                        }
                    }
                } catch(e) {}
            };

            // Setup Video Element Telemetry
            video.addEventListener('loadedmetadata', function() {
                postMsg({
                    type: 'video_ready',
                    duration: video.duration || 0,
                    isPlaying: !video.paused,
                    videoWidth: video.videoWidth || 0,
                    videoHeight: video.videoHeight || 0
                });
            });

            video.addEventListener('canplay', function() {
                postMsg({
                    type: 'video_ready',
                    duration: video.duration || 0,
                    isPlaying: !video.paused,
                    videoWidth: video.videoWidth || 0,
                    videoHeight: video.videoHeight || 0
                });
                postMsg({
                    type: 'buffering',
                    isBuffering: false
                });
            });

            video.addEventListener('play', function() {
                if (userWantsPaused) {
                    try { video.pause(); } catch(e) {}
                    return;
                }
                postMsg({
                    type: 'playstate',
                    isPlaying: true
                });
            });

            video.addEventListener('playing', function() {
                if (userWantsPaused) {
                    try { video.pause(); } catch(e) {}
                    return;
                }
                postMsg({
                    type: 'playstate',
                    isPlaying: true
                });
                postMsg({
                    type: 'buffering',
                    isBuffering: false
                });
            });

            video.addEventListener('pause', function() {
                postMsg({
                    type: 'playstate',
                    isPlaying: false
                });
            });

            video.addEventListener('waiting', function() {
                postMsg({
                    type: 'buffering',
                    isBuffering: true
                });
            });

            video.addEventListener('timeupdate', function() {
                var bufferedEnd = 0;
                try {
                    if (video.buffered && video.buffered.length > 0) {
                        bufferedEnd = video.buffered.end(video.buffered.length - 1);
                    }
                } catch(e) {}
                postMsg({
                    type: 'timeupdate',
                    currentTime: video.currentTime || 0,
                    duration: video.duration || 0,
                    buffered: bufferedEnd
                });
            });

            video.addEventListener('progress', function() {
                try {
                    if (video.buffered && video.buffered.length > 0) {
                        postMsg({
                            type: 'progress',
                            buffered: video.buffered.end(video.buffered.length - 1)
                        });
                    }
                } catch(e) {}
            });

            video.addEventListener('seeked', function() {
                postMsg({
                    type: 'seeked',
                    currentTime: video.currentTime || 0
                });
            });

            video.addEventListener('error', function(e) {
                postMsg({
                    type: 'media_error',
                    message: 'Gagal memuat video HLS'
                });
            });

            function setupHls() {
                if (window.Hls && Hls.isSupported()) {
                    // Safe buffer configuration for Android TV:
                    // Limits resolution to player viewport size and avoids running out of decoder memory
                    var hls = new Hls({
                        debug: false,
                        enableWorker: true,
                        lowLatencyMode: false,
                        capLevelToPlayerSize: true,
                        backBufferLength: 60,
                        maxBufferLength: 30,
                        maxMaxBufferLength: 60,
                        maxBufferSize: 60 * 1024 * 1024,
                        maxBufferHole: 0.5,
                        highBufferWatchdogPeriod: 2,
                        nudgeOffset: 0.2,
                        nudgeMaxRetry: 5,
                        manifestLoadingTimeOut: 20000,
                        manifestLoadingMaxRetry: 5,
                        levelLoadingTimeOut: 20000,
                        levelLoadingMaxRetry: 5,
                        fragLoadingTimeOut: 25000,
                        fragLoadingMaxRetry: 5,
                        startPosition: initTime > 0 ? initTime : -1
                    });
                    hlsInstance = hls;
                    window.__HLS_INSTANCE__ = hls;
                    hls.loadSource(streamUrl);
                    hls.attachMedia(video);

                    hls.on(Hls.Events.MANIFEST_PARSED, function(event, data) {
                        var targetLevel = -1;
                        if (data && data.levels && data.levels.length > 0) {
                            // Capping initial level to <= 1080p so Android TV MediaCodec doesn't crash on 4K (2160p) streams
                            for (var li = 0; li < data.levels.length; li++) {
                                var lh = data.levels[li].height;
                                if (lh && lh <= 1080) {
                                    if (targetLevel === -1 || lh > (data.levels[targetLevel] ? data.levels[targetLevel].height : 0)) {
                                        targetLevel = li;
                                    }
                                }
                            }
                            if (targetLevel !== -1) {
                                hls.currentLevel = targetLevel;
                                hls.loadLevel = targetLevel;
                            }

                            var parsedLevels = data.levels.map(function(lvl, idx) {
                                return {
                                    index: idx,
                                    label: lvl.height ? (lvl.height + 'p') : ('Kualitas ' + (idx + 1)),
                                    height: lvl.height || 0,
                                    bitrate: lvl.bitrate || 0
                                };
                            });
                            postMsg({
                                type: 'hls_levels',
                                levels: parsedLevels,
                                currentLevel: targetLevel
                            });
                        }

                        postMsg({
                            type: 'video_ready',
                            duration: video.duration || 0,
                            isPlaying: true,
                            videoWidth: video.videoWidth || 0,
                            videoHeight: video.videoHeight || 0
                        });
                        postMsg({
                            type: 'buffering',
                            isBuffering: false
                        });
                        if (initTime > 0) {
                            try { video.currentTime = initTime; } catch(e) {}
                        }
                        if (!userWantsPaused) {
                            video.play().catch(function() {
                                video.muted = true;
                                video.play().catch(function() {});
                            });
                        }
                    });

                    hls.on(Hls.Events.LEVEL_LOADED, function(event, data) {
                        if (data && data.details && data.details.totalduration) {
                            postMsg({
                                type: 'video_ready',
                                duration: data.details.totalduration,
                                isPlaying: !video.paused
                            });
                        }
                    });

                    hls.on(Hls.Events.ERROR, function(event, data) {
                        if (data.fatal) {
                            switch (data.type) {
                                case Hls.ErrorTypes.NETWORK_ERROR:
                                    hls.startLoad();
                                    break;
                                case Hls.ErrorTypes.MEDIA_ERROR:
                                    hls.recoverMediaError();
                                    break;
                                default:
                                    hls.destroy();
                                    postMsg({
                                        type: 'media_error',
                                        message: 'Gagal memuat fragmen HLS'
                                    });
                                    break;
                            }
                        }
                    });
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.src = streamUrl;
                    if (initTime > 0) {
                        try { video.currentTime = initTime; } catch(e) {}
                    }
                    if (!userWantsPaused) {
                        video.play().catch(function() {
                            video.muted = true;
                            video.play().catch(function() {});
                        });
                    }
                }
            }

            if (window.Hls) {
                setupHls();
            } else {
                window.addEventListener('DOMContentLoaded', setupHls);
                window.addEventListener('load', setupHls);
                setTimeout(function() {
                    if (!hlsInstance && !video.src) {
                        setupHls();
                    }
                }, 1500);
            }
        })();
    </script>
</body>
</html>`;
}
