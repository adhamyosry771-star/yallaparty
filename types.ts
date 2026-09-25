
export interface User {
  id: string;
  name: string;
  avatar: string;
  level: number;
  vip?: boolean;
  coins?: number;
  diamonds?: number;
  charismaXP?: number;
  wealthXP?: number;
  charismaLevel?: number;
  wealthLevel?: number;
  hasSecretClub?: boolean;
  secretClubPassword?: string;
}

export interface Room {
  id: string;
  title: string;
  owner: User;
  participantsCount: number;
  tags: string[];
  coverImage: string;
  isSecretClub?: boolean;
}

export interface Gift {
  id: string;
  name: string;
  price: number;
  icon: string;
  animation?: string;
  tab?: string;
  luckyRate?: number;
  luckyMultipliers?: number[];
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  type: 'text' | 'gift' | 'join';
  giftName?: string;
  image?: string; // Support for GIF emojis
  userAvatar?: string;
}

// Added Artifact interface used by ArtifactCard component
export interface Artifact {
  id: string;
  styleName: string;
  html: string;
  status: 'streaming' | 'completed' | string;
}
