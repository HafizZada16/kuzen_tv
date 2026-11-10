import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  ImageBackground,
  Pressable,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { Colors } from '../constants/Colors';
import {
  MediaItem,
  AnimeDetail,
  fetchAnimeDetail,
  fetchDonghuaDetail,
} from '../services/mediaService';
import { ArrowLeft, Play, Star, Calendar, CheckCircle, Tag } from 'lucide-react-native';

interface DetailScreenProps {
  item: MediaItem;
  onBack: () => void;
  onSelectEpisode: (episode: { title: string; slug: string }, media: MediaItem) => void;
}

/**
 * Anti-slop clean episode number extractor:
 * Converts verbose scraped titles like "Bleach Thousand Year Blood War Episode 05 Sub Indo"
 * into clean, concise TV button labels: "Episode 5"
 */
export function extractEpisodeNumber(title: string, index: number): string {
  if (!title) return `Episode ${index + 1}`;
  const cleaned = title.replace(/\s*(Subtitle Indonesia|Sub Indo)\s*$/i, '').trim();

  // 1. Matches "Episode 12", "Eps 12", "Ep 12", "Ep. 12", "Episode 12.5"
  const epMatch = cleaned.match(/(?:episode|eps|ep)\.?\s*(\d+(?:\.\d+)?)/i);
  if (epMatch && epMatch[1]) {
    const num = epMatch[1].startsWith('0') && epMatch[1].length > 1 ? parseInt(epMatch[1], 10) : epMatch[1];
    return `Episode ${num}`;
  }

  // 2. Matches standalone number or number at end
  const numMatch = cleaned.match(/\b(\d+)\b/);
  if (numMatch && numMatch[1]) {
    return `Episode ${parseInt(numMatch[1], 10)}`;
  }

  // 3. Special cases (Batch, OVA, Movie)
  if (/batch/i.test(cleaned)) return 'Batch';
  if (/ova/i.test(cleaned)) return 'OVA';
  if (/movie/i.test(cleaned)) return 'Movie';
  if (/special/i.test(cleaned)) return 'Special';

  return `Episode ${index + 1}`;
}

