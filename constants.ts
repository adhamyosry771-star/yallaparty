import { Gift, Room } from './types';

export const GIFTS: Gift[] = [
  { id: '1', name: 'وردة', price: 10, icon: '🌹' },
  { id: '2', name: 'ألماس', price: 100, icon: '💎' },
  { id: '3', name: 'سيارة', price: 5000, icon: '🏎️' },
  { id: '4', name: 'صاروخ', price: 9999, icon: '🚀' },
  { id: '5', name: 'قلب', price: 50, icon: '💖' },
  { id: '6', name: 'تاج', price: 1000, icon: '👑' },
];

export const MOCK_ROOMS: Room[] = [
  {
    id: 'r1',
    title: 'سهرة الألعاب 🎮',
    owner: { id: 'u1', name: 'أحمد', avatar: 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><rect width=\'100\' height=\'100\' fill=\'%23a855f7\'/><circle cx=\'50\' cy=\'35\' r=\'20\' fill=\'%23ffffff\' fill-opacity=\'0.3\'/><path d=\'M25 80c0-15 10-25 25-25s25 10 25 25\' fill=\'%23ffffff\' fill-opacity=\'0.3\'/></svg>', level: 25 },
    participantsCount: 156,
    tags: ['ألعاب', 'عربي'],
    coverImage: 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 400 200\'><defs><linearGradient id=\'g1\' x1=\'0%\' y1=\'0%\' x2=\'100%\' y2=\'100%\'><stop offset=\'0%\' stop-color=\'%23a855f7\'/><stop offset=\'100%\' stop-color=\'%231e1b4b\'/></linearGradient></defs><rect width=\'400\' height=\'200\' fill=\'url(%23g1)\'/><text x=\'50%\' y=\'50%\' font-family=\'sans-serif\' font-size=\'24\' font-weight=\'bold\' fill=\'%23ffffff\' fill-opacity=\'0.2\' text-anchor=\'middle\'>ROOM</text></svg>'
  },
  {
    id: 'r2',
    title: 'أغاني ووناسة 🎵',
    owner: { id: 'u2', name: 'سارة', avatar: 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><rect width=\'100\' height=\'100\' fill=\'%23ec4899\'/><circle cx=\'50\' cy=\'35\' r=\'20\' fill=\'%23ffffff\' fill-opacity=\'0.3\'/><path d=\'M25 80c0-15 10-25 25-25s25 10 25 25\' fill=\'%23ffffff\' fill-opacity=\'0.3\'/></svg>', level: 42, vip: true },
    participantsCount: 890,
    tags: ['موسيقى', 'حفلة'],
    coverImage: 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 400 200\'><defs><linearGradient id=\'g2\' x1=\'0%\' y1=\'0%\' x2=\'100%\' y2=\'100%\'><stop offset=\'0%\' stop-color=\'%23ec4899\'/><stop offset=\'100%\' stop-color=\'%23111827\'/></linearGradient></defs><rect width=\'400\' height=\'200\' fill=\'url(%23g2)\'/><text x=\'50%\' y=\'50%\' font-family=\'sans-serif\' font-size=\'24\' font-weight=\'bold\' fill=\'%23ffffff\' fill-opacity=\'0.2\' text-anchor=\'middle\'>PARTY</text></svg>'
  },
  {
    id: 'r3',
    title: 'دردشة آخر الليل 🌙',
    owner: { id: 'u3', name: 'عمر', avatar: 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><rect width=\'100\' height=\'100\' fill=\'%2306b6d4\'/><circle cx=\'50\' cy=\'35\' r=\'20\' fill=\'%23ffffff\' fill-opacity=\'0.3\'/><path d=\'M25 80c0-15 10-25 25-25s25 10 25 25\' fill=\'%23ffffff\' fill-opacity=\'0.3\'/></svg>', level: 12 },
    participantsCount: 45,
    tags: ['هدوء', 'سوالف'],
    coverImage: 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 400 200\'><defs><linearGradient id=\'g3\' x1=\'0%\' y1=\'0%\' x2=\'100%\' y2=\'100%\'><stop offset=\'0%\' stop-color=\'%2306b6d4\'/><stop offset=\'100%\' stop-color=\'%230f172a\'/></linearGradient></defs><rect width=\{400\} height=\'200\' fill=\'url(%23g3)\'/><text x=\'50%\' y=\'50%\' font-family=\'sans-serif\' font-size=\'24\' font-weight=\'bold\' fill=\'%23ffffff\' fill-opacity=\'0.2\' text-anchor=\'middle\'>CHAT</text></svg>'
  }
];
