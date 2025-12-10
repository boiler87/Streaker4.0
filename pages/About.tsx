import React from 'react';
import { MAX_LEVEL, XP_CONSTANT, XP_PER_DAY, BADGES, START_BONUS } from '../types';
import { iconMap } from './Badges'; // Import the icon map from Badges page
import { Award } from 'lucide-react';

const About: React.FC = () => {
  // Generate level data using simulation to account for Badge XP spikes
  const levels = [];
  
  // Optimization: Map badges to days for O(1) lookup during simulation
  const badgeMap = new Map<number, number>();
  BADGES.forEach(b => {
      if (b.requiredDays > 0) {
          const current = badgeMap.get(b.requiredDays) || 0;
          badgeMap.set(b.requiredDays, current + b.xpReward);
      }
  });

  let simulatedXP = START_BONUS;
  let simulatedDays = 0;
  let currentTargetLevel = 1;

  // We want to show stats for each level up to MAX_LEVEL
  // We simulate day by day until we reach the XP for the target level
  while (currentTargetLevel <= MAX_LEVEL) {
      const targetXP = XP_CONSTANT * Math.pow(currentTargetLevel, 2);
      
      while (simulatedXP < targetXP) {
          simulatedDays++;
          simulatedXP += XP_PER_DAY;
          if (badgeMap.has(simulatedDays)) {
              simulatedXP += badgeMap.get(simulatedDays)!;
          }
      }

      // Record stats for reaching this level
      if (currentTargetLevel > 0) {
           const years = (simulatedDays / 365).toFixed(1);
           levels.push({ 
               level: currentTargetLevel, 
               xp: targetXP, 
               days: simulatedDays, 
               years: years === "0.0" ? "< 0.1" : years 
            });
      }
      
      currentTargetLevel++;
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <h2 className="text-3xl font-bold text-white mb-8">User Guide & Levels</h2>

      {/* Guide Section */}
      <div className="grid grid-cols-1 gap-6 mb-12">
        <div className="bg-card p-6 rounded-2xl border border-gray-700">
          <h3 className="text-xl font-bold text-primary mb-4">How It Works</h3>
          <ul className="space-y-3 text-gray-300 text-sm">
            <li className="flex items-start">
              <span className="bg-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">1</span>
              <span><strong>Dashboard:</strong> Click "Begin Journey" to start a timer. If you falter, click "I Relapsed" to log it and reset.</span>
            </li>
            <li className="flex items-start">
              <span className="bg-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">2</span>
              <span><strong>Active Streak:</strong> You earn badges based on your <em>current</em> streak. Keep it alive to unlock higher tiers!</span>
            </li>
            <li className="flex items-start">
              <span className="bg-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">3</span>
              <span><strong>XP & Levels:</strong> You earn <strong>10 XP per day</strong> plus <strong>100 XP per Badge</strong>. Your "Status Level" is based on your <strong>continuous discipline</strong> (current streak).</span>
            </li>
            <li className="flex items-start">
              <span className="bg-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">4</span>
              <span><strong>History:</strong> Use the History page to record past streaks you might have tracked elsewhere.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Badge Glossary */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-white">Badge Glossary</h3>
        <span className="text-sm text-primary font-bold bg-primary/10 px-3 py-1 rounded-full">All badges award 100 XP</span>
      </div>
      
      <div className="bg-card border border-gray-700 rounded-xl overflow-hidden shadow-xl mb-12">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {BADGES.map(badge => {
                  const Icon = iconMap[badge.icon] || Award;
                  return (
                      <div key={badge.id} className="flex items-center space-x-3 bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                          <div className="bg-gray-700 p-2 rounded-full">
                              <Icon size={20} className="text-gray-300" />
                          </div>
                          <div>
                              <p className="font-bold text-sm text-white">{badge.name}</p>
                              <p className="text-xs text-gray-400">{badge.description}</p>
                          </div>
                      </div>
                  )
              })}
          </div>
      </div>

      {/* Level Table */}
      <h3 className="text-2xl font-bold text-white mb-4">Level Breakdown</h3>
      <div className="bg-card border border-gray-700 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider sticky top-0">
                        <th className="p-4 font-semibold border-b border-gray-700">Level</th>
                        <th className="p-4 font-semibold border-b border-gray-700">Streak XP Required</th>
                        <th className="p-4 font-semibold border-b border-gray-700">Est. Streak Days</th>
                        <th className="p-4 font-semibold border-b border-gray-700">Approx Time</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 text-sm">
                    {levels.map((lvl) => (
                        <tr key={lvl.level} className="hover:bg-gray-800/50 transition-colors">
                            <td className="p-4 text-white font-bold">{lvl.level}</td>
                            <td className="p-4 text-gray-300">{lvl.xp.toLocaleString()} XP</td>
                            <td className="p-4 text-gray-300">{lvl.days.toLocaleString()} days</td>
                            <td className="p-4 text-primary font-medium">{lvl.years} years</td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};

export default About;