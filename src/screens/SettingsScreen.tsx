import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/Colors';
import {
  Tv,
  Gamepad2,
  Server,
  ShieldCheck,
  Cpu,
  HardDrive,
  Trash2,
  CheckCircle2,
} from 'lucide-react-native';
import {
  clearAllAppCache,
  getLastCacheCleanTimestamp,
} from '../utils/cacheManager';

export const SettingsScreen: React.FC = () => {
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanFeedback, setCleanFeedback] = useState<string | null>(null);
  const [lastCleanTime, setLastCleanTime] = useState<string>('Memeriksa...');
  const [isBtnFocused, setIsBtnFocused] = useState(false);

  const formatTimestamp = (ts: number | null): string => {
    if (!ts) return 'Belum pernah dibersihkan';
    const d = new Date(ts);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    getLastCacheCleanTimestamp().then((ts) => {
      setLastCleanTime(formatTimestamp(ts));
    });
  }, []);

  const handleClearCache = async () => {
    if (isCleaning) return;
    setIsCleaning(true);
    setCleanFeedback(null);

    const result = await clearAllAppCache();
    setIsCleaning(false);

    if (result.success) {
      setLastCleanTime(formatTimestamp(result.timestamp));
      setCleanFeedback('Cache gambar & media berhasil dibersihkan!');
    } else {
      setCleanFeedback('Gagal membersihkan sebagian cache.');
    }

    setTimeout(() => {
      setCleanFeedback(null);
    }, 4500);
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Pengaturan & Info Perangkat TV</Text>
        <Text style={styles.pageSubtitle}>Kuzen TV Companion • Standalone Leanback Edition</Text>
      </View>

      <View style={styles.gridSection}>
        {/* Storage & Cache Management Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <HardDrive size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Penyimpanan & Manajemen Cache</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cache Gambar Poster:</Text>
            <Text style={styles.infoValue}>Glide Disk & Memory Cache (expo-image)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Buffer Stream Player:</Text>
            <Text style={styles.infoValue}>Auto-flush media & WebView cache on exit</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pembersihan Terakhir:</Text>
            <Text style={styles.infoValue}>{lastCleanTime}</Text>
          </View>

          <View style={styles.cacheActionContainer}>
            <Pressable
              focusable={true}
              onFocus={() => setIsBtnFocused(true)}
              onBlur={() => setIsBtnFocused(false)}
              onPress={handleClearCache}
              style={[
                styles.clearButton,
                isBtnFocused && styles.clearButtonFocused,
              ]}
            >
              {isCleaning ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.clearButtonText}>Sedang Membersihkan...</Text>
                </>
              ) : (
                <>
                  <Trash2 size={16} color="#FFFFFF" />
                  <Text style={styles.clearButtonText}>Bersihkan Cache Gambar & Media</Text>
                </>
              )}
            </Pressable>

            {cleanFeedback && (
              <View style={styles.feedbackRow}>
                <CheckCircle2 size={15} color="#22C55E" />
                <Text style={styles.feedbackText}>{cleanFeedback}</Text>
              </View>
            )}

            <Text style={styles.cacheSafeNote}>
              * Aman: Pembersihan tidak menghapus sesi login Supabase, bookmark, atau riwayat tontonan.
            </Text>
          </View>
        </View>

        {/* Device & OS Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Tv size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Kompatibilitas Android TV</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Target OS:</Text>
            <Text style={styles.infoValue}>Android TV 7.0+ (API 24 Nougat / minSdkVersion 24)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tipe TV Box:</Text>
            <Text style={styles.infoValue}>Google TV & AOSP TV Box (Leanback optional)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Resolusi Layar:</Text>
            <Text style={styles.infoValue}>1080p Full HD • Landscape Locked</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Expo SDK:</Text>
            <Text style={styles.infoValue}>SDK 52+ (@react-native-tvos/config-tv)</Text>
          </View>
        </View>

        {/* Remote D-Pad Navigation Controls Guide */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Gamepad2 size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Panduan Remote Control D-Pad</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>D-Pad Kiri (Left):</Text>
            <Text style={styles.infoValue}>Buka Navigasi Rail Menu / Seek -10s</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>D-Pad Kanan (Right):</Text>
            <Text style={styles.infoValue}>Kembali ke Konten / Seek +10s</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>D-Pad OK / Center:</Text>
            <Text style={styles.infoValue}>Buka Media / Toggle Play & Pause</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>D-Pad Bawah (Down):</Text>
            <Text style={styles.infoValue}>Buka Drawer OSD Episode & Server</Text>
          </View>
        </View>

        {/* Server & Network Status Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Server size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Status Jaringan & Layanan</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kuzen Cloud Service:</Text>
            <Text style={styles.infoValue}>Terhubung & Aktif (Online)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sinkronisasi Cloud:</Text>
            <Text style={styles.infoValue}>Riwayat Tontonan & Watchlist Aktif</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Resolusi Stream:</Text>
            <Text style={styles.infoValue}>Auto Adaptif (HLS & Direct Embed)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status Subtitle:</Text>
            <Text style={styles.infoValue}>Subtitle Indonesia Otomatis</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  pageHeader: {
    marginBottom: 24,
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
  gridSection: {
    gap: 20,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderMuted,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderMuted,
    paddingBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  cacheActionContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderMuted,
    gap: 10,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  clearButtonFocused: {
    borderColor: '#FFFFFF',
    borderWidth: 3,
    backgroundColor: Colors.primary,
    transform: [{ scale: 1.03 }],
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  feedbackText: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '600',
  },
  cacheSafeNote: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
});

