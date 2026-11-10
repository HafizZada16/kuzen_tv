// Kuzen Android TV Design Tokens

export const Colors = {
  // Latar belakang utama TV (Deep Dark Leanback)
  background: '#0a0a0a',
  backgroundElevated: '#121212',
  
  // Elemen mengambang seperti Card, Section, Sidebar Rail
  card: '#161615',
  cardFocused: '#232321',
  
  // Aksen utama Kuzen
  primary: '#ea580c', // Brand Orange - HSL(20, 84%, 48%)
  accent: '#ea580c',  // Brand Orange
  
  // Remote Focus styling
  focusBorder: '#ea580c',
  focusGlow: 'rgba(234, 88, 12, 0.45)',
  
  // Teks
  text: '#FFFFFF',
  textMuted: '#A1A09A',
  textDark: '#0a0a0a',
  
  // Batasan / Garis pemisah
  border: 'rgba(234, 88, 12, 0.15)',
  borderMuted: '#262626',
  
  // Fungsional
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  // Overlay
  overlay: 'rgba(10, 10, 10, 0.85)',
  glassBackground: 'rgba(22, 22, 21, 0.8)',
} as const;

export type ThemeColorsType = typeof Colors;

