'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

interface TodoProps {
  initialTodos?: Todo[];
  onSave?: (todos: Todo[]) => void;
  title?: string;
  storageKey?: string;
}

const Todo: React.FC<TodoProps> = ({
  initialTodos = [],
  onSave,
  title = 'Tasks',
  storageKey = 'edusloth-todos'
}) => {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [newTodo, setNewTodo] = useState('');
  const router = useRouter();

  // Load todos from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTodos = localStorage.getItem(storageKey);
      if (savedTodos) {
        try {
          setTodos(JSON.parse(savedTodos));
        } catch (error) {
          console.error('Failed to parse todos from storage', error);
        }
      }
    }
  }, [storageKey]);

  // Save todos to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && todos.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(todos));
      if (onSave) {
        onSave(todos);
      }
    }
  }, [todos, storageKey, onSave]);

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim()) {
      const newTask: Todo = {
        id: Date.now().toString(),
        text: newTodo.trim(),
        completed: false,
        createdAt: new Date()
      };
      setTodos([...todos, newTask]);
      setNewTodo('');
    }
  };

  const toggleComplete = (id: string) => {
    setTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const clearCompleted = () => {
    setTodos(todos.filter(todo => !todo.completed));
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        
        <form onSubmit={handleAddTodo} className="mb-4">
          <div className="flex items-center border-b border-blue-500 py-2">
            <input
              className="appearance-none bg-transparent border-none w-full text-gray-700 mr-3 py-1 px-2 leading-tight focus:outline-none"
              type="text"
              placeholder="Add a new task..."
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
            />
            <button
              className="flex-shrink-0 bg-blue-500 hover:bg-blue-700 border-blue-500 hover:border-blue-700 text-sm border-4 text-white py-1 px-2 rounded"
              type="submit"
            >
              Add
            </button>
          </div>
        </form>
        
        <ul className="divide-y divide-gray-200">
          {todos.length === 0 ? (
            <li className="py-4 text-gray-500">No tasks yet. Add one above!</li>
          ) : (
            todos.map(todo => (
              <li key={todo.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={todo.completed}
                      onChange={() => toggleComplete(todo.id)}
                    />
                    <span 
                      className={`ml-3 ${
                        todo.completed ? 'line-through text-gray-400' : 'text-gray-900'
                      }`}
                    >
                      {todo.text}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
        
        {todos.some(todo => todo.completed) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearCompleted}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear completed
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Todo; 