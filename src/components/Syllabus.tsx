import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, Timestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ChevronDown, ChevronRight, CheckSquare, Square, Trash2, Plus, BookOpen, Play, Edit2, Check, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { format } from 'date-fns';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ContentItem {
  id: string;
  subject: string;
  title: string;
  completed: boolean;
  createdAt: any;
}

interface StudySession {
  id: string;
  duration: number;
  date: string;
  subject: string;
  topic: string;
  createdAt: any;
}

interface SyllabusProps {
  onSelectTask: (task: { subject: string; topic: string }) => void;
  activeTask: { subject: string; topic: string } | null;
  sessions: StudySession[];
  onDeleteSession: (sessionId: string) => void;
  items: ContentItem[];
  isLoading: boolean;
}

export function Syllabus({ onSelectTask, activeTask, sessions, onDeleteSession, items, isLoading }: SyllabusProps) {
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [newSubject, setNewSubject] = useState('');
  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({});
  
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editItemTitle, setEditItemTitle] = useState('');
  
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  const subjects = Array.from(new Set(items.map(item => item.subject))).sort();

  const toggleSubject = (subject: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subject)) {
      newExpanded.delete(subject);
    } else {
      newExpanded.add(subject);
    }
    setExpandedSubjects(newExpanded);
  };

  const addSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    const subjectName = newSubject.trim();
    if (!user || !subjectName) return;

    try {
      await addDoc(collection(db, 'content_items'), {
        userId: user.uid,
        subject: subjectName,
        title: 'Novo Tópico',
        completed: false,
        createdAt: Timestamp.now()
      });
      setNewSubject('');
      setExpandedSubjects(new Set(expandedSubjects).add(subjectName));
    } catch (error) {
      console.error("Error adding subject:", error);
    }
  };

  const addItem = async (e: React.FormEvent, subject: string) => {
    e.preventDefault();
    const user = auth.currentUser;
    const title = newItemTitles[subject]?.trim();
    if (!user || !title) return;

    try {
      await addDoc(collection(db, 'content_items'), {
        userId: user.uid,
        subject: subject,
        title: title,
        completed: false,
        createdAt: Timestamp.now()
      });
      setNewItemTitles({ ...newItemTitles, [subject]: '' });
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const toggleItem = async (item: ContentItem) => {
    try {
      const itemRef = doc(db, 'content_items', item.id);
      await updateDoc(itemRef, {
        completed: !item.completed
      });
    } catch (error) {
      console.error("Error toggling item:", error);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, 'content_items', itemId));
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const saveSubjectRename = async (oldSubject: string) => {
    const newName = editSubjectName.trim();
    if (!newName || newName === oldSubject) {
      setEditingSubject(null);
      return;
    }
    
    try {
      const itemsToUpdate = items.filter(i => i.subject === oldSubject);
      await Promise.all(itemsToUpdate.map(item => 
        updateDoc(doc(db, 'content_items', item.id), { subject: newName })
      ));
      
      const newExpanded = new Set(expandedSubjects);
      if (newExpanded.has(oldSubject)) {
        newExpanded.delete(oldSubject);
        newExpanded.add(newName);
      }
      setExpandedSubjects(newExpanded);
      setEditingSubject(null);
      
      if (activeTask?.subject === oldSubject) {
        onSelectTask({ subject: newName, topic: activeTask.topic });
      }
    } catch (error) {
      console.error("Error renaming subject:", error);
    }
  };

  const saveItemRename = async (item: ContentItem) => {
    const newTitle = editItemTitle.trim();
    if (!newTitle || newTitle === item.title) {
      setEditingItem(null);
      return;
    }
    try {
      await updateDoc(doc(db, 'content_items', item.id), { title: newTitle });
      setEditingItem(null);
      
      if (activeTask?.subject === item.subject && activeTask?.topic === item.title) {
        onSelectTask({ subject: item.subject, topic: newTitle });
      }
    } catch (error) {
      console.error("Error renaming item:", error);
    }
  };

  const toggleTopic = (itemId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedTopics(newExpanded);
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

  return (
    <div className="bg-white dark:bg-[#191919] rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col h-full shadow-sm transition-colors">
      <div className="flex items-center gap-2 mb-6">
        <BookOpen size={20} className="text-zinc-800 dark:text-zinc-200" />
        <h2 className="text-lg font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">Conteúdo Programático & Histórico</h2>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {isLoading ? (
          <div className="text-zinc-500 dark:text-zinc-400 text-sm text-center py-4 animate-pulse">Carregando conteúdos...</div>
        ) : subjects.length === 0 ? (
          <div className="text-zinc-500 dark:text-zinc-400 text-sm text-center py-8">Nenhuma matéria cadastrada.</div>
        ) : (
          subjects.map(subject => {
            const subjectItems = items.filter(item => item.subject === subject)
              .sort((a, b) => a.createdAt?.toMillis?.() - b.createdAt?.toMillis?.());
            const isExpanded = expandedSubjects.has(subject);
            const completedCount = subjectItems.filter(i => i.completed).length;
            const progress = subjectItems.length > 0 ? Math.round((completedCount / subjectItems.length) * 100) : 0;
            const isEditingThisSubject = editingSubject === subject;

            return (
              <div key={subject} className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden transition-colors">
                <div className="w-full flex items-center justify-between p-2 bg-zinc-50 dark:bg-[#202020] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    <button onClick={() => toggleSubject(subject)} className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200">
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                                   {isEditingThisSubject ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          autoFocus
                          value={editSubjectName}
                          onChange={(e) => setEditSubjectName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveSubjectRename(subject);
                            if (e.key === 'Escape') setEditingSubject(null);
                          }}
                          className="flex-1 bg-white dark:bg-[#191919] border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-500"
                        />
                        <button onClick={() => saveSubjectRename(subject)} className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded">
                          <Check size={16} />
                        </button>
                        <button onClick={() => setEditingSubject(null)} className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1 overflow-hidden group">
                        <span 
                          className="font-medium text-zinc-800 dark:text-zinc-200 truncate cursor-pointer"
                          onClick={() => toggleSubject(subject)}
                        >
                          {subject}
                        </span>
                        {(() => {
                          const subjectSessions = sessions.filter(s => s.subject === subject);
                          const subjectTotalSeconds = subjectSessions.reduce((acc, curr) => acc + curr.duration, 0);
                          if (subjectTotalSeconds > 0) {
                            return (
                              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                                {formatDuration(subjectTotalSeconds)}
                              </span>
                            );
                          }
                          return null;
                        })()}
                        <button 
                          onClick={() => {
                            setEditSubjectName(subject);
                            setEditingSubject(subject);
                          }}
                          className="p-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Renomear matéria"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {!isEditingThisSubject && (
                    <div className="flex items-center gap-3 pr-2">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{completedCount}/{subjectItems.length}</span>
                      <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#2eaadc] transition-all duration-500" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="p-2 bg-white dark:bg-[#191919] space-y-1">
                    {subjectItems.map(item => {
                      const isActive = activeTask?.subject === subject && activeTask?.topic === item.title;
                      const isEditingThisItem = editingItem === item.id;
                      const isTopicExpanded = expandedTopics.has(item.id);
                      
                      const topicSessions = sessions.filter(s => s.subject === subject && s.topic === item.title)
                        .sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.());
                      const totalSeconds = topicSessions.reduce((acc, curr) => acc + curr.duration, 0);
                      
                      return (
                        <div key={item.id} className="flex flex-col gap-1">
                          <div 
                            className={cn(
                              "flex items-center justify-between p-2 rounded-md transition-all group",
                              isActive ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50" : "hover:bg-zinc-50 dark:hover:bg-[#202020] border border-transparent",
                              item.completed && !isActive ? "opacity-60" : ""
                            )}
                          >
                            {isEditingThisItem ? (
                              <div className="flex items-center gap-2 flex-1 ml-6">
                                <input
                                  autoFocus
                                  value={editItemTitle}
                                  onChange={(e) => setEditItemTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveItemRename(item);
                                    if (e.key === 'Escape') setEditingItem(null);
                                  }}
                                  className="flex-1 bg-white dark:bg-[#191919] border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-500"
                                />
                                <button onClick={() => saveItemRename(item)} className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded">
                                  <Check size={16} />
                                </button>
                                <button onClick={() => setEditingItem(null)} className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <button 
                                  onClick={() => toggleItem(item)}
                                  className="flex items-center gap-3 flex-1 text-left overflow-hidden"
                                >
                                  {item.completed ? (
                                    <CheckSquare size={18} className="text-[#2eaadc] shrink-0" />
                                  ) : (
                                    <Square size={18} className="text-zinc-400 dark:text-zinc-500 shrink-0 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors" />
                                  )}
                                  <span className={cn(
                                    "text-sm transition-all truncate",
                                    item.completed ? "text-zinc-500 dark:text-zinc-400 line-through" : "text-zinc-800 dark:text-zinc-200",
                                    isActive && "font-medium text-[#2eaadc]"
                                  )}>
                                    {item.title}
                                  </span>
                                </button>
                                
                                <div className="flex items-center gap-3 shrink-0">
                                  {totalSeconds > 0 && (
                                    <button 
                                      onClick={() => toggleTopic(item.id)}
                                      className="text-xs font-mono text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 transition-colors"
                                      title="Ver registros de estudo"
                                    >
                                      {formatDuration(totalSeconds)}
                                      {isTopicExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </button>
                                  )}
                                  
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => onSelectTask({ subject, topic: item.title })}
                                      className="p-1.5 text-zinc-500 hover:text-[#2eaadc] hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                                      title="Estudar este tópico"
                                    >
                                      <Play size={16} fill={isActive ? "currentColor" : "none"} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditItemTitle(item.title);
                                        setEditingItem(item.id);
                                      }}
                                      className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                                      title="Renomear tópico"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      onClick={() => deleteItem(item.id)}
                                      className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                                      title="Excluir tópico"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                          
                          {/* Expanded Study Sessions for this Topic */}
                          {isTopicExpanded && topicSessions.length > 0 && (
                            <div className="ml-8 pl-4 border-l-2 border-zinc-100 dark:border-zinc-800 space-y-1 py-1 mb-2">
                              {topicSessions.map(session => (
                                <div key={session.id} className="flex items-center justify-between text-xs p-1.5 hover:bg-zinc-50 dark:hover:bg-[#202020] rounded group/session transition-colors">
                                  <span className="text-zinc-500 dark:text-zinc-400">
                                    {session.createdAt ? format(session.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : session.date}
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-zinc-600 dark:text-zinc-300">{formatDuration(session.duration)}</span>
                                    <button 
                                      onClick={() => onDeleteSession(session.id)}
                                      className="text-zinc-400 hover:text-red-500 opacity-0 group-hover/session:opacity-100 transition-opacity"
                                      title="Excluir registro de tempo"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <form onSubmit={(e) => addItem(e, subject)} className="flex gap-2 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                      <input
                        type="text"
                        value={newItemTitles[subject] || ''}
                        onChange={(e) => setNewItemTitles({ ...newItemTitles, [subject]: e.target.value })}
                        placeholder="Adicionar novo tópico..."
                        className="flex-1 bg-transparent border border-transparent rounded-md px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:bg-zinc-50 dark:focus:bg-[#202020] transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={!newItemTitles[subject]?.trim()}
                        className="text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed p-1.5 rounded-md transition-colors"
                      >
                        <Plus size={18} />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={addSubject} className="flex gap-2 mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <input
          type="text"
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
          placeholder="Nova matéria (ex: Português)"
          className="flex-1 bg-zinc-50 dark:bg-[#202020] border border-transparent rounded-md px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:bg-white dark:focus:bg-[#191919] focus:border-zinc-200 dark:focus:border-zinc-700 transition-colors"
        />
        <button
          type="submit"
          disabled={!newSubject.trim()}
          className="text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded-md transition-colors"
        >
          <Plus size={20} />
        </button>
      </form>
    </div>
  );
}
