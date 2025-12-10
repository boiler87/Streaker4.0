import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PublicProfileData, MAX_LEVEL, XP_CONSTANT, BADGES } from '../types';
import { calculateLevel } from '../utils/gamification';
import { Flame, Award, PieChart, Shield, Lock, User, AlertTriangle } from 'lucide-react';
import { iconMap } from './Badges';

const PublicProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
          setError("Invalid User ID");
          setLoading(false);
          return;
      }
      try {
        const docRef = doc(db, 'public_profiles', userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const profileData = docSnap.data() as PublicProfileData;
          if (profileData.settings.isEnabled) {
              setData(profileData);
          } else {
              setError("This profile is private.");
          }
        } else {
          setError("Profile not found.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load profile. Make sure the 'public_profiles' collection is readable in Firebase Rules.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  if (loading) {
      return <div className="min-h-screen flex items-center justify-center bg-darker text-primary animate-pulse">Loading Profile...</div>;
  }

  if (error || !data) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-darker p-4 text-center">
              <div className="bg-card p-8 rounded-3xl border border-gray-800 shadow-2xl max-w-sm w-full">
                  <div className="flex justify-center mb-6">
                      <div className="bg-red-500/10 p-4 rounded-2xl">
                          <AlertTriangle className="text-red-500 w-12 h-12" />
                      </div>
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">Oops!</h1>
                  <p className="text-gray-400 mb-8">{error || "Something went wrong."}</p>
                  <Link to="/" className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-xl transition-all">
                      Go Home
                  </Link>
              </div>
          </div>
      );
  }

  const { settings } = data;
  
  // Calculate Progress for Level Card
  const currentLevel = data.level;
  const nextLevelXP = XP_CONSTANT * Math.pow(currentLevel + 1, 2);
  const currentLevelBaseXP = XP_CONSTANT * Math.pow(currentLevel, 2);
  const xpInCurrentLevel = data.totalXP - currentLevelBaseXP;
  const xpRequiredForCurrentLevel = nextLevelXP - currentLevelBaseXP;
  const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpRequiredForCurrentLevel) * 100));

  return (
    <div className="min-h-screen bg-darker pb-20">
        {/* Simple Header */}
        <div className="w-full bg-card border-b border-gray-800 p-4 flex justify-between items-center mb-8">
             <div className="container max-w-4xl mx-auto flex justify-between items-center">
                <Link to="/" className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Streaker</Link>
                <Link to="/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Join Now</Link>
             </div>
        </div>

        <div className="container max-w-4xl mx-auto px-4 space-y-8">
            
            {/* Identity Header */}
            <div className="text-center">
                <div className="w-24 h-24 bg-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-gray-700">
                    <User size={40} className="text-gray-500" />
                </div>
                <h1 className="text-3xl font-bold text-white">
                    {settings.showName ? data.displayName : "Anonymous Streaker"}
                </h1>
                <p className="text-gray-500 mt-1 text-sm uppercase tracking-widest font-bold">Public Profile</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Active Streak */}
                {settings.showActiveStreak && (
                    <div className="bg-card border border-gray-700 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col items-center text-center">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                        <div className="bg-gray-800 p-3 rounded-full mb-4">
                            <Flame size={24} className={data.activeStreakDays > 7 ? 'text-orange-500' : 'text-gray-400'} />
                        </div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Active Streak</p>
                        <h2 className="text-6xl font-black text-white mt-2">{data.activeStreakDays}</h2>
                        <p className="text-gray-500 font-medium text-sm mt-1">Days</p>
                    </div>
                )}

                {/* Level Stats */}
                {settings.showLevel && (
                     <div className="bg-card border border-gray-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -ml-10 -mt-10 pointer-events-none"></div>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Level</p>
                                <h2 className="text-4xl font-black text-white">Lvl {currentLevel}</h2>
                            </div>
                            <div className="text-right">
                                <span className="text-primary font-bold">{data.totalXP.toLocaleString()} XP</span>
                            </div>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-primary to-purple-500 h-full rounded-full"
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                        <p className="text-right text-xs text-gray-500 mt-2">
                             {currentLevel >= MAX_LEVEL ? 'Max Level' : `${Math.round(progressPercent)}% to next level`}
                        </p>
                     </div>
                )}
            </div>

            {/* Success Stats */}
            {settings.showStats && (
                <div className="bg-card border border-gray-700 rounded-2xl p-6 shadow-xl flex items-center justify-between">
                     <div className="flex items-center space-x-4">
                         <div className="bg-green-500/20 p-3 rounded-xl">
                             <PieChart className="text-green-500" size={24} />
                         </div>
                         <div>
                             <h3 className="text-xl font-bold text-white">Success Rate</h3>
                             <p className="text-sm text-gray-500">Percentage of disciplined days</p>
                         </div>
                     </div>
                     <div className="text-3xl font-black text-white">
                         {data.successRate}%
                     </div>
                </div>
            )}

            {/* Badges */}
            {settings.showBadges && (
                <div>
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                        <Award className="mr-2 text-yellow-400" /> Earned Badges
                    </h3>
                    {data.badges.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {data.badges.map(badgeId => {
                                const badgeDef = BADGES.find(b => b.id === badgeId);
                                if (!badgeDef) return null;
                                const Icon = iconMap[badgeDef.icon] || Award;
                                return (
                                    <div key={badgeId} className="bg-card border border-gray-700 p-4 rounded-xl flex flex-col items-center text-center">
                                        <div className="bg-gray-800 p-3 rounded-full mb-3 text-yellow-400">
                                            <Icon size={24} />
                                        </div>
                                        <span className="font-bold text-white text-sm">{badgeDef.name}</span>
                                        <span className="text-xs text-gray-500 mt-1">{badgeDef.description}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-gray-800/50 p-6 rounded-xl text-center text-gray-500 italic">
                            No badges earned yet on the current streak.
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default PublicProfile;