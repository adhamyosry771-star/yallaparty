export type Language = 'ar' | 'en' | 'zh';

export interface FrameDesign {
  id: string;
  nameAr: string;
  nameEn: string;
  category: 'frame' | 'entry' | 'gift';
  themeColor: string;
  borderColor: string;
  glowColor: string;
  accentColor: string;
  price?: string;
  descriptionAr: string;
  descriptionEn: string;
  // Dynamic features for simulating in browser
  animationStyle: 'spin' | 'pulse' | 'glitch' | 'rotate-dual' | 'matrix-rain';
  shape: 'circle' | 'hexagon' | 'cyber-classic';
}

export interface SimulationState {
  avatarUrl: string;
  selectedFrameId: string;
  activeEntryId: string | null;
  activeGiftId: string | null;
  showScanline: boolean;
  gridOverlay: boolean;
  simulatedName: string;
}

export interface DesignOrder {
  appType: string;
  designType: 'custom_frame' | 'custom_entry' | 'custom_gift' | 'full_pack';
  preferredFormat: 'mp4_alpha' | 'svg' | 'webm' | 'all';
  colorPalette: string;
  details: string;
  userName: string;
  telegramOrWhatsapp: string;
}
