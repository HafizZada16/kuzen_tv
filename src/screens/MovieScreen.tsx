import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  Text,
  Pressable,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { MediaItem } from '../services/mediaService';
import {
  fetchDiscoverMovies,
  MOVIE_GENRES,
} from '../services/movieService';
import { TVHeroBanner } from '../components/TVHeroBanner';
import { TVMediaRow } from '../components/TVMediaRow';
import { TVFocusableCard } from '../components/TVFocusableCard';
import { Sparkles, Flame, Star, Film, Clapperboard } from 'lucide-react-native';

interface MovieScreenProps {
  onSelectItem: (item: MediaItem) => void;
}

export const MovieScreen: React.FC<MovieScreenProps> = ({ onSelectItem }) => {
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [focusedGenre, setFocusedGenre] = useState<string | null>(null);

  // Categorized Rows (when 'Semua Genre' is active)
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<MediaItem[]>([]);
  const [latestMovies, setLatestMovies] = useState<MediaItem[]>([]);
  const [featuredHero, setFeaturedHero] = useState<MediaItem | null>(null);

  // Genre Filtered List
  const [genreMovies, setGenreMovies] = useState<MediaItem[]>([]);
  const [isGenreLoading, setIsGenreLoading] = useState(false);

  // Load Initial Default Categories
  useEffect(() => {
    let isMounted = true;
    async function loadInitialMovies() {
      setLoading(true);
      try {
        const [popList, topList, latestList] = await Promise.all([
          fetchDiscoverMovies(1, '', 'popularity.desc'),
          fetchDiscoverMovies(1, '', 'vote_average.desc'),
          fetchDiscoverMovies(1, '', 'primary_release_date.desc'),
        ]);

        if (!isMounted) return;

        setPopularMovies(popList);
        setTopRatedMovies(topList);
        setLatestMovies(latestList);

        if (popList.length > 0) {
          setFeaturedHero(popList[0]);
        }
      } catch (err) {
        console.error('Failed to load initial movies:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitialMovies();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch movies when a specific genre is selected
  const handleSelectGenre = useCallback(async (genreValue: string) => {
    setSelectedGenre(genreValue);
    if (!genreValue) {
      setGenreMovies([]);
      return;
    }

    setIsGenreLoading(true);
    try {
      const res = await fetchDiscoverMovies(1, genreValue, 'popularity.desc');
      setGenreMovies(res);
    } catch (err) {
      console.error('Failed to load genre movies:', err);
      setGenreMovies([]);
    } finally {
      setIsGenreLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Memuat Katalog Film Bioskop...</Text>
      </View>
    );
  }

  const selectedGenreObj = MOVIE_GENRES.find((g) => g.value === selectedGenre);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <View style={styles.titleRow}>
          <Clapperboard size={26} color={Colors.primary} />
          <Text style={styles.pageTitle}>Katalog Film Bioskop (Movies)</Text>
        </View>
        <Text style={styles.pageSubtitle}>
          Koleksi Film Internasional & Box Office • Full HD 1080p • Sumber Resmi FrameX TV
        </Text>
      </View>

      {/* Hero Featured Movie (only when on All Genres) */}
      {!selectedGenre && featuredHero && (
        <TVHeroBanner
          item={featuredHero}
          onPlayPress={onSelectItem}
          onDetailPress={onSelectItem}
        />
      )}

      {/* Horizontal Genre Selector Bar (D-Pad focusable) */}
      <View style={styles.genreBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreBarContent}
        >
          {MOVIE_GENRES.map((genre) => {
            const isSelected = selectedGenre === genre.value;
            const isFocused = focusedGenre === genre.value;

            return (
              <Pressable
                key={`genre-${genre.value || 'all'}`}
                focusable={true}
                onFocus={() => setFocusedGenre(genre.value)}
                onBlur={() => setFocusedGenre(null)}
                onPress={() => handleSelectGenre(genre.value)}
                style={[
                  styles.genrePill,
                  isSelected && styles.genrePillSelected,
                  isFocused && styles.genrePillFocused,
                ]}
              >
                <Text
                  style={[
                    styles.genrePillText,
                    isSelected && styles.genrePillTextSelected,
                    isFocused && styles.genrePillTextFocused,
                  ]}
                >
                  {genre.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Content View: Specific Genre Selected vs. Default Categorized Rows */}
      {selectedGenre ? (
        <View style={styles.genreGridSection}>
          <View style={styles.genreHeaderRow}>
            <Film size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>
              Kategori Film: {selectedGenreObj?.label || 'Genre'}
            </Text>
          </View>

          {isGenreLoading ? (
            <View style={styles.genreLoadingBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Memuat film kategori {selectedGenreObj?.label}...</Text>
            </View>
          ) : genreMovies.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Tidak ada film ditemukan untuk kategori ini.</Text>
            </View>
          ) : (
            <View style={styles.genreGrid}>
              {genreMovies.map((movie, idx) => (
                <View key={`movie-${movie.slug}-${idx}`} style={styles.gridCardWrapper}>
                  <TVFocusableCard
                    title={movie.title}
                    subtitle={movie.status || 'Film Bioskop'}
                    thumb={movie.thumb}
                    rating={movie.rating}
                    badge={movie.rating ? `★ ${movie.rating}` : undefined}
                    width={180}
                    height={260}
                    onPress={() => onSelectItem(movie)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        <>
          {/* Row 1: Popular Movies */}
          <TVMediaRow
            title="Film Paling Populer (Box Office)"
            icon={<Flame size={20} color={Colors.primary} />}
            items={popularMovies}
            onSelectItem={onSelectItem}
          />

          {/* Row 2: Top Rated Movies */}
          <TVMediaRow
            title="Film Rating Tertinggi (Top Rated TMDB)"
            icon={<Star size={20} color="#FBBF24" />}
            items={topRatedMovies}
            onSelectItem={onSelectItem}
          />

          {/* Row 3: Latest Releases */}
          <TVMediaRow
            title="Rilis Bioskop Terbaru"
            icon={<Sparkles size={20} color={Colors.success} />}
            items={latestMovies}
            onSelectItem={onSelectItem}
          />
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 50,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  pageHeader: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 6,
  },
  genreBarContainer: {
    marginBottom: 24,
  },
  genreBarContent: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 6,
  },
  genrePill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#161616',
    borderWidth: 1.5,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genrePillSelected: {
    backgroundColor: 'rgba(234, 88, 12, 0.25)',
    borderColor: Colors.primary,
  },
  genrePillFocused: {
    borderColor: '#FFFFFF',
    borderWidth: 2.5,
    backgroundColor: Colors.primary,
    transform: [{ scale: 1.08 }],
    elevation: 8,
  },
  genrePillText: {
    color: '#A3A3A3',
    fontSize: 14,
    fontWeight: '700',
  },
  genrePillTextSelected: {
    color: Colors.primary,
  },
  genrePillTextFocused: {
    color: '#FFFFFF',
  },
  genreGridSection: {
    marginTop: 8,
  },
  genreHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  genreLoadingBox: {
    minHeight: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 15,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  gridCardWrapper: {
    marginBottom: 14,
  },
});

