import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '../constants/Colors';
import { Star, Play } from 'lucide-react-native';

interface TVFocusableCardProps {
  title: string;
  subtitle?: string;
  thumb: string;
  rating?: string;
  badge?: string;
  width?: number;
  height?: number;
  hasTVPreferredFocus?: boolean;
  onPress: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const TVFocusableCard: React.FC<TVFocusableCardProps> = ({
  title,
  subtitle,
  thumb,
  rating,
  badge,
  width = 145,
  height = 210,
  hasTVPreferredFocus = false,
  onPress,
  onFocus,
  onBlur,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.06,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1.0,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
    onBlur?.();
  };

  return (
    <Pressable
      focusable={true}
      hasTVPreferredFocus={hasTVPreferredFocus}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPress={onPress}
      style={styles.touchableWrapper}
    >
      <Animated.View
        style={[
          styles.cardContainer,
          { width, height, transform: [{ scale: scaleAnim }] },
          isFocused && styles.cardFocused,
        ]}
      >
        {/* Poster Image with Glide Native Downsampling & Recycling */}
        <Image
          source={{ uri: thumb || 'https://via.placeholder.com/300x450/161615/FFFFFF?text=No+Image' }}
          style={styles.posterImage}
          contentFit="cover"
          transition={150}
          recyclingKey={thumb}
          cachePolicy="memory-disk"
        />

        {/* Gradient Shadow Overlay at Bottom */}
        <View style={styles.imageOverlay} />

        {/* Top Badges (Rating & Status) */}
        <View style={styles.badgeRow}>
          {rating ? (
            <View style={styles.ratingBadge}>
              <Star size={9} color="#FBBF24" fill="#FBBF24" />
              <Text style={styles.ratingText}>{rating}</Text>
            </View>
          ) : null}

          {badge ? (
            <View style={styles.statusBadge}>
              <Text style={styles.badgeText} numberOfLines={1}>{badge}</Text>
            </View>
          ) : null}
        </View>

        {/* Focused Center Play Icon Indicator */}
        {isFocused && (
          <View style={styles.playIconContainer}>
            <View style={styles.playIconCircle}>
              <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </View>
        )}

        {/* Bottom Details */}
        <View style={styles.detailsContainer}>
          <Text
            style={[styles.title, isFocused && styles.titleFocused]}
            numberOfLines={2}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  touchableWrapper: {
    marginRight: 12,
    marginVertical: 6,
  },
  cardContainer: {
    borderRadius: 10,
    backgroundColor: Colors.card,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: 'transparent',
    elevation: 3,
  },
  cardFocused: {
    borderColor: '#FFFFFF', // Outline PUTIH cerah & jelas sesuai instruksi remote Android TV!
    borderWidth: 3,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
    elevation: 12,
  },
  posterImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  badgeRow: {
    position: 'absolute',
    top: 7,
    left: 7,
    right: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  ratingText: {
    color: '#FBBF24',
    fontSize: 9.5,
    fontWeight: '700',
  },
  statusBadge: {
    backgroundColor: 'rgba(234, 88, 12, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 80,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  playIconContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  playIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(234, 88, 12, 0.95)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  detailsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  title: {
    color: '#E5E5E5',
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 15,
  },
  titleFocused: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
});
