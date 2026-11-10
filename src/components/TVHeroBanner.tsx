import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { MediaItem } from '../services/mediaService';
import { Play, Info, Star } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TVHeroBannerProps {
  item: MediaItem | null;
  onPlayPress: (item: MediaItem) => void;
  onDetailPress: (item: MediaItem) => void;
}

export const TVHeroBanner: React.FC<TVHeroBannerProps> = ({
  item,
  onPlayPress,
  onDetailPress,
}) => {
  const [focusedBtn, setFocusedBtn] = useState<'play' | 'info' | null>(null);

  if (!item) return null;

  return (
    <View style={styles.bannerWrapper}>
      <ImageBackground
        source={{ uri: item.thumb }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Dark Left-to-Right and Bottom-to-Top Overlay Gradients */}
        <View style={styles.gradientOverlay}>
          <View style={styles.contentContainer}>
            {/* Meta Row */}
            <View style={styles.metaRow}>
              <View style={styles.sourceTag}>
                <Text style={styles.sourceText}>
                  {item.type === 'donghua' ? 'DONGHUA SPOTLIGHT' : 'ANIME SPOTLIGHT'}
                </Text>
              </View>

              {item.status ? (
                <View style={styles.statusTag}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              ) : null}

              {item.rating ? (
                <View style={styles.ratingBadge}>
                  <Star size={13} color="#FBBF24" fill="#FBBF24" />
                  <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
              ) : null}
            </View>

            {/* Title */}
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>

            {/* Description Snippet */}
            <Text style={styles.description} numberOfLines={3}>
              Tonton rilis episode terbaru dalam kualitas Full HD 1080p dengan server HLS cepat dan subtitle Indonesia.
            </Text>

            {/* Action Buttons Row */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                hasTVPreferredFocus={true}
                onFocus={() => setFocusedBtn('play')}
                onBlur={() => setFocusedBtn(null)}
                onPress={() => onPlayPress(item)}
                style={[
                  styles.actionButton,
                  styles.playButton,
                  focusedBtn === 'play' && styles.playButtonFocused,
                ]}
              >
                <Play
                  size={18}
                  color={focusedBtn === 'play' ? '#FFFFFF' : '#0a0a0a'}
                  fill={focusedBtn === 'play' ? '#FFFFFF' : '#0a0a0a'}
                />
                <Text
                  style={[
                    styles.playButtonText,
                    focusedBtn === 'play' && styles.playButtonTextFocused,
                  ]}
                >
                  Tonton Sekarang
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                onFocus={() => setFocusedBtn('info')}
                onBlur={() => setFocusedBtn(null)}
                onPress={() => onDetailPress(item)}
                style={[
                  styles.actionButton,
                  styles.infoButton,
                  focusedBtn === 'info' && styles.infoButtonFocused,
                ]}
              >
                <Info
                  size={18}
                  color={focusedBtn === 'info' ? Colors.primary : Colors.textMuted}
                />
                <Text
                  style={[
                    styles.infoButtonText,
                    focusedBtn === 'info' && styles.infoButtonTextFocused,
                  ]}
                >
                  Detail Info
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerWrapper: {
    height: 340,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 28,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 10, 0.78)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  contentContainer: {
    maxWidth: 580,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sourceTag: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  sourceText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    color: '#E5E5E5',
    fontSize: 11,
    fontWeight: '600',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 34,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  playButton: {
    backgroundColor: '#FFFFFF',
  },
  playButtonFocused: {
    backgroundColor: Colors.primary, // Kuzen Orange
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.05 }],
    elevation: 8,
  },
  playButtonText: {
    color: '#0a0a0a',
    fontSize: 14,
    fontWeight: '700',
  },
  playButtonTextFocused: {
    color: '#FFFFFF',
  },
  infoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  infoButtonFocused: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(234, 88, 12, 0.25)',
    transform: [{ scale: 1.05 }],
  },
  infoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  infoButtonTextFocused: {
    color: Colors.primary,
  },
});

