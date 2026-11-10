import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, Text } from 'react-native';
import { Colors } from '../constants/Colors';
import {
  fetchPopularDonghua,
  fetchOngoingDonghua,
  fetchCompletedDonghua,
  MediaItem,
} from '../services/mediaService';
import { TVMediaRow } from '../components/TVMediaRow';
import { Sparkles, Film, CheckCircle } from 'lucide-react-native';

interface DonghuaScreenProps {
  onSelectItem: (item: MediaItem) => void;
}

export const DonghuaScreen: React.FC<DonghuaScreenProps> = ({ onSelectItem }) => {
  const [loading, setLoading] = useState(true);
  const [popular, setPopular] = useState<MediaItem[]>([]);
  const [ongoing, setOngoing] = useState<MediaItem[]>([]);
  const [completed, setCompleted] = useState<MediaItem[]>([]);

  useEffect(() => {
    async function loadDonghua() {
      try {
        const [popList, onList, compList] = await Promise.all([
          fetchPopularDonghua(1),
          fetchOngoingDonghua(1),
          fetchCompletedDonghua(1),
        ]);
        setPopular(popList);
        setOngoing(onList);
        setCompleted(compList);
      } catch (err) {
        console.error('Failed to load donghua screen:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDonghua();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Memuat Katalog Donghua...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Katalog Donghua (3D/2D)</Text>
        <Text style={styles.pageSubtitle}>Sumber resmi Anichin & Kuramadrive HLS • Subtitle Indonesia</Text>
      </View>

      <TVMediaRow
        title="Donghua Paling Populer"
        icon={<Sparkles size={20} color={Colors.primary} />}
        items={popular}
        onSelectItem={onSelectItem}
      />

      <TVMediaRow
        title="Donghua Rilis Terbaru (Ongoing)"
        icon={<Film size={20} color={Colors.primary} />}
        items={ongoing}
        onSelectItem={onSelectItem}
      />

      <TVMediaRow
        title="Donghua Tamat (Completed)"
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

