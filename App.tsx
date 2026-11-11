import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
} from 'react-native';
import { Colors } from './src/constants/Colors';
import { TVSidebar, NavTabId, COLLAPSED_WIDTH } from './src/components/TVSidebar';
import { HomeScreen } from './src/screens/HomeScreen';
import { AnimeScreen } from './src/screens/AnimeScreen';
import { DonghuaScreen } from './src/screens/DonghuaScreen';
import { MovieScreen } from './src/screens/MovieScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { TVNativePlayer } from './src/components/player/TVNativePlayer';
import { MediaItem } from './src/services/mediaService';
import { HistoryItem } from './src/services/userService';

interface ActiveEpisodeState {
  media: MediaItem;
  episode: { title: string; slug: string };
  episodes?: { title: string; slug: string }[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>('home');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [activePlayback, setActivePlayback] = useState<ActiveEpisodeState | null>(null);

  const handleSelectMedia = (item: MediaItem) => {
    setSelectedMedia(item);
  };

  const handleSelectHistory = (history: HistoryItem) => {
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
    media: MediaItem,
    episodes?: { title: string; slug: string }[]
  ) => {
    setActivePlayback({ media, episode, episodes });
  };

  const handleEpisodeChange = (newEpisodeSlug: string, newEpisodeTitle: string) => {
    if (activePlayback) {
      setActivePlayback({
        media: activePlayback.media,
        episode: { slug: newEpisodeSlug, title: newEpisodeTitle },
        episodes: activePlayback.episodes,
      });
    }
  };

  const renderActiveScreen = () => {
    // If a media is selected, render the full-page Netflix-style Detail Screen
    if (selectedMedia) {
      return (
        <DetailScreen
          item={selectedMedia}
          onBack={() => setSelectedMedia(null)}
          onSelectEpisode={handleSelectEpisode}
        />
      );
    }

    switch (activeTab) {
      case 'home':
        return <HomeScreen onSelectItem={handleSelectMedia} />;
      case 'anime':
        return <AnimeScreen onSelectItem={handleSelectMedia} />;
      case 'donghua':
        return <DonghuaScreen onSelectItem={handleSelectMedia} />;
      case 'movies':
        return <MovieScreen onSelectItem={handleSelectMedia} />;
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

      {/* Main Content Viewport (offset by 72px for the slim collapsed rail) */}
      <View
        style={[
          styles.mainViewport,
          activePlayback ? { display: 'none' } : undefined,
        ]}
      >
        {renderActiveScreen()}
      </View>

      {/* YouTube TV Collapsible Floating Sidebar Rail */}
      {!activePlayback && (
        <TVSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setSelectedMedia(null);
            setActiveTab(tab);
          }}
        />
      )}

      {/* Native TV Video Player Overlay (Full-screen) */}
      {activePlayback && (
        <TVNativePlayer
          animeSlug={activePlayback.media.slug}
          animeTitle={activePlayback.media.title}
          animeThumb={activePlayback.media.thumb}
          episodeSlug={activePlayback.episode.slug}
          episodeTitle={activePlayback.episode.title}
          episodes={activePlayback.episodes}
          source={
            activePlayback.media.type === 'donghua'
              ? 'anichin'
              : activePlayback.media.type === 'movie'
              ? 'movie'
              : 'otakudesu'
          }
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
    backgroundColor: Colors.background, // Deep dark TV background #0a0a0a
  },
  mainViewport: {
    flex: 1,
    paddingTop: 24,
    paddingRight: 36,
    paddingLeft: COLLAPSED_WIDTH + 24, // 72px rail + 24px margin
  },
});
