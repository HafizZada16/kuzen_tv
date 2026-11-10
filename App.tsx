import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
} from 'react-native';
import { Colors } from './src/constants/Colors';
import { TVSidebar, NavTabId } from './src/components/TVSidebar';
import { HomeScreen } from './src/screens/HomeScreen';
import { AnimeScreen } from './src/screens/AnimeScreen';
import { DonghuaScreen } from './src/screens/DonghuaScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TVMediaModal } from './src/components/TVMediaModal';
import { TVNativePlayer } from './src/components/player/TVNativePlayer';
import { MediaItem } from './src/services/mediaService';
import { HistoryItem } from './src/services/userService';

interface ActiveEpisodeState {
  media: MediaItem;
  episode: { title: string; slug: string };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>('home');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activePlayback, setActivePlayback] = useState<ActiveEpisodeState | null>(null);

  const handleSelectMedia = (item: MediaItem) => {
    setSelectedMedia(item);
    setModalVisible(true);
  };

  const handleSelectHistory = (history: HistoryItem) => {
    // Langsung putar riwayat atau buka episode picker
    setActivePlayback({
      media: {
        title: history.anime_title,
        slug: history.anime_slug,
        thumb: history.anime_thumb,
        type: history.source === 'anichin' ? 'donghua' : 'anime',
      },
      episode: {
        title: history.episode_title,
        slug: history.episode_slug,
      },
    });
  };

  const handleSelectEpisode = (
    episode: { title: string; slug: string },
    media: MediaItem
  ) => {
    setModalVisible(false);
    setActivePlayback({ media, episode });
  };

  const handleEpisodeChange = (newEpisodeSlug: string, newEpisodeTitle: string) => {
    if (activePlayback) {
      setActivePlayback({
        media: activePlayback.media,
        episode: { slug: newEpisodeSlug, title: newEpisodeTitle },
      });
    }
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onSelectItem={handleSelectMedia} />;
      case 'anime':
        return <AnimeScreen onSelectItem={handleSelectMedia} />;
      case 'donghua':
        return <DonghuaScreen onSelectItem={handleSelectMedia} />;
      case 'history':
        return <HistoryScreen onSelectHistory={handleSelectHistory} />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeScreen onSelectItem={handleSelectMedia} />;
    }
  };

  return (
    <View style={styles.appContainer}>
      <StatusBar hidden />

      {/* YouTube TV Collapsible / Expandable Sidebar Rail */}
      <TVSidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
        }}
        onExpandedChange={setIsSidebarExpanded}
      />

      {/* Main Content Viewport */}
      <View style={styles.mainViewport}>
        {renderActiveScreen()}

        {/* Dimming Backdrop overlay when Sidebar is expanded (YouTube TV style) */}
        {isSidebarExpanded && (
          <View pointerEvents="none" style={styles.dimmingOverlay} />
        )}
      </View>

      {/* Media Detail & Episode Selector Modal */}
      <TVMediaModal
        visible={modalVisible}
        item={selectedMedia}
        onClose={() => setModalVisible(false)}
        onSelectEpisode={handleSelectEpisode}
      />

      {/* Native TV Video Player Overlay (Full-screen) */}
      {activePlayback && (
        <TVNativePlayer
          animeSlug={activePlayback.media.slug}
          animeTitle={activePlayback.media.title}
          animeThumb={activePlayback.media.thumb}
          episodeSlug={activePlayback.episode.slug}
          episodeTitle={activePlayback.episode.title}
          source={activePlayback.media.type === 'donghua' ? 'anichin' : 'otakudesu'}
          onClose={() => setActivePlayback(null)}
          onEpisodeChange={handleEpisodeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.background, // Deep dark TV background #0a0a0a
  },
  mainViewport: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 36,
  },
  dimmingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
});
