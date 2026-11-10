import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Dimensions,
  Animated,
  ActivityIndicator,
  ScrollView,
  BackHandler,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors } from '../../constants/Colors';
import {
  fetchAnimeWatch,
  fetchDonghuaWatch,
  fetchKuramanimeLazyStream,
  WatchResponse,
  ServerItem,
} from '../../services/mediaService';
import {
  addHistory,
  fetchHistoryBySlug,
} from '../../services/userService';
import { extractEpisodeNumber } from '../../screens/DetailScreen';
import { buildQuettaInjectedScript } from './quettaInjectedScript';
import { buildHlsPlayerHtml } from './hlsPlayerTemplate';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  ArrowLeft,
  ListVideo,
  ChevronDown,
  Server as ServerIcon,
  Check,
  Tv,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AUTO_HIDE_DELAY = 4500; // 4.5 seconds auto-hide

/**
 * Server priority scoring identical to kuzen_app:
 * Higher priority = lower number (Kuramadrive > Playdesu > Odstream > Odcdn > Otaku > Moedesu...)
 */
export function getServerPriority(name: string, url: string): number {
  const n = (name || '').toLowerCase();
  const u = (url || '').toLowerCase();
  // Donghua Kuramadrive / Direct HLS gets top priority
  if (n.includes('kurama') || u.includes('.m3u8')) return -1;
  if (n.includes('playdesu') || u.includes('playdesu')) return 0;
  if (n.includes('odstream') || n.includes('odsstream') || u.includes('odstream')) return 1;
  if (n.includes('odcdn') || u.includes('odcdn')) return 2;
  if (n.includes('otaku') || u.includes('otaku')) return 3;
  if (n.includes('moedesu') || u.includes('moedesu')) return 4;
  if (n.includes('pdrain') || n.includes('pixeldrain') || u.includes('pdrain') || u.includes('pixeldrain')) return 5;
  if (n.includes('ondesu') || u.includes('ondesu') || u.includes('desustream')) return 6;
  if (n.includes('mega') || u.includes('mega.nz')) return 7;
  if (n.includes('gdrive') || n.includes('drive') || n.includes('sharer') || u.includes('drive.google') || u.includes('sharer-embed')) return 8;
  if (n.includes('acefile') || u.includes('acefile')) return 9;
  if (n.includes('kraken') || u.includes('kraken')) return 10;
  if (n.includes('blogs') || n.includes('blogger')) return 11;
  if (n.includes('yourupload')) return 12;
  if (n.includes('mp4load')) return 13;
  if (n.includes('vidhide') || u.includes('vidhide') || u.includes('earnvids')) return 14;
  if (n.includes('filedon') || u.includes('filedon')) return 99;
  return 15;
}

interface TVNativePlayerProps {
  animeSlug: string;
  animeTitle: string;
  animeThumb: string;
  episodeSlug: string;
  episodeTitle: string;
  source: 'anime' | 'donghua' | 'otakudesu' | 'anichin';
  onClose: () => void;
  onEpisodeChange?: (newEpisodeSlug: string, newEpisodeTitle: string) => void;
}

