import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Streak, BADGES } from '../types';
import { differenceInCalendarDays } from 'date-fns';
import { 
    Lock, Award, Trophy, Zap, Shield, Crown, Moon, Calendar, 
    Mountain, Footprints, Medal, Target, Hand, Hash, Repeat, 
    Sun, Baby, Star, Diamond, Anchor, Rocket, Brain, Flame, 
    Flag, Swords, Triangle, Dumbbell 
} from 'lucide-react';

export const iconMap: Record<string, any> = {
    footprints: Footprints,
    zap: Zap,
    calendar: Calendar,
    shield: Shield,
    moon: Moon,
    crown: Crown,
    medal: Medal,
    award: Award,
    trophy: Trophy,
    mountain: Mountain,
    target: Target,
    hand: Hand,
    hash: Hash,
    repeat: Repeat,
    sun: Sun,
    baby: Baby,
    star: Star,
    diamond: Diamond,
    anchor: Anchor,
    rocket: Rocket,
    brain: Brain,
    flame: Flame,
    flag: Flag,
    swords: Swords,
    triangle: Triangle,
    biceps: Dumbbell,
    lock: Lock
};

const Badges: React.FC = () => {
    const { user, userProfile } = useAuth();
    const [currentStreakDays, setCurrentStreakDays] = useState(0);

    useEffect(() => {
        const fetchActiveStreak = async () => {
            if (!user) return;
            try {
                const streaksRef = collection(db, 'users', user.uid, 'streaks');
                // Query only for the active streak (where endDate is null)
                const q = query(streaksRef, where('endDate', '==', null));
                
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const data = snapshot.docs[0].data() as Streak;
                    
                    // Safety check for startDate
                    if (data.startDate && typeof data.startDate.toDate === 'function') {
                        const start = data.startDate.toDate();
                        if (!isNaN(start.getTime())) {
                            const days = differenceInCalendarDays(new Date(), start);
                            setCurrentStreakDays(days);
                            return;
                        }
                    }
                }
                setCurrentStreakDays(0);
            } catch (error) {
                console.error("Error fetching active streak for badges:", error);
                setCurrentStreakDays(0);
            }
        };
        fetchActiveStreak();
    }, [user]);

    return (
        <div className="pb-20">
            <h2 className="text-2xl font-bold text-white mb-2">Achievements</h2>
            <p className="text-gray-400 mb-6 text-sm">Badges are earned based on your <span className="text-primary font-bold">current active streak</span>.</p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {BADGES.map((badge) => {
                    const IconComponent = iconMap[badge.icon] || Award;
                    let isUnlocked = false;
                    let requirementText = `${badge.requiredDays} days`;

                    if (badge.id === 'goal_target') {
                        const target = userProfile?.targetStreak || 0;
                        isUnlocked = target > 0 && currentStreakDays >= target;
                        requirementText = target > 0 ? `Reach ${target} days goal` : "Set a goal to unlock";
                    } else {
                        isUnlocked = currentStreakDays >= badge.requiredDays;
                    }

                    return (
                        <div 
                            key={badge.id}
                            className={`relative overflow-hidden p-6 rounded-2xl border flex flex-col items-center text-center transition-all duration-300 ${
                                isUnlocked 
                                    ? 'bg-card border-primary/50 shadow-lg shadow-primary/10' 
                                    : 'bg-gray-900 border-gray-800 opacity-60'
                            }`}
                        >
                            <div className={`mb-4 p-4 rounded-full ${isUnlocked ? 'bg-gradient-to-br from-primary to-secondary' : 'bg-gray-800'}`}>
                                <IconComponent size={32} className={isUnlocked ? 'text-white' : 'text-gray-600'} />
                            </div>
                            
                            <h3 className={`font-bold mb-1 ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>{badge.name}</h3>
                            <p className="text-xs text-gray-500 mb-2">{badge.description}</p>
                            
                            {isUnlocked ? (
                                <div className="flex flex-col items-center space-y-1">
                                    <span className="inline-flex items-center px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs font-medium">
                                        Unlocked
                                    </span>
                                    <span className="text-xs text-secondary font-bold">+{badge.xpReward} XP</span>
                                </div>
                            ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded bg-gray-800 text-gray-500 text-xs font-medium">
                                    <Lock size={10} className="mr-1" />
                                    {requirementText}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Badges;