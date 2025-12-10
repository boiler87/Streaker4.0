import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, limit, addDoc, Timestamp, updateDoc, doc, increment, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Streak, XP_PER_DAY, START_BONUS, MOODS, RELAPSE_REASONS, JournalEntry } from '../types';
import { differenceInCalendarDays, startOfDay, endOfDay } from 'date-fns';
import { Flame, RefreshCw, Zap, Save, Loader2, AlertCircle, Calendar, Target, Edit2, Check, BookOpen, PenTool } from 'lucide-react';
import LevelProgress from '../components/LevelProgress';
import { getMotivationalQuote } from '../services/geminiService';

const Dashboard: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [activeStreak, setActiveStreak] = useState<Streak | null>(null);
  const [daysCount, setDaysCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [motivation, setMotivation] = useState<string>("");
  const [isMotivating, setIsMotivating] = useState(false);
  
  // Edit Start Date State
  const [isEditingStart, setIsEditingStart] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');

  // Goal State
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  // Journal State
  const [todayJournal, setTodayJournal] = useState<JournalEntry | null>(null);
  const [mood, setMood] = useState<number>(3);
  const [journalNote, setJournalNote] = useState('');
  const [isSubmittingJournal, setIsSubmittingJournal] = useState(false);

  // Relapse Modal State
  const [isRelapsing, setIsRelapsing] = useState(false);
  const [relapseReason, setRelapseReason] = useState(RELAPSE_REASONS[0]);
  const [relapseNotes, setRelapseNotes] = useState('');

  useEffect(() => {
    if (!user) return;

    // 1. Listen for Active Streak
    const streaksRef = collection(db, 'users', user.uid, 'streaks');
    const q = query(streaksRef, where('endDate', '==', null), limit(1));

    const unsubscribeStreak = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const streakData = snapshot.docs[0].data() as Streak;
        streakData.id = snapshot.docs[0].id;
        
        // Safety check
        if (!streakData.startDate || !streakData.startDate.toDate) {
            console.warn("Found active streak with invalid startDate", streakData);
            setActiveStreak(null);
            setDaysCount(0);
            setLoading(false);
            return;
        }

        setActiveStreak(streakData);
        
        try {
            const start = streakData.startDate.toDate();
            const now = new Date();
            const days = differenceInCalendarDays(now, start); 
            setDaysCount(days);

            const y = start.getFullYear();
            const m = String(start.getMonth() + 1).padStart(2, '0');
            const d = String(start.getDate()).padStart(2, '0');
            setNewStartDate(`${y}-${m}-${d}`);
        } catch (e) {
            setDaysCount(0);
        }
      } else {
        setActiveStreak(null);
        setDaysCount(0);
      }
      setLoading(false);
    }, (err) => {
        if (err.code === 'permission-denied') {
            setOpError("Permission denied: Check Firestore Rules.");
        }
        setLoading(false);
    });

    // 2. Check for Today's Journal Entry
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    
    // Note: Firestore doesn't support range queries on different fields easily without composite index.
    // We'll just query for created today or just query recent and filter in JS for simplicity/speed 
    // without creating custom indexes immediately.
    const checkJournal = async () => {
        try {
            const journalRef = collection(db, 'users', user.uid, 'journal_entries');
            // Simple query: Order by date desc, limit 1. Check if it's today.
            // This requires an index on date desc, which is auto-created.
            const qJournal = query(journalRef, where('date', '>=', Timestamp.fromDate(todayStart)), limit(1));
            const snapshot = await getDocs(qJournal);
            if (!snapshot.empty) {
                setTodayJournal(snapshot.docs[0].data() as JournalEntry);
            } else {
                setTodayJournal(null);
            }
        } catch (e) {
            console.log("Journal check skipped or failed", e);
        }
    };
    checkJournal();

    return () => unsubscribeStreak();
  }, [user]);

  const handleStartStreak = async () => {
    if (!user) return;
    setActionLoading(true);
    setOpError(null);
    try {
      await addDoc(collection(db, 'users', user.uid, 'streaks'), {
        userId: user.uid,
        startDate: Timestamp.now(),
        endDate: null,
        createdAt: Timestamp.now()
      });
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        totalXP: increment(START_BONUS)
      }, { merge: true });
    } catch (e: any) {
      setOpError(e.message || "Failed to start streak.");
    } finally {
        setActionLoading(false);
    }
  };

  const handleRelapseConfirm = async () => {
    if (!user || !activeStreak || !activeStreak.id) return;
    
    setActionLoading(true);
    try {
        const now = new Date();
        const streakRef = doc(db, 'users', user.uid, 'streaks', activeStreak.id);
        await updateDoc(streakRef, {
            endDate: Timestamp.fromDate(now),
            relapseReason: relapseReason,
            relapseNotes: relapseNotes
        });
        
        const start = activeStreak.startDate.toDate();
        const days = differenceInCalendarDays(now, start);
        
        if (days > 0) {
            const xpEarned = days * XP_PER_DAY;
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, {
                totalXP: increment(xpEarned)
            }, { merge: true });
        }
        setIsRelapsing(false);
        setRelapseNotes('');
        setRelapseReason(RELAPSE_REASONS[0]);
    } catch (e: any) {
        setOpError("Failed to update streak. " + e.message);
    } finally {
        setActionLoading(false);
    }
  };

  const handleSubmitJournal = async () => {
      if (!user) return;
      if (!journalNote.trim()) {
          setOpError("Please write a short note.");
          return;
      }
      setIsSubmittingJournal(true);
      try {
          await addDoc(collection(db, 'users', user.uid, 'journal_entries'), {
              userId: user.uid,
              date: Timestamp.now(),
              mood: mood,
              note: journalNote
          });
          setTodayJournal({
              userId: user.uid,
              date: Timestamp.now(),
              mood,
              note: journalNote
          });
          setJournalNote('');
      } catch (e: any) {
          setOpError("Failed to save journal.");
      } finally {
          setIsSubmittingJournal(false);
      }
  };

  const fetchMotivation = async () => {
    setIsMotivating(true);
    const quote = await getMotivationalQuote(daysCount);
    setMotivation(quote);
    setIsMotivating(false);
  };

  const handleUpdateGoal = async () => {
      if (!user) return;
      const val = parseInt(goalInput);
      if (isNaN(val) || val < 0) return;
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { targetStreak: val }, { merge: true });
        setIsEditingGoal(false);
      } catch (e: any) {}
  };
  
  const startEditGoal = () => {
      setGoalInput(userProfile?.targetStreak?.toString() || '0');
      setIsEditingGoal(true);
  };

  const handleUpdateStartDate = async () => {
    if (!user || !activeStreak || !activeStreak.id) return;
    setOpError(null);
    try {
        if (!newStartDate) return;
        const [y, m, d] = newStartDate.split('-').map(Number);
        const newDate = new Date(y, m - 1, d);
        
        if (newDate > new Date()) {
            setOpError("Start date cannot be in the future.");
            return;
        }

        const streakRef = doc(db, 'users', user.uid, 'streaks', activeStreak.id);
        await updateDoc(streakRef, { startDate: Timestamp.fromDate(newDate) });
        setIsEditingStart(false);
    } catch (e: any) {
        setOpError("Failed to update date: " + e.message);
    }
  };

  const targetGoal = userProfile?.targetStreak || 0;
  const goalPercentage = targetGoal > 0 ? Math.min(100, Math.round((daysCount / targetGoal) * 100)) : 0;

  if (loading) return <div className="flex h-screen items-center justify-center text-primary animate-pulse">Loading willpower...</div>;

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto p-4 space-y-8 relative">
      
      {/* Greeting */}
      <div className="w-full text-center animate-fade-in">
          <p className="text-gray-400 text-sm uppercase tracking-widest font-bold">Welcome back</p>
          <h1 className="text-3xl font-bold text-white mt-1">
              {userProfile?.displayName ? userProfile.displayName : 'Streaker'}
          </h1>
      </div>

      {/* Relapse Reflection Modal */}
      {isRelapsing && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-card border border-red-500/30 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                  <div className="flex items-center space-x-2 text-red-500 mb-4">
                      <AlertCircle size={24} />
                      <h3 className="text-xl font-bold">Reflect & Reset</h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-6">Failure is just data. Analyze it so you can win next time.</p>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-gray-500 text-xs font-bold uppercase mb-1">Trigger / Reason</label>
                          <select 
                            value={relapseReason} 
                            onChange={(e) => setRelapseReason(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg outline-none focus:border-red-500"
                          >
                              {RELAPSE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-gray-500 text-xs font-bold uppercase mb-1">What happened? (Optional)</label>
                          <textarea 
                             value={relapseNotes}
                             onChange={(e) => setRelapseNotes(e.target.value)}
                             placeholder="I was feeling stressed because..."
                             className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg outline-none focus:border-red-500 h-24 resize-none"
                          />
                      </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                      <button 
                        onClick={() => setIsRelapsing(false)}
                        className="px-4 py-2 text-gray-400 hover:text-white"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={handleRelapseConfirm}
                        disabled={actionLoading}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold flex items-center"
                      >
                          {actionLoading ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2" size={18} />}
                          End Streak
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Start Date Modal */}
      {isEditingStart && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-card border border-gray-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                      <Calendar className="mr-2 text-primary" /> Edit Start Date
                  </h3>
                  <div className="mb-4">
                      <input 
                          type="date"
                          value={newStartDate}
                          onChange={(e) => setNewStartDate(e.target.value)}
                          className="bg-gray-800 border border-gray-600 text-white w-full p-3 rounded-lg outline-none focus:border-primary"
                      />
                  </div>
                  <div className="flex justify-end space-x-3">
                      <button onClick={() => setIsEditingStart(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                      <button onClick={handleUpdateStartDate} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-bold flex items-center">
                          <Save size={18} className="mr-2" /> Save
                      </button>
                  </div>
              </div>
          </div>
      )}

      <LevelProgress 
          streakDays={daysCount} 
          startDate={activeStreak?.startDate?.toDate ? activeStreak.startDate.toDate() : null}
          onEditStart={() => setIsEditingStart(true)}
      />

      {opError && (
          <div className="w-full bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start space-x-3 text-red-200 text-sm">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{opError}</span>
          </div>
      )}

      <div className="relative group w-full flex justify-center">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full group-hover:bg-primary/30 transition-all duration-700"></div>
        <div className="relative z-10 flex flex-col items-center justify-center bg-card border border-gray-700 w-64 h-64 md:w-80 md:h-80 rounded-full shadow-2xl overflow-hidden px-2">
          {activeStreak ? (
            <>
              <Flame className={`w-12 h-12 mb-2 ${daysCount > 7 ? 'text-orange-500 animate-pulse' : 'text-gray-400'}`} />
              <div className="w-full flex justify-center px-4">
                  <h1 className="text-8xl md:text-9xl font-black bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent tracking-tighter text-center leading-none">
                    {daysCount}
                  </h1>
              </div>
              <p className="text-gray-400 font-medium uppercase tracking-widest mt-4">Days Streak</p>
            </>
          ) : (
            <>
              <div className="text-gray-500 mb-4">No Active Streak</div>
              <button 
                onClick={handleStartStreak}
                disabled={actionLoading}
                className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-primary/25 transition-all transform hover:scale-105 flex items-center"
              >
                {actionLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                Begin Journey
              </button>
            </>
          )}
        </div>
      </div>

      {/* Goal Card */}
      {activeStreak && (
        <div className="w-full bg-card/80 border border-gray-700 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
             <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-green-500/10 rounded-full blur-2xl pointer-events-none"></div>
             <div className="flex justify-between items-center mb-4 relative z-10">
                 <div className="flex items-center space-x-2 text-white font-bold">
                     <div className="bg-green-500/20 p-2 rounded-lg">
                        <Target className="text-green-400" size={20} />
                     </div>
                     <span className="text-lg">Current Goal</span>
                 </div>
                 <div className="flex items-center space-x-2">
                     {isEditingGoal ? (
                        <div className="flex items-center space-x-2 bg-gray-900 rounded-lg p-1 border border-gray-700">
                             <input 
                                type="number" 
                                value={goalInput}
                                onChange={(e) => setGoalInput(e.target.value)}
                                className="bg-transparent text-white w-16 text-right outline-none text-sm font-bold"
                             />
                             <button onClick={handleUpdateGoal} className="bg-green-500/20 text-green-400 p-1 rounded hover:bg-green-500/30">
                                <Check size={14} />
                             </button>
                        </div>
                     ) : (
                        <div className="flex items-center space-x-2">
                            <span className="text-3xl font-black text-white">{targetGoal > 0 ? targetGoal : 0}</span>
                            <span className="text-gray-500 text-sm font-medium pt-2">Days</span>
                            <button onClick={startEditGoal} className="text-gray-500 hover:text-white transition-colors ml-2">
                                <Edit2 size={16} />
                            </button>
                        </div>
                     )}
                 </div>
             </div>
             
             {targetGoal > 0 ? (
                <div className="space-y-2 relative z-10">
                    <div className="flex justify-between text-xs font-bold text-gray-500">
                        <span>Progress</span>
                        <span className={goalPercentage >= 100 ? 'text-green-400' : 'text-primary'}>{goalPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-4 border border-gray-700/50 overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ${goalPercentage >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                            style={{ width: `${Math.min(100, goalPercentage)}%` }}
                        ></div>
                    </div>
                </div>
             ) : (
                 !isEditingGoal && <div className="text-center text-sm text-gray-500 py-2 border-t border-gray-700/50 mt-2">Set a goal to track your progress!</div>
             )}
        </div>
      )}

      {/* Daily Journal Card */}
      {activeStreak && (
          <div className="w-full bg-card border border-gray-700 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center space-x-2 text-white font-bold mb-4">
                  <div className="bg-blue-500/20 p-2 rounded-lg">
                      <BookOpen className="text-blue-400" size={20} />
                  </div>
                  <span className="text-lg">Daily Check-in</span>
              </div>

              {todayJournal ? (
                  <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 flex flex-col items-center text-center">
                      <div className="text-4xl mb-2">{MOODS.find(m => m.value === todayJournal.mood)?.emoji}</div>
                      <p className="text-white font-bold mb-1">Check-in Complete</p>
                      <p className="text-gray-400 text-sm italic">"{todayJournal.note}"</p>
                  </div>
              ) : (
                  <div className="space-y-4">
                      <div className="flex justify-between items-center bg-gray-900 rounded-xl p-2 border border-gray-700">
                          {MOODS.map((m) => (
                              <button
                                  key={m.value}
                                  onClick={() => setMood(m.value)}
                                  className={`p-2 rounded-lg transition-all text-2xl hover:scale-110 ${mood === m.value ? 'bg-gray-700 scale-110 shadow-lg' : 'opacity-50 hover:opacity-100'}`}
                                  title={m.label}
                              >
                                  {m.emoji}
                              </button>
                          ))}
                      </div>
                      <div className="relative">
                          <textarea 
                              value={journalNote}
                              onChange={(e) => setJournalNote(e.target.value)}
                              placeholder="How are you feeling today?"
                              className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg outline-none focus:border-blue-500 resize-none h-24 text-sm"
                          />
                          <button 
                            onClick={handleSubmitJournal}
                            disabled={isSubmittingJournal}
                            className="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                              {isSubmittingJournal ? <Loader2 size={16} className="animate-spin"/> : <PenTool size={16} />}
                          </button>
                      </div>
                  </div>
              )}
          </div>
      )}

      {activeStreak && (
        <div className="flex flex-col items-center space-y-4 w-full pb-20">
            <div className="flex space-x-4 w-full justify-center">
                <button 
                    onClick={fetchMotivation}
                    disabled={isMotivating}
                    className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white py-3 px-6 rounded-xl transition-all w-full md:w-auto justify-center"
                >
                    <Zap size={18} className={isMotivating ? "animate-spin" : "text-yellow-400"} />
                    <span>{isMotivating ? "Thinking..." : "Motivator"}</span>
                </button>
                <button 
                    onClick={() => setIsRelapsing(true)}
                    disabled={actionLoading}
                    className="flex items-center space-x-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-500 py-3 px-6 rounded-xl transition-all w-full md:w-auto justify-center"
                >
                    <RefreshCw size={18} />
                    <span>I Relapsed</span>
                </button>
            </div>
            {motivation && (
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 text-center max-w-md animate-fade-in">
                    <p className="text-gray-300 italic">"{motivation}"</p>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;