import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, Timestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { CheckSquare, Square, Trash2, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: any;
}

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newTasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      
      newTasks.sort((a, b) => {
        if (a.completed === b.completed) {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        }
        return a.completed ? 1 : -1;
      });
      
      setTasks(newTasks);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching tasks:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !newTaskTitle.trim()) return;

    try {
      await addDoc(collection(db, 'tasks'), {
        userId: user.uid,
        title: newTaskTitle.trim(),
        completed: false,
        createdAt: Timestamp.now()
      });
      setNewTaskTitle('');
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, {
        completed: !task.completed
      });
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-[#e9e9e7] p-6 flex flex-col h-full max-h-[400px] shadow-sm">
      <form onSubmit={addTask} className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Adicionar nova tarefa..."
          className="flex-1 bg-[#f7f7f5] border border-transparent rounded-md px-3 py-2 text-sm text-[#37352f] placeholder:text-[#9ca2b0] focus:outline-none focus:bg-white focus:border-[#e9e9e7] transition-colors"
        />
        <button
          type="submit"
          disabled={!newTaskTitle.trim()}
          className="text-[#787774] hover:bg-[#f7f7f5] hover:text-[#37352f] disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded-md transition-colors"
        >
          <Plus size={20} />
        </button>
      </form>

      <div className="flex-1 overflow-y-auto pr-2 space-y-1">
        {isLoading ? (
          <div className="text-[#787774] text-sm text-center py-4 animate-pulse">Carregando tarefas...</div>
        ) : tasks.length === 0 ? (
          <div className="text-[#787774] text-sm text-center py-8">Nenhuma tarefa pendente.</div>
        ) : (
          tasks.map(task => (
            <div 
              key={task.id} 
              className={cn(
                "flex items-center justify-between p-2 rounded-md transition-all group",
                task.completed 
                  ? "opacity-60" 
                  : "hover:bg-[#f7f7f5]"
              )}
            >
              <button 
                onClick={() => toggleTask(task)}
                className="flex items-center gap-3 flex-1 text-left"
              >
                {task.completed ? (
                  <CheckSquare size={18} className="text-[#37352f] shrink-0" />
                ) : (
                  <Square size={18} className="text-[#9ca2b0] shrink-0 group-hover:text-[#37352f] transition-colors" />
                )}
                <span className={cn(
                  "text-sm transition-all",
                  task.completed ? "text-[#787774] line-through" : "text-[#37352f]"
                )}>
                  {task.title}
                </span>
              </button>
              
              <button
                onClick={() => deleteTask(task.id)}
                className="p-1.5 text-[#9ca2b0] hover:text-[#eb5757] hover:bg-[#ffebe9] rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                title="Excluir tarefa"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
