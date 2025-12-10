import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Streak, JournalEntry, MOODS } from '../types';
import { 
    differenceInCalendarDays, isSameYear, format, 
    startOfMonth, endOfMonth, eachDayOfInterval, 
    isSameDay, isWithinInterval, addMonths, subMonths, 
    startOfWeek, endOfWeek, startOfYear, endOfYear, getDay 
} from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, TrendingUp, AlertTriangle, PieChart as PieChartIcon, Activity, Smile } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

const Stats: React.FC = () => {
  const { user } = useAuth();
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        // Streaks
        const qStreaks = query(collection(db, 'users', user.uid, 'streaks'), orderBy('startDate', 'asc'));
        const sSnap = await getDocs(qStreaks);
        const sData = sSnap.docs.map(d => ({ ...d.data(), id: d.id } as Streak)).filter(s => s.startDate?.toDate);
        setStreaks(sData);

        // Journals (Limit last 30 for chart clarity, or more if needed)
        const qJournals = query(collection(db, 'users', user.uid, 'journal_entries'), orderBy('date', 'desc'), limit(30));
        const jSnap = await getDocs(qJournals);
        const jData = jSnap.docs.map(d => ({ ...d.data(), id: d.id } as JournalEntry)).filter(j => j.date?.toDate);
        setJournals(jData.reverse()); // Reverse to chronological for chart

      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="text-center p-10 text-gray-400">Loading stats...</div>;

  const now = new Date();
  
  // --- Data Processing for KPIs ---
  let totalDaysThisYear = 0;
  let longestStreak = 0;
  let totalDisciplinedDays = 0;
  const streakLengths: number[] = [];
  const firstStartDate = streaks.length > 0 ? streaks[0].startDate.toDate() : now;

  streaks.forEach((streak) => {
    try {
        const start = streak.startDate.toDate();
        const end = streak.endDate ? streak.endDate.toDate() : new Date();
        if (isNaN(start.getTime())) return;
        const days = Math.max(0, differenceInCalendarDays(end, start)); 
        if (days > longestStreak) longestStreak = days;
        streakLengths.push(days);
        totalDisciplinedDays += days;
        if (isSameYear(start, now) || isSameYear(end, now)) {
             const yearStart = startOfYear(now);
             const yearEnd = endOfYear(now);
             const effectiveStart = start < yearStart ? yearStart : start;
             const effectiveEnd = end > yearEnd ? yearEnd : end;
             if (effectiveStart <= effectiveEnd) totalDaysThisYear += differenceInCalendarDays(effectiveEnd, effectiveStart);
        }
    } catch (e) { }
  });

  const averageStreak = streakLengths.length > 0 ? Math.round(streakLengths.reduce((a, b) => a + b, 0) / streakLengths.length) : 0;
  const daysSinceStart = Math.max(1, differenceInCalendarDays(now, firstStartDate));
  const successRate = Math.min(100, Math.round((totalDisciplinedDays / daysSinceStart) * 100));


  // --- Chart Data ---

  // 1. Monthly Consistency
  const monthsData = Array.from({ length: 12 }, (_, i) => ({ name: format(new Date(now.getFullYear(), i, 1), 'MMM'), days: 0 }));
  const daysInCurrentYear = eachDayOfInterval({ start: startOfYear(now), end: endOfYear(now) < now ? endOfYear(now) : now });
  daysInCurrentYear.forEach(day => {
      const dayTime = day.setHours(0,0,0,0);
      const isInStreak = streaks.some(s => {
          const sStart = s.startDate.toDate().setHours(0,0,0,0);
          const sEnd = s.endDate ? s.endDate.toDate().setHours(0,0,0,0) : new Date().setHours(0,0,0,0);
          return dayTime >= sStart && dayTime < sEnd; 
      });
      if (isInStreak) monthsData[day.getMonth()].days += 1;
  });

  // 2. Relapse Risk (Day of Week)
  const dayOfWeekData = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(name => ({ name, count: 0 }));
  streaks.forEach(s => { if (s.endDate) dayOfWeekData[getDay(s.endDate.toDate())].count += 1; });

  // 3. Relapse Triggers (New)
  const triggerMap = new Map<string, number>();
  streaks.forEach(s => {
      if (s.relapseReason) {
          triggerMap.set(s.relapseReason, (triggerMap.get(s.relapseReason) || 0) + 1);
      }
  });
  const triggerData = Array.from(triggerMap.entries()).map(([name, value]) => ({ name, value }));

  // 4. Mood History (New)
  const moodData = journals.map(j => ({
      date: format(j.date.toDate(), 'MM/dd'),
      mood: j.mood
  }));

  // --- Calendar Logic ---
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });

  const getDayStatus = (day: Date) => {
      let status = 'none';
      let isStart = false;
      let isEnd = false;
      const dayTime = day.setHours(0,0,0,0);
      const nowTime = new Date().setHours(0,0,0,0);
      for (const streak of streaks) {
          try {
              const start = streak.startDate.toDate();
              const end = streak.endDate ? streak.endDate.toDate() : new Date(); 
              const startTime = start.setHours(0,0,0,0);
              const endTime = end.setHours(0,0,0,0);
              const isValidDay = streak.endDate ? (dayTime >= startTime && dayTime < endTime) : (dayTime >= startTime && dayTime <= nowTime);
              if (isValidDay) {
                  if (!streak.endDate && dayTime > nowTime) continue; 
                  const thisStreakStatus = streak.endDate ? 'past' : 'active';
                  if (status === 'none') status = thisStreakStatus;
                  else if (status === 'past' && thisStreakStatus === 'active') status = 'active';
              }
              if (dayTime === startTime) isStart = true;
              if (streak.endDate && dayTime === endTime) isEnd = true;
          } catch(e) {}
      }
      return { status, isStart, isEnd };
  };

  return (
    <div className="space-y-8 pb-20">
      <h2 className="text-2xl font-bold text-white mb-6">Your Performance</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Yearly Days" value={`${totalDaysThisYear}`} unit="days" icon={<CalendarIcon size={16} />} />
        <StatCard label="Longest Streak" value={`${longestStreak}`} unit="days" highlight icon={<TrendingUp size={16} />} />
        <StatCard label="Avg Streak" value={`${averageStreak}`} unit="days" icon={<Activity size={16} />} />
        <StatCard label="Success Rate" value={`${successRate}%`} unit="all time" icon={<PieChartIcon size={16} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Consistency */}
        <div className="bg-card p-6 rounded-2xl border border-gray-700 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center"><Activity className="w-5 h-5 mr-2 text-primary" />Monthly Consistency</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="name" stroke="#9ca3af" tick={{fontSize: 12}} />
                        <YAxis stroke="#9ca3af" tick={{fontSize: 12}} />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} cursor={{ fill: '#374151', opacity: 0.2 }} />
                        <Bar dataKey="days" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Mood History */}
        <div className="bg-card p-6 rounded-2xl border border-gray-700 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center"><Smile className="w-5 h-5 mr-2 text-blue-400" />Mood Trends (Last 30 Days)</h3>
            <div className="h-64 w-full">
                {moodData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={moodData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                            <XAxis dataKey="date" stroke="#9ca3af" tick={{fontSize: 12}} />
                            <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} stroke="#9ca3af" tick={{fontSize: 12}} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                            <Line type="monotone" dataKey="mood" stroke="#3b82f6" strokeWidth={2} dot={{r: 4, fill: '#3b82f6'}} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-gray-500 text-sm">No mood data logged yet.</div>}
            </div>
        </div>

        {/* Relapse Analysis (Day of Week) */}
        <div className="bg-card p-6 rounded-2xl border border-gray-700 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center"><AlertTriangle className="w-5 h-5 mr-2 text-orange-400" />Relapse Day Analysis</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dayOfWeekData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="name" stroke="#9ca3af" tick={{fontSize: 12}} />
                        <YAxis stroke="#9ca3af" tick={{fontSize: 12}} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} itemStyle={{ color: '#f87171' }} cursor={{ fill: '#374151', opacity: 0.2 }} />
                        <Bar dataKey="count" fill="#f87171" radius={[4, 4, 0, 0]} name="Relapses" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Relapse Triggers (Reason) */}
        <div className="bg-card p-6 rounded-2xl border border-gray-700 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center"><AlertTriangle className="w-5 h-5 mr-2 text-red-500" />Relapse Triggers</h3>
            <div className="h-64 w-full">
                {triggerData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={triggerData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                            <XAxis type="number" stroke="#9ca3af" tick={{fontSize: 12}} allowDecimals={false} />
                            <YAxis dataKey="name" type="category" stroke="#9ca3af" tick={{fontSize: 10}} width={100} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} itemStyle={{ color: '#ef4444' }} cursor={{ fill: '#374151', opacity: 0.2 }} />
                            <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} name="Count" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-gray-500 text-sm">No relapse reasons recorded.</div>}
            </div>
        </div>

         {/* Calendar */}
         <div className="bg-card p-6 rounded-2xl border border-gray-700 shadow-xl lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center"><CalendarIcon className="w-5 h-5 mr-2 text-primary" />Streak Calendar</h3>
                <div className="flex items-center space-x-4 bg-gray-800 rounded-lg p-1">
                    <button onClick={prevMonth} className="p-1 hover:text-white text-gray-400 transition-colors"><ChevronLeft size={20} /></button>
                    <span className="text-sm font-bold w-32 text-center select-none">{format(currentMonth, 'MMMM yyyy')}</span>
                    <button onClick={nextMonth} className="p-1 hover:text-white text-gray-400 transition-colors"><ChevronRight size={20} /></button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-bold text-gray-500 uppercase">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, idx) => {
                    const { status, isStart, isEnd } = getDayStatus(day);
                    const isCurrentMonth = isSameDay(day, startOfMonth(day)) || isWithinInterval(day, { start: monthStart, end: monthEnd });
                    const isToday = isSameDay(day, now);
                    let bgClass = 'bg-gray-800/30';
                    let textClass = 'text-gray-500';
                    if (status === 'active') { bgClass = 'bg-primary/20 border border-primary/30'; textClass = 'text-primary font-bold'; } 
                    else if (status === 'past') { bgClass = 'bg-secondary/10 border border-secondary/20'; textClass = 'text-secondary'; }
                    if (!isCurrentMonth) { textClass = 'text-gray-700'; bgClass = 'bg-transparent'; }

                    return (
                        <div key={idx} className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all ${bgClass}`}>
                            <span className={`text-sm ${textClass} ${isToday ? 'bg-white/10 w-6 h-6 rounded-full flex items-center justify-center' : ''}`}>{format(day, 'd')}</span>
                            <div className="flex space-x-1 mt-1">
                                {isStart && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]"></div>}
                                {isEnd && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]"></div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; unit: string; highlight?: boolean; icon?: React.ReactNode }> = ({ label, value, unit, highlight, icon }) => (
    <div className={`p-4 rounded-xl border ${highlight ? 'bg-primary/10 border-primary/50' : 'bg-card border-gray-700'} flex flex-col`}>
        <div className="flex items-center space-x-2 mb-2">
            <div className={`p-1.5 rounded-lg ${highlight ? 'bg-primary/20 text-primary' : 'bg-gray-800 text-gray-400'}`}>{icon}</div>
            <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
        </div>
        <div>
            <span className={`text-2xl md:text-3xl font-bold ${highlight ? 'text-primary' : 'text-white'}`}>{value}</span>
            <span className="text-xs text-gray-500 ml-1">{unit}</span>
        </div>
    </div>
);

export default Stats;