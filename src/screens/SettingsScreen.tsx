import React from 'react';
import { StyleSheet, View, ScrollView, Text } from 'react-native';
import { Colors } from '../constants/Colors';
import {
  Tv,
  Gamepad2,
  Server,
  ShieldCheck,
  Cpu,
} from 'lucide-react-native';

export const SettingsScreen: React.FC = () => {
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

        {/* Cloud & Scraper Backend */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Server size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Status Server & Scraper</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kuzen Core API:</Text>
            <Text style={styles.infoValue}>https://kuzen.web.id/api (Active)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Database Cloud:</Text>
            <Text style={styles.infoValue}>Supabase Cloud (Watch History & Watchlist)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Scraper Anime:</Text>
            <Text style={styles.infoValue}>Otakudesu Scraper via Reverse Proxy</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Scraper Donghua:</Text>
            <Text style={styles.infoValue}>Anichin & Kuramadrive HLS Stream</Text>
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
});

