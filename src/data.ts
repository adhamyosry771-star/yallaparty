import { FrameDesign } from './types';

export const showcaseDesigns: FrameDesign[] = [
  // FRAMES (الإطارات)
  {
    id: 'cyberpunk-neon-core',
    nameAr: 'إطار طيف النيون السيبراني',
    nameEn: 'Cyber Neon Spectrum Frame',
    category: 'frame',
    themeColor: '#00f0ff',
    borderColor: '#00f0ff',
    glowColor: '#ff007f',
    accentColor: '#fefe00',
    descriptionAr: 'تصميم فائق الدقة مع مؤثرات الإضاءة الدوارة، مصمم باحتراف ليميز حضورك داخل غرف التطبيقات الصوتية والبث المباشر.',
    descriptionEn: 'High-definition cybernetic design with rotating neon light effects, professionally crafted for Yalla, StarChat, and voice apps.',
    animationStyle: 'spin',
    shape: 'circle',
    price: '$15 - $25'
  },
  {
    id: 'golden-royal-overdrive',
    nameAr: 'الإطار الملكي الذهبي',
    nameEn: 'Royal Gold Overdrive',
    category: 'frame',
    themeColor: '#fefe00',
    borderColor: '#fefe00',
    glowColor: '#ff007f',
    accentColor: '#00f0ff',
    descriptionAr: 'أناقة الذهب المطعم بعناصر المستقبل السيبراني الرقمي وبصيغة SVG متوافقة مع كل منصات البث.',
    descriptionEn: 'An elegant golden chassis integrated with high-tech circuits, fully scalable vector SVG or alpha MP4 suitable for elite VIP users.',
    animationStyle: 'pulse',
    shape: 'hexagon',
    price: '$20 - $35'
  },
  {
    id: 'plasma-matrix-hazard',
    nameAr: 'إطار البلازما الرقمي الأخضر',
    nameEn: 'Plasma Matrix Threat',
    category: 'frame',
    themeColor: '#39ff14',
    borderColor: '#39ff14',
    glowColor: '#00f0ff',
    accentColor: '#ff007f',
    descriptionAr: 'تصميم مشع مع مؤشرات خطر سيبرانية وتحذيرات تفاعلية متحركة تدور حول صورة الحساب بشكل مميز.',
    descriptionEn: 'Radiant toxic green chassis with animated hazard indicators flashing around the profile picture in absolute cyberpunk terminal style.',
    animationStyle: 'rotate-dual',
    shape: 'cyber-classic',
    price: '$18 - $30'
  },
  {
    id: 'void-empress-magenta',
    nameAr: 'درع الإمبراطورة الأرجواني',
    nameEn: 'Void Empress Magenta',
    category: 'frame',
    themeColor: '#ff007f',
    borderColor: '#ff007f',
    glowColor: '#00f0ff',
    accentColor: '#fefe00',
    descriptionAr: 'تناسق فريد من اللون الوردي اللامع وجسيمات الطاقة المضيئة، مناسب لتطبيقات مثل لودو، Spoon وغيرها.',
    descriptionEn: 'Vibrant hot pink tech panels integrated with beautiful rotating particle halos, tailored beautifully for top live broadcasters.',
    animationStyle: 'spin',
    shape: 'circle',
    price: '$15 - $28'
  },

  // ENTRIES (الدخوليات)
  {
    id: 'hologram-grid-scan',
    nameAr: 'تأثير مسح الهولوجرام الرقمي',
    nameEn: 'Hologram Grid Arrival',
    category: 'entry',
    themeColor: '#00f0ff',
    borderColor: '#00f0ff',
    glowColor: '#00f0ff',
    accentColor: '#ff007f',
    descriptionAr: 'تأثير دخول مهيب يظهر شبكة هولوجرام متوهجة تمسح الحساب بالكامل عند الانضمام للغرفة الصوتية.',
    descriptionEn: 'A powerful entrance transition displaying an scanning cyan hologram grid with particle metrics descending slowly.',
    animationStyle: 'matrix-rain',
    shape: 'circle',
    price: '$25 - $40'
  },
  {
    id: 'nitro-fire-warp',
    nameAr: 'بوابة النيترو النفاثة',
    nameEn: 'Nitro Jet Gate',
    category: 'entry',
    themeColor: '#ff007f',
    borderColor: '#ff007f',
    glowColor: '#fefe00',
    accentColor: '#00f0ff',
    descriptionAr: 'دخول نفاث سريع مع حركة ريبيل (Ripple) متوهجة وجزيئات طاقة متطايرة بصيغة MP4 بخلفية شفافة عالية الجودة.',
    descriptionEn: 'High-speed jet entrance with explosive heat ripple and sparks in premium alpha-transparent MP4 format.',
    animationStyle: 'glitch',
    shape: 'cyber-classic',
    price: '$30 - $50'
  },

  // GIFTS (الهدايا)
  {
    id: 'cyber-supercar-drag',
    nameAr: 'السيارة السيبرانية الخارقة',
    nameEn: 'Cyber Hypercar Delivery',
    category: 'gift',
    themeColor: '#fefe00',
    borderColor: '#fefe00',
    glowColor: '#00f0ff',
    accentColor: '#ff007f',
    descriptionAr: 'هدية فاخرة تظهر سيارة رياضية مستقبلية تنزلق على الشاشة مع إضاءة نيون خلفها وتأثير صوتي قوي للسرعة.',
    descriptionEn: 'Exclusive dynamic gift rendering an interactive hovering supercar speeding across the chat with custom neon skidmarks.',
    animationStyle: 'pulse',
    shape: 'hexagon',
    price: 'Custom Project'
  },
  {
    id: 'crown-of-the-matrix',
    nameAr: 'تاج حكام الماتريكس المتحرك',
    nameEn: 'Crown of The Network Matrix',
    category: 'gift',
    themeColor: '#39ff14',
    borderColor: '#39ff14',
    glowColor: '#00f0ff',
    accentColor: '#fefe00',
    descriptionAr: 'هدية تاج مذهل يهبط من هطول البيانات الخضراء ليطوق حساب المهدى إليه، يعبر عن القوة والسيطرة.',
    descriptionEn: 'A legendary crown descending through a storm of digital cascades, perfect for rewarding elite room hostesses or admins.',
    animationStyle: 'matrix-rain',
    shape: 'circle',
    price: 'Custom Project'
  }
];

export const sampleAvatars = [
  { name: 'Cyber Neon Techie', url: 'https://images.unsplash.com/photo-1566753323558-f4e0952af115?auto=format&fit=crop&q=80&w=200' },
  { name: 'Neon Empress', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' },
  { name: 'Retro Punk Boy', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' }
];
