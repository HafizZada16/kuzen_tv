import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, Text } from 'react-native';
import { Colors } from '../constants/Colors';
import {
  fetchOngoingAnime,
  fetchPopularDonghua,
  fetchOngoingDonghua,
  MediaItem,
} from '../services/mediaService';
import { fetchDiscoverMovies } from '../services/movieService';
import { TVHeroBanner } from '../components/TVHeroBanner';
import { TVMediaRow } from '../components/TVMediaRow';
import { Flame, Sparkles, Film, Tv } from 'lucide-react-native';

interface HomeScreenProps {
  onSelectItem: (item: MediaItem) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectItem }) => {
  const [loading, setLoading] = useState(true);
  const [ongoingAnime, setOngoingAnime] = useState<MediaItem[]>([]);
  const [popularDonghua, setPopularDonghua] = useState<MediaItem[]>([]);
  const [ongoingDonghua, setOngoingDonghua] = useState<MediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [actionMovies, setActionMovies] = useState<MediaItem[]>([]);
  const [featuredItem, setFeaturedItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [anime, popDonghua, onDonghua, popMovies, actMovies] = await Promise.all([
          fetchOngoingAnime(1),
          fetchPopularDonghua(1),
          fetchOngoingDonghua(1),
          fetchDiscoverMovies(1, '', 'popularity.desc'),
          fetchDiscoverMovies(1, '28', 'popularity.desc'),
        ]);

        setOngoingAnime(anime);
        setPopularDonghua(popDonghua);
        setOngoingDonghua(onDonghua);
        setPopularMovies(popMovies);
        setActionMovies(actMovies);

        if (anime.length > 0) {
          setFeaturedItem(anime[0]);
        } else if (popMovies.length > 0) {
          setFeaturedItem(popMovies[0]);
        } else if (popDonghua.length > 0) {
          setFeaturedItem(popDonghua[0]);
        }
      } catch (err) {
        console.error('Failed to load home screen media:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Memuat Katalog Rekomendasi...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* Hero Banner Spotlight */}
      <TVHeroBanner
        item={featuredItem}
        onPlayPress={onSelectItem}
        onDetailPress={onSelectItem}
      />

      {/* Row 1: Film Bioskop Populer */}
      {popularMovies.length > 0 && (
        <TVMediaRow
          title="Film Bioskop Populer (FrameX)"
          icon={<Film size={20} color={Colors.primary} />}
          items={popularMovies}
          onSelectItem={onSelectItem}
        />
      )}

      {/* Row 2: Anime Ongoing */}
      <TVMediaRow
        title="Anime Terbaru (Otakudesu)"
        icon={<Flame size={20} color={Colors.primary} />}
        items={ongoingAnime}
        onSelectItem={onSelectItem}
      />

      {/* Row 3: Film Aksi & Bioskop Pilihan */}
      {actionMovies.length > 0 && (
        <TVMediaRow
          title="Film Aksi Pilihan (FrameX)"
          icon={<Tv size={20} color={Colors.primary} />}
          items={actionMovies}
          onSelectItem={onSelectItem}
        />
      )}

      {/* Row 4: Donghua Populer */}
      <TVMediaRow
        title="Donghua Populer (Anichin)"
        icon={<Sparkles size={20} color={Colors.primary} />}
        items={popularDonghua}
        onSelectItem={onSelectItem}
      />

      {/* Row 5: Donghua Ongoing */}
      <TVMediaRow
        title="Donghua Terbaru (Anichin)"
        icon={<Film size={20} color={Colors.primary} />}
        items={ongoingDonghua}
        onSelectItem={onSelectItem}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 15,
    marginTop: 16,
  },
});

