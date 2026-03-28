import React, { useState, useEffect } from 'react';
import { Timer } from './components/Timer';
import { Heatmap } from './components/Heatmap';
import { Syllabus } from './components/Syllabus';
import { Stats } from './components/Stats';
import { Questions } from './components/Questions';
import { SessionHistory } from './components/SessionHistory';
import { LogIn, LogOut, Moon, Sun, Clock, BookOpen, BarChart2, CheckSquare, History as HistoryIcon } from 'lucide-react';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { format } from 'date-fns';

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

class ErrorBoundary extends React.Component<any, any> {
  state = { hasError: false, error: null };
  props: any;

  constructor(props: any) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white dark:bg-[#191919] text-zinc-800 dark:text-zinc-200 flex flex-col items-center justify-center p-4 transition-colors">
          <h1 className="text-2xl font-bold mb-4">Ops! Algo deu errado.</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-4">Desculpe pelo inconveniente. Por favor, recarregue a página.</p>
          <pre className="bg-zinc-50 dark:bg-[#202020] p-4 rounded-lg text-sm overflow-auto max-w-2xl w-full border border-zinc-200 dark:border-zinc-800">
            {this.state.error?.message}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 rounded-md hover:bg-zinc-700 dark:hover:bg-white transition-colors"
          >
            Recarregar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function StudyApp() {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<{subject: string, topic: string} | null>(null);
  const [activeTab, setActiveTab] = useState<'timer' | 'content' | 'stats' | 'questions' | 'history'>('timer');

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
             window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setSessions([]);
        setContentItems([]);
        setIsLoading(false);
        setIsContentLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const qSessions = query(
      collection(db, 'study_sessions'),
      where('userId', '==', user.uid)
    );

    const unsubscribeSessions = onSnapshot(qSessions, (snapshot) => {
      const newSessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StudySession[];
      setSessions(newSessions);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching sessions:", error);
      setIsLoading(false);
    });

    const qContent = query(
      collection(db, 'content_items'),
      where('userId', '==', user.uid)
    );

    const unsubscribeContent = onSnapshot(qContent, (snapshot) => {
      const newItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ContentItem[];
      setContentItems(newItems);
      setIsContentLoading(false);
    }, (error) => {
      console.error("Error fetching content items:", error);
      setIsContentLoading(false);
    });

    return () => {
      unsubscribeSessions();
      unsubscribeContent();
    };
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setErrorMsg(null);
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in:", error);
      setErrorMsg("Erro ao fazer login. Tente novamente.");
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const saveSession = async (durationSeconds: number, subject: string, topic: string, correctAnswers: number = 0, wrongAnswers: number = 0) => {
    if (!user) {
      setErrorMsg("Você precisa estar logado para salvar as sessões.");
      setTimeout(() => setErrorMsg(null), 5000);
      return;
    }

    const today = new Date();
    const dateStr = format(today, 'yyyy-MM-dd');

    try {
      await addDoc(collection(db, 'study_sessions'), {
        userId: user.uid,
        duration: durationSeconds,
        date: dateStr,
        subject: subject || 'Estudo Geral',
        topic: topic || 'Sem tópico específico',
        correctAnswers,
        wrongAnswers,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error("Error saving session:", error);
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        const errInfo = {
          error: error.message,
          operationType: 'create',
          path: 'study_sessions',
          authInfo: {
            userId: user.uid,
            email: user.email
          }
        };
        console.error('Firestore Error: ', JSON.stringify(errInfo));
      }
      setErrorMsg("Erro ao salvar a sessão.");
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await deleteDoc(doc(db, 'study_sessions', sessionId));
    } catch (error) {
      console.error("Error deleting session:", error);
      setErrorMsg("Erro ao excluir o registro.");
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

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

  const handleSelectTask = (task: {subject: string, topic: string}) => {
    setSelectedTask(task);
    setActiveTab('timer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#191919] text-zinc-800 dark:text-zinc-200 font-sans selection:bg-[#2eaadc]/30 transition-colors duration-200">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#191919]/80 backdrop-blur-md sticky top-0 z-10 transition-colors">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-zinc-50 dark:bg-[#202020] flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">SF</span>
            </div>
            <h1 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">StudyFlow</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-500 dark:text-zinc-400 hidden sm:inline-block">{user.email}</span>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                >
                  <LogOut size={16} />
                  <span>Sair</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 px-3 py-1.5 rounded-md transition-colors"
              >
                <LogIn size={16} />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        {errorMsg && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-500 px-4 py-3 rounded-md text-sm border border-red-200 dark:border-red-900/50 flex items-center justify-center">
            {errorMsg}
          </div>
        )}
        {user ? (
          <>
            {/* Tab Navigation */}
            <div className="flex items-center justify-center mb-8">
              <div className="bg-zinc-100 dark:bg-[#191919] p-1 rounded-lg flex flex-wrap justify-center gap-1 shadow-sm border border-zinc-200 dark:border-zinc-800 transition-colors">
                <button
                  onClick={() => setActiveTab('timer')}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'timer'
                      ? 'bg-white dark:bg-[#2a2a2a] text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-[#202020]'
                  }`}
                >
                  <Clock size={16} />
                  <span className="hidden sm:inline">Cronômetro</span>
                </button>
                <button
                  onClick={() => setActiveTab('content')}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'content'
                      ? 'bg-white dark:bg-[#2a2a2a] text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-[#202020]'
                  }`}
                >
                  <BookOpen size={16} />
                  <span className="hidden sm:inline">Conteúdo</span>
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'stats'
                      ? 'bg-white dark:bg-[#2a2a2a] text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-[#202020]'
                  }`}
                >
                  <BarChart2 size={16} />
                  <span className="hidden sm:inline">Estatísticas</span>
                </button>
                <button
                  onClick={() => setActiveTab('questions')}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'questions'
                      ? 'bg-white dark:bg-[#2a2a2a] text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-[#202020]'
                  }`}
                >
                  <CheckSquare size={16} />
                  <span className="hidden sm:inline">Questões</span>
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'history'
                      ? 'bg-white dark:bg-[#2a2a2a] text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-[#202020]'
                  }`}
                >
                  <HistoryIcon size={16} />
                  <span className="hidden sm:inline">Histórico</span>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className={activeTab === 'timer' ? 'block' : 'hidden'}>
              <section className="flex flex-col items-center justify-center">
                <Timer 
                  onSaveSession={saveSession} 
                  selectedTask={selectedTask} 
                />
              </section>
            </div>

            <div className={activeTab === 'content' ? 'block' : 'hidden'}>
              <section className="space-y-8">
                <div className="space-y-4">
                  <Syllabus 
                    onSelectTask={(task) => {
                      handleSelectTask(task);
                      setActiveTab('timer'); // Switch to timer tab when a task is selected
                    }} 
                    activeTask={selectedTask} 
                    sessions={sessions}
                    onDeleteSession={deleteSession}
                    items={contentItems}
                    isLoading={isContentLoading}
                  />
                </div>

                <div className="space-y-4">
                  <h2 className="text-lg font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">Histórico de Estudos</h2>
                  <div className="bg-white dark:bg-[#191919] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm overflow-x-auto transition-colors">
                    <Heatmap sessions={sessions} />
                  </div>
                </div>
              </section>
            </div>

            <div className={activeTab === 'stats' ? 'block' : 'hidden'}>
              <section>
                <Stats sessions={sessions} contentItems={contentItems} />
              </section>
            </div>

            <div className={activeTab === 'questions' ? 'block' : 'hidden'}>
              <section>
                <Questions sessions={sessions} contentItems={contentItems} />
              </section>
            </div>

            <div className={activeTab === 'history' ? 'block' : 'hidden'}>
              <section>
                <SessionHistory sessions={sessions} onDeleteSession={deleteSession} />
              </section>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-[#202020] flex items-center justify-center border border-zinc-200 dark:border-zinc-800 mb-4">
              <span className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">SF</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">Bem-vindo ao StudyFlow</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-md">
              Organize suas matérias, cronometre seu tempo de estudo e acompanhe seu progresso de forma simples e minimalista.
            </p>
            <button 
              onClick={handleLogin}
              className="mt-4 px-6 py-2.5 bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 rounded-md font-medium hover:bg-zinc-700 dark:hover:bg-white transition-colors"
            >
              Fazer login com Google
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StudyApp />
    </ErrorBoundary>
  );
}
