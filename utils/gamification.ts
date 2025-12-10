import { XP_CONSTANT, MAX_LEVEL } from '../types';

export const calculateLevel = (xp: number): number => {
  // Level = Sqrt(XP / Constant)
  const level = Math.floor(Math.sqrt(xp / XP_CONSTANT));
  return Math.min(Math.max(level, 1), MAX_LEVEL);
};

export const calculateXPForLevel = (level: number): number => {
  // XP = Constant * Level^2
  return XP_CONSTANT * Math.pow(level, 2);
};

export const getProgressToNextLevel = (currentXP: number) => {
  const currentLevel = calculateLevel(currentXP);
  if (currentLevel >= MAX_LEVEL) return 100;

  const currentLevelXP = calculateXPForLevel(currentLevel);
  const nextLevelXP = calculateXPForLevel(currentLevel + 1);
  const diff = nextLevelXP - currentLevelXP;
  const progress = currentXP - currentLevelXP;

  return Math.min(100, Math.max(0, (progress / diff) * 100));
};
