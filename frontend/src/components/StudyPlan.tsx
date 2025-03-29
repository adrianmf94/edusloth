'use client';

import React, { useState, useEffect } from 'react';

interface StudyGoal {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  targetDate?: Date;
  priority: 'low' | 'medium' | 'high';
}

interface StudySession {
  id: string;
  goalId: string;
  date: Date;
  duration: number; // in minutes
  notes?: string;
}

interface StudyPlanProps {
  initialGoals?: StudyGoal[];
  initialSessions?: StudySession[];
  onSaveGoals?: (goals: StudyGoal[]) => void;
  onSaveSessions?: (sessions: StudySession[]) => void;
  storageKeyPrefix?: string;
}

const StudyPlan: React.FC<StudyPlanProps> = ({
  initialGoals = [],
  initialSessions = [],
  onSaveGoals,
  onSaveSessions,
  storageKeyPrefix = 'edusloth-study'
}) => {
  const [goals, setGoals] = useState<StudyGoal[]>(initialGoals);
  const [sessions, setSessions] = useState<StudySession[]>(initialSessions);
  const [newGoal, setNewGoal] = useState<Partial<StudyGoal>>({
    title: '',
    description: '',
    completed: false,
    priority: 'medium'
  });
  const [newSession, setNewSession] = useState<Partial<StudySession>>({
    goalId: '',
    duration: 30,
    notes: ''
  });
  const [activeTab, setActiveTab] = useState<'goals' | 'sessions'>('goals');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedGoals = localStorage.getItem(`${storageKeyPrefix}-goals`);
      const savedSessions = localStorage.getItem(`${storageKeyPrefix}-sessions`);
      
      if (savedGoals) {
        try {
          setGoals(JSON.parse(savedGoals));
        } catch (error) {
          console.error('Failed to parse study goals from storage', error);
        }
      }
      
      if (savedSessions) {
        try {
          setSessions(JSON.parse(savedSessions));
        } catch (error) {
          console.error('Failed to parse study sessions from storage', error);
        }
      }
    }
  }, [storageKeyPrefix]);

  // Save to localStorage when data changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${storageKeyPrefix}-goals`, JSON.stringify(goals));
      if (onSaveGoals) {
        onSaveGoals(goals);
      }
    }
  }, [goals, storageKeyPrefix, onSaveGoals]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${storageKeyPrefix}-sessions`, JSON.stringify(sessions));
      if (onSaveSessions) {
        onSaveSessions(sessions);
      }
    }
  }, [sessions, storageKeyPrefix, onSaveSessions]);

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGoal.title?.trim()) {
      const goal: StudyGoal = {
        id: Date.now().toString(),
        title: newGoal.title.trim(),
        description: newGoal.description?.trim(),
        completed: false,
        targetDate: newGoal.targetDate,
        priority: newGoal.priority || 'medium'
      };
      setGoals([...goals, goal]);
      setNewGoal({
        title: '',
        description: '',
        completed: false,
        priority: 'medium'
      });
    }
  };

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSession.goalId && newSession.duration) {
      const session: StudySession = {
        id: Date.now().toString(),
        goalId: newSession.goalId,
        date: newSession.date || new Date(),
        duration: newSession.duration,
        notes: newSession.notes?.trim()
      };
      setSessions([...sessions, session]);
      setNewSession({
        goalId: '',
        duration: 30,
        notes: ''
      });
    }
  };

  const toggleGoalComplete = (id: string) => {
    setGoals(
      goals.map(goal =>
        goal.id === id ? { ...goal, completed: !goal.completed } : goal
      )
    );
  };

  const deleteGoal = (id: string) => {
    setGoals(goals.filter(goal => goal.id !== id));
    // Also delete related sessions
    setSessions(sessions.filter(session => session.goalId !== id));
  };

  const deleteSession = (id: string) => {
    setSessions(sessions.filter(session => session.id !== id));
  };

  const startEditGoal = (goal: StudyGoal) => {
    setEditingGoalId(goal.id);
    setNewGoal({
      title: goal.title,
      description: goal.description,
      priority: goal.priority,
      targetDate: goal.targetDate
    });
  };

  const saveEditGoal = () => {
    if (editingGoalId && newGoal.title?.trim()) {
      setGoals(
        goals.map(goal => 
          goal.id === editingGoalId 
            ? { 
                ...goal, 
                title: newGoal.title!.trim(),
                description: newGoal.description,
                priority: newGoal.priority as 'low' | 'medium' | 'high',
                targetDate: newGoal.targetDate
              } 
            : goal
        )
      );
      setEditingGoalId(null);
      setNewGoal({
        title: '',
        description: '',
        completed: false,
        priority: 'medium'
      });
    }
  };

  const cancelEditGoal = () => {
    setEditingGoalId(null);
    setNewGoal({
      title: '',
      description: '',
      completed: false,
      priority: 'medium'
    });
  };

  // Get goal by ID helper
  const getGoalById = (id: string) => {
    return goals.find(goal => goal.id === id);
  };

  // Format duration helper
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${mins > 0 ? `${mins}m` : ''}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="flex border-b mb-4">
          <button
            className={`py-2 px-4 mr-2 ${
              activeTab === 'goals'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('goals')}
          >
            Study Goals
          </button>
          <button
            className={`py-2 px-4 ${
              activeTab === 'sessions'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('sessions')}
          >
            Study Sessions
          </button>
        </div>

        {activeTab === 'goals' && (
          <>
            <form onSubmit={handleAddGoal} className="mb-6">
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="goalTitle">
                  Goal Title
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="goalTitle"
                  type="text"
                  placeholder="Learn React Hooks"
                  value={newGoal.title || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="goalDescription">
                  Description (Optional)
                </label>
                <textarea
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="goalDescription"
                  placeholder="Understand useEffect, useState, and useContext"
                  value={newGoal.description || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  rows={2}
                />
              </div>
              
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="goalTargetDate">
                    Target Date (Optional)
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="goalTargetDate"
                    type="date"
                    value={newGoal.targetDate ? new Date(newGoal.targetDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setNewGoal({ 
                      ...newGoal, 
                      targetDate: e.target.value ? new Date(e.target.value) : undefined 
                    })}
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="goalPriority">
                    Priority
                  </label>
                  <select
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="goalPriority"
                    value={newGoal.priority || 'medium'}
                    onChange={(e) => setNewGoal({ 
                      ...newGoal, 
                      priority: e.target.value as 'low' | 'medium' | 'high'
                    })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                {editingGoalId ? (
                  <>
                    <button
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                      type="button"
                      onClick={saveEditGoal}
                    >
                      Save Changes
                    </button>
                    <button
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                      type="button"
                      onClick={cancelEditGoal}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    type="submit"
                  >
                    Add Goal
                  </button>
                )}
              </div>
            </form>
            
            <div className="mt-6">
              <h3 className="text-lg font-bold text-gray-700 mb-4">Your Study Goals</h3>
              
              {goals.length === 0 ? (
                <p className="text-gray-500">No study goals yet. Add one above!</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {goals.map(goal => (
                    <li key={goal.id} className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={goal.completed}
                            onChange={() => toggleGoalComplete(goal.id)}
                          />
                          <div className="ml-3">
                            <p className={`text-sm font-medium ${
                              goal.completed ? 'line-through text-gray-400' : 'text-gray-900'
                            }`}>
                              {goal.title}
                            </p>
                            {goal.description && (
                              <p className="mt-1 text-sm text-gray-500">{goal.description}</p>
                            )}
                            <div className="mt-1 flex items-center text-xs">
                              {goal.targetDate && (
                                <span className="mr-3 text-gray-500">
                                  Due: {new Date(goal.targetDate).toLocaleDateString()}
                                </span>
                              )}
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                goal.priority === 'high' 
                                  ? 'bg-red-100 text-red-800' 
                                  : goal.priority === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                              }`}>
                                {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => startEditGoal(goal)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteGoal(goal.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {activeTab === 'sessions' && (
          <>
            <form onSubmit={handleAddSession} className="mb-6">
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sessionGoal">
                  Related Study Goal
                </label>
                <select
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="sessionGoal"
                  value={newSession.goalId || ''}
                  onChange={(e) => setNewSession({ ...newSession, goalId: e.target.value })}
                  required
                >
                  <option value="">Select a goal</option>
                  {goals.map(goal => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sessionDate">
                    Date
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="sessionDate"
                    type="date"
                    value={newSession.date ? new Date(newSession.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                    onChange={(e) => setNewSession({ 
                      ...newSession, 
                      date: e.target.value ? new Date(e.target.value) : new Date() 
                    })}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sessionDuration">
                    Duration (minutes)
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="sessionDuration"
                    type="number"
                    min="1"
                    step="1"
                    value={newSession.duration || 30}
                    onChange={(e) => setNewSession({ 
                      ...newSession, 
                      duration: parseInt(e.target.value) 
                    })}
                    required
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sessionNotes">
                  Session Notes (Optional)
                </label>
                <textarea
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="sessionNotes"
                  placeholder="What did you accomplish in this session?"
                  value={newSession.notes || ''}
                  onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                  rows={2}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  type="submit"
                >
                  Log Study Session
                </button>
              </div>
            </form>
            
            <div className="mt-6">
              <h3 className="text-lg font-bold text-gray-700 mb-4">Your Study Sessions</h3>
              
              {sessions.length === 0 ? (
                <p className="text-gray-500">No study sessions logged yet. Add one above!</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {sessions.map(session => {
                    const goal = getGoalById(session.goalId);
                    return (
                      <li key={session.id} className="py-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {goal ? goal.title : 'Unknown Goal'}
                            </p>
                            <div className="mt-1 flex items-center text-xs text-gray-500">
                              <span className="mr-3">
                                {new Date(session.date).toLocaleDateString()}
                              </span>
                              <span className="mr-3">
                                {formatDuration(session.duration)}
                              </span>
                            </div>
                            {session.notes && (
                              <p className="mt-1 text-sm text-gray-500">{session.notes}</p>
                            )}
                          </div>
                          <button
                            onClick={() => deleteSession(session.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              
              {sessions.length > 0 && (
                <div className="mt-4 text-sm text-gray-700">
                  <p>
                    <strong>Total Study Time: </strong> 
                    {formatDuration(sessions.reduce((total, session) => total + session.duration, 0))}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudyPlan; 