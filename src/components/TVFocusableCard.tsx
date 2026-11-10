import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Image,
  Animated,
} from 'react-native';
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
  width = 190,
  height = 270,
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
        {/* Poster Image */}
        <Image
          source={{ uri: thumb || 'https://via.placeholder.com/300x450/161615/FFFFFF?text=No+Image' }}
          style={styles.posterImage}
          resizeMode="cover"
        />

        {/* Gradient Shadow Overlay at Bottom */}
        <View style={styles.imageOverlay} />

        {/* Top Badges (Rating & Status) */}
        <View style={styles.badgeRow}>
          {rating ? (
            <View style={styles.ratingBadge}>
              <Star size={11} color="#FBBF24" fill="#FBBF24" />
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
              <Play size={22} color="#FFFFFF" fill="#FFFFFF" />
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
    marginRight: 18,
    marginVertical: 10,
  },
  cardContainer: {
    borderRadius: 12,
    backgroundColor: Colors.card,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
    elevation: 3,
  },
  cardFocused: {
    borderColor: '#FFFFFF', // Outline PUTIH cerah & jelas sesuai instruksi remote Android TV!
    borderWidth: 3.5,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 10,
    elevation: 14,
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
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  ratingText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    backgroundColor: 'rgba(234, 88, 12, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: 90,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  playIconContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  playIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(234, 88, 12, 0.95)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  detailsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
  },
  title: {
    color: '#E5E5E5',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  titleFocused: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  },
});
