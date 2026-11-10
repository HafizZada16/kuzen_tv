import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator,
  ScrollView,
  BackHandler,
} from 'react-native';
import * as RN from 'react-native';

const useTVEventHandler = (RN as any).useTVEventHandler;
import { WebView } from 'react-native-webview';
import { Colors } from '../../constants/Colors';
import {
  fetchAnimeWatch,
  fetchDonghuaWatch,
  WatchResponse,
  ServerItem,
} from '../../services/mediaService';
import {
  addHistory,
  fetchHistoryBySlug,
} from '../../services/userService';
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
} from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AUTO_HIDE_DELAY = 4000; // 4 seconds auto-hide

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
  const [seekNotice, setSeekNotice] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'episodes' | 'servers'>('episodes');

  // --- Refs ---
  const webViewRef = useRef<WebView | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const seekNoticeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
        setWatchData(data);

        // Prioritas server: Kurama HLS atau Server pertama
        const servers = data.servers || [];
        const preferred = servers.find((s) => s.isHls) || servers[0] || null;
        setCurrentServer(preferred);

        // Resume playback jika ada riwayat tontonan di Supabase
        const history = await fetchHistoryBySlug(episodeSlug);
        if (history && history.current_time && history.current_time > 10) {
          const resumeTime = history.current_time;
          setCurrentTime(resumeTime);
          setSeekNotice(`Melanjutkan dari ${formatTime(resumeTime)}`);
          setTimeout(() => setSeekNotice(null), 2500);
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

  // --- 2. Auto-Hide Controls Timer (4 seconds) ---
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
          duration: 300,
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
  // RULE: Polling strictly checks `if (player)`. NEVER add `player.status === 'readyToPlay'`.
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

  // --- 4. Remote D-Pad Commands via Quetta Media Hijacking ---
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

  const togglePlayPause = () => {
    resetControlsTimer();
    sendQuettaCommand('TOGGLE');
    setIsPlaying((prev) => !prev);
    setSeekNotice(!isPlaying ? 'Putar' : 'Jeda');
    if (seekNoticeTimeoutRef.current) clearTimeout(seekNoticeTimeoutRef.current);
    seekNoticeTimeoutRef.current = setTimeout(() => setSeekNotice(null), 1200);
  };

  const handleSeek = (delta: number) => {
    resetControlsTimer();
    const nextTime = Math.max(0, Math.min(duration, currentTime + delta));
    setCurrentTime(nextTime);
    sendQuettaCommand('SEEK', nextTime);

    setSeekNotice(delta > 0 ? `+${delta}s ⮞` : `⮜ ${delta}s`);
    if (seekNoticeTimeoutRef.current) clearTimeout(seekNoticeTimeoutRef.current);
    seekNoticeTimeoutRef.current = setTimeout(() => setSeekNotice(null), 1000);
  };

  const openDrawer = (tab: 'episodes' | 'servers' = 'episodes') => {
    setDrawerTab(tab);
    setIsDrawerOpen(true);
    setShowControls(true);
    Animated.spring(drawerSlideAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerSlideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsDrawerOpen(false);
      resetControlsTimer();
    });
  };

  // --- 5. React Native TV Remote D-Pad Event Listener ---
  if (typeof useTVEventHandler === 'function') {
    useTVEventHandler((evt: any) => {
      if (!evt || !evt.eventType) return;

      if (isDrawerOpen) {
        if (evt.eventType === 'up' && evt.eventKeyAction === 0) {
          closeDrawer();
        }
        return;
      }

      switch (evt.eventType) {
        case 'select':
        case 'playPause':
          togglePlayPause();
          break;
        case 'left':
          handleSeek(-10);
          break;
        case 'right':
          handleSeek(10);
          break;
        case 'down':
          openDrawer('episodes');
          break;
        case 'up':
          resetControlsTimer();
          break;
      }
    });
  }

  // Handle hardware Back button on TV remote
  useEffect(() => {
    const onBackPress = () => {
      if (isDrawerOpen) {
        closeDrawer();
        return true;
      }
      onClose();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isDrawerOpen, onClose]);

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

  // Build WebView source & injection
  const streamUrl = currentServer?.url || watchData?.stream_url || '';
  const isDirectHls = currentServer?.isHls || streamUrl.includes('.m3u8') || streamUrl.includes('kurama');

  const webViewSource = isDirectHls
    ? { html: buildHlsPlayerHtml({ streamUrl, initTime: currentTime }), baseUrl: 'https://kuzen.web.id' }
    : { uri: streamUrl };

  const injectedJavaScript = !isDirectHls
    ? buildQuettaInjectedScript({ startTime: currentTime, totalDuration: duration })
    : undefined;

  return (
    <View style={styles.playerContainer}>
      {/* 1. Quetta Media Hijacking Isolated WebView Surface */}
      <View style={styles.videoSurface}>
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
            userAgent="Mozilla/5.0 (Linux; Android 12; Android TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 KuzenTV/1.0"
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

      {/* 2. Visual Center Seek / Play/Pause Toast Indicator */}
      {seekNotice && (
        <View style={styles.seekToastContainer}>
          <Text style={styles.seekToastText}>{seekNotice}</Text>
        </View>
      )}

      {/* 3. On-Screen Display (OSD) Overlay */}
      {showControls && (
        <Animated.View style={[styles.osdOverlay, { opacity: controlsOpacity }]}>
          {/* Top Bar: Back & Title */}
          <View style={styles.topBar}>
            <TouchableOpacity
              activeOpacity={0.8}
              hasTVPreferredFocus={true}
              onPress={onClose}
              style={styles.backButton}
            >
              <ArrowLeft size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.titleWrapper}>
              <Text style={styles.animeTitle} numberOfLines={1}>
                {animeTitle}
              </Text>
              <Text style={styles.episodeSubtitle} numberOfLines={1}>
                {episodeTitle} • {currentServer?.label || 'Quetta Player'}
              </Text>
            </View>

            <View style={styles.topActionsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => openDrawer('servers')}
                style={styles.topActionButton}
              >
                <ServerIcon size={18} color={Colors.primary} />
                <Text style={styles.topActionText}>Server</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => openDrawer('episodes')}
                style={styles.topActionButton}
              >
                <ListVideo size={18} color="#FFFFFF" />
                <Text style={styles.topActionText}>Episode</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Center Play/Pause & Seek Buttons */}
          <View style={styles.centerControls}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSeek(-10)}
              style={styles.circleButton}
            >
              <RotateCcw size={28} color="#FFFFFF" />
              <Text style={styles.seekBtnText}>-10s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={togglePlayPause}
              style={styles.centerPlayButton}
            >
              {isPlaying ? (
                <Pause size={38} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <Play size={38} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSeek(10)}
              style={styles.circleButton}
            >
              <RotateCw size={28} color="#FFFFFF" />
              <Text style={styles.seekBtnText}>+10s</Text>
            </TouchableOpacity>
          </View>

          {/* Netflix-Style Bottom Controls: Seekbar on TOP, Time & Info on BOTTOM */}
          <View style={styles.bottomBarGradient}>
            {/* Top of bottom bar: Horizontal Seekbar */}
            <View style={styles.seekbarContainer}>
              <View style={styles.seekbarRail}>
                {/* Buffered Track (Semi-transparent white) */}
                <View
                  style={[styles.seekbarBufferTrack, { width: `${bufferPercent}%` }]}
                />
                {/* Active Progress Track (Kuzen Brand Orange #ea580c) */}
                <View
                  style={[styles.seekbarProgressTrack, { width: `${progressPercent}%` }]}
                />
              </View>
              {/* Glowing Thumb Indicator */}
              <View
                style={[
                  styles.seekbarThumb,
                  { left: `${Math.max(0, Math.min(99, progressPercent))}%` },
                ]}
              />
            </View>

            {/* Bottom of bottom bar: Time & Stream Meta */}
            <View style={styles.bottomMetaRow}>
              {/* Left Side: Time Format 01:45 / 23:40 */}
              <View style={styles.timeWrapper}>
                <Text style={styles.timeCurrent}>{formatTime(currentTime)}</Text>
                <Text style={styles.timeDivider}> / </Text>
                <Text style={styles.timeTotal}>{formatTime(duration)}</Text>
              </View>

              {/* Right Side: Remote Hint & Stream Quality Badge */}
              <View style={styles.streamMetaWrapper}>
                <Text style={styles.remoteHint}>D-Pad Bawah: Buka Drawer OSD</Text>
                <View style={styles.qualityPill}>
                  <Text style={styles.qualityText}>
                    {currentServer?.isHls ? 'HLS CEPAT' : 'QUETTA STREAM'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* 4. Bottom OSD Drawer (Episode & Server Switcher) */}
      <Animated.View
        style={[
          styles.drawerContainer,
          { transform: [{ translateY: drawerSlideAnim }] },
        ]}
      >
        <View style={styles.drawerHeader}>
          <View style={styles.drawerTabsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setDrawerTab('episodes')}
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
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setDrawerTab('servers')}
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
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={closeDrawer}
            style={styles.closeDrawerButton}
          >
            <ChevronDown size={22} color="#FFFFFF" />
          </TouchableOpacity>
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
              return (
                <TouchableOpacity
                  key={`drawer-ep-${ep.slug}-${idx}`}
                  activeOpacity={0.85}
                  onPress={() => {
                    closeDrawer();
                    onEpisodeChange?.(ep.slug, ep.title);
                  }}
                  style={[
                    styles.drawerCardItem,
                    isCurrent && styles.drawerCardItemActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.drawerCardTitle,
                      isCurrent && styles.drawerCardTitleActive,
                    ]}
                    numberOfLines={2}
                  >
                    {ep.title}
                  </Text>
                  {isCurrent && (
                    <View style={styles.playingBadge}>
                      <Text style={styles.playingBadgeText}>SEDANG DIPUTAR</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          ) : (
            (watchData?.servers || []).map((s, idx) => {
              const isSelected = currentServer?.label === s.label;
              return (
                <TouchableOpacity
                  key={`drawer-srv-${idx}`}
                  activeOpacity={0.85}
                  onPress={() => {
                    setCurrentServer(s);
                    closeDrawer();
                    setSeekNotice(`Ganti ke ${s.label}`);
                    setTimeout(() => setSeekNotice(null), 1500);
                  }}
                  style={[
                    styles.drawerCardItem,
                    styles.serverCardItem,
                    isSelected && styles.drawerCardItemActive,
                  ]}
                >
                  <View style={styles.serverCardHeader}>
                    <Text
                      style={[
                        styles.drawerCardTitle,
                        isSelected && styles.drawerCardTitleActive,
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
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  playerContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 9999,
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
  seekToastContainer: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    zIndex: 1000,
  },
  seekToastText: {
    color: '#FFFFFF',
    fontSize: 18,
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
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
  },
  topActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  circleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  seekBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  centerPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary, // Kuzen Orange
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 12,
  },
  bottomBarGradient: {
    paddingHorizontal: 36,
    paddingBottom: 28,
    paddingTop: 16,
    backgroundColor: 'rgba(10, 10, 10, 0.88)',
  },
  seekbarContainer: {
    height: 20,
    justifyContent: 'center',
    marginBottom: 8,
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
    backgroundColor: 'rgba(255, 255, 255, 0.38)', // Semi-transparent white
  },
  seekbarProgressTrack: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.primary, // Kuzen Brand Orange #ea580c
  },
  seekbarThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    top: 3,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  bottomMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  remoteHint: {
    color: '#777777',
    fontSize: 12,
    fontStyle: 'italic',
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
  drawerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: '#141414',
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  drawerTabButtonActive: {
    backgroundColor: 'rgba(234, 88, 12, 0.2)',
    borderWidth: 1,
    borderColor: Colors.primary,
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
    backgroundColor: 'rgba(234, 88, 12, 0.12)',
  },
  serverCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drawerCardTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  drawerCardTitleActive: {
    color: Colors.primary,
    fontWeight: '700',
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
