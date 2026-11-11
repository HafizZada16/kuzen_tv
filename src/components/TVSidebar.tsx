import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
} from 'react-native';
import { Colors } from '../constants/Colors';
import {
  Home,
  Flame,
  Tv,
  Film,
  History as HistoryIcon,
  Settings,
} from 'lucide-react-native';

export type NavTabId = 'home' | 'anime' | 'donghua' | 'movies' | 'history' | 'settings';

interface TVSidebarProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  onFocusSidebar?: () => void;
  onBlurSidebar?: () => void;
  onExpandedChange?: (expanded: boolean) => void;
}

interface NavItemDef {
  id: NavTabId;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
}

const NAV_ITEMS: NavItemDef[] = [
  { id: 'home', label: 'Beranda', icon: Home },
  { id: 'anime', label: 'Anime', icon: Flame },
  { id: 'donghua', label: 'Donghua', icon: Tv },
  { id: 'movies', label: 'Film', icon: Film },
  { id: 'history', label: 'Riwayat', icon: HistoryIcon },
  { id: 'settings', label: 'Pengaturan', icon: Settings },
];

export const COLLAPSED_WIDTH = 72;
export const EXPANDED_WIDTH = 224;

export const TVSidebar: React.FC<TVSidebarProps> = ({
  activeTab,
  onSelectTab,
  onFocusSidebar,
  onBlurSidebar,
  onExpandedChange,
}) => {
  const [focusedTab, setFocusedTab] = useState<NavTabId | null>(null);

  const widthAnim = useRef(new Animated.Value(COLLAPSED_WIDTH)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;
  const blurTimerRef = useRef<NodeJS.Timeout | null>(null);

  const expandSidebar = () => {
    onExpandedChange?.(true);
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: EXPANDED_WIDTH,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.timing(labelOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const collapseSidebar = () => {
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: COLLAPSED_WIDTH,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(labelOpacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: false,
      }),
    ]).start(() => {
      onExpandedChange?.(false);
    });
  };

  const handleItemFocus = (id: NavTabId) => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setFocusedTab(id);
    expandSidebar();
    onFocusSidebar?.();
  };

  const handleItemBlur = () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
    }
    blurTimerRef.current = setTimeout(() => {
      setFocusedTab(null);
      collapseSidebar();
      onBlurSidebar?.();
    }, 120);
  };

  return (
    <Animated.View
      style={[
        styles.sidebarContainer,
        { width: widthAnim },
      ]}
    >
      {/* Brand Icon Mini-Header */}
      <View style={styles.brandIconWrapper}>
        <View style={styles.brandCircle}>
          <Tv size={22} color={Colors.primary} />
        </View>
        <Animated.View
          style={[
            styles.brandTextWrapper,
            { opacity: labelOpacity },
          ]}
        >
          <Text style={styles.brandTitle} numberOfLines={1}>
            KUZEN<Text style={{ color: Colors.primary }}> TV</Text>
          </Text>
        </Animated.View>
      </View>

      {/* Navigation Buttons List */}
      <View style={styles.navItemsList}>
        {NAV_ITEMS.map((item, index) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          const isFocused = focusedTab === item.id;

          return (
            <Pressable
              key={item.id}
              focusable={true}
              hasTVPreferredFocus={index === 0}
              onFocus={() => handleItemFocus(item.id)}
              onBlur={handleItemBlur}
              onPress={() => onSelectTab(item.id)}
              style={[
                styles.navButton,
                isActive && styles.navButtonActive,
                isFocused && styles.navButtonFocused,
              ]}
            >
              {/* Active Indicator Bar on leftmost */}
              {isActive && !isFocused && <View style={styles.activeBar} />}

              <View style={styles.iconContainer}>
                <IconComponent
                  size={22}
                  color={
                    isFocused
                      ? '#FFFFFF'
                      : isActive
                      ? Colors.primary
                      : Colors.textMuted
                  }
                />
              </View>

              {/* YouTube TV Animated Label Fade-in */}
              <Animated.Text
                style={[
                  styles.navLabel,
                  isActive && styles.navLabelActive,
                  isFocused && styles.navLabelFocused,
                  { opacity: labelOpacity },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Animated.Text>
            </Pressable>
          );
        })}
      </View>

      {/* App Version at bottom */}
      <View style={styles.footerContainer}>
        <Animated.Text
          style={[styles.footerText, { opacity: labelOpacity }]}
          numberOfLines={1}
        >
          Kuzen TV v1.0
        </Animated.Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sidebarContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#0d0d0d',
    borderRightWidth: 1,
    borderRightColor: Colors.borderMuted,
    paddingVertical: 24,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    zIndex: 100,
    elevation: 20,
    overflow: 'hidden',
  },
  brandIconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  brandCircle: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(234, 88, 12, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  brandTextWrapper: {
    marginLeft: 12,
    width: 140,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  navItemsList: {
    flex: 1,
    gap: 10,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  navButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  navButtonFocused: {
    backgroundColor: Colors.primary, // Kuzen Orange
    borderColor: '#FFFFFF', // OUTLINE PUTIH TEBAL
    borderWidth: 2.5,
    transform: [{ scale: 1.04 }],
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 10,
    elevation: 12,
  },
  activeBar: {
    position: 'absolute',
    left: 2,
    width: 3.5,
    height: 22,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  iconContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
    width: 130,
  },
  navLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  navLabelFocused: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  footerContainer: {
    height: 24,
    justifyContent: 'center',
    paddingLeft: 4,
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    width: 150,
  },
});