export const DetailScreen: React.FC<DetailScreenProps> = ({
  item,
  onBack,
  onSelectEpisode,
}) => {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<AnimeDetail | null>(null);
  const [focusedBtn, setFocusedBtn] = useState<string | null>(null);

  // Handle hardware Back button on TV remote
  useEffect(() => {
    const backAction = () => {
      onBack();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => subscription.remove();
  }, [onBack]);

  // Load detailed metadata & episode list
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        let res: AnimeDetail;
        if (item.type === 'donghua') {
          res = await fetchDonghuaDetail(item.slug);
        } else {
          res = await fetchAnimeDetail(item.slug);
        }
        if (isMounted) {
          setDetail(res);
        }
      } catch (err) {
        console.error('Failed to load anime/donghua detail:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [item.slug, item.type]);

  const episodes = detail?.episodes || [];
  const firstEpisode = episodes.length > 0 ? episodes[0] : null;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
    >
      {/* Top Header Row with Back Button */}
      <View style={styles.topNavRow}>
        <Pressable
          focusable={true}
          onFocus={() => setFocusedBtn('back')}
          onBlur={() => setFocusedBtn(null)}
          onPress={onBack}
          style={[
            styles.backButton,
            focusedBtn === 'back' && styles.backButtonFocused,
          ]}
        >
          <ArrowLeft size={18} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Kembali ke Katalog</Text>
        </Pressable>
      </View>

      {/* Hero Section: Poster Backdrop + Metadata */}
      <View style={styles.heroSection}>
        <Image
          source={{ uri: detail?.thumb || item.thumb }}
          style={styles.posterImage}
          resizeMode="cover"
        />

        <View style={styles.infoCol}>
          {/* Metadata Badges Row */}
          <View style={styles.metaRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {item.type === 'donghua' ? 'DONGHUA' : 'ANIME'}
              </Text>
            </View>

            {detail?.rating ? (
              <View style={styles.ratingBadge}>
                <Star size={13} color="#FBBF24" fill="#FBBF24" />
                <Text style={styles.ratingText}>{detail.rating}</Text>
              </View>
            ) : null}

            {detail?.status ? (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{detail.status}</Text>
              </View>
            ) : null}

            {detail?.info?.Total_Episode ? (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{detail.info.Total_Episode} Episode</Text>
              </View>
            ) : null}
          </View>

          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>
            {detail?.title || item.title}
          </Text>

          {/* Genres Chips */}
          {detail?.genres && detail.genres.length > 0 ? (
            <View style={styles.genresRow}>
              {detail.genres.slice(0, 5).map((genre, idx) => (
                <View key={`genre-${idx}`} style={styles.genreChip}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Synopsis */}
          <Text style={styles.synopsisText} numberOfLines={4}>
            {detail?.synopsis || 'Memuat sinopsis lengkap...'}
          </Text>

          {/* Primary Action Button (Play First Episode) */}
          {firstEpisode && (
            <Pressable
              focusable={true}
              hasTVPreferredFocus={true}
              onFocus={() => setFocusedBtn('play-primary')}
              onBlur={() => setFocusedBtn(null)}
              onPress={() => onSelectEpisode(firstEpisode, item)}
              style={[
                styles.primaryPlayButton,
                focusedBtn === 'play-primary' && styles.primaryPlayButtonFocused,
              ]}
            >
              <Play
                size={18}
                color={focusedBtn === 'play-primary' ? '#FFFFFF' : '#0a0a0a'}
                fill={focusedBtn === 'play-primary' ? '#FFFFFF' : '#0a0a0a'}
              />
              <Text
                style={[
                  styles.primaryPlayButtonText,
                  focusedBtn === 'play-primary' && styles.primaryPlayButtonTextFocused,
                ]}
              >
                Mulai Nonton ({extractEpisodeNumber(firstEpisode.title, 0)})
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Episodes Rail Section (Netflix TV Style) */}
      <View style={styles.episodesSection}>
        <View style={styles.episodesHeaderRow}>
          <Text style={styles.episodesSectionTitle}>Daftar Episode</Text>
          <Text style={styles.episodesTotalLabel}>
            {loading ? 'Memuat episode...' : `${episodes.length} Episode Tersedia`}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingMessage}>Memuat daftar episode...</Text>
          </View>
        ) : episodes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Tidak ada episode yang ditemukan untuk judul ini.</Text>
          </View>
        ) : (
          <View style={styles.episodesGrid}>
            {episodes.map((ep, idx) => {
              const epLabel = extractEpisodeNumber(ep.title, idx);
              const isFocused = focusedBtn === `ep-${ep.slug}`;

              return (
                <Pressable
                  key={`ep-btn-${ep.slug}-${idx}`}
                  focusable={true}
                  onFocus={() => setFocusedBtn(`ep-${ep.slug}`)}
                  onBlur={() => setFocusedBtn(null)}
                  onPress={() => onSelectEpisode(ep, item)}
                  style={[
                    styles.episodeButton,
                    isFocused && styles.episodeButtonFocused,
                  ]}
                >
                  <Play
                    size={14}
                    color={isFocused ? '#FFFFFF' : Colors.primary}
                    fill={isFocused ? '#FFFFFF' : 'transparent'}
                  />
                  <Text
                    style={[
                      styles.episodeButtonText,
                      isFocused && styles.episodeButtonTextFocused,
                    ]}
                    numberOfLines={1}
                  >
                    {epLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 60,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  backButtonFocused: {
    borderColor: '#FFFFFF', // Outline putih
    backgroundColor: Colors.primary,
    transform: [{ scale: 1.04 }],
    elevation: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  heroSection: {
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 24,
    gap: 28,
    marginBottom: 32,
  },
  posterImage: {
    width: 200,
    height: 290,
    borderRadius: 12,
    backgroundColor: Colors.card,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  typeBadge: {
    backgroundColor: 'rgba(234, 88, 12, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  typeBadgeText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: '#E5E5E5',
    fontSize: 11,
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  countText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 34,
    marginBottom: 12,
  },
  genresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  genreChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  genreText: {
    color: '#A0A0A0',
    fontSize: 11,
    fontWeight: '500',
  },
  synopsisText: {
    color: '#BDBDBD',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
    gap: 8,
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  primaryPlayButtonFocused: {
    backgroundColor: Colors.primary,
    borderColor: '#FFFFFF', // Outline putih
    transform: [{ scale: 1.05 }],
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 10,
    elevation: 12,
  },
  primaryPlayButtonText: {
    color: '#0a0a0a',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryPlayButtonTextFocused: {
    color: '#FFFFFF',
  },
  episodesSection: {
    marginTop: 8,
  },
  episodesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  episodesSectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  episodesTotalLabel: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  episodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  episodeButton: {
    width: '18.8%', // 5 episode buttons per row cleanly on landscape 1080p
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  episodeButtonFocused: {
    backgroundColor: Colors.primary, // Kuzen Orange
    borderColor: '#FFFFFF', // OUTLINE PUTIH TEBAL
    transform: [{ scale: 1.06 }],
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
    elevation: 10,
  },
  episodeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  episodeButtonTextFocused: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingMessage: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
});

