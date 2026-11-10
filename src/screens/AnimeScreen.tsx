import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, Text } from 'react-native';
import { Colors } from '../constants/Colors';
import {
  fetchOngoingAnime,
  fetchCompletedAnime,
  MediaItem,
} from '../services/mediaService';
import { TVMediaRow } from '../components/TVMediaRow';
import { Flame, CheckCircle } from 'lucide-react-native';

interface AnimeScreenProps {
  onSelectItem: (item: MediaItem) => void;
}

export const AnimeScreen: React.FC<AnimeScreenProps> = ({ onSelectItem }) => {
  const [loading, setLoading] = useState(true);
  const [ongoing, setOngoing] = useState<MediaItem[]>([]);
  const [completed, setCompleted] = useState<MediaItem[]>([]);

  useEffect(() => {
    async function loadAnime() {
      try {
        const [ongoingList, completedList] = await Promise.all([
          fetchOngoingAnime(1),
          fetchCompletedAnime(1),
        ]);
        setOngoing(ongoingList);
        setCompleted(completedList);
      } catch (err) {
        console.error('Failed to load anime screen:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnime();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Memuat Katalog Anime...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Katalog Anime</Text>
        <Text style={styles.pageSubtitle}>Sumber resmi Otakudesu • Subtitle Indonesia</Text>
      </View>

      <TVMediaRow
        title="Anime Sedang Tayang (Ongoing)"
        icon={<Flame size={20} color={Colors.primary} />}
        items={ongoing}
        onSelectItem={onSelectItem}
      />

      <TVMediaRow
        title="Anime Tamat (Completed)"
        icon={<CheckCircle size={20} color={Colors.success} />}
        items={completed}
        onSelectItem={onSelectItem}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  pageHeader: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pageSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
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

