import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/Colors';
import {
  MediaItem,
  AnimeDetail,
  fetchAnimeDetail,
  fetchDonghuaDetail,
} from '../services/mediaService';
import { X, Play, Star, Calendar, CheckCircle } from 'lucide-react-native';

interface TVMediaModalProps {
  visible: boolean;
  item: MediaItem | null;
  onClose: () => void;
  onSelectEpisode: (episode: { title: string; slug: string }, media: MediaItem) => void;
}

export const TVMediaModal: React.FC<TVMediaModalProps> = ({
  visible,
  item,
  onClose,
  onSelectEpisode,
}) => {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<AnimeDetail | null>(null);
  const [focusedEpisode, setFocusedEpisode] = useState<string | null>(null);
  const [focusedClose, setFocusedClose] = useState(false);

  useEffect(() => {
    if (!visible || !item) {
      setDetail(null);
      setLoading(true);
      return;
    }

    let isMounted = true;
    async function loadDetail() {
      setLoading(true);
      try {
        let res: AnimeDetail;
        if (item?.type === 'donghua') {
          res = await fetchDonghuaDetail(item.slug);
        } else {
          res = await fetchAnimeDetail(item!.slug);
        }
        if (isMounted) {
          setDetail(res);
        }
      } catch (err) {
        console.error('Failed to load media detail:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDetail();
    return () => {
      isMounted = false;
    };
  }, [visible, item]);

  if (!visible || !item) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          {/* Top Header Bar */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTagRow}>
              <View style={styles.tagBadge}>
                <Text style={styles.tagText}>
                  {item.type === 'donghua' ? 'DONGHUA' : 'ANIME'}
                </Text>
              </View>
              {detail?.rating ? (
                <View style={styles.ratingBadge}>
                  <Star size={13} color="#FBBF24" fill="#FBBF24" />
                  <Text style={styles.ratingText}>{detail.rating}</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onFocus={() => setFocusedClose(true)}
              onBlur={() => setFocusedClose(false)}
              onPress={onClose}
              style={[
                styles.closeButton,
                focusedClose && styles.closeButtonFocused,
              ]}
            >
              <X size={20} color={focusedClose ? '#FFFFFF' : Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Memuat Daftar Episode...</Text>
            </View>
          ) : (
            <View style={styles.bodyRow}>
              {/* Left Column: Poster & Metadata */}
              <View style={styles.leftCol}>
                <Image
                  source={{ uri: detail?.thumb || item.thumb }}
                  style={styles.modalPoster}
                  resizeMode="cover"
                />

                <Text style={styles.modalTitle} numberOfLines={2}>
                  {detail?.title || item.title}
                </Text>

                <View style={styles.metaInfoBox}>
                  <Text style={styles.metaText}>
                    Status: <Text style={{ color: '#FFFFFF' }}>{detail?.status || 'Ongoing'}</Text>
                  </Text>
                  {detail?.genres && detail.genres.length > 0 && (
                    <Text style={styles.metaText} numberOfLines={2}>
                      Genre: <Text style={{ color: '#FFFFFF' }}>{detail.genres.slice(0, 4).join(', ')}</Text>
                    </Text>
                  )}
                </View>

                <ScrollView style={styles.synopsisScroll}>
                  <Text style={styles.synopsisText}>
                    {detail?.synopsis || 'Tidak ada sinopsis tersedia.'}
                  </Text>
                </ScrollView>
              </View>

              {/* Right Column: Episode Grid / List */}
              <View style={styles.rightCol}>
                <Text style={styles.episodeSectionTitle}>
                  Pilih Episode ({detail?.episodes?.length || 0})
                </Text>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.episodeListContainer}
                >
                  {(detail?.episodes || []).map((ep, idx) => {
                    const isEpFocused = focusedEpisode === ep.slug;
                    return (
                      <TouchableOpacity
                        key={`${ep.slug}-${idx}`}
                        activeOpacity={0.85}
                        hasTVPreferredFocus={idx === 0}
                        onFocus={() => setFocusedEpisode(ep.slug)}
                        onBlur={() => setFocusedEpisode(null)}
                        onPress={() => onSelectEpisode(ep, item)}
                        style={[
                          styles.episodeButton,
                          isEpFocused && styles.episodeButtonFocused,
                        ]}
                      >
                        <Play
                          size={16}
                          color={isEpFocused ? '#FFFFFF' : Colors.primary}
                          fill={isEpFocused ? '#FFFFFF' : 'transparent'}
                        />
                        <Text
                          style={[
                            styles.episodeButtonText,
                            isEpFocused && styles.episodeButtonTextFocused,
                          ]}
                          numberOfLines={1}
                        >
                          {ep.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 32,
  },
  modalContent: {
    width: '100%',
    height: '100%',
    backgroundColor: '#121212',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderMuted,
    paddingBottom: 12,
  },
  headerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tagBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  closeButtonFocused: {
    backgroundColor: Colors.primary,
    borderColor: '#FFFFFF',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: Colors.textMuted,
    fontSize: 15,
  },
  bodyRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 28,
  },
  leftCol: {
    width: 320,
    borderRightWidth: 1,
    borderRightColor: Colors.borderMuted,
    paddingRight: 24,
  },
  modalPoster: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#1E1E1E',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 8,
  },
  metaInfoBox: {
    marginBottom: 10,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  synopsisScroll: {
    flex: 1,
  },
  synopsisText: {
    fontSize: 12,
    color: '#B0B0B0',
    lineHeight: 18,
  },
  rightCol: {
    flex: 1,
  },
  episodeSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  episodeListContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 24,
  },
  episodeButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.borderMuted,
    gap: 10,
  },
  episodeButtonFocused: {
    backgroundColor: Colors.primary, // Kuzen Orange
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.03 }],
    elevation: 8,
  },
  episodeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  episodeButtonTextFocused: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

