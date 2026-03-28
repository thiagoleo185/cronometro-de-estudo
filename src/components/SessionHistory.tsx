import React, { useState } from 'react';
import { format } from 'date-fns';
import { Trash2, CalendarDays, AlertCircle } from 'lucide-react';

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

interface SessionHistoryProps {
  sessions: StudySession[];
  onDeleteSession: (id: string) => void;
}

export function SessionHistory({ sessions, onDeleteSession }: SessionHistoryProps) {
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    let timeStr = '';
    if (hours > 0) timeStr += `${hours}h `;
    if (minutes > 0 || hours > 0) timeStr += `${minutes}m `;
    timeStr += `${seconds}s`;
    
    return timeStr.trim();
  };

  const sortedSessions = [...sessions].sort((a, b) => {
    const dateA = a.createdAt?.toMillis?.() || new Date(a.date).getTime();
    const dateB = b.createdAt?.toMillis?.() || new Date(b.date).getTime();
    return dateB - dateA;
  });

  return (
    <div className="bg-white dark:bg-[#191919] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm transition-colors">
      <div className="flex items-center gap-2 mb-6">
        <CalendarDays size={20} className="text-zinc-800 dark:text-zinc-200" />
        <h2 className="text-lg font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">Histórico Completo de Sessões</h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-[#202020] border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-4 py-3 font-medium rounded-tl-lg">Data / Hora</th>
              <th className="px-4 py-3 font-medium">Matéria</th>
              <th className="px-4 py-3 font-medium">Tópico</th>
              <th className="px-4 py-3 font-medium">Tempo</th>
              <th className="px-4 py-3 font-medium">Questões (A/E)</th>
              <th className="px-4 py-3 font-medium rounded-tr-lg text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sortedSessions.map((session) => (
              <tr key={session.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-[#202020]/50 transition-colors">
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                  {session.createdAt 
                    ? format(session.createdAt.toDate(), "dd/MM/yyyy 'às' HH:mm") 
                    : format(new Date(session.date + 'T12:00:00'), "dd/MM/yyyy")}
                </td>
                <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">
                  {session.subject}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {session.topic}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                  {formatDuration(session.duration)}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                  {(session.correctAnswers || 0) > 0 || (session.wrongAnswers || 0) > 0 ? (
                    <span className="flex items-center gap-1.5">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium" title="Acertos">{session.correctAnswers || 0}</span>
                      <span className="text-zinc-300 dark:text-zinc-600">/</span>
                      <span className="text-red-600 dark:text-red-400 font-medium" title="Erros">{session.wrongAnswers || 0}</span>
                    </span>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-600">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setSessionToDelete(session.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors inline-flex"
                    title="Excluir registro"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {sortedSessions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  Nenhuma sessão de estudo registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#191919] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4 text-red-500">
                <AlertCircle size={24} />
                <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">Excluir Registro</h3>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Tem certeza que deseja excluir este registro de estudo? Esta ação não pode ser desfeita e o tempo será removido das suas estatísticas.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setSessionToDelete(null)}
                  className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-[#202020] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    onDeleteSession(sessionToDelete);
                    setSessionToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