export const TVNativePlayer: React.FC<TVNativePlayerProps> = ({
  animeSlug,
  animeTitle,
  animeThumb,
  episodeSlug,
  episodeTitle,
  source,
  onClose,
  onEpisodeChange,
}) => {
  // --- Player State ---
  const [loading, setLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [watchData, setWatchData] = useState<WatchResponse | null>(null);
  const [currentServer, setCurrentServer] = useState<ServerItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1440); // 24 minutes default
  const [bufferedTime, setBufferedTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [centerToast, setCenterToast] = useState<{
    type: 'play' | 'pause' | 'rewind' | 'forward' | 'info';
    label: string;
  } | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'episodes' | 'servers'>('episodes');
  const [focusedBtn, setFocusedBtn] = useState<string | null>('bottom-episodes');

  // --- Refs ---
  const webViewRef = useRef<WebView | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const centerToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const drawerSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const playerActiveRef = useRef<boolean>(true);

  // Normalize source name
  const normSource: 'otakudesu' | 'anichin' =
    source === 'donghua' || source === 'anichin' ? 'anichin' : 'otakudesu';

  // --- 1. Load Watch Data & Initial History ---
  useEffect(() => {
    let isMounted = true;
    async function loadStream() {
      setLoading(true);
      try {
        let data: WatchResponse;
        if (normSource === 'anichin') {
          data = await fetchDonghuaWatch(episodeSlug);
        } else {
          data = await fetchAnimeWatch(episodeSlug);
        }

        if (!isMounted) return;

        // Filter and sort servers matching kuzen_app priority
        const rawServers = data.servers || [];
        const filteredServers = rawServers.filter((s) => {
          const l = (s.label || '').toLowerCase();
          const u = (s.url || '').toLowerCase();
          if (l.includes('filedon') || u.includes('filedon')) return false;
          const isShortlink =
            u.includes('desudrive') ||
            u.includes('safelink') ||
            u.includes('shortlink') ||
            u.includes('shorturl') ||
            u.includes('linkpoi') ||
            u.includes('ouo.io') ||
            u.includes('ouo.press') ||
            u.includes('coeg') ||
            u.includes('hexafile');
          if (l.includes('mega') && isShortlink) return false;
          return true;
        });

        filteredServers.sort((a, b) => getServerPriority(a.label, a.url) - getServerPriority(b.label, b.url));
        data.servers = filteredServers;
        setWatchData(data);

        // Auto-select preferred server (prefer 720p/1080p if available on top priority, or top priority servers[0])
        let preferred = filteredServers[0] || null;
        const hdMatch = filteredServers.find((s) => {
          const l = (s.label || '').toLowerCase();
          return (l.includes('720p') || l.includes('1080p')) && getServerPriority(s.label, s.url) <= 4;
        });
        if (hdMatch) {
          preferred = hdMatch;
        }
        setCurrentServer(preferred);

        // Background lazy-load Kuramadrive HLS from Neon DB for Donghua (matching kuzen_app)
        if (normSource === 'anichin' && data.hybrid?.eligible && data.hybrid?.lazy_endpoint) {
          fetchKuramanimeLazyStream(data.hybrid.lazy_endpoint)
            .then((kuramaServer) => {
              if (!isMounted || !kuramaServer) return;
              setWatchData((prev) => {
                if (!prev) return prev;
                const existing = prev.servers || [];
                if (existing.some((s) => (s.label || '').toLowerCase().includes('kurama'))) return prev;
                return {
                  ...prev,
                  servers: [kuramaServer, ...existing],
                };
              });
              // Auto-upgrade to Kuramadrive HLS
              setCurrentServer(kuramaServer);
            })
            .catch(() => {});
        }

        // Resume playback jika ada riwayat tontonan di Supabase
        const history = await fetchHistoryBySlug(episodeSlug);
        if (history && history.current_time && history.current_time > 10) {
          const resumeTime = history.current_time;
          setCurrentTime(resumeTime);
          setCenterToast({
            type: 'info',
            label: `Melanjutkan dari ${formatTime(resumeTime)}`,
          });
          setTimeout(() => setCenterToast(null), 2500);
        }
      } catch (err) {
        console.error('Failed to load stream data for TV:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadStream();
    return () => {
      isMounted = false;
    };
  }, [episodeSlug, normSource]);

  // --- 2. Auto-Hide Controls Timer (Controls remain mounted, only opacity fades) ---
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (!isDrawerOpen) {
      controlsTimeoutRef.current = setTimeout(() => {
        Animated.timing(controlsOpacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start(() => {
          setShowControls(false);
        });
      }, AUTO_HIDE_DELAY);
    }
  }, [isDrawerOpen, controlsOpacity]);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [resetControlsTimer]);

  // --- 3. Telemetry & Supabase History Polling ---
  useEffect(() => {
    const historyInterval = setInterval(() => {
      const player = playerActiveRef.current;
      if (player && isPlaying && currentTime > 5 && duration > 0) {
        addHistory(
          animeSlug,
          animeTitle,
          animeThumb,
          episodeSlug,
          episodeTitle,
          normSource,
          Math.floor(currentTime),
          Math.floor(duration)
        ).catch((e) => console.warn('History telemetry sync error:', e));
      }
    }, 5000);

    return () => {
      clearInterval(historyInterval);
      if (currentTime > 5 && duration > 0) {
        addHistory(
          animeSlug,
          animeTitle,
          animeThumb,
          episodeSlug,
          episodeTitle,
          normSource,
          Math.floor(currentTime),
          Math.floor(duration)
        ).catch(() => {});
      }
    };
  }, [currentTime, duration, isPlaying, animeSlug, animeTitle, animeThumb, episodeSlug, episodeTitle, normSource]);

  // --- 4. Quetta Media Hijacking ---
  const sendQuettaCommand = (action: string, val?: any) => {
    if (!webViewRef.current) return;
    const script = `
      try {
        if (window.__QUETTA_EXEC__) {
          window.__QUETTA_EXEC__(${JSON.stringify(action)}, ${val !== undefined ? JSON.stringify(val) : 'undefined'});
        }
      } catch(e) {}
      true;
    `;
    webViewRef.current.injectJavaScript(script);
  };

  const showCenterToast = useCallback(
    (type: 'play' | 'pause' | 'rewind' | 'forward' | 'info', label: string, duration = 1200) => {
      if (centerToastTimeoutRef.current) clearTimeout(centerToastTimeoutRef.current);
      setCenterToast({ type, label });
      centerToastTimeoutRef.current = setTimeout(() => {
        setCenterToast(null);
      }, duration);
    },
    []
  );

  const togglePlayPause = useCallback(() => {
    resetControlsTimer();
    sendQuettaCommand('TOGGLE');
    setIsPlaying((prev) => {
      const next = !prev;
      showCenterToast(next ? 'play' : 'pause', next ? 'Putar' : 'Jeda');
      return next;
    });
  }, [resetControlsTimer, showCenterToast]);

  const handleSeek = useCallback(
    (delta: number) => {
      resetControlsTimer();
      const nextTime = Math.max(0, Math.min(duration, currentTime + delta));
      setCurrentTime(nextTime);
      sendQuettaCommand('SEEK', nextTime);
      showCenterToast(delta > 0 ? 'forward' : 'rewind', delta > 0 ? '+10s' : '-10s');
    },
    [duration, currentTime, resetControlsTimer, showCenterToast]
  );

  const openDrawer = useCallback((tab: 'episodes' | 'servers' = 'episodes') => {
    setDrawerTab(tab);
    setIsDrawerOpen(true);
    setShowControls(true);
    drawerSlideAnim.setValue(SCREEN_HEIGHT);
    Animated.spring(drawerSlideAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [drawerSlideAnim, setShowControls]);

  const closeDrawer = useCallback(() => {
    Animated.timing(drawerSlideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsDrawerOpen(false);
      resetControlsTimer();
      setFocusedBtn('bottom-episodes');
    });
  }, [drawerSlideAnim, resetControlsTimer]);

  // Handle hardware Back button on TV remote
  useEffect(() => {
    const onBackPress = () => {
      if (isDrawerOpen) {
        closeDrawer();
        return true;
      }
      if (showControls) {
        // Quick hide controls on first back press
        Animated.timing(controlsOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setShowControls(false));
        return true;
      }
      onClose();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isDrawerOpen, showControls, onClose]);

  // Handle telemetry incoming from Quetta Media Hijacking script inside WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (!data || !data.type) return;

      switch (data.type) {
        case 'video_ready':
          if (data.duration && data.duration > 0) setDuration(Math.floor(data.duration));
          if (data.isPlaying !== undefined) setIsPlaying(data.isPlaying);
          setIsBuffering(false);
          break;
        case 'timeupdate':
          if (data.currentTime !== undefined) setCurrentTime(Math.floor(data.currentTime));
          if (data.duration && data.duration > 0) setDuration(Math.floor(data.duration));
          if (data.buffered !== undefined) setBufferedTime(Math.floor(data.buffered));
          break;
        case 'playstate':
          if (data.isPlaying !== undefined) setIsPlaying(data.isPlaying);
          break;
        case 'buffering':
          setIsBuffering(!!data.isBuffering);
          break;
      }
    } catch (_) {}
  };

  // Format mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPercent = duration > 0 ? (bufferedTime / duration) * 100 : 0;

  // Build WebView source & injection with Referer Header & Mobile User-Agent matching kuzen_app
  const streamUrl = currentServer?.url || watchData?.stream_url || '';
  const isDirectHls = currentServer?.isHls || streamUrl.includes('.m3u8') || streamUrl.includes('kurama');

  const webViewHeaders = useMemo(() => {
    if (!streamUrl) return {};
    if (
      streamUrl.includes('mega.nz') ||
      streamUrl.includes('mega-embed') ||
      streamUrl.includes('drive.google.com') ||
      streamUrl.includes('acefile') ||
      streamUrl.includes('kraken') ||
      streamUrl.includes('sharer')
    ) {
      return {};
    }
    return {
      Referer:
        streamUrl.includes('animexin') || normSource === 'anichin'
          ? 'https://animexin.dev/'
          : streamUrl.includes('anichin') ||
            streamUrl.includes('nunadrama') ||
            streamUrl.includes('miraishare')
          ? 'https://anichin.moe/'
          : 'https://otakudesu.cloud/',
    };
  }, [streamUrl, normSource]);

  const webViewSource = isDirectHls
    ? { html: buildHlsPlayerHtml({ streamUrl, initTime: currentTime }), baseUrl: 'https://kuzen.web.id' }
    : { uri: streamUrl, headers: webViewHeaders };

  const injectedJavaScript = !isDirectHls
    ? buildQuettaInjectedScript({ startTime: currentTime, totalDuration: duration })
    : undefined;

  return (
    <View style={styles.playerContainer}>
      {/* 1. Isolated Video Surface (Never steals TV Remote focus) */}
      <View style={styles.videoSurface} pointerEvents="none" focusable={false}>
        {loading ? (
          <View style={styles.bufferingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.spinnerText}>Menghubungkan ke Server Video...</Text>
          </View>
        ) : streamUrl ? (
          <WebView
            ref={webViewRef}
            source={webViewSource}
            injectedJavaScript={injectedJavaScript}
            onMessage={handleWebViewMessage}
            style={styles.webView}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            scalesPageToFit
            originWhitelist={['*']}
            focusable={false}
            userAgent="Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
            onShouldStartLoadWithRequest={(request) => {
              const reqUrl = request.url || '';
              if (isDirectHls) return true;
              if (
                reqUrl.startsWith('about:') ||
                reqUrl.startsWith('blob:') ||
                reqUrl.startsWith('data:') ||
                reqUrl.startsWith('file:')
              ) {
                return true;
              }
              // Block non-http protocols (intent, market, whatsapp, etc.)
              if (
                reqUrl.startsWith('intent:') ||
                reqUrl.startsWith('market:') ||
                reqUrl.startsWith('whatsapp:') ||
                reqUrl.startsWith('tg:') ||
                !reqUrl.startsWith('http')
              ) {
                return false;
              }
              // Allow initial stream or proxy
              if (reqUrl === streamUrl || reqUrl.includes('/cors-proxy?') || reqUrl.includes('/iframe-proxy?')) {
                return true;
              }
              // Whitelist streaming media hosts
              const allowedHosts = [
                'playdesu', 'odstream', 'odsstream', 'odcdn', 'otakudesu', 'moedesu',
                'desustream', 'ondesu', 'pdrain', 'pixeldrain', 'kuramadrive', 'kuramanime',
                'anichin', 'animexin', 'mega.nz', 'google.com', 'googleapis.com', 'blogger.com',
                'acefile', 'kuzen.web.id'
              ];
              return allowedHosts.some((h) => reqUrl.toLowerCase().includes(h));
            }}
          />
        ) : (
          <View style={styles.bufferingContainer}>
            <Text style={styles.spinnerText}>Stream video tidak tersedia di server ini.</Text>
          </View>
        )}

        {/* Buffering Indicator Overlay */}
        {isBuffering && (
          <View style={styles.bufferingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
      </View>

      {/* 2. Full-Screen TV Playback Remote Zone (Always active, receives 1st OK click & bridges UP/DOWN) */}
      <Pressable
        focusable={true}
        hasTVPreferredFocus={!isDrawerOpen}
        onFocus={() => {
          setFocusedBtn('playback-zone');
        }}
        onBlur={() => {
          if (focusedBtn === 'playback-zone') setFocusedBtn(null);
        }}
        onPress={togglePlayPause}
        style={styles.playbackZone}
      />

      {/* 3. Center Action Toast (Appears only on Play/Pause, Seek, or Resume) */}
      {centerToast && (
        <View style={styles.centerToastContainer} pointerEvents="none">
          <View style={styles.centerToastPill}>
            {centerToast.type === 'play' && (
              <Play size={36} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 3 }} />
            )}
            {centerToast.type === 'pause' && (
              <Pause size={36} color="#FFFFFF" fill="#FFFFFF" />
            )}
            {centerToast.type === 'rewind' && (
              <RotateCcw size={34} color="#FFFFFF" />
            )}
            {centerToast.type === 'forward' && (
              <RotateCw size={34} color="#FFFFFF" />
            )}
            <Text style={styles.centerToastText}>{centerToast.label}</Text>
          </View>
        </View>
      )}

      {/* 4. On-Screen Display (OSD) Overlay - Opacity animated, pointerEvents fixed to box-none */}
      <Animated.View
        style={[styles.osdOverlay, { opacity: controlsOpacity }]}
        pointerEvents="box-none"
      >
        {/* Top Bar: Back & Title & Quick Nav */}
        <View style={styles.topBar}>
          <Pressable
            focusable={true}
            onFocus={() => {
              setFocusedBtn('back');
              resetControlsTimer();
            }}
            onBlur={() => {
              if (focusedBtn === 'back') setFocusedBtn(null);
            }}
            onPress={onClose}
            style={({ focused }: any) => [
              styles.backButton,
              (focused || focusedBtn === 'back') && styles.backButtonFocused,
            ]}
          >
            <ArrowLeft size={22} color="#FFFFFF" />
          </Pressable>

          <View style={styles.titleWrapper}>
            <Text style={styles.animeTitle} numberOfLines={1}>
              {animeTitle}
            </Text>
            <Text style={styles.episodeSubtitle} numberOfLines={1}>
              {extractEpisodeNumber(episodeTitle, 0)} • {currentServer?.label || 'Quetta Player'}
            </Text>
          </View>

          <View style={styles.topActionsRow}>
            <Pressable
              focusable={true}
              onFocus={() => {
                setFocusedBtn('servers-top');
                resetControlsTimer();
              }}
              onBlur={() => {
                if (focusedBtn === 'servers-top') setFocusedBtn(null);
              }}
              onPress={() => openDrawer('servers')}
              style={({ focused }: any) => [
                styles.topActionButton,
                (focused || focusedBtn === 'servers-top') && styles.topActionButtonFocused,
              ]}
            >
              <ServerIcon size={18} color={focusedBtn === 'servers-top' ? '#FFFFFF' : Colors.primary} />
              <Text style={styles.topActionText}>Server</Text>
            </Pressable>

            <Pressable
              focusable={true}
              onFocus={() => {
                setFocusedBtn('episodes-top');
                resetControlsTimer();
              }}
              onBlur={() => {
                if (focusedBtn === 'episodes-top') setFocusedBtn(null);
              }}
              onPress={() => openDrawer('episodes')}
              style={({ focused }: any) => [
                styles.topActionButton,
                (focused || focusedBtn === 'episodes-top') && styles.topActionButtonFocused,
              ]}
            >
              <ListVideo size={18} color="#FFFFFF" />
              <Text style={styles.topActionText}>Episode</Text>
            </Pressable>
          </View>
        </View>

        {/* Bottom Bar: Seekbar, Time, and TV Remote Quick Action Row */}
        <View style={styles.bottomBarGradient}>
          {/* Seekbar */}
          <View style={styles.seekbarContainer}>
            <View style={styles.seekbarRail}>
              <View style={[styles.seekbarBufferTrack, { width: `${bufferPercent}%` }]} />
              <View style={[styles.seekbarProgressTrack, { width: `${progressPercent}%` }]} />
            </View>
            <View
              style={[
                styles.seekbarThumb,
                { left: `${Math.max(0, Math.min(99, progressPercent))}%` },
              ]}
            />
          </View>

          {/* Time & Stream Meta Row */}
          <View style={styles.bottomMetaRow}>
            <View style={styles.timeWrapper}>
              <Text style={styles.timeCurrent}>{formatTime(currentTime)}</Text>
              <Text style={styles.timeDivider}> / </Text>
              <Text style={styles.timeTotal}>{formatTime(duration)}</Text>
            </View>

            <View style={styles.streamMetaWrapper}>
              <View style={styles.qualityPill}>
                <Text style={styles.qualityText}>
                  {currentServer?.isHls ? 'HLS CEPAT 1080P' : 'QUETTA STREAM'}
                </Text>
              </View>
            </View>
          </View>

          {/* TV Remote Quick Focus Action Bar (Pressing DOWN from Center directly focuses here) */}
          <View style={styles.quickNavRow}>
            <Pressable
              focusable={true}
              onFocus={() => {
                setFocusedBtn('bottom-episodes');
                resetControlsTimer();
              }}
              onBlur={() => {
                if (focusedBtn === 'bottom-episodes') setFocusedBtn(null);
              }}
              onPress={() => openDrawer('episodes')}
              style={({ focused }: any) => [
                styles.quickNavBtn,
                (focused || focusedBtn === 'bottom-episodes') && styles.quickNavBtnFocused,
              ]}
            >
              <ListVideo size={18} color={focusedBtn === 'bottom-episodes' ? '#FFFFFF' : Colors.primary} />
              <Text style={[
                styles.quickNavBtnText,
                focusedBtn === 'bottom-episodes' && styles.quickNavBtnTextFocused
              ]}>
                Daftar Episode
              </Text>
            </Pressable>

            <Pressable
              focusable={true}
              onFocus={() => {
                setFocusedBtn('bottom-servers');
                resetControlsTimer();
              }}
              onBlur={() => {
                if (focusedBtn === 'bottom-servers') setFocusedBtn(null);
              }}
              onPress={() => openDrawer('servers')}
              style={({ focused }: any) => [
                styles.quickNavBtn,
                (focused || focusedBtn === 'bottom-servers') && styles.quickNavBtnFocused,
              ]}
            >
              <ServerIcon size={18} color={focusedBtn === 'bottom-servers' ? '#FFFFFF' : Colors.primary} />
              <Text style={[
                styles.quickNavBtnText,
                focusedBtn === 'bottom-servers' && styles.quickNavBtnTextFocused
              ]}>
                Ganti Server
              </Text>
            </Pressable>

            <Pressable
              focusable={true}
              onFocus={() => {
                setFocusedBtn('bottom-rewind');
                resetControlsTimer();
              }}
              onBlur={() => {
                if (focusedBtn === 'bottom-rewind') setFocusedBtn(null);
              }}
              onPress={() => handleSeek(-10)}
              style={({ focused }: any) => [
                styles.quickNavBtnSmall,
                (focused || focusedBtn === 'bottom-rewind') && styles.quickNavBtnFocused,
              ]}
            >
              <RotateCcw size={16} color="#FFFFFF" />
              <Text style={styles.quickNavBtnTextSmall}>-10d</Text>
            </Pressable>

            <Pressable
              focusable={true}
              onFocus={() => {
                setFocusedBtn('bottom-forward');
                resetControlsTimer();
              }}
              onBlur={() => {
                if (focusedBtn === 'bottom-forward') setFocusedBtn(null);
              }}
              onPress={() => handleSeek(10)}
              style={({ focused }: any) => [
                styles.quickNavBtnSmall,
                (focused || focusedBtn === 'bottom-forward') && styles.quickNavBtnFocused,
              ]}
            >
              <RotateCw size={16} color="#FFFFFF" />
              <Text style={styles.quickNavBtnTextSmall}>+10d</Text>
            </Pressable>

            <View style={styles.dpadHintContainer}>
              <Text style={styles.dpadHintText}>
                ▼ Bawah: Menu Kontrol • OK: Putar/Jeda • ◄/►: Lewati 10d
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* 4. Bottom OSD Drawer (Episode & Server Switcher) - ONLY RENDERED WHEN isDrawerOpen */}
      {isDrawerOpen && (
        <Animated.View
          style={[
            styles.drawerContainer,
            { transform: [{ translateY: drawerSlideAnim }] },
          ]}
        >
          <View style={styles.drawerHeader}>
            <View style={styles.drawerTabsRow}>
              <Pressable
                focusable={true}
                onFocus={() => {
                  setFocusedBtn('drawer-tab-episodes');
                  setDrawerTab('episodes');
                }}
                onBlur={() => setFocusedBtn(null)}
                onPress={() => setDrawerTab('episodes')}
                style={[
                  styles.drawerTabButton,
                  drawerTab === 'episodes' && styles.drawerTabButtonActive,
                  focusedBtn === 'drawer-tab-episodes' && styles.drawerTabButtonFocused,
                ]}
              >
                <ListVideo size={18} color={drawerTab === 'episodes' ? Colors.primary : Colors.textMuted} />
                <Text
                  style={[
                    styles.drawerTabText,
                    drawerTab === 'episodes' && styles.drawerTabTextActive,
                  ]}
                >
                  Daftar Episode ({watchData?.episodes?.length || 0})
                </Text>
              </Pressable>

              <Pressable
                focusable={true}
                onFocus={() => {
                  setFocusedBtn('drawer-tab-servers');
                  setDrawerTab('servers');
                }}
                onBlur={() => setFocusedBtn(null)}
                onPress={() => setDrawerTab('servers')}
                style={[
                  styles.drawerTabButton,
                  drawerTab === 'servers' && styles.drawerTabButtonActive,
                  focusedBtn === 'drawer-tab-servers' && styles.drawerTabButtonFocused,
                ]}
              >
                <ServerIcon size={18} color={drawerTab === 'servers' ? Colors.primary : Colors.textMuted} />
                <Text
                  style={[
                    styles.drawerTabText,
                    drawerTab === 'servers' && styles.drawerTabTextActive,
                  ]}
                >
                  Pilihan Server ({watchData?.servers?.length || 0})
                </Text>
              </Pressable>
            </View>

            <Pressable
              focusable={true}
              onFocus={() => setFocusedBtn('drawer-tab-close')}
              onBlur={() => setFocusedBtn(null)}
              onPress={closeDrawer}
              style={[
                styles.closeDrawerButton,
                focusedBtn === 'drawer-tab-close' && styles.closeDrawerButtonFocused,
              ]}
            >
              <ChevronDown size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Drawer Content Items */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.drawerScrollList}
          >
            {drawerTab === 'episodes' ? (
              (watchData?.episodes || []).map((ep, idx) => {
                const isCurrent = ep.slug === episodeSlug;
                const isFocused = focusedBtn === `drawer-ep-${ep.slug}`;
                const epLabel = extractEpisodeNumber(ep.title, idx);

                return (
                  <Pressable
                    key={`drawer-ep-${ep.slug}-${idx}`}
                    focusable={true}
                    hasTVPreferredFocus={isDrawerOpen && isCurrent}
                    onFocus={() => {
                      setFocusedBtn(`drawer-ep-${ep.slug}`);
                      resetControlsTimer();
                    }}
                    onBlur={() => setFocusedBtn(null)}
                    onPress={() => {
                      closeDrawer();
                      onEpisodeChange?.(ep.slug, epLabel);
                    }}
                    style={[
                      styles.drawerCardItem,
                      isCurrent && styles.drawerCardItemActive,
                      isFocused && styles.drawerCardItemFocused,
                    ]}
                  >
                    <View style={styles.episodeCardTopRow}>
                      <Tv size={16} color={isCurrent ? Colors.primary : '#FFFFFF'} />
                      <Text
                        style={[
                          styles.drawerCardTitle,
                          isCurrent && styles.drawerCardTitleActive,
                          isFocused && styles.drawerCardTitleFocused,
                        ]}
                        numberOfLines={1}
                      >
                        {epLabel}
                      </Text>
                    </View>
                    {isCurrent ? (
                      <View style={styles.playingBadge}>
                        <Text style={styles.playingBadgeText}>SEDANG DIPUTAR</Text>
                      </View>
                    ) : (
                      <Text style={styles.episodeReadyHint}>Tekan OK untuk tonton</Text>
                    )}
                  </Pressable>
                );
              })
            ) : (
              (watchData?.servers || []).map((s, idx) => {
                const isSelected = currentServer?.label === s.label;
                const isFocused = focusedBtn === `drawer-srv-${idx}`;
                return (
                  <Pressable
                    key={`drawer-srv-${idx}`}
                    focusable={true}
                    hasTVPreferredFocus={isDrawerOpen && isSelected}
                    onFocus={() => {
                      setFocusedBtn(`drawer-srv-${idx}`);
                      resetControlsTimer();
                    }}
                    onBlur={() => setFocusedBtn(null)}
                    onPress={() => {
                      setCurrentServer(s);
                      closeDrawer();
                      showCenterToast('info', `Ganti ke ${s.label}`, 1500);
                    }}
                    style={[
                      styles.drawerCardItem,
                      styles.serverCardItem,
                      isSelected && styles.drawerCardItemActive,
                      isFocused && styles.drawerCardItemFocused,
                    ]}
                  >
                    <View style={styles.serverCardHeader}>
                      <Text
                        style={[
                          styles.drawerCardTitle,
                          isSelected && styles.drawerCardTitleActive,
                          isFocused && styles.drawerCardTitleFocused,
                        ]}
                        numberOfLines={1}
                      >
                        {s.label}
                      </Text>
                      {isSelected && <Check size={16} color={Colors.primary} />}
                    </View>
                    <Text style={styles.serverCardSub}>
                      {s.isHls ? 'HLS Cepat • Full 1080p' : 'Direct Embed Stream'}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  playerContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 99999,
    elevation: 99999,
  },
  videoSurface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webView: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bufferingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerText: {
    color: '#E5E5E5',
    fontSize: 15,
    marginTop: 14,
    fontWeight: '600',
  },
  playbackZone: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    bottom: 120,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  centerToastContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  centerToastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 12, 12, 0.92)',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 36,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    gap: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 20,
  },
  centerToastText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  osdOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingTop: 28,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  backButtonFocused: {
    borderColor: '#FFFFFF',
    backgroundColor: Colors.primary,
    transform: [{ scale: 1.08 }],
    elevation: 8,
  },
  titleWrapper: {
    flex: 1,
  },
  animeTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  episodeSubtitle: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  topActionButtonFocused: {
    borderColor: '#FFFFFF',
    backgroundColor: Colors.primary,
    transform: [{ scale: 1.05 }],
    elevation: 8,
  },
  topActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomBarGradient: {
    paddingHorizontal: 36,
    paddingBottom: 24,
    paddingTop: 16,
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
  },
  seekbarContainer: {
    height: 18,
    justifyContent: 'center',
    marginBottom: 6,
  },
  seekbarRail: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  seekbarBufferTrack: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.38)',
  },
  seekbarProgressTrack: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
  },
  seekbarThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    top: 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  bottomMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeCurrent: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timeDivider: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  timeTotal: {
    color: Colors.textMuted,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  streamMetaWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  qualityPill: {
    backgroundColor: 'rgba(234, 88, 12, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qualityText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  quickNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  quickNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 8,
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  quickNavBtnFocused: {
    borderColor: '#FFFFFF',
    backgroundColor: Colors.primary,
    transform: [{ scale: 1.05 }],
    elevation: 8,
  },
  quickNavBtnText: {
    color: '#E5E5E5',
    fontSize: 13,
    fontWeight: '700',
  },
  quickNavBtnTextFocused: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  quickNavBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickNavBtnTextSmall: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dpadHintContainer: {
    marginLeft: 'auto',
  },
  dpadHintText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
  },
  drawerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: '#121212',
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
    paddingHorizontal: 36,
    paddingVertical: 16,
    zIndex: 10000,
    elevation: 24,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  drawerTabsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  drawerTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  drawerTabButtonActive: {
    backgroundColor: 'rgba(234, 88, 12, 0.2)',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  drawerTabButtonFocused: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(234, 88, 12, 0.4)',
    transform: [{ scale: 1.04 }],
    elevation: 6,
  },
  drawerTabText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  drawerTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  closeDrawerButton: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  closeDrawerButtonFocused: {
    borderColor: '#FFFFFF',
    backgroundColor: Colors.primary,
  },
  drawerScrollList: {
    paddingRight: 40,
    gap: 14,
    alignItems: 'center',
  },
  drawerCardItem: {
    width: 170,
    height: 100,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.borderMuted,
    padding: 12,
    justifyContent: 'space-between',
  },
  serverCardItem: {
    width: 200,
  },
  drawerCardItemActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(234, 88, 12, 0.14)',
  },
  drawerCardItemFocused: {
    borderColor: '#FFFFFF', // Clean TV crisp white outline
    borderWidth: 2.5,
    backgroundColor: 'rgba(234, 88, 12, 0.4)',
    transform: [{ scale: 1.05 }],
    elevation: 8,
  },
  episodeCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serverCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drawerCardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  drawerCardTitleActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  drawerCardTitleFocused: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  episodeReadyHint: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  serverCardSub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  playingBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  playingBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
