import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, PictureInPicture2, Edit2, RotateCcw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TimerProps {
  onSaveSession: (durationSeconds: number, subject: string, topic: string, correctAnswers: number, wrongAnswers: number) => void;
  selectedTask: { subject: string; topic: string } | null;
}

export function Timer({ onSaveSession, selectedTask }: TimerProps) {
  const [initialTime, setInitialTime] = useState(25 * 60);
  const [remainingTime, setRemainingTime] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('25');
  
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [elapsedToSave, setElapsedToSave] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState('');
  const [wrongAnswers, setWrongAnswers] = useState('');
  
  const timerContainerRef = useRef<HTMLDivElement>(null);
  const pipWindowRef = useRef<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('studyflow_timer_preset');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (parsed > 0) {
        setInitialTime(parsed);
        setRemainingTime(parsed);
        setCustomMinutes(Math.floor(parsed / 60).toString());
      }
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime((time) => time - 1);
      }, 1000);
    } else if (isActive && remainingTime === 0) {
      setIsActive(false);
      if (selectedTask) {
        setElapsedToSave(initialTime);
        setShowQuestionModal(true);
      } else {
        setRemainingTime(initialTime);
      }
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, remainingTime, initialTime, selectedTask]);

  const toggleTimer = () => {
    if (!selectedTask && !isActive) {
      alert("Por favor, selecione um tópico no Conteúdo Programático antes de iniciar.");
      return;
    }
    setIsActive(!isActive);
  };

  const stopTimer = () => {
    setIsActive(false);
    const elapsed = initialTime - remainingTime;
    if (elapsed > 0 && selectedTask) {
      setElapsedToSave(elapsed);
      setShowQuestionModal(true);
    } else {
      setRemainingTime(initialTime);
    }
  };

  const handleSaveWithQuestions = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedTask) {
      onSaveSession(
        elapsedToSave,
        selectedTask.subject,
        selectedTask.topic,
        parseInt(correctAnswers) || 0,
        parseInt(wrongAnswers) || 0
      );
    }
    setShowQuestionModal(false);
    setCorrectAnswers('');
    setWrongAnswers('');
    setRemainingTime(initialTime);
  };

  const handleSkipQuestions = () => {
    if (selectedTask) {
      onSaveSession(elapsedToSave, selectedTask.subject, selectedTask.topic, 0, 0);
    }
    setShowQuestionModal(false);
    setCorrectAnswers('');
    setWrongAnswers('');
    setRemainingTime(initialTime);
  };

  const resetTimer = () => {
    setIsActive(false);
    setRemainingTime(initialTime);
  };

  const handleSetTime = (seconds: number) => {
    setInitialTime(seconds);
    setRemainingTime(seconds);
    localStorage.setItem('studyflow_timer_preset', seconds.toString());
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePiP = async () => {
    if (!('documentPictureInPicture' in window)) {
      console.error('Picture-in-Picture não é suportado no seu navegador.');
      return;
    }

    if (isPiP && pipWindowRef.current) {
      pipWindowRef.current.close();
      return;
    }

    try {
      const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
        width: 320,
        height: 380,
      });
      
      pipWindowRef.current = pipWindow;
      setIsPiP(true);

      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
          const style = document.createElement('style');
          style.textContent = cssRules;
          pipWindow.document.head.appendChild(style);
        } catch (e) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.type = styleSheet.type;
          link.media = styleSheet.media.mediaText;
          link.href = styleSheet.href || '';
          pipWindow.document.head.appendChild(link);
        }
      });

      if (timerContainerRef.current) {
        pipWindow.document.body.appendChild(timerContainerRef.current);
        pipWindow.document.body.className = 'bg-white dark:bg-[#191919] flex items-center justify-center h-screen m-0 text-zinc-800 dark:text-zinc-200';
      }

      pipWindow.addEventListener('pagehide', () => {
        setIsPiP(false);
        pipWindowRef.current = null;
        const mainContainer = document.getElementById('timer-placeholder');
        if (mainContainer && timerContainerRef.current) {
          mainContainer.appendChild(timerContainerRef.current);
        }
      });
    } catch (error) {
      console.error('Failed to enter PiP mode:', error);
    }
  };

  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const progress = initialTime > 0 ? remainingTime / initialTime : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div id="timer-placeholder" className="flex justify-center items-center w-full max-w-md mx-auto">
      <div 
        ref={timerContainerRef}
        className={cn(
          "flex flex-col items-center justify-center p-8 transition-all duration-500",
          isPiP ? "w-full h-full" : "w-full bg-white dark:bg-[#191919] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm"
        )}
      >
        <div className="w-full flex justify-between items-center mb-6">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            CBMERJ Focus
          </span>
          {!isPiP && 'documentPictureInPicture' in window && (
            <button 
              onClick={togglePiP}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              title="Mini Player (Picture in Picture)"
            >
              <PictureInPicture2 size={16} />
            </button>
          )}
        </div>

        {!isPiP && (
          <div className="w-full space-y-1 mb-6 text-center min-h-[40px] flex flex-col justify-center">
            {selectedTask ? (
              <>
                <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate px-2" title={selectedTask.subject}>
                  {selectedTask.subject}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate px-2" title={selectedTask.topic}>
                  {selectedTask.topic}
                </div>
              </>
            ) : (
              <div className="text-sm text-zinc-500 dark:text-zinc-400 italic px-4">
                Selecione um tópico no Conteúdo Programático para começar
              </div>
            )}
          </div>
        )}

        {!isPiP && !isActive && remainingTime === initialTime && (
          <div className="w-full mb-6 flex justify-center">
            {isEditingTime ? (
              <div className="flex items-center gap-2 justify-center">
                <input 
                  type="number" 
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  className="w-16 bg-zinc-50 dark:bg-[#202020] border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1 text-center text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                  min="1"
                />
                <span className="text-sm text-zinc-500 dark:text-zinc-400">min</span>
                <button 
                  onClick={() => {
                    const mins = parseInt(customMinutes);
                    if (mins > 0) {
                      handleSetTime(mins * 60);
                      setIsEditingTime(false);
                    }
                  }}
                  className="px-3 py-1.5 bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 text-xs rounded-md font-medium hover:bg-zinc-700 dark:hover:bg-white transition-colors"
                >
                  Salvar
                </button>
              </div>
            ) : (
              <button 
                onClick={() => {
                  setCustomMinutes(Math.floor(initialTime / 60).toString());
                  setIsEditingTime(true);
                }}
                className="px-4 py-1.5 text-xs rounded-full transition-colors font-medium bg-zinc-50 dark:bg-[#202020] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-2"
              >
                <Edit2 size={12} />
                Editar Tempo ({Math.floor(initialTime / 60)} min)
              </button>
            )}
          </div>
        )}
        
        <div className="relative flex items-center justify-center w-64 h-64 mb-8">
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r={radius}
              stroke="currentColor"
              className="text-zinc-100 dark:text-zinc-800"
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="128"
              cy="128"
              r={radius}
              stroke="currentColor"
              className="text-zinc-800 dark:text-zinc-200 transition-all duration-1000 ease-linear"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="font-mono text-5xl font-light tracking-tight text-zinc-800 dark:text-zinc-200 tabular-nums z-10">
            {formatTime(remainingTime)}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTimer}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-50 dark:bg-[#202020] text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            {isActive ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
          </button>
          
          <button
            onClick={stopTimer}
            disabled={remainingTime === initialTime}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-50 dark:bg-[#202020] text-zinc-500 dark:text-zinc-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Parar e Salvar"
          >
            <Square size={16} fill="currentColor" />
          </button>
          
          <button
            onClick={resetTimer}
            disabled={remainingTime === initialTime}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-50 dark:bg-[#202020] text-zinc-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zerar tempo (sem salvar)"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Modal de Questões */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#191919] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-2">Sessão Concluída!</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Você estudou <strong className="text-zinc-800 dark:text-zinc-200">{formatTime(elapsedToSave)}</strong> de {selectedTask?.topic}.
                Gostaria de registrar quantas questões você resolveu?
              </p>
              
              <form onSubmit={handleSaveWithQuestions} className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Acertos</label>
                    <input 
                      type="number" 
                      min="0"
                      value={correctAnswers}
                      onChange={(e) => setCorrectAnswers(e.target.value)}
                      placeholder="0"
                      className="w-full bg-zinc-50 dark:bg-[#202020] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-medium text-red-600 dark:text-red-400">Erros</label>
                    <input 
                      type="number" 
                      min="0"
                      value={wrongAnswers}
                      onChange={(e) => setWrongAnswers(e.target.value)}
                      placeholder="0"
                      className="w-full bg-zinc-50 dark:bg-[#202020] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-red-500 dark:focus:border-red-500 transition-colors"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={handleSkipQuestions}
                    className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-[#202020] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors"
                  >
                    Pular
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[#2eaadc] hover:bg-[#2590bd] text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
