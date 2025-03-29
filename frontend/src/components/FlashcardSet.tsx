'use client';

import React, { useState, useEffect } from 'react';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  lastReviewed?: Date;
  confidence: 'low' | 'medium' | 'high';
}

interface FlashcardSetProps {
  title: string;
  initialCards?: Flashcard[];
  onSave?: (cards: Flashcard[]) => void;
  storageKey?: string;
}

const FlashcardSet: React.FC<FlashcardSetProps> = ({
  title,
  initialCards = [],
  onSave,
  storageKey = 'edusloth-flashcards'
}) => {
  const [cards, setCards] = useState<Flashcard[]>(initialCards);
  const [currentCard, setCurrentCard] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [newCard, setNewCard] = useState({ question: '', answer: '' });
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [mode, setMode] = useState<'edit' | 'study'>('edit');
  const [shuffled, setShuffled] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCards = localStorage.getItem(storageKey);
      if (savedCards) {
        try {
          setCards(JSON.parse(savedCards));
        } catch (error) {
          console.error('Failed to parse flashcards from storage', error);
        }
      }
    }
  }, [storageKey]);

  // Save to localStorage when cards change
  useEffect(() => {
    if (typeof window !== 'undefined' && cards.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(cards));
      if (onSave) {
        onSave(cards);
      }
    }
  }, [cards, storageKey, onSave]);

  // Set the first card as current when entering study mode
  useEffect(() => {
    if (mode === 'study' && cards.length > 0 && currentCard === null) {
      setCurrentCard(0);
      setShowAnswer(false);
    }
  }, [mode, cards, currentCard]);

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCard.question.trim() && newCard.answer.trim()) {
      if (editingCardId) {
        // Update existing card
        setCards(
          cards.map(card => 
            card.id === editingCardId 
              ? { 
                  ...card, 
                  question: newCard.question.trim(),
                  answer: newCard.answer.trim()
                } 
              : card
          )
        );
        setEditingCardId(null);
      } else {
        // Add new card
        const card: Flashcard = {
          id: Date.now().toString(),
          question: newCard.question.trim(),
          answer: newCard.answer.trim(),
          confidence: 'medium'
        };
        setCards([...cards, card]);
      }
      
      setNewCard({ question: '', answer: '' });
    }
  };

  const startEditCard = (card: Flashcard) => {
    setEditingCardId(card.id);
    setNewCard({
      question: card.question,
      answer: card.answer
    });
  };

  const deleteCard = (id: string) => {
    setCards(cards.filter(card => card.id !== id));
  };

  const shuffleCards = () => {
    const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffledCards);
    setCurrentCard(0);
    setShowAnswer(false);
    setShuffled(true);
  };

  const startStudying = () => {
    setMode('study');
    setCurrentCard(0);
    setShowAnswer(false);
  };

  const stopStudying = () => {
    setMode('edit');
    setCurrentCard(null);
    setShowAnswer(false);
  };

  const nextCard = () => {
    if (currentCard === null || cards.length === 0) return;
    
    if (currentCard < cards.length - 1) {
      setCurrentCard(currentCard + 1);
      setShowAnswer(false);
    } else {
      // End of deck
      setCurrentCard(null);
      setMode('edit');
      setShuffled(false);
    }
  };

  const previousCard = () => {
    if (currentCard === null || currentCard === 0 || cards.length === 0) return;
    
    setCurrentCard(currentCard - 1);
    setShowAnswer(false);
  };
  
  const updateConfidence = (confidence: 'low' | 'medium' | 'high') => {
    if (currentCard === null) return;
    
    setCards(
      cards.map((card, index) => 
        index === currentCard 
          ? { 
              ...card, 
              confidence,
              lastReviewed: new Date()
            } 
          : card
      )
    );
    
    nextCard();
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-700">{title}</h2>
          
          <div className="flex space-x-2">
            {mode === 'edit' ? (
              <button
                onClick={startStudying}
                disabled={cards.length === 0}
                className={`bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                  cards.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Study
              </button>
            ) : (
              <button
                onClick={stopStudying}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Stop Studying
              </button>
            )}
            
            {mode === 'study' && !shuffled && (
              <button
                onClick={shuffleCards}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Shuffle
              </button>
            )}
          </div>
        </div>

        {mode === 'edit' ? (
          <>
            <form onSubmit={handleAddCard} className="mb-6">
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="question">
                  Question
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="question"
                  type="text"
                  placeholder="Enter question"
                  value={newCard.question}
                  onChange={(e) => setNewCard({ ...newCard, question: e.target.value })}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="answer">
                  Answer
                </label>
                <textarea
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="answer"
                  placeholder="Enter answer"
                  value={newCard.answer}
                  onChange={(e) => setNewCard({ ...newCard, answer: e.target.value })}
                  required
                  rows={3}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  type="submit"
                >
                  {editingCardId ? 'Update Card' : 'Add Card'}
                </button>
                
                {editingCardId && (
                  <button
                    onClick={() => {
                      setEditingCardId(null);
                      setNewCard({ question: '', answer: '' });
                    }}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    type="button"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
            
            <div className="mt-6">
              <h3 className="text-lg font-bold text-gray-700 mb-4">Your Flashcards ({cards.length})</h3>
              
              {cards.length === 0 ? (
                <p className="text-gray-500">No flashcards yet. Add one above!</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {cards.map((card, index) => (
                    <li key={card.id} className="py-4">
                      <div className="flex justify-between">
                        <div className="w-5/6">
                          <p className="text-sm font-medium text-gray-900">
                            Q: {card.question}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            A: {card.answer}
                          </p>
                          <div className="mt-1 flex items-center">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              card.confidence === 'high' 
                                ? 'bg-green-100 text-green-800' 
                                : card.confidence === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}>
                              {card.confidence.charAt(0).toUpperCase() + card.confidence.slice(1)} confidence
                            </span>
                            {card.lastReviewed && (
                              <span className="ml-2 text-xs text-gray-500">
                                Last reviewed: {new Date(card.lastReviewed).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => startEditCard(card)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteCard(card.id)}
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
        ) : (
          <>
            {currentCard !== null && cards.length > 0 ? (
              <div className="flex flex-col items-center">
                <div className="w-full p-6 border rounded-lg mb-4 min-h-48 flex flex-col items-center justify-center text-center">
                  <h3 className="text-xl font-semibold mb-2">Question:</h3>
                  <p className="text-lg">{cards[currentCard].question}</p>
                  
                  {showAnswer && (
                    <div className="mt-6 pt-4 border-t border-gray-200 w-full">
                      <h3 className="text-xl font-semibold mb-2">Answer:</h3>
                      <p className="text-lg">{cards[currentCard].answer}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between w-full mb-4">
                  <button
                    onClick={previousCard}
                    disabled={currentCard === 0}
                    className={`bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                      currentCard === 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Previous
                  </button>
                  
                  {!showAnswer ? (
                    <button
                      onClick={() => setShowAnswer(true)}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    >
                      Show Answer
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateConfidence('low')}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                      >
                        Hard
                      </button>
                      <button
                        onClick={() => updateConfidence('medium')}
                        className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                      >
                        Medium
                      </button>
                      <button
                        onClick={() => updateConfidence('high')}
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                      >
                        Easy
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={nextCard}
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    {currentCard === cards.length - 1 ? 'Finish' : 'Skip'}
                  </button>
                </div>
                
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-500 h-2" 
                    style={{ width: `${((currentCard + 1) / cards.length) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Card {currentCard + 1} of {cards.length}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10">
                <h3 className="text-xl font-bold text-gray-700 mb-4">
                  {cards.length === 0 
                    ? 'No flashcards to study! Add some cards first.' 
                    : 'You finished studying all cards!'}
                </h3>
                <button
                  onClick={stopStudying}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Back to Editing
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FlashcardSet; 