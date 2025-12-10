import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, increment, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Streak, XP_PER_DAY, START_BONUS, BADGES, RELAPSE_REASONS } from '../types';
import { differenceInCalendarDays, format, addDays } from 'date-fns';
import { Trash2, AlertCircle, CalendarPlus, Save, Loader2, AlertTriangle, Check, X, ChevronDown, ChevronUp, Zap, Award, Edit3 } from 'lucide-react';

const History: React.FC = () => {
  const { user } = useAuth();
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Edit Reflection State
  const [editingReflectionId, setEditingReflectionId] = useState<string | null>(null);
  const [editReason, setEditReason] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingReflection, setIsSavingReflection] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'streaks'), orderBy('startDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const validStreaks = snapshot.docs
        .map(d => ({ ...d.data(), id: d.id } as Streak))
        .filter(s => s.startDate && typeof s.startDate.toDate === 'function');
      setStreaks(validStreaks);
    }, (err) => {
        if (err.code === 'permission-denied') setError("Permission denied.");
    });
    return () => unsubscribe();
  }, [user]);

  const toggleExpand = (streakId: string | undefined) => {
      if (!streakId) return;
      setExpandedId(prev => prev === streakId ? null : streakId);
  };

  const initiateDelete = (e: React.MouseEvent, streakId: string | undefined) => {
    e.stopPropagation();
    if (streakId) setConfirmDeleteId(streakId);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  const executeDelete = async (e: React.MouseEvent, streakId: string | undefined, days: number, isActive: boolean) => {
    e.stopPropagation();
    if (!user || !streakId) return;
    setConfirmDeleteId(null);
    setDeletingId(streakId);
    setError('');

    try {
        const batch = writeBatch(db);
        const streakRef = doc(db, 'users', user.uid, 'streaks', streakId);
        batch.delete(streakRef);
        
        const baseDeduction = START_BONUS;
        const dailyDeduction = isActive ? 0 : (Math.max(0, days) * XP_PER_DAY);
        let badgeDeduction = 0;
        if (!isActive && days > 0) {
            BADGES.forEach(badge => {
                if (badge.requiredDays > 0 && days >= badge.requiredDays) badgeDeduction += badge.xpReward;
            });
        }
        const totalDeduction = baseDeduction + dailyDeduction + badgeDeduction;
        if (totalDeduction > 0) {
            const userRef = doc(db, 'users', user.uid);
            batch.set(userRef, { totalXP: increment(-Math.abs(totalDeduction)) }, { merge: true });
        }
        await batch.commit();
    } catch (err: any) {
        setError("Delete failed: " + err.message);
    } finally {
        setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
      if (!user) return;
      setIsClearing(true);
      setError('');
      try {
          const batch = writeBatch(db);
          let totalXPDeduction = 0;
          streaks.forEach(streak => {
              if (streak.id) {
                  const streakRef = doc(db, 'users', user.uid, 'streaks', streak.id);
                  batch.delete(streakRef);
                  const start = streak.startDate.toDate();
                  const end = streak.endDate ? streak.endDate.toDate() : new Date();
                  const days = Math.max(0, differenceInCalendarDays(end, start));
                  const isActive = !streak.endDate;
                  const baseDeduction = START_BONUS;
                  const dailyDeduction = isActive ? 0 : (days * XP_PER_DAY);
                  let badgeDeduction = 0;
                  if (!isActive && days > 0) {
                      BADGES.forEach(badge => {
                          if (badge.requiredDays > 0 && days >= badge.requiredDays) badgeDeduction += badge.xpReward;
                      });
                  }
                  totalXPDeduction += (baseDeduction + dailyDeduction + badgeDeduction);
              }
          });
          if (totalXPDeduction > 0) {
              const userRef = doc(db, 'users', user.uid);
              batch.set(userRef, { totalXP: increment(-Math.abs(totalXPDeduction)) }, { merge: true });
          }
          await batch.commit();
          setConfirmClearAll(false);
      } catch (err: any) {
          setError("Failed to clear history: " + err.message);
      } finally {
          setIsClearing(false);
      }
  };

  const handleAddPastStreak = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !startDate || !endDate) return;
    
    const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
    const start = new Date(sYear, sMonth - 1, sDay);
    const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
    const end = new Date(eYear, eMonth - 1, eDay);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > new Date() || end > new Date()) {
        setError("Invalid date range.");
        return;
    }
    const days = differenceInCalendarDays(end, start);
    if (days < 0) {
        setError("End date cannot be before start date.");
        return;
    }

    const hasOverlap = streaks.some(s => {
        try {
            const sStart = s.startDate.toDate();
            sStart.setHours(0, 0, 0, 0);
            if (sStart.getTime() === start.getTime()) return true;
            let sEnd = s.endDate ? s.endDate.toDate() : new Date(8640000000000000);
            sEnd.setHours(0,0,0,0);
            return (start < sEnd && end > sStart);
        } catch (e) { return false; }
    });

    if (hasOverlap) {
        setError("This date range overlaps with an existing streak.");
        return;
    }

    try {
        setIsAdding(true);
        const batch = writeBatch(db);
        const newStreakRef = doc(collection(db, 'users', user.uid, 'streaks'));
        batch.set(newStreakRef, {
            userId: user.uid,
            startDate: Timestamp.fromDate(start),
            endDate: Timestamp.fromDate(end),
            createdAt: Timestamp.now()
        });
        let xpEarned = (days * XP_PER_DAY) + START_BONUS;
        BADGES.forEach(badge => {
            if (badge.requiredDays > 0 && days >= badge.requiredDays) xpEarned += badge.xpReward;
        });
        const userRef = doc(db, 'users', user.uid);
        batch.set(userRef, { totalXP: increment(xpEarned) }, { merge: true });
        await batch.commit();
        setStartDate('');
        setEndDate('');
        setError('');
    } catch (err: any) {
        setError("Failed to add streak: " + err.message);
    } finally {
        setIsAdding(false);
    }
  };

  const startEditingReflection = (streak: Streak, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingReflectionId(streak.id || null);
      setEditReason(streak.relapseReason || RELAPSE_REASONS[0]);
      setEditNotes(streak.relapseNotes || '');
  };

  const saveReflection = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user || !editingReflectionId) return;
      setIsSavingReflection(true);
      try {
          const streakRef = doc(db, 'users', user.uid, 'streaks', editingReflectionId);
          await updateDoc(streakRef, {
              relapseReason: editReason,
              relapseNotes: editNotes
          });
          setEditingReflectionId(null);
      } catch (err: any) {
          setError("Failed to update reflection");
      } finally {
          setIsSavingReflection(false);
      }
  };

  const renderXPBreakdown = (streak: Streak, days: number) => {
      const start = streak.startDate.toDate();
      interface BreakdownItem { date: Date; label: string; xp: number; isBadge?: boolean; }
      const breakdown: BreakdownItem[] = [];
      breakdown.push({ date: start, label: "Momentum Start Bonus", xp: START_BONUS });
      for (let i = 1; i <= days; i++) {
          breakdown.push({ date: addDays(start, i), label: `Day ${i} Complete`, xp: XP_PER_DAY });
      }
      BADGES.forEach(badge => {
          if (badge.requiredDays > 0 && days >= badge.requiredDays) {
              breakdown.push({
                  date: addDays(start, badge.requiredDays),
                  label: `Badge Earned: ${badge.name}`,
                  xp: badge.xpReward,
                  isBadge: true
              });
          }
      });
      breakdown.sort((a, b) => a.date.getTime() - b.date.getTime());
      const totalCalculated = breakdown.reduce((acc, curr) => acc + curr.xp, 0);

      return (
          <div className="mt-4 animate-fade-in space-y-4 cursor-default" onClick={(e) => e.stopPropagation()}>
              
              {/* Relapse Reflection Section */}
              {streak.endDate && (
                  <div className="bg-red-500/5 rounded-lg border border-red-500/20 p-4">
                        {editingReflectionId === streak.id ? (
                            <div className="space-y-3">
                                <div className="flex items-center space-x-2 text-red-400 font-bold text-sm">
                                    <Edit3 size={16} />
                                    <span>Editing Reflection</span>
                                </div>
                                <select 
                                    value={editReason} 
                                    onChange={(e) => setEditReason(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 text-white p-2 rounded text-sm"
                                >
                                    {RELAPSE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <textarea 
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 text-white p-2 rounded text-sm h-20 resize-none"
                                    placeholder="Notes..."
                                />
                                <div className="flex justify-end space-x-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setEditingReflectionId(null); }}
                                        className="text-gray-400 text-xs hover:text-white px-3 py-1"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={saveReflection}
                                        disabled={isSavingReflection}
                                        className="bg-primary text-white px-3 py-1 rounded text-xs font-bold"
                                    >
                                        {isSavingReflection ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="relative group/reflection">
                                <button 
                                    onClick={(e) => startEditingReflection(streak, e)}
                                    className="absolute top-0 right-0 p-1 text-gray-500 hover:text-white opacity-0 group-hover/reflection:opacity-100 transition-opacity"
                                >
                                    <Edit3 size={14} />
                                </button>
                                <h4 className="text-red-400 text-xs font-bold uppercase mb-2">Relapse Analysis</h4>
                                <div className="flex items-start space-x-2 mb-2">
                                    <span className="bg-red-500/20 text-red-300 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">
                                        Trigger: {streak.relapseReason || "Not Recorded"}
                                    </span>
                                </div>
                                {streak.relapseNotes && (
                                    <p className="text-gray-400 text-sm italic border-l-2 border-red-500/30 pl-3">
                                        "{streak.relapseNotes}"
                                    </p>
                                )}
                            </div>
                        )}
                  </div>
              )}

              {/* XP Breakdown */}
              <div className="bg-darker/50 rounded-lg overflow-hidden border border-gray-700/50">
                  <div className="flex justify-between items-center p-3 bg-gray-800/50 border-b border-gray-700/50">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Progress Log</span>
                      <div className="flex items-center text-primary text-sm font-bold">
                          <Zap size={14} className="mr-1" />
                          Total: {totalCalculated.toLocaleString()} XP
                      </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-sm">
                          <tbody className="divide-y divide-gray-800/50">
                              {breakdown.map((item, idx) => (
                                  <tr key={idx} className={`hover:bg-gray-800/30 transition-colors ${item.isBadge ? 'bg-yellow-500/5' : ''}`}>
                                      <td className="p-3 text-gray-400 font-mono text-xs">{format(item.date, 'MMM dd')}</td>
                                      <td className={`p-3 ${item.isBadge ? 'text-yellow-400 font-bold' : 'text-gray-300'}`}>
                                          {item.isBadge && <Award size={14} className="inline mr-1" />}
                                          {item.label}
                                      </td>
                                      <td className={`p-3 text-right font-medium ${item.isBadge ? 'text-yellow-400' : 'text-green-400'}`}>
                                          +{item.xp}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="pb-20 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">History</h2>
      <div className="bg-card border border-gray-700 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex items-center space-x-2 mb-4 text-primary">
              <CalendarPlus size={20} />
              <h3 className="font-bold">Record Past Streak</h3>
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-4 flex items-center"><AlertCircle size={16} className="mr-2" />{error}</div>}
          <form onSubmit={handleAddPastStreak} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white text-sm" required />
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white text-sm" required />
              </div>
              <button type="submit" disabled={isAdding} className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg transition-all">{isAdding ? 'Saving...' : 'Save Record'}</button>
          </form>
      </div>

      <div className="space-y-4">
        {streaks.map((streak) => {
            let start, end, days;
            try {
                start = streak.startDate.toDate();
                end = streak.endDate ? streak.endDate.toDate() : new Date();
                days = differenceInCalendarDays(end, start);
            } catch (e) { return null; }
            const isActive = !streak.endDate;
            const isDeleting = deletingId === streak.id;
            const isConfirming = confirmDeleteId === streak.id;
            const isExpanded = expandedId === streak.id;

            return (
                <div key={streak.id} onClick={() => toggleExpand(streak.id)} className={`bg-card border transition-all cursor-pointer rounded-xl overflow-hidden ${isExpanded ? 'border-primary' : 'border-gray-700'}`}>
                    <div className="p-4 flex justify-between items-center">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3">
                                <span className={`text-xl font-bold ${isActive ? 'text-green-400' : 'text-gray-200'}`}>{days} Days</span>
                                {isActive && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium">Active</span>}
                                <ChevronDown size={16} className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                            <div className="text-sm text-gray-500 mt-1">{format(start, 'MMM d, yyyy')} - {isActive ? 'Present' : format(end, 'MMM d, yyyy')}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {isDeleting ? <Loader2 size={20} className="animate-spin m-2" /> : isConfirming ? (
                                <>
                                    <button onClick={(e) => executeDelete(e, streak.id, days, isActive)} className="p-2 bg-red-500/10 text-red-500 rounded"><Check size={20}/></button>
                                    <button onClick={cancelDelete} className="p-2 bg-gray-700 text-gray-300 rounded"><X size={20}/></button>
                                </>
                            ) : (
                                <button onClick={(e) => initiateDelete(e, streak.id)} className="p-2 text-gray-600 hover:text-red-400 rounded"><Trash2 size={20}/></button>
                            )}
                        </div>
                    </div>
                    {isExpanded && <div className="px-4 pb-4 border-t border-gray-700 pt-2">{renderXPBreakdown(streak, days)}</div>}
                </div>
            );
        })}
      </div>
      {streaks.length > 0 && <div className="mt-12 flex justify-center"><button onClick={confirmClearAll ? handleClearAll : () => setConfirmClearAll(true)} className="flex items-center space-x-2 text-red-500 hover:text-red-400 text-sm border border-red-500/20 px-4 py-2 rounded-lg">{confirmClearAll ? 'Confirm Delete All' : 'Delete All History'}</button></div>}
    </div>
  );
};
export default History;