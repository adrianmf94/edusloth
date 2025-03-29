'use client';

import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Todo from '@/components/Todo';
import StudyPlan from '@/components/StudyPlan';
import FlashcardSet from '@/components/FlashcardSet';

// Mock data for the flashcards
const sampleFlashcards = [
  {
    id: '1',
    question: 'What is React?',
    answer: 'A JavaScript library for building user interfaces',
    confidence: 'high' as const,
    lastReviewed: new Date(Date.now() - 86400000) // yesterday
  },
  {
    id: '2',
    question: 'What is JSX?',
    answer: 'JavaScript XML - A syntax extension for JavaScript recommended by React',
    confidence: 'medium' as const,
  },
  {
    id: '3',
    question: 'What is a React Hook?',
    answer: 'Functions that let you "hook into" React state and lifecycle features from function components',
    confidence: 'low' as const,
  }
];

// Mock study goals
const sampleGoals = [
  {
    id: '1',
    title: 'Learn React Hooks',
    description: 'Master useState, useEffect, useContext, and custom hooks',
    completed: false,
    targetDate: new Date(Date.now() + 7 * 86400000), // 7 days from now
    priority: 'high' as const
  },
  {
    id: '2',
    title: 'Complete Next.js Tutorial',
    description: 'Go through the official tutorial and build a small app',
    completed: true,
    targetDate: new Date(Date.now() - 2 * 86400000), // 2 days ago
    priority: 'medium' as const
  }
];

// Mock study sessions
const sampleSessions = [
  {
    id: '1',
    goalId: '1',
    date: new Date(Date.now() - 86400000), // yesterday
    duration: 60, // minutes
    notes: 'Completed useState and useEffect sections'
  },
  {
    id: '2',
    goalId: '1',
    date: new Date(Date.now() - 3 * 86400000), // 3 days ago
    duration: 45, // minutes
    notes: 'Got started with React docs and basic hook examples'
  }
];

const ComponentsShowcasePage = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Components Showcase</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <section className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Todo Component</h2>
            <Todo title="Sample Todo List" />
          </section>
          
          <section className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Flashcards Component</h2>
            <FlashcardSet 
              title="Sample Flashcards" 
              initialCards={sampleFlashcards}
              storageKey="showcase-flashcards"
            />
          </section>
        </div>
        
        <section className="bg-white shadow-md rounded-lg p-6 mb-12">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Study Plan Component</h2>
          <StudyPlan 
            initialGoals={sampleGoals}
            initialSessions={sampleSessions}
            storageKeyPrefix="showcase-study"
          />
        </section>
      </div>
    </MainLayout>
  );
};

export default ComponentsShowcasePage; 