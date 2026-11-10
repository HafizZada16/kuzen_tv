import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
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
      toValue: 1.08,
      useNativeDriver: true,
      friction: 6,
      tension: 100,
    }).start();
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1.0,
      useNativeDriver: true,
      friction: 6,
      tension: 100,
    }).start();
    onBlur?.();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchableWrapper: {
    marginRight: 16,
    marginVertical: 12,
  },
  cardContainer: {
    borderRadius: 12,
    backgroundColor: Colors.card,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 3,
  },
  cardFocused: {
    borderColor: Colors.primary, // Kuzen Orange #ea580c
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.65,
    shadowRadius: 10,
    elevation: 12,
  },
  posterImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1C1C1E',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 10, 0.45)',
  },
  badgeRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    backgroundColor: 'rgba(234, 88, 12, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    maxWidth: 90,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  playIconContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  detailsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
  },
  titleFocused: {
    color: Colors.primary,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
});

