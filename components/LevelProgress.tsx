import React from 'react';
import { calculateLevel } from '../utils/gamification';
import { XP_CONSTANT, XP_PER_DAY, MAX_LEVEL, START_BONUS, BADGES } from '../types';
import { addDays, format } from 'date-fns';
import { TrendingUp, Calendar, Zap, Crown, Edit2 } from 'lucide-react';

interface LevelProgressProps {
  streakDays: number;
  startDate: Date | null;
  onEditStart: () => void;
}

const LevelProgress: React.FC<LevelProgressProps> = ({ streakDays, startDate, onEditStart }) => {
  // 1. Calculate stats based on Active Streak + Badges + Start Bonus
  let currentXP = START_BONUS + (streakDays * XP_PER_DAY);
  
  // Add earned badges to current streak XP
  BADGES.forEach(badge => {
      if (badge.requiredDays > 0 && streakDays >= badge.requiredDays) {
          currentXP += badge.xpReward;
      }
  });

  const currentLevel = calculateLevel(currentXP);
  
  // Calculate next level requirements
  const nextLevelXP = XP_CONSTANT * Math.pow(currentLevel + 1, 2);
  let xpNeeded = Math.max(0, nextLevelXP - currentXP);
  
  // 2. Project estimated date by simulating future days and badge unlocks
  let estimatedDateString = "Max Level";
  
  if (currentLevel < MAX_LEVEL) {
      try {
          // Simulation variables
          let simulatedDays = streakDays;
          let simulatedXP = currentXP;
          let daysToAdd = 0;

          // Cap the loop to avoid infinite freeze if something goes wrong (e.g. 10 years)
          const MAX_SIMULATION_DAYS = 3650; 

          while (simulatedXP < nextLevelXP && daysToAdd < MAX_SIMULATION_DAYS) {
              daysToAdd++;
              simulatedDays++;
              
              // Daily Gain
              simulatedXP += XP_PER_DAY;

              // Badge Gain Check
              // Find badges that trigger exactly on this day
              for (const badge of BADGES) {
                  if (badge.requiredDays === simulatedDays) {
                      simulatedXP += badge.xpReward;
                  }
              }
          }

          const projectedDate = addDays(new Date(), daysToAdd);
          estimatedDateString = format(projectedDate, 'MMM do, yyyy');
      } catch (e) {
          estimatedDateString = "Unknown";
      }
  }

  // Format Start Date
  let startDateString = "Unknown";
  if (startDate && !isNaN(startDate.getTime())) {
      startDateString = format(startDate, 'MMM do, yyyy');
  }

  // Visual progress bar
  // Recalculate range for current level to display bar from 0-100% of THAT level
  const currentLevelBaseXP = XP_CONSTANT * Math.pow(currentLevel, 2);
  const xpInCurrentLevel = currentXP - currentLevelBaseXP;
  const xpRequiredForCurrentLevel = nextLevelXP - currentLevelBaseXP;
  const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpRequiredForCurrentLevel) * 100));

  return (
    <div className="w-full bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl border border-gray-700 shadow-xl mb-6 relative overflow-hidden group">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

      {/* Header Section */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Current Status</span>
          <div className="flex items-baseline space-x-2">
              <h2 className="text-4xl font-black text-white">Lvl {currentLevel}</h2>
              <span className="text-sm text-gray-500 font-medium">/ {MAX_LEVEL}</span>
          </div>
        </div>
        <div className="text-right">
             <div className="flex items-center justify-end space-x-1 text-primary mb-1">
                <Zap size={16} fill="currentColor" />
                <span className="font-bold text-lg">{currentXP.toLocaleString()} XP</span>
             </div>
             <span className="text-xs text-gray-500">Streak Experience</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-700/50 rounded-full h-4 mb-6 backdrop-blur-sm border border-gray-600/50">
        <div 
            className="bg-gradient-to-r from-primary via-purple-500 to-secondary h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)] relative"
            style={{ width: `${progressPercent}%` }}
        >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] skew-x-12"></div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          
        {/* Started On */}
        <div className="flex items-center space-x-3 bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
            <div className="bg-purple-500/20 p-2 rounded-lg">
                <Calendar size={18} className="text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 font-bold uppercase truncate">Started On</p>
                <div className="flex items-center space-x-2 mt-0.5">
                    <p className="text-sm text-white font-medium truncate">{startDateString}</p>
                    <button onClick={onEditStart} className="text-gray-500 hover:text-white transition-colors flex-shrink-0">
                        <Edit2 size={12} />
                    </button>
                </div>
            </div>
        </div>

        {/* Next Level */}
        {currentLevel < MAX_LEVEL ? (
          <div className="flex items-center space-x-3 bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                    <TrendingUp size={18} className="text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400 font-bold uppercase truncate">Next Level</p>
                    <p className="text-sm text-white font-medium truncate">{xpNeeded.toLocaleString()} XP left</p>
                    <p className="text-xs text-gray-500 truncate">Est: {estimatedDateString}</p>
                </div>
            </div>
        ) : (
          <div className="text-center py-2 text-yellow-400 font-bold flex items-center justify-center space-x-2 bg-gray-800/50 rounded-lg border border-gray-700/50 w-full">
              <Crown size={20} />
              <span>Max Level Achieved</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LevelProgress;