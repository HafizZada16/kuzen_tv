import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Colors } from '../constants/Colors';
import { MediaItem } from '../services/mediaService';
import { TVFocusableCard } from './TVFocusableCard';

interface TVMediaRowProps {
  title: string;
  icon?: React.ReactNode;
  items: MediaItem[];
  onSelectItem: (item: MediaItem) => void;
  cardWidth?: number;
  cardHeight?: number;
}

export const TVMediaRow: React.FC<TVMediaRowProps> = ({
  title,
  icon,
  items,
  onSelectItem,
  cardWidth = 180,
  cardHeight = 260,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.rowContainer}>
      {/* Category Section Header */}
      <View style={styles.headerRow}>
        {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {/* Horizontal Cards ScrollView */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item, index) => (
          <TVFocusableCard
            key={`${item.slug}-${index}`}
            title={item.title}
            subtitle={item.status || (item.type === 'donghua' ? 'Donghua' : 'Anime')}
            thumb={item.thumb}
            rating={item.rating}
            badge={item.status}
            width={cardWidth}
            height={cardHeight}
            onPress={() => onSelectItem(item)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  rowContainer: {
    marginBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingRight: 40,
    paddingLeft: 4,
  },
});

