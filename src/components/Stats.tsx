import React, { useMemo, useState } from 'react';
import { format, isToday, subDays, startOfDay, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Clock, Book, Target, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';

interface StudySession {
  id: string;
  duration: number;
  date: string;
  subject: string;
  topic: string;
  createdAt: any;
  correctAnswers?: number;
  wrongAnswers?: number;
}

interface ContentItem {
  id: string;
  subject: string;
  title: string;
  completed: boolean;
  createdAt: any;
}

interface StatsProps {
  sessions: StudySession[];
  contentItems: ContentItem[];
}

const COLORS = ['#2eaadc', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export function Stats({ sessions, contentItems }: StatsProps) {
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  const toggleSubject = (subject: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subject)) {
      newExpanded.delete(subject);
    } else {
      newExpanded.add(subject);
    }
    setExpandedSubjects(newExpanded);
  };

  const stats = useMemo(() => {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const sevenDaysAgo = subDays(startOfToday, 6);

    let todayTime = 0;
    let weekTime = 0;
    let totalTime = 0;

    const subjectTimeToday: Record<string, number> = {};
    const subjectTimeTotal: Record<string, number> = {};
    const dailyTime: Record<string, number> = {};
    const detailedStats: Record<string, { totalTime: number, topics: Record<string, number> }> = {};

    // Initialize dailyTime for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i);
      dailyTime[format(d, 'yyyy-MM-dd')] = 0;
    }

    const activeSubjects = new Set(contentItems.map(item => item.subject));

    sessions.forEach(session => {
      if (!activeSubjects.has(session.subject)) return;

      const sessionDate = session.createdAt ? session.createdAt.toDate() : new Date(session.date);
      const dateStr = format(sessionDate, 'yyyy-MM-dd');
      
      totalTime += session.duration;
      
      if (subjectTimeTotal[session.subject]) {
        subjectTimeTotal[session.subject] += session.duration;
      } else {
        subjectTimeTotal[session.subject] = session.duration;
      }

      if (!detailedStats[session.subject]) {
        detailedStats[session.subject] = { totalTime: 0, topics: {} };
      }
      detailedStats[session.subject].totalTime += session.duration;

      if (!detailedStats[session.subject].topics[session.topic]) {
        detailedStats[session.subject].topics[session.topic] = 0;
      }
      detailedStats[session.subject].topics[session.topic] += session.duration;

      if (isToday(sessionDate)) {
        todayTime += session.duration;
        if (subjectTimeToday[session.subject]) {
          subjectTimeToday[session.subject] += session.duration;
        } else {
          subjectTimeToday[session.subject] = session.duration;
        }
      }

      if (isAfter(sessionDate, sevenDaysAgo) || dateStr === format(sevenDaysAgo, 'yyyy-MM-dd')) {
        weekTime += session.duration;
        if (dailyTime[dateStr] !== undefined) {
          dailyTime[dateStr] += session.duration;
        }
      }
    });

    const dailyChartData = Object.keys(dailyTime).map(date => ({
      name: format(new Date(date + 'T00:00:00'), 'EEE', { locale: ptBR }),
      minutos: Math.round(dailyTime[date] / 60)
    }));

    const subjectChartDataToday = Object.keys(subjectTimeToday).map(subject => ({
      name: subject,
      value: Math.round(subjectTimeToday[subject] / 60)
    })).sort((a, b) => b.value - a.value);

    const subjectChartDataTotal = Object.keys(subjectTimeTotal).map(subject => ({
      name: subject,
      value: Math.round(subjectTimeTotal[subject] / 60)
    })).sort((a, b) => b.value - a.value);

    const tableData = Object.keys(detailedStats).map(subject => ({
      subject,
      totalTime: detailedStats[subject].totalTime,
      topics: Object.keys(detailedStats[subject].topics).map(topic => ({
        topic,
        totalTime: detailedStats[subject].topics[topic]
      })).sort((a, b) => b.totalTime - a.totalTime)
    })).sort((a, b) => b.totalTime - a.totalTime);

    return {
      todayTime,
      weekTime,
      totalTime,
      dailyChartData,
      subjectChartDataToday,
      subjectChartDataTotal,
      tableData
    };
  }, [sessions, contentItems]);

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    let timeStr = '';
    if (hours > 0) timeStr += `${hours}h `;
    if (minutes > 0 || hours > 0) timeStr += `${minutes}m `;
    timeStr += `${seconds}s`;
    return timeStr.trim() || '0s';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#191919] border border-zinc-200 dark:border-zinc-800 p-3 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1">{label}</p>
          <p className="text-sm text-[#2eaadc] font-semibold">
            {payload[0].value} minutos
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#191919] border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 flex items-center gap-4 shadow-sm transition-colors">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-[#2eaadc] rounded-full">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Estudado Hoje</p>
            <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">{formatDuration(stats.todayTime)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#191919] border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 flex items-center gap-4 shadow-sm transition-colors">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Últimos 7 Dias</p>
            <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">{formatDuration(stats.weekTime)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#191919] border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 flex items-center gap-4 shadow-sm transition-colors">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-500 rounded-full">
            <Target size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Acumulado</p>
            <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">{formatDuration(stats.totalTime)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras: Últimos 7 dias */}
        <div className="bg-white dark:bg-[#191919] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm transition-colors">
          <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-6">Tempo de Estudo (Últimos 7 dias)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(161, 161, 170, 0.1)' }} />
                <Bar dataKey="minutos" fill="#2eaadc" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Pizza: Matérias Hoje ou Total */}
        <div className="bg-white dark:bg-[#191919] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm transition-colors">
          <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-6">
            Distribuição por Matéria {stats.subjectChartDataToday.length > 0 ? '(Hoje)' : '(Total)'}
          </h3>
          <div className="h-64 w-full">
            {(stats.subjectChartDataToday.length > 0 || stats.subjectChartDataTotal.length > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.subjectChartDataToday.length > 0 ? stats.subjectChartDataToday : stats.subjectChartDataTotal}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {(stats.subjectChartDataToday.length > 0 ? stats.subjectChartDataToday : stats.subjectChartDataTotal).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-zinc-600 dark:text-zinc-400 text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
                <Book size={32} className="mb-2 opacity-50" />
                <p className="text-sm">Nenhum estudo registrado ainda.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Detalhamento por Matéria e Tópico */}
      <div className="bg-white dark:bg-[#191919] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm transition-colors">
        <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-6">Detalhamento por Matéria e Tópico</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-[#202020] border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3 font-medium rounded-tl-lg">Matéria / Tópico</th>
                <th className="px-4 py-3 font-medium rounded-tr-lg text-right">Tempo Estudado</th>
              </tr>
            </thead>
            <tbody>
              {stats.tableData.map((subjectData) => {
                const isExpanded = expandedSubjects.has(subjectData.subject);
                return (
                  <React.Fragment key={subjectData.subject}>
                    <tr 
                      className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-[#202020]/50 transition-colors cursor-pointer"
                      onClick={() => toggleSubject(subjectData.subject)}
                    >
                      <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                        <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        {subjectData.subject}
                      </td>
                      <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200 text-right">
                        {formatDuration(subjectData.totalTime)}
                      </td>
                    </tr>
                    {isExpanded && subjectData.topics.map(topicData => (
                      <tr key={`${subjectData.subject}-${topicData.topic}`} className="border-b border-zinc-50 dark:border-zinc-800/30 last:border-0 hover:bg-zinc-50/50 dark:hover:bg-[#202020]/50 transition-colors bg-zinc-50/30 dark:bg-[#202020]/30">
                        <td className="px-4 py-2 pl-10 text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600"></div>
                          {topicData.topic}
                        </td>
                        <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400 text-right">
                          {formatDuration(topicData.totalTime)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              {stats.tableData.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    Nenhum dado de estudo disponível.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
