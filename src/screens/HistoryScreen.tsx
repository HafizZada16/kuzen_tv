import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, Text } from 'react-native';
import { Colors } from '../constants/Colors';
import { fetchHistory, HistoryItem } from '../services/userService';
import { TVFocusableCard } from '../components/TVFocusableCard';
import { History as HistoryIcon, Clock } from 'lucide-react-native';

interface HistoryScreenProps {
  onSelectHistory: (item: HistoryItem) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ onSelectHistory }) => {
  const [loading, setLoading] = useState(true);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);

  useEffect(() => {
    async function loadHistory() {
      try {
        const items = await fetchHistory(0, 50, true);
        setHistoryList(items);
      } catch (err) {
        console.error('Failed to load history screen:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Memuat Riwayat Menonton...</Text>
      </View>
    );
  }

  if (historyList.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Clock size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Belum Ada Riwayat Tontonan</Text>
        <Text style={styles.emptySubtitle}>
          Anime dan donghua yang Anda tonton di TV maupun aplikasi Kuzen Mobile akan tersinkronisasi di sini.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <View style={styles.pageHeader}>
        <View style={styles.headerTitleRow}>
          <HistoryIcon size={24} color={Colors.primary} />
          <Text style={styles.pageTitle}>Riwayat Tontonan</Text>
        </View>
        <Text style={styles.pageSubtitle}>
          Tersinkronisasi otomatis dengan database akun Kuzen
        </Text>
      </View>

      <View style={styles.gridContainer}>
        {historyList.map((item) => {
          let progressPercent = 0;
          if (item.current_time && item.total_duration && item.total_duration > 0) {
            progressPercent = Math.min(
              100,
              Math.round((item.current_time / item.total_duration) * 100)
            );
          }

          return (
            <View key={`history-${item.id}`} style={styles.cardItemWrapper}>
              <TVFocusableCard
                title={item.anime_title}
                subtitle={`${item.episode_title} • ${progressPercent > 0 ? `${progressPercent}%` : 'Baru mulai'}`}
                thumb={item.anime_thumb}
                badge={item.source === 'anichin' ? 'Donghua' : 'Anime'}
                width={180}
                height={260}
                onPress={() => onSelectHistory(item)}
              />
            </View>
          );
        })}
      </View>
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardItemWrapper: {
    marginBottom: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 15,
    marginTop: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtitle: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 420,
    lineHeight: 20,
  },
});

