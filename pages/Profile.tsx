import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Download, Save, Loader2, AlertCircle, FileJson, Mail, Globe, Share2, Copy, Check } from 'lucide-react';
import { collection, getDocs, doc, setDoc, query, where, getDoc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { PublicProfileSettings, PublicProfileData, Streak, BADGES } from '../types';
import { differenceInCalendarDays } from 'date-fns';

const Profile: React.FC = () => {
  const { user, userProfile, updateName } = useAuth();
  const [name, setName] = useState(userProfile?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Public Profile State
  const [isSyncingPublic, setIsSyncingPublic] = useState(false);
  const [publicSettings, setPublicSettings] = useState<PublicProfileSettings>({
      isEnabled: false,
      showName: true,
      showLevel: true,
      showActiveStreak: true,
      showBadges: false,
      showStats: false
  });
  const [publicLink, setPublicLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
      if (user) {
          const link = `${window.location.origin}${window.location.pathname}#/u/${user.uid}`;
          setPublicLink(link);
          
          // Fetch existing public profile settings if they exist
          const fetchSettings = async () => {
             try {
                 const docRef = doc(db, 'public_profiles', user.uid);
                 const docSnap = await getDoc(docRef);
                 if (docSnap.exists()) {
                     const data = docSnap.data() as PublicProfileData;
                     if (data.settings) setPublicSettings(data.settings);
                 }
             } catch (e) {
                 console.error("Failed to load public settings", e);
             }
          };
          fetchSettings();
      }
  }, [user]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSaving(true);
    setMessage(null);
    try {
      await updateName(name);
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      // 1. Fetch all data collections in parallel
      const streaksRef = collection(db, 'users', user.uid, 'streaks');
      const journalsRef = collection(db, 'users', user.uid, 'journal_entries');
      
      const [streaksSnap, journalsSnap] = await Promise.all([
        getDocs(streaksRef),
        getDocs(journalsRef)
      ]);

      const streaks = streaksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const journals = journalsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 2. Construct the data object
      const exportData = {
        profile: userProfile,
        streaks: streaks,
        journalEntries: journals,
        exportDate: new Date().toISOString(),
        appName: "Streaker"
      };

      // 3. Create blob and download link
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `streaker_data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Data export started.' });
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to export data.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePublicSettingChange = (key: keyof PublicProfileSettings) => {
      setPublicSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveAndSyncPublicProfile = async () => {
      if (!user || !userProfile) return;
      setIsSyncingPublic(true);
      setMessage(null);

      try {
          if (!publicSettings.isEnabled) {
              // If disabling, just update the settings field in public doc (or delete it, but keeping it allows toggle back)
              // We will just overwrite with isEnabled: false
               await setDoc(doc(db, 'public_profiles', user.uid), {
                  uid: user.uid,
                  settings: publicSettings,
                  updatedAt: Timestamp.now()
              }, { merge: true });
               setMessage({ type: 'success', text: 'Public profile disabled.' });
          } else {
              // Gather stats to publish
              const streaksRef = collection(db, 'users', user.uid, 'streaks');
              const qActive = query(streaksRef, where('endDate', '==', null));
              const activeSnap = await getDocs(qActive);
              
              let activeStreakDays = 0;
              let activeStartDate = null;
              
              if (!activeSnap.empty) {
                  const s = activeSnap.docs[0].data() as Streak;
                  if (s.startDate) {
                      activeStartDate = s.startDate;
                      activeStreakDays = differenceInCalendarDays(new Date(), s.startDate.toDate());
                  }
              }

              // Calculate Success Rate (from Stats logic)
              // We need full history for badges and success rate
              const allStreaksSnap = await getDocs(streaksRef);
              const streaks = allStreaksSnap.docs.map(d => d.data() as Streak);
              
              let totalDisciplinedDays = 0;
              const firstStart = streaks.length > 0 && streaks[0].startDate ? streaks[0].startDate.toDate() : new Date();
              
              streaks.forEach(s => {
                  if (s.startDate) {
                    const start = s.startDate.toDate();
                    const end = s.endDate ? s.endDate.toDate() : new Date();
                    totalDisciplinedDays += Math.max(0, differenceInCalendarDays(end, start));
                  }
              });
              
              const daysSinceStart = Math.max(1, differenceInCalendarDays(new Date(), firstStart));
              const successRate = Math.min(100, Math.round((totalDisciplinedDays / daysSinceStart) * 100));

              // Calculate Earned Badges
              const earnedBadges: string[] = [];
              if (publicSettings.showBadges) {
                   // Based on ACTIVE streak
                   BADGES.forEach(b => {
                       if (activeStreakDays >= b.requiredDays) earnedBadges.push(b.id);
                   });
              }

              const publicData: PublicProfileData = {
                  uid: user.uid,
                  displayName: userProfile.displayName || 'Anonymous Streaker',
                  photoURL: userProfile.photoURL || undefined,
                  level: userProfile.level,
                  totalXP: userProfile.totalXP,
                  activeStreakDays: activeStreakDays,
                  activeStreakStartDate: activeStartDate,
                  badges: earnedBadges,
                  successRate: successRate,
                  updatedAt: Timestamp.now(),
                  settings: publicSettings
              };

              await setDoc(doc(db, 'public_profiles', user.uid), publicData);
              setMessage({ type: 'success', text: 'Public profile synced and updated.' });
          }

      } catch (e: any) {
          console.error(e);
          setMessage({ type: 'error', text: 'Failed to sync public profile.' });
      } finally {
          setIsSyncingPublic(false);
      }
  };

  const copyLink = () => {
      navigator.clipboard.writeText(publicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-8">
      <h2 className="text-3xl font-bold text-white mb-2">My Profile</h2>
      <p className="text-gray-400">Manage your identity and data.</p>

      {message && (
        <div className={`p-4 rounded-xl border flex items-center space-x-3 ${
            message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
            {message.type === 'error' && <AlertCircle size={20} />}
            <span>{message.text}</span>
        </div>
      )}

      {/* Account Details Card */}
      <div className="bg-card border border-gray-700 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center space-x-2 text-primary font-bold mb-6">
              <User size={20} />
              <h3>Identity</h3>
          </div>

          <form onSubmit={handleUpdateName} className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Display Name</label>
                     <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        placeholder="Your Name"
                     />
                 </div>
                 <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Address</label>
                     <div className="flex items-center space-x-2 w-full bg-gray-800/50 border border-gray-700 text-gray-400 p-3 rounded-lg cursor-not-allowed">
                        <Mail size={16} />
                        <span>{user?.email}</span>
                     </div>
                     <p className="text-xs text-gray-600 mt-1">Email cannot be changed.</p>
                 </div>
             </div>
             
             <div className="flex justify-end">
                 <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                 >
                     {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                     <span>Save Changes</span>
                 </button>
             </div>
          </form>
      </div>

      {/* Public Profile Card */}
      <div className="bg-card border border-gray-700 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center space-x-2 text-purple-400 font-bold mb-6">
              <Globe size={20} />
              <h3>Public Profile</h3>
          </div>

          <div className="mb-6">
              <div className="flex items-center justify-between bg-gray-900 p-4 rounded-xl border border-gray-700">
                  <span className="font-bold text-white">Enable Public Profile</span>
                  <div 
                    onClick={() => handlePublicSettingChange('isEnabled')}
                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${publicSettings.isEnabled ? 'bg-primary' : 'bg-gray-600'}`}
                  >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${publicSettings.isEnabled ? 'translate-x-6' : ''}`}></div>
                  </div>
              </div>
          </div>

          {publicSettings.isEnabled && (
              <div className="space-y-6 animate-fade-in">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Select Data to Share</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                              { key: 'showName', label: 'Display Name' },
                              { key: 'showLevel', label: 'Level & XP' },
                              { key: 'showActiveStreak', label: 'Active Streak Counter' },
                              { key: 'showBadges', label: 'Earned Badges' },
                              { key: 'showStats', label: 'Success Rate' },
                          ].map((item) => (
                              <label key={item.key} className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors">
                                  <input 
                                    type="checkbox" 
                                    checked={(publicSettings as any)[item.key]}
                                    onChange={() => handlePublicSettingChange(item.key as keyof PublicProfileSettings)}
                                    className="w-5 h-5 rounded border-gray-600 text-primary focus:ring-primary bg-gray-900" 
                                  />
                                  <span className="text-gray-300 text-sm">{item.label}</span>
                              </label>
                          ))}
                      </div>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Public Link</label>
                      <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-900 border border-gray-700 text-gray-400 p-3 rounded-lg truncate text-sm">
                              {publicLink}
                          </div>
                          <button 
                            onClick={copyLink}
                            className="bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-lg transition-colors relative"
                            title="Copy Link"
                          >
                              {copied ? <Check size={20} className="text-green-500"/> : <Copy size={20} />}
                          </button>
                      </div>
                  </div>

                  <div className="flex justify-end pt-2">
                       <button 
                          onClick={saveAndSyncPublicProfile}
                          disabled={isSyncingPublic}
                          className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                        >
                           {isSyncingPublic ? <Loader2 className="animate-spin" size={18} /> : <Share2 size={18} />}
                           <span>Update & Publish</span>
                       </button>
                  </div>
              </div>
          )}
      </div>

      {/* Data Export Card */}
      <div className="bg-card border border-gray-700 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center space-x-2 text-blue-400 font-bold mb-6">
              <Download size={20} />
              <h3>Data Export</h3>
          </div>
          <div className="flex justify-start">
              <button 
                onClick={handleExportData}
                disabled={isExporting}
                className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                  {isExporting ? <Loader2 className="animate-spin" size={18} /> : <FileJson size={18} />}
                  <span>Download JSON Archive</span>
              </button>
          </div>
      </div>
    </div>
  );
};

export default Profile;