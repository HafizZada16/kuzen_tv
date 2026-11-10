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
  DeviceEventEmitter,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors } from '../../constants/Colors';
import {
  fetchAnimeWatch,
  fetchDonghuaWatch,
  fetchAnimeDetail,
  fetchDonghuaDetail,
  getCachedAnimeDetail,
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
  episodes?: { title: string; slug: string }[];
  source: 'anime' | 'donghua' | 'otakudesu' | 'anichin';
  onClose: () => void;
  onEpisodeChange?: (newEpisodeSlug: string, newEpisodeTitle: string) => void;
}

export const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

export const TVNativePlayer: React.FC<TVNativePlayerProps> = ({
  animeSlug,
  animeTitle,
  animeThumb,
  episodeSlug,
  episodeTitle,
  episodes: initialEpisodes,
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
  const [isOsdVisible, setIsOsdVisible] = useState(false);
  const [centerToast, setCenterToast] = useState<{
    type: 'play' | 'pause' | 'rewind' | 'forward' | 'info';
    label: string;
  } | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'episodes' | 'servers'>('episodes');
  const [drawerIndex, setDrawerIndex] = useState<number>(0);
  const [activeTier, setActiveTier] = useState<1 | 2 | 3 | 4>(1);
  const [tier3Selection, setTier3Selection] = useState<'episodes' | 'servers' | 'speed'>('episodes');
  const [scrubTime, setScrubTime] = useState<number>(0);
  const [scrubStep, setScrubStep] = useState<number>(10);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // --- Refs ---
  const webViewRef = useRef<WebView | null>(null);
  const drawerScrollViewRef = useRef<ScrollView | null>(null);
  const osdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const centerToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const drawerSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const playerActiveRef = useRef<boolean>(true);

  // SmartTube Accelerated Scrubbing Tracking Refs
  const lastScrubTimeRef = useRef<number>(0);
  const scrubStreakRef = useRef<number>(0);

  // Synchronized refs to eliminate any stale closures in hardware remote listener
  const isOsdVisibleRef = useRef<boolean>(false);
  isOsdVisibleRef.current = isOsdVisible;

  const activeTierRef = useRef<1 | 2 | 3 | 4>(1);
  activeTierRef.current = activeTier;

  const tier3SelectionRef = useRef<'episodes' | 'servers' | 'speed'>('episodes');
  tier3SelectionRef.current = tier3Selection;

  const scrubTimeRef = useRef<number>(0);
  scrubTimeRef.current = scrubTime;

  const playbackSpeedRef = useRef<number>(1.0);
  playbackSpeedRef.current = playbackSpeed;

  const currentTimeRef = useRef<number>(0);
  currentTimeRef.current = currentTime;

  const durationRef = useRef<number>(1440);
  durationRef.current = duration;

  const drawerIndexRef = useRef<number>(0);
  drawerIndexRef.current = drawerIndex;

  const drawerTabRef = useRef<'episodes' | 'servers'>('episodes');
  drawerTabRef.current = drawerTab;

  const watchDataRef = useRef<WatchResponse | null>(null);
  watchDataRef.current = watchData;

  const currentServerRef = useRef<ServerItem | null>(null);
  currentServerRef.current = currentServer;

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

        // Populate episodes: from props, from watchData, or fallback detail
        if (initialEpisodes && initialEpisodes.length > 0) {
          data.episodes = initialEpisodes;
        } else if (!data.episodes || data.episodes.length === 0) {
          try {
            if (normSource === 'anichin') {
              const d = await fetchDonghuaDetail(animeSlug);
              if (d?.episodes && d.episodes.length > 0) {
                data.episodes = d.episodes;
              }
            } else {
              const d = getCachedAnimeDetail(animeSlug) || await fetchAnimeDetail(animeSlug);
              if (d?.episodes && d.episodes.length > 0) {
                data.episodes = d.episodes;
              }
            }
          } catch (e) {
            console.warn('Fallback episodes error in TV player:', e);
          }
        }

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
  }, [episodeSlug, normSource, animeSlug, initialEpisodes]);

  // --- 2. SmartTube Auto-Close Timer for OSD Menu (8 seconds inactivity) ---
  const resetOsdTimer = useCallback(() => {
    if (osdTimeoutRef.current) {
      clearTimeout(osdTimeoutRef.current);
    }
    // Only auto-close if OSD is visible and drawer is not open
    if (isOsdVisibleRef.current && !isDrawerOpen) {
      osdTimeoutRef.current = setTimeout(() => {
        setIsOsdVisible(false);
        isOsdVisibleRef.current = false;
        setActiveTier(1);
        activeTierRef.current = 1;
      }, 8000);
    }
  }, [isDrawerOpen]);

  useEffect(() => {
    if (isOsdVisible) {
      resetOsdTimer();
    }
    return () => {
      if (osdTimeoutRef.current) clearTimeout(osdTimeoutRef.current);
    };
  }, [isOsdVisible, resetOsdTimer]);

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

  // SmartTube Accelerated Scrubbing: dynamically scales step based on rapid clicks
  const getScrubStep = useCallback(() => {
    const now = Date.now();
    if (now - lastScrubTimeRef.current < 550) {
      scrubStreakRef.current += 1;
    } else {
      scrubStreakRef.current = 1;
    }
    lastScrubTimeRef.current = now;

    let step = 10;
    if (scrubStreakRef.current >= 8) {
      step = 60; // 1 minute
    } else if (scrubStreakRef.current >= 4) {
      step = 30; // 30 seconds
    }
    setScrubStep(step);
    return step;
  }, []);

  const cyclePlaybackSpeed = useCallback(() => {
    const SPEED_OPTIONS = [1.0, 1.25, 1.5, 2.0];
    const nextIdx = (SPEED_OPTIONS.indexOf(playbackSpeedRef.current) + 1) % SPEED_OPTIONS.length;
    const nextSpeed = SPEED_OPTIONS[nextIdx];
    setPlaybackSpeed(nextSpeed);
    playbackSpeedRef.current = nextSpeed;
    sendQuettaCommand('SPEED', nextSpeed);
    showCenterToast('info', `Kecepatan: ${nextSpeed}x`, 1000);
  }, [showCenterToast]);

  const togglePlayPause = useCallback(() => {
    sendQuettaCommand('TOGGLE');
    setIsPlaying((prev) => {
      const next = !prev;
      showCenterToast(next ? 'play' : 'pause', next ? 'Putar' : 'Jeda');
      return next;
    });
  }, [showCenterToast]);

  const handleSeek = useCallback(
    (delta: number) => {
      const nextTime = Math.max(0, Math.min(duration, currentTime + delta));
      setCurrentTime(nextTime);
      sendQuettaCommand('SEEK', nextTime);
      showCenterToast(delta > 0 ? 'forward' : 'rewind', delta > 0 ? '+10s' : '-10s');
    },
    [duration, currentTime, showCenterToast]
  );

  const openDrawer = useCallback((tab: 'episodes' | 'servers' = 'episodes') => {
    setDrawerTab(tab);
    drawerTabRef.current = tab;

    let initIdx = 0;
    if (tab === 'episodes') {
      const epList = watchDataRef.current?.episodes || [];
      const found = epList.findIndex((e) => e.slug === episodeSlug);
      initIdx = found >= 0 ? found : 0;
    } else {
      const srvList = watchDataRef.current?.servers || [];
      const found = srvList.findIndex((s) => s.label === currentServerRef.current?.label);
      initIdx = found >= 0 ? found : 0;
    }
    setDrawerIndex(initIdx);
    drawerIndexRef.current = initIdx;

    setIsDrawerOpen(true);
    drawerSlideAnim.setValue(SCREEN_HEIGHT);
    Animated.spring(drawerSlideAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start(() => {
      setTimeout(() => {
        drawerScrollViewRef.current?.scrollTo({
          x: Math.max(0, initIdx * (tab === 'episodes' ? 144 : 164) - 100),
          animated: true,
        });
      }, 60);
    });
  }, [episodeSlug, drawerSlideAnim]);

  const closeDrawer = useCallback(() => {
    Animated.timing(drawerSlideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsDrawerOpen(false);
      resetOsdTimer();
    });
  }, [drawerSlideAnim, resetOsdTimer]);

  // Handle hardware Back button on TV remote
  useEffect(() => {
    const onBackPress = () => {
      if (activeTierRef.current === 4) {
        closeDrawer();
        setActiveTier(3);
        activeTierRef.current = 3;
        return true;
      }
      if (isOsdVisibleRef.current) {
        setIsOsdVisible(false);
        isOsdVisibleRef.current = false;
        setActiveTier(1);
        activeTierRef.current = 1;
        return true;
      }
      onClose();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [closeDrawer, onClose]);

  // --- 4-Tier Android TV Hardware Remote Key Dispatcher ---
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('onTVRemoteKey', (keyCode: number) => {
      // 1. Back Key (keyCode 4: BACK, keyCode 111: ESCAPE on PC/Emulator Keyboard)
      if (keyCode === 4 || keyCode === 111) {
        if (activeTierRef.current === 4) {
          closeDrawer();
          setActiveTier(3);
          activeTierRef.current = 3;
          return;
        }
        if (isOsdVisibleRef.current) {
          setIsOsdVisible(false);
          isOsdVisibleRef.current = false;
          setActiveTier(1);
          activeTierRef.current = 1;
          return;
        }
        onClose();
        return;
      }

      // 2. Tingkat 4: Drawer is Open (Episode or Server Selector)
      if (activeTierRef.current === 4) {
        if (keyCode === 19) { // DPAD_UP -> Return to Tingkat 3
          closeDrawer();
          setActiveTier(3);
          activeTierRef.current = 3;
          return;
        }

        const isEps = drawerTabRef.current === 'episodes';
        const items = isEps
          ? watchDataRef.current?.episodes || []
          : watchDataRef.current?.servers || [];
        if (items.length === 0) return;

        const cardWidth = isEps ? 144 : 164;

        if (keyCode === 21) { // DPAD_LEFT
          const next = Math.max(0, drawerIndexRef.current - 1);
          setDrawerIndex(next);
          drawerIndexRef.current = next;
          drawerScrollViewRef.current?.scrollTo({
            x: Math.max(0, next * cardWidth - 100),
            animated: true,
          });
          return;
        }
        if (keyCode === 22) { // DPAD_RIGHT
          const next = Math.min(items.length - 1, drawerIndexRef.current + 1);
          setDrawerIndex(next);
          drawerIndexRef.current = next;
          drawerScrollViewRef.current?.scrollTo({
            x: Math.max(0, next * cardWidth - 100),
            animated: true,
          });
          return;
        }
        if (keyCode === 23 || keyCode === 66 || keyCode === 160 || keyCode === 62) { // DPAD_CENTER / ENTER / SPACE -> Select Item
          const currentIdx = drawerIndexRef.current;
          if (isEps) {
            const epList = watchDataRef.current?.episodes || [];
            const ep = epList[currentIdx];
            if (ep) {
              closeDrawer();
              setIsOsdVisible(false);
              isOsdVisibleRef.current = false;
              setActiveTier(1);
              activeTierRef.current = 1;
              onEpisodeChange?.(ep.slug, extractEpisodeNumber(ep.title, currentIdx));
            }
          } else {
            const srvList = watchDataRef.current?.servers || [];
            const s = srvList[currentIdx];
            if (s) {
              setCurrentServer(s);
              closeDrawer();
              setIsOsdVisible(false);
              isOsdVisibleRef.current = false;
              setActiveTier(1);
              activeTierRef.current = 1;
              showCenterToast('info', `Ganti ke ${s.label}`, 1500);
            }
          }
          return;
        }
        return;
      }

      // 3. Mode Watch (Tingkat 1): OSD Sedang Tertutup
      if (!isOsdVisibleRef.current) {
        if (
          keyCode === 23 || // DPAD_CENTER
          keyCode === 66 || // ENTER
          keyCode === 160 || // NUMPAD_ENTER
          keyCode === 62 || // SPACEBAR (Emulator / PC Keyboard)
          keyCode === 85 || // MEDIA_PLAY_PAUSE
          keyCode === 126 || // MEDIA_PLAY
          keyCode === 127 // MEDIA_PAUSE
        ) {
          togglePlayPause();
        } else if (keyCode === 21 || keyCode === 89) { // LEFT -> Skip -10s
          handleSeek(-10);
        } else if (keyCode === 22 || keyCode === 90) { // RIGHT -> Skip +10s
          handleSeek(10);
        } else if (keyCode === 20 || keyCode === 19) { // DOWN or UP -> BUKA OSD PLAYER (SmartTube Style)
          setIsOsdVisible(true);
          isOsdVisibleRef.current = true;
          setActiveTier(2);
          activeTierRef.current = 2;
          setScrubTime(currentTimeRef.current);
          resetOsdTimer();
        }
        return;
      }

      // 4. Tingkat 2 (Seekbar): OSD Terbuka
      if (activeTierRef.current === 2) {
        resetOsdTimer();
        if (keyCode === 21 || keyCode === 89) { // LEFT -> Scrub backward (SmartTube Accelerated)
          const step = getScrubStep();
          setScrubTime((prev) => {
            const next = Math.max(0, prev - step);
            scrubTimeRef.current = next;
            return next;
          });
          showCenterToast('rewind', `-${step}s`, 600);
        } else if (keyCode === 22 || keyCode === 90) { // RIGHT -> Scrub forward (SmartTube Accelerated)
          const step = getScrubStep();
          setScrubTime((prev) => {
            const next = Math.min(durationRef.current, prev + step);
            scrubTimeRef.current = next;
            return next;
          });
          showCenterToast('forward', `+${step}s`, 600);
        } else if (keyCode === 23 || keyCode === 66 || keyCode === 160 || keyCode === 62) { // OK / ENTER / SPACE -> Confirm seek
          scrubStreakRef.current = 0;
          setScrubStep(10);
          const target = scrubTimeRef.current;
          setCurrentTime(target);
          sendQuettaCommand('SEEK', target);
          showCenterToast('info', `Lompat ke ${formatTime(target)}`);
        } else if (keyCode === 20) { // DOWN -> Move to Tingkat 3 (Episode, Server, Speed buttons)
          scrubStreakRef.current = 0;
          setScrubStep(10);
          setActiveTier(3);
          activeTierRef.current = 3;
          setTier3Selection('episodes');
          tier3SelectionRef.current = 'episodes';
        } else if (keyCode === 19) { // UP -> Tutup OSD, Kembali ke Watch Fullscreen (SmartTube Style)
          scrubStreakRef.current = 0;
          setScrubStep(10);
          setIsOsdVisible(false);
          isOsdVisibleRef.current = false;
          setActiveTier(1);
          activeTierRef.current = 1;
        }
        return;
      }

      // 5. Tingkat 3 (Barisan Pilih Episode, Server & Kecepatan): OSD Terbuka
      if (activeTierRef.current === 3) {
        resetOsdTimer();
        if (keyCode === 21) { // LEFT
          if (tier3SelectionRef.current === 'speed') {
            setTier3Selection('servers');
            tier3SelectionRef.current = 'servers';
          } else {
            setTier3Selection('episodes');
            tier3SelectionRef.current = 'episodes';
          }
        } else if (keyCode === 22) { // RIGHT
          if (tier3SelectionRef.current === 'episodes') {
            setTier3Selection('servers');
            tier3SelectionRef.current = 'servers';
          } else {
            setTier3Selection('speed');
            tier3SelectionRef.current = 'speed';
          }
        } else if (keyCode === 19) { // UP -> Return to Tingkat 2 (Seekbar)
          setActiveTier(2);
          activeTierRef.current = 2;
          setScrubTime(currentTimeRef.current);
        } else if (keyCode === 23 || keyCode === 66 || keyCode === 160 || keyCode === 62) { // OK / ENTER / SPACE
          if (tier3SelectionRef.current === 'speed') {
            cyclePlaybackSpeed();
          } else if (tier3SelectionRef.current === 'servers') {
            openDrawer('servers');
            setActiveTier(4);
            activeTierRef.current = 4;
          } else {
            openDrawer('episodes');
            setActiveTier(4);
            activeTierRef.current = 4;
          }
        }
        return;
      }
    });

    return () => sub.remove();
  }, [
    getScrubStep,
    cyclePlaybackSpeed,
    togglePlayPause,
    handleSeek,
    openDrawer,
    closeDrawer,
    resetOsdTimer,
    showCenterToast,
    onEpisodeChange,
    onClose,
  ]);

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

  const displayTime = activeTier === 2 ? scrubTime : currentTime;
  const displayProgress = duration > 0 ? (displayTime / duration) * 100 : 0;
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

      {/* 2. Center Action Toast (Appears only on Play/Pause, Seek, or Resume) */}
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

      {/* 4. On-Screen Display (OSD) Overlay - SmartTube Style (Mounted only when isOsdVisible) */}
      {isOsdVisible && (
        <View style={styles.osdOverlay} pointerEvents="box-none">
          {/* Top Bar: Back & Title */}
          <View style={styles.topBar}>
            <Pressable
              focusable={true}
              onPress={() => {
                setIsOsdVisible(false);
                setActiveTier(1);
              }}
              style={({ focused }: any) => [
                styles.backButton,
                focused && styles.backButtonFocused,
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
          </View>

          {/* Bottom Bar: Seekbar, Time, and TV Remote Quick Action Row */}
          <View style={styles.bottomBarGradient}>
            {/* Tingkat 2: Interactive TV Seekbar with High-Contrast #FFFFFF Outline */}
            <Pressable
              focusable={false}
              onPress={() => {
                const target = scrubTime;
                setCurrentTime(target);
                sendQuettaCommand('SEEK', target);
                showCenterToast('info', `Lompat ke ${formatTime(target)}`);
              }}
              style={[
                styles.seekbarContainer,
                activeTier === 2 && styles.seekbarContainerFocused,
              ]}
            >
              <View style={styles.seekbarRailWrapper}>
                <View style={[styles.seekbarRail, activeTier === 2 && styles.seekbarRailFocused]}>
                  <View style={[styles.seekbarBufferTrack, { width: `${bufferPercent}%` }]} />
                  <View style={[styles.seekbarProgressTrack, { width: `${displayProgress}%` }]} />
                </View>
                <View
                  style={[
                    styles.seekbarThumb,
                    { left: `${Math.max(0, Math.min(98, displayProgress))}%` },
                    activeTier === 2 && styles.seekbarThumbFocused,
                  ]}
                />
              </View>

              {/* Floating Scrub Preview Badge when activeTier === 2 */}
              {activeTier === 2 && (
                <View style={styles.seekbarScrubBadge}>
                  <Text style={styles.seekbarScrubBadgeText}>
                    ◄/► [±{scrubStep}s] {formatTime(scrubTime)} • OK: Lompat
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Time & Stream Meta Row */}
            <View style={styles.bottomMetaRow}>
              <View style={styles.timeWrapper}>
                <Text style={styles.timeCurrent}>
                  {formatTime(activeTier === 2 ? scrubTime : currentTime)}
                </Text>
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

            {/* Tingkat 3: Barisan Pilih Episode, Server & Kecepatan */}
            <View style={styles.quickNavRow}>
              <Pressable
                focusable={false}
                onPress={() => {
                  setTier3Selection('episodes');
                  tier3SelectionRef.current = 'episodes';
                  openDrawer('episodes');
                  setActiveTier(4);
                  activeTierRef.current = 4;
                }}
                style={[
                  styles.quickNavBtn,
                  activeTier === 3 && tier3Selection === 'episodes' && styles.quickNavBtnFocused,
                ]}
              >
                <ListVideo
                  size={20}
                  color={activeTier === 3 && tier3Selection === 'episodes' ? '#FFFFFF' : Colors.primary}
                />
                <Text
                  style={[
                    styles.quickNavBtnText,
                    activeTier === 3 && tier3Selection === 'episodes' && styles.quickNavBtnTextFocused,
                  ]}
                >
                  Daftar Episode ({watchData?.episodes?.length || 0})
                </Text>
              </Pressable>

              <Pressable
                focusable={false}
                onPress={() => {
                  setTier3Selection('servers');
                  tier3SelectionRef.current = 'servers';
                  openDrawer('servers');
                  setActiveTier(4);
                  activeTierRef.current = 4;
                }}
                style={[
                  styles.quickNavBtn,
                  activeTier === 3 && tier3Selection === 'servers' && styles.quickNavBtnFocused,
                ]}
              >
                <ServerIcon
                  size={20}
                  color={activeTier === 3 && tier3Selection === 'servers' ? '#FFFFFF' : Colors.primary}
                />
                <Text
                  style={[
                    styles.quickNavBtnText,
                    activeTier === 3 && tier3Selection === 'servers' && styles.quickNavBtnTextFocused,
                  ]}
                >
                  Pilihan Server ({watchData?.servers?.length || 0})
                </Text>
              </Pressable>

              <Pressable
                focusable={false}
                onPress={cyclePlaybackSpeed}
                style={[
                  styles.quickNavBtn,
                  activeTier === 3 && tier3Selection === 'speed' && styles.quickNavBtnFocused,
                ]}
              >
                <Tv
                  size={18}
                  color={activeTier === 3 && tier3Selection === 'speed' ? '#FFFFFF' : Colors.primary}
                />
                <Text
                  style={[
                    styles.quickNavBtnText,
                    activeTier === 3 && tier3Selection === 'speed' && styles.quickNavBtnTextFocused,
                  ]}
                >
                  ⚡ {playbackSpeed}x
                </Text>
              </Pressable>

              <View style={styles.dpadHintContainer}>
                <Text style={styles.dpadHintText}>
                  {activeTier === 2
                    ? '◄/► Geser Waktu • OK: Lompat • ▲ Tutup • ▼ Turun'
                    : '◄/► Pilih Menu • OK: Buka • ▲ Naik ke Seekbar'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

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
              <View
                style={[
                  styles.drawerTabButton,
                  drawerTab === 'episodes' && styles.drawerTabButtonActive,
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
              </View>

              <View
                style={[
                  styles.drawerTabButton,
                  drawerTab === 'servers' && styles.drawerTabButtonActive,
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
              </View>
            </View>

            <Pressable
              focusable={false}
              onPress={closeDrawer}
              style={styles.closeDrawerButton}
            >
              <ChevronDown size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Drawer Content Items */}
          <ScrollView
            ref={drawerScrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.drawerScrollList}
          >
            {drawerTab === 'episodes' ? (
              (watchData?.episodes || []).map((ep, idx) => {
                const isCurrent = ep.slug === episodeSlug;
                const isFocused = idx === drawerIndex;
                const epLabel = extractEpisodeNumber(ep.title, idx);

                return (
                  <Pressable
                    key={`drawer-ep-${ep.slug}-${idx}`}
                    focusable={false}
                    onPress={() => {
                      closeDrawer();
                      setIsOsdVisible(false);
                      isOsdVisibleRef.current = false;
                      setActiveTier(1);
                      activeTierRef.current = 1;
                      onEpisodeChange?.(ep.slug, epLabel);
                    }}
                    style={[
                      styles.drawerCardItem,
                      isCurrent && styles.drawerCardItemActive,
                      isFocused && styles.drawerCardItemFocused,
                    ]}
                  >
                    <View style={styles.episodeCardTopRow}>
                      <Tv size={16} color={isFocused ? '#FFFFFF' : isCurrent ? Colors.primary : '#FFFFFF'} />
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
                      <View style={[styles.playingBadge, isFocused && { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]}>
                        <Text style={styles.playingBadgeText}>SEDANG DIPUTAR</Text>
                      </View>
                    ) : (
                      <Text style={[styles.episodeReadyHint, isFocused && { color: '#FFFFFF' }]}>Tekan OK untuk tonton</Text>
                    )}
                  </Pressable>
                );
              })
            ) : (
              (watchData?.servers || []).map((s, idx) => {
                const isSelected = currentServer?.label === s.label;
                const isFocused = idx === drawerIndex;
                return (
                  <Pressable
                    key={`drawer-srv-${idx}`}
                    focusable={false}
                    onPress={() => {
                      setCurrentServer(s);
                      closeDrawer();
                      setIsOsdVisible(false);
                      isOsdVisibleRef.current = false;
                      setActiveTier(1);
                      activeTierRef.current = 1;
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
                      {isSelected && <Check size={16} color={isFocused ? '#FFFFFF' : Colors.primary} />}
                    </View>
                    <Text style={[styles.serverCardSub, isFocused && { color: 'rgba(255, 255, 255, 0.85)' }]}>
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
    borderWidth: 3,
    backgroundColor: Colors.primary,
    transform: [{ scale: 1.1 }],
    elevation: 12,
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
  bottomBarGradient: {
    paddingHorizontal: 36,
    paddingBottom: 24,
    paddingTop: 16,
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
  },
  seekbarContainer: {
    height: 42,
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  seekbarContainerFocused: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 12,
  },
  seekbarRailWrapper: {
    height: 16,
    justifyContent: 'center',
    width: '100%',
  },
  seekbarRail: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  seekbarRailFocused: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.38)',
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
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    top: 0,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  seekbarThumbFocused: {
    width: 22,
    height: 22,
    borderRadius: 11,
    top: -3,
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    backgroundColor: Colors.primary,
    elevation: 12,
  },
  seekbarScrubBadge: {
    position: 'absolute',
    top: -24,
    alignSelf: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 16,
  },
  seekbarScrubBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
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
    borderWidth: 3,
    backgroundColor: Colors.primary,
    transform: [{ scale: 1.06 }],
    elevation: 12,
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
    borderWidth: 2.5,
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
