import React, { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Target, ChevronDown, ChevronRight } from 'lucide-react';

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

interface QuestionsProps {
  sessions: StudySession[];
  contentItems: ContentItem[];
}

export function Questions({ sessions, contentItems }: QuestionsProps) {
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
    const activeSubjects = new Set(contentItems.map(item => item.subject));
    const detailedStats: Record<string, { correct: number, wrong: number, topics: Record<string, { correct: number, wrong: number }> }> = {};

    let totalCorrect = 0;
    let totalWrong = 0;

    sessions.forEach(session => {
      if (!activeSubjects.has(session.subject)) return;

      const correct = session.correctAnswers || 0;
      const wrong = session.wrongAnswers || 0;

      if (correct === 0 && wrong === 0) return; // Only count sessions with questions

      totalCorrect += correct;
      totalWrong += wrong;

      if (!detailedStats[session.subject]) {
        detailedStats[session.subject] = { correct: 0, wrong: 0, topics: {} };
      }
      detailedStats[session.subject].correct += correct;
      detailedStats[session.subject].wrong += wrong;

      if (!detailedStats[session.subject].topics[session.topic]) {
        detailedStats[session.subject].topics[session.topic] = { correct: 0, wrong: 0 };
      }
      detailedStats[session.subject].topics[session.topic].correct += correct;
      detailedStats[session.subject].topics[session.topic].wrong += wrong;
    });

    const tableData = Object.keys(detailedStats).map(subject => ({
      subject,
      correct: detailedStats[subject].correct,
      wrong: detailedStats[subject].wrong,
      topics: Object.keys(detailedStats[subject].topics).map(topic => ({
        topic,
        correct: detailedStats[subject].topics[topic].correct,
        wrong: detailedStats[subject].topics[topic].wrong,
      })).sort((a, b) => (b.correct + b.wrong) - (a.correct + a.wrong))
    })).sort((a, b) => (b.correct + b.wrong) - (a.correct + a.wrong));

    return {
      totalCorrect,
      totalWrong,
      tableData
    };
  }, [sessions, contentItems]);

  const calculatePercentage = (correct: number, wrong: number) => {
    const total = correct + wrong;
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#191919] border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 flex items-center gap-4 shadow-sm transition-colors">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total de Acertos</p>
            <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">{stats.totalCorrect}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#191919] border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 flex items-center gap-4 shadow-sm transition-colors">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total de Erros</p>
            <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">{stats.totalWrong}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#191919] border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 flex items-center gap-4 shadow-sm transition-colors">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-[#2eaadc] rounded-full">
            <Target size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Aproveitamento Geral</p>
            <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">
              {calculatePercentage(stats.totalCorrect, stats.totalWrong)}%
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#191919] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm transition-colors">
        <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-6">Desempenho por Matéria e Tópico</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-[#202020] border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3 font-medium rounded-tl-lg">Matéria / Tópico</th>
                <th className="px-4 py-3 font-medium text-center text-emerald-600 dark:text-emerald-400">Acertos</th>
                <th className="px-4 py-3 font-medium text-center text-red-600 dark:text-red-400">Erros</th>
                <th className="px-4 py-3 font-medium text-center">Total</th>
                <th className="px-4 py-3 font-medium rounded-tr-lg text-right">Aproveitamento</th>
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
                      <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200 text-center">
                        {subjectData.correct}
                      </td>
                      <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200 text-center">
                        {subjectData.wrong}
                      </td>
                      <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200 text-center">
                        {subjectData.correct + subjectData.wrong}
                      </td>
                      <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200 text-right">
                        {calculatePercentage(subjectData.correct, subjectData.wrong)}%
                      </td>
                    </tr>
                    {isExpanded && subjectData.topics.map(topicData => (
                      <tr key={`${subjectData.subject}-${topicData.topic}`} className="border-b border-zinc-50 dark:border-zinc-800/30 last:border-0 hover:bg-zinc-50/50 dark:hover:bg-[#202020]/50 transition-colors bg-zinc-50/30 dark:bg-[#202020]/30">
                        <td className="px-4 py-2 pl-10 text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600"></div>
                          {topicData.topic}
                        </td>
                        <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400 text-center">
                          {topicData.correct}
                        </td>
                        <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400 text-center">
                          {topicData.wrong}
                        </td>
                        <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400 text-center">
                          {topicData.correct + topicData.wrong}
                        </td>
                        <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400 text-right">
                          {calculatePercentage(topicData.correct, topicData.wrong)}%
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              {stats.tableData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    Nenhuma questão registrada ainda.
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
