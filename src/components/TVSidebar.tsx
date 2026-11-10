import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Colors } from '../constants/Colors';
import {
  Home,
  Flame,
  Tv,
  History as HistoryIcon,
  Settings,
  Search,
} from 'lucide-react-native';

export type NavTabId = 'home' | 'anime' | 'donghua' | 'history' | 'settings';

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
  { id: 'history', label: 'Riwayat', icon: HistoryIcon },
  { id: 'settings', label: 'Pengaturan', icon: Settings },
];

const COLLAPSED_WIDTH = 72;
const EXPANDED_WIDTH = 224;

export const TVSidebar: React.FC<TVSidebarProps> = ({
  activeTab,
  onSelectTab,
  onFocusSidebar,
  onBlurSidebar,
  onExpandedChange,
}) => {
  const [focusedTab, setFocusedTab] = useState<NavTabId | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const widthAnim = useRef(new Animated.Value(COLLAPSED_WIDTH)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;

  const expandSidebar = () => {
    setIsExpanded(true);
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
        useNativeDriver: true,
      }),
    ]).start();
  };

  const collapseSidebar = () => {
    setIsExpanded(false);
    onExpandedChange?.(false);
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: COLLAPSED_WIDTH,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(labelOpacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleItemFocus = (id: NavTabId) => {
    setFocusedTab(id);
    expandSidebar();
    onFocusSidebar?.();
  };

  const handleItemBlur = () => {
    // Delay sedikit agar perpindahan D-Pad antar item menu tidak langsung menutup sidebar
    setTimeout(() => {
      setFocusedTab((prev) => {
        if (!prev) {
          collapseSidebar();
          onBlurSidebar?.();
        }
        return prev;
      });
    }, 50);
  };

  const handleSidebarBlur = () => {
    setFocusedTab(null);
    collapseSidebar();
    onBlurSidebar?.();
  };

  return (
    <Animated.View
      style={[
        styles.sidebarContainer,
        { width: widthAnim },
        isExpanded && styles.sidebarExpanded,
      ]}
    >
      {/* Brand Icon Mini-Header */}
      <View style={styles.brandIconWrapper}>
        <View style={styles.brandCircle}>
          <Tv size={22} color={Colors.primary} />
        </View>
        {isExpanded && (
          <Animated.View style={[styles.brandTextWrapper, { opacity: labelOpacity }]}>
            <Text style={styles.brandTitle}>
              KUZEN<Text style={{ color: Colors.primary }}> TV</Text>
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Navigation Buttons List */}
      <View style={styles.navItemsList}>
        {NAV_ITEMS.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          const isFocused = focusedTab === item.id;

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              onFocus={() => handleItemFocus(item.id)}
              onBlur={() => {
                setFocusedTab(null);
                handleSidebarBlur();
              }}
              onPress={() => {
                onSelectTab(item.id);
              }}
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
              {isExpanded && (
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
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* App Version at bottom */}
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>{isExpanded ? 'Kuzen TV v1.0' : 'v1.0'}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sidebarContainer: {
    backgroundColor: '#0d0d0d',
    borderRightWidth: 1,
    borderRightColor: Colors.borderMuted,
    paddingVertical: 24,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    zIndex: 100,
    elevation: 8,
  },
  sidebarExpanded: {
    backgroundColor: '#121212',
    borderRightColor: 'rgba(234, 88, 12, 0.25)',
    shadowColor: '#000000',
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 20,
  },
  brandIconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    paddingLeft: 2,
  },
  brandCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(234, 88, 12, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  brandTextWrapper: {
    marginLeft: 12,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  navItemsList: {
    flex: 1,
    gap: 8,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  navButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  navButtonFocused: {
    backgroundColor: Colors.primary, // Kuzen Orange
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.04 }],
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
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
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  navLabel: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  navLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  navLabelFocused: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  footerContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  footerText: {
    fontSize: 11,
    color: '#555555',
    fontWeight: '600',
  },
});
