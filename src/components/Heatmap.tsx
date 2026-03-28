import React, { useMemo } from 'react';
import { format, subDays, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StudySession {
  id: string;
  duration: number; // in seconds
  date: string; // YYYY-MM-DD
  createdAt: any;
}

interface HeatmapProps {
  sessions: StudySession[];
}

export function Heatmap({ sessions }: HeatmapProps) {
  const days = useMemo(() => {
    const today = new Date();
    const startDate = startOfWeek(subDays(today, 364));
    const endDate = endOfWeek(today);
    
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, []);

  const sessionData = useMemo(() => {
    const data: Record<string, number> = {};
    sessions.forEach(session => {
      const dateStr = session.date;
      if (!data[dateStr]) {
        data[dateStr] = 0;
      }
      data[dateStr] += session.duration;
    });
    return data;
  }, [sessions]);

  const getColorClass = (durationSeconds: number) => {
    if (!durationSeconds || durationSeconds === 0) return 'bg-zinc-100 dark:bg-zinc-800/50';
    
    const hours = durationSeconds / 3600;
    if (hours < 1) return 'bg-emerald-200 dark:bg-emerald-900/60';
    if (hours < 2) return 'bg-emerald-400 dark:bg-emerald-700/80';
    if (hours < 4) return 'bg-emerald-600 dark:bg-emerald-600';
    return 'bg-emerald-800 dark:bg-emerald-400';
  };

  const getTooltipText = (date: Date, durationSeconds?: number) => {
    const dateStr = format(date, "d 'de' MMM, yyyy", { locale: ptBR });
    if (!durationSeconds) return `Nenhuma sessão de estudo em ${dateStr}`;
    
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    const seconds = durationSeconds % 60;
    
    let timeStr = '';
    if (hours > 0) timeStr += `${hours}h `;
    if (minutes > 0 || hours > 0) timeStr += `${minutes}m `;
    timeStr += `${seconds}s`;
    
    return `${timeStr.trim()} de estudo em ${dateStr}`;
  };

  const weeks = useMemo(() => {
    const result = [];
    let currentWeek = [];
    
    for (let i = 0; i < days.length; i++) {
      currentWeek.push(days[i]);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }
    
    if (currentWeek.length > 0) {
      result.push(currentWeek);
    }
    
    return result;
  }, [days]);

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  return (
    <div className="w-full max-w-5xl mx-auto p-6 bg-white dark:bg-[#191919] rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-x-auto shadow-sm transition-colors">
      <div className="min-w-[800px]">
        <div className="flex text-xs text-zinc-500 dark:text-zinc-400 mb-2 pl-8">
          {months.map((month) => (
            <div key={month} className="flex-1 text-left">{month}</div>
          ))}
        </div>
        
        <div className="flex gap-1.5">
          <div className="flex flex-col gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 pr-2 pt-1 justify-between h-[110px]">
            <span>Seg</span>
            <span>Qua</span>
            <span>Sex</span>
          </div>
          
          <div className="flex gap-1.5 flex-1">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-1.5">
                {week.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const duration = sessionData[dateStr] || 0;
                  
                  return (
                    <div
                      key={dateStr}
                      className={cn(
                        "w-3.5 h-3.5 rounded-sm transition-colors duration-200 cursor-pointer hover:ring-2 hover:ring-zinc-400 dark:hover:ring-zinc-600 hover:ring-offset-1 dark:hover:ring-offset-[#191919]",
                        getColorClass(duration)
                      )}
                      title={getTooltipText(day, duration)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          <span>Menos</span>
          <div className="flex gap-1.5">
            <div className="w-3.5 h-3.5 rounded-sm bg-zinc-100 dark:bg-zinc-800/50" />
            <div className="w-3.5 h-3.5 rounded-sm bg-emerald-200 dark:bg-emerald-900/60" />
            <div className="w-3.5 h-3.5 rounded-sm bg-emerald-400 dark:bg-emerald-700/80" />
            <div className="w-3.5 h-3.5 rounded-sm bg-emerald-600 dark:bg-emerald-600" />
            <div className="w-3.5 h-3.5 rounded-sm bg-emerald-800 dark:bg-emerald-400" />
          </div>
          <span>Mais</span>
        </div>
      </div>
    </div>
  );
}
