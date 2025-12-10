import { Timestamp } from 'firebase/firestore';

export interface Streak {
  id?: string;
  userId: string;
  startDate: Timestamp;
  endDate: Timestamp | null; // null means currently active
  createdAt: Timestamp;
  relapseReason?: string;
  relapseNotes?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
  totalXP: number;
  level: number;
  targetStreak?: number; // Personal goal in days
  xpVersion?: number; // For migration tracking: 1=10XP/day, 2=FlatBadgeXP
}

export interface PublicProfileSettings {
  isEnabled: boolean;
  showName: boolean;
  showLevel: boolean;
  showActiveStreak: boolean;
  showBadges: boolean;
  showStats: boolean;
}

export interface PublicProfileData {
  uid: string;
  displayName: string;
  photoURL?: string;
  level: number;
  totalXP: number;
  activeStreakDays: number; // 0 if not sharing
  activeStreakStartDate?: Timestamp | null;
  badges: string[]; // Array of badge IDs
  successRate: number;
  updatedAt: Timestamp;
  settings: PublicProfileSettings;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredDays: number;
  xpReward: number;
}

export interface JournalEntry {
  id?: string;
  userId: string;
  date: Timestamp;
  mood: number; // 1-5
  note: string;
}

export enum TimeRange {
  Week = 'Week',
  Month = 'Month',
  Year = 'Year',
  All = 'All'
}

export const XP_PER_DAY = 10; 
export const START_BONUS = 10; // XP awarded just for starting a streak
export const MAX_LEVEL = 10; // Capped at Level 10
export const XP_CONSTANT = 100; // XP = 100 * Level^2. Level 10 = 10,000 XP (Approx 2 years)

export const MOODS = [
  { value: 1, label: 'Terrible', emoji: '😫', color: '#ef4444' },
  { value: 2, label: 'Bad', emoji: '🙁', color: '#f97316' },
  { value: 3, label: 'Okay', emoji: '😐', color: '#eab308' },
  { value: 4, label: 'Good', emoji: '🙂', color: '#22c55e' },
  { value: 5, label: 'Great', emoji: '😁', color: '#3b82f6' },
];

export const RELAPSE_REASONS = [
  'Stress / Anxiety',
  'Boredom',
  'Social Pressure',
  'Urge / Cravings',
  'Emotional Overwhelm',
  'Fatigue / Tiredness',
  'Accidental',
  'Other'
];

export const BADGES: Badge[] = [
  { id: '1_day', name: 'First Step', description: 'Complete 1 day', icon: 'footprints', requiredDays: 1, xpReward: 100 },
  { id: '2_days', name: 'Double Down', description: '2 days streak', icon: 'zap', requiredDays: 2, xpReward: 100 },
  { id: '3_days', name: 'Hat Trick', description: '3 days streak', icon: 'zap', requiredDays: 3, xpReward: 100 },
  { id: '5_days', name: 'High Five', description: '5 days streak', icon: 'hand', requiredDays: 5, xpReward: 100 },
  { id: '1_week', name: 'One Week', description: '7 days streak', icon: 'calendar', requiredDays: 7, xpReward: 100 },
  { id: '10_days', name: 'Double Digits', description: '10 days streak', icon: 'hash', requiredDays: 10, xpReward: 100 },
  { id: '2_weeks', name: 'Fortnight', description: '14 days streak', icon: 'shield', requiredDays: 14, xpReward: 100 },
  { id: '21_days', name: 'Habit Former', description: '21 days streak', icon: 'repeat', requiredDays: 21, xpReward: 100 },
  { id: '1_month', name: 'Month Master', description: '30 days streak', icon: 'moon', requiredDays: 30, xpReward: 100 },
  { id: '40_days', name: 'Quarantine', description: '40 days streak', icon: 'lock', requiredDays: 40, xpReward: 100 },
  { id: '50_days', name: 'Half Century', description: '50 days streak', icon: 'star', requiredDays: 50, xpReward: 100 },
  { id: '2_months', name: 'Duo Months', description: '60 days streak', icon: 'moon', requiredDays: 60, xpReward: 100 },
  { id: '75_days', name: 'Hard Mode', description: '75 days streak', icon: 'biceps', requiredDays: 75, xpReward: 100 },
  { id: '3_months', name: 'Quarterly King', description: '90 days streak', icon: 'crown', requiredDays: 90, xpReward: 100 },
  { id: '100_days', name: 'Centurion', description: '100 days streak', icon: 'award', requiredDays: 100, xpReward: 100 },
  { id: '4_months', name: 'Seasoned', description: '120 days streak', icon: 'sun', requiredDays: 120, xpReward: 100 },
  { id: '5_months', name: 'Dedicated', description: '150 days streak', icon: 'anchor', requiredDays: 150, xpReward: 100 },
  { id: '6_months', name: 'Half Year Hero', description: '180 days streak', icon: 'medal', requiredDays: 180, xpReward: 100 },
  { id: '8_months', name: 'Resilient', description: '240 days streak', icon: 'shield', requiredDays: 240, xpReward: 100 },
  { id: '9_months', name: 'Rebirth', description: '270 days streak', icon: 'baby', requiredDays: 270, xpReward: 100 },
  { id: '1_year', name: 'Year of Will', description: '365 days streak', icon: 'trophy', requiredDays: 365, xpReward: 100 },
  { id: '400_days', name: 'Four Hundred', description: '400 days streak', icon: 'flame', requiredDays: 400, xpReward: 100 },
  { id: '500_days', name: 'Five Hundred', description: '500 days streak', icon: 'rocket', requiredDays: 500, xpReward: 100 },
  { id: '1.5_years', name: 'Long Haul', description: '548 days streak', icon: 'mountain', requiredDays: 548, xpReward: 100 },
  { id: '2_years', name: 'Master of Self', description: '730 days streak', icon: 'brain', requiredDays: 730, xpReward: 100 },
  { id: '1000_days', name: 'Kilo Day', description: '1000 days streak', icon: 'diamond', requiredDays: 1000, xpReward: 100 },
  { id: '3_years', name: 'Triad', description: '3 years streak', icon: 'triangle', requiredDays: 1095, xpReward: 100 },
  { id: '4_years', name: 'Olympian', description: '4 years streak', icon: 'flag', requiredDays: 1460, xpReward: 100 },
  { id: '5_years', name: 'Legend', description: '5 years streak', icon: 'swords', requiredDays: 1825, xpReward: 100 },
  { id: 'goal_target', name: 'Goal Getter', description: 'Reach your personal streak goal', icon: 'target', requiredDays: 0, xpReward: 2000 },
];