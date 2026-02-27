'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { aiAPI, reviewsAPI } from '@/lib/api';

export default function ReviewPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [mode, setMode] = useState<'flashcard' | 'cloze' | 'listening' | 'speaking' | 'writing'>('flashcard');
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [aiCorrections, setAiCorrections] = useState<any[]>([]);
  const [aiTranscript, setAiTranscript] = useState<string>('');
  const [aiPronunciationIssues, setAiPronunciationIssues] = useState<string[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [flashcardPair, setFlashcardPair] = useState<{ shown: string; correct: string; isCorrectPair: boolean } | null>(null);
  const [showFlashcardCorrection, setShowFlashcardCorrection] = useState(false);
  const [translationCache, setTranslationCache] = useState<Record<number, string>>({});
  const [loadingTranslation, setLoadingTranslation] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    loadReviewItems();
  }, []);

  useEffect(() => {
    resetPerItemState();
  }, [currentIndex, mode]);

  useEffect(() => {
    if (mode === 'flashcard' && items.length > 0 && items[currentIndex]) {
      buildAndSetFlashcardPair();
    }
  }, [mode, currentIndex, items, translationCache]);

  const buildAndSetFlashcardPair = async () => {
    const pair = await buildFlashcardPair();
    setFlashcardPair(pair);
  };

  const loadReviewItems = async () => {
    try {
      const response = await reviewsAPI.getYesterday();
      setItems(response.data.items);
    } catch (err) {
      console.error('Failed to load review items');
    } finally {
      setLoading(false);
    }
  };

  const resetPerItemState = () => {
    setShowAnswer(false);
    setInputText('');
    setFeedback('');
    setAiScore(null);
    setAiCorrections([]);
    setAiTranscript('');
    setAiPronunciationIssues([]);
    setAudioBlob(null);
    setIsRecording(false);
    setIsListening(false);
    setRecognizedText('');
    setShowFlashcardCorrection(false);
    audioChunksRef.current = [];
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const normalizeText = (text: string) =>
    text.toLowerCase().trim().replace(/\s+/g, ' ');

  const clozeData = useMemo(() => {
    const currentItem = items[currentIndex];
    if (!currentItem?.content) return { prompt: '', answer: '' };
    const words = currentItem.content.split(' ');
    const indexToHide = words.findIndex((w: string) => w.length > 3);
    const targetIndex = indexToHide >= 0 ? indexToHide : 0;
    const answer = words[targetIndex] || '';
    const prompt = words
      .map((w: string, i: number) => (i === targetIndex ? '_____' : w))
      .join(' ');
    return { prompt, answer };
  }, [items, currentIndex]);

  const buildFlashcardPair = async () => {
    const currentItem = items[currentIndex];
    if (!currentItem) return null;
    let correctTranslation = currentItem.example || '';
    if (!correctTranslation) {
      if (translationCache[currentItem.id]) {
        correctTranslation = translationCache[currentItem.id];
      } else {
        setLoadingTranslation(true);
        try {
          const response = await aiAPI.translate({
            text: currentItem.content,
            source_lang: 'English',
            target_lang: 'Chinese',
          });
          correctTranslation = response.data.translation;
          setTranslationCache(prev => ({ ...prev, [currentItem.id]: correctTranslation }));
        } catch (err) {
          correctTranslation = '(Translation unavailable)';
        } finally {
          setLoadingTranslation(false);
        }
      }
    }
    if (!correctTranslation || correctTranslation === '(Translation unavailable)') {
      return { shown: correctTranslation, correct: correctTranslation, isCorrectPair: true };
    }
    const shouldBeCorrect = Math.random() > 0.5;
    if (shouldBeCorrect) {
      return { shown: correctTranslation, correct: correctTranslation, isCorrectPair: true };
    }
    const otherItemsWithTranslations = await Promise.all(
      items
        .filter((item) => item.id !== currentItem.id)
        .map(async (item) => {
          if (item.example) return item.example;
          if (translationCache[item.id]) return translationCache[item.id];
          return null;
        })
    );
    const validOthers = otherItemsWithTranslations.filter(t => t && t !== '(Translation unavailable)');
    if (validOthers.length === 0) {
      return { shown: correctTranslation, correct: correctTranslation, isCorrectPair: true };
    }
    const randomOther = validOthers[Math.floor(Math.random() * validOthers.length)];
    return { shown: randomOther, correct: correctTranslation, isCorrectPair: false };
  };

  const handleAnswer = (result: 'correct' | 'incorrect') => {
    const score = result === 'correct' ? 100 : 0;
    setResults([
      ...results,
      { item_id: items[currentIndex].id, result, score },
    ]);
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    } else {
      finishReview([
        ...results,
        { item_id: items[currentIndex].id, result, score },
      ]);
    }
  };

  const handleFlashcardAnswer = (userSaysCorrect: boolean) => {
    if (!flashcardPair) return;
    const isUserCorrect = userSaysCorrect === flashcardPair.isCorrectPair;
    const result = isUserCorrect ? 'correct' : 'incorrect';
    const score = isUserCorrect ? 100 : 0;
    setResults([
      ...results,
      { item_id: items[currentIndex].id, result, score },
    ]);
    if (!isUserCorrect) {
      setShowFlashcardCorrection(true);
    }
    if (isUserCorrect) {
      if (currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        finishReview([
          ...results,
          { item_id: items[currentIndex].id, result, score },
        ]);
      }
    }
  };

  const handleContinueAfterCorrection = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishReview([...results]);
    }
  };

  const handleCheckText = (target: string) => {
    const isCorrect = normalizeText(inputText) === normalizeText(target);
    setFeedback(isCorrect ? 'Correct!' : 'Not quite.');
    setShowAnswer(true);
    const score = isCorrect ? 100 : 0;
    setResults([
      ...results,
      { item_id: items[currentIndex].id, result: isCorrect ? 'correct' : 'incorrect', score },
    ]);
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishReview([
        ...results,
        { item_id: items[currentIndex].id, result: isCorrect ? 'correct' : 'incorrect', score },
      ]);
    }
  };

  const handleWritingCheck = async () => {
    if (!inputText.trim()) return;
    setChecking(true);
    setFeedback('');
    try {
      const response = await aiAPI.correctText({
        text: inputText,
        context: items[currentIndex]?.content || '',
      });
      setAiCorrections(response.data.corrections || []);
      setAiScore(response.data.score ?? null);
      setFeedback('AI feedback ready.');
    } catch (err) {
      setFeedback('AI correction failed.');
    } finally {
      setChecking(false);
    }
  };

  const handleSaveWritingResult = () => {
    const score = aiScore ?? 0;
    const result = score >= 70 ? 'correct' : 'incorrect';
    handleAnswer(result);
  };

  const handlePlayAudio = () => {
    if (typeof window === 'undefined') return;
    const utterance = new SpeechSynthesisUtterance(items[currentIndex]?.content || '');
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleStartSpeechRecognition = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFeedback('Speech recognition not supported. Please use Chrome, Edge, or Safari.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => {
      setIsListening(true);
      setRecognizedText('');
      setFeedback('Listening... Please speak now.');
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setRecognizedText(transcript);
      setFeedback('Speech captured! Click "Score" to evaluate.');
    };
    recognition.onerror = (event: any) => {
      setFeedback(`Error: ${event.error}. Please try again.`);
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleStopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleStartRecording = async () => {
    handleStartSpeechRecognition();
  };

  const handleStopRecording = () => {
    handleStopSpeechRecognition();
  };

  const handleSpeakingScore = async () => {
    if (!recognizedText.trim()) {
      setFeedback('Please speak first before scoring.');
      return;
    }
    setChecking(true);
    setFeedback('');
    try {
      const response = await aiAPI.speakingScoreText({
        transcript: recognizedText,
        target_text: items[currentIndex]?.content || '',
        item_id: items[currentIndex]?.id
      });
      setAiTranscript(response.data.transcript || '');
      setAiCorrections(response.data.corrections || []);
      setAiScore(response.data.score ?? null);
      setAiPronunciationIssues(response.data.pronunciation_issues || []);
      setFeedback(`Similarity: ${(response.data.similarity * 100).toFixed(0)}%`);
    } catch (err) {
      setFeedback('Speaking score failed.');
    } finally {
      setChecking(false);
    }
  };

  const finishReview = async (finalResults: any[]) => {
    try {
      await reviewsAPI.submit({
        mode,
        items: finalResults,
      });
      router.push('/dashboard');
    } catch (err) {
      console.error('Failed to submit review');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-premium-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <p className="text-sm text-muted-foreground">Loading review...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-premium-surface flex items-center justify-center px-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="p-8">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">No Items to Review</h2>
            <p className="text-sm text-muted-foreground mb-6">Add some learning items first to start reviewing.</p>
            <Button onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentItem = items[currentIndex];
  const progress = ((currentIndex + 1) / items.length) * 100;

  const modeIcons: Record<string, React.ReactNode> = {
    flashcard: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
    ),
    cloze: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
    ),
    listening: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
    ),
    speaking: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
    ),
    writing: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
    ),
  };

  return (
    <div className="min-h-screen bg-premium-surface">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Exit
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              {currentIndex + 1} / {items.length}
            </span>
          </div>

          {/* Mode Selector */}
          <select
            className="text-xs bg-muted/30 border border-border/50 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring/20 transition-all"
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
          >
            <option value="flashcard">Flashcards</option>
            <option value="cloze">Cloze</option>
            <option value="listening">Listening</option>
            <option value="speaking">Speaking</option>
            <option value="writing">Writing</option>
          </select>
        </div>

        {/* Progress Bar */}
        <div className="h-0.5 bg-muted/50">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Review Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Card className="overflow-hidden">
          <CardContent className="p-6 sm:p-10">
            <div className="text-center">
              {/* Item Type Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 mb-6">
                {modeIcons[mode]}
                <span className="text-xs font-medium text-muted-foreground capitalize">{currentItem.type}</span>
              </div>

              {/* Flashcard Mode */}
              {mode === 'flashcard' && (
                <div className="animate-fade-in">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4 break-words tracking-tight">{currentItem.content}</h2>
                  {loadingTranslation ? (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <svg className="animate-spin h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      <span className="text-sm text-muted-foreground">Generating translation...</span>
                    </div>
                  ) : flashcardPair?.shown ? (
                    <p className="text-xl sm:text-2xl text-muted-foreground break-words">{flashcardPair.shown}</p>
                  ) : null}
                </div>
              )}

              {/* Cloze Mode */}
              {mode === 'cloze' && (
                <div className="animate-fade-in mb-6">
                  <p className="text-xl sm:text-2xl font-semibold break-words mb-8">{clozeData.prompt}</p>
                  <input
                    className="w-full max-w-sm mx-auto block bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-base text-center focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground/20 transition-all duration-200"
                    placeholder="Fill the blank"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                </div>
              )}

              {/* Listening Mode */}
              {mode === 'listening' && (
                <div className="animate-fade-in mb-6">
                  <p className="text-sm text-muted-foreground mb-6">Listen carefully and type what you hear</p>
                  <Button onClick={handlePlayAudio} variant="outline" className="mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    </svg>
                    Play Audio
                  </Button>
                  <input
                    className="w-full max-w-sm mx-auto block bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-base text-center focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground/20 transition-all duration-200"
                    placeholder="Type what you hear"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                </div>
              )}

              {/* Writing Mode */}
              {mode === 'writing' && (
                <div className="animate-fade-in mb-6">
                  <p className="text-sm text-muted-foreground mb-2">Write a sentence using:</p>
                  <p className="text-xl font-semibold mb-6">{currentItem.content}</p>
                  <textarea
                    className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-base min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground/20 transition-all duration-200"
                    placeholder="Write your sentence here..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                </div>
              )}

              {/* Speaking Mode */}
              {mode === 'speaking' && (
                <div className="animate-fade-in mb-6">
                  <p className="text-sm text-muted-foreground mb-4">Read aloud:</p>
                  <p className="text-xl sm:text-2xl font-semibold mb-6">{currentItem.content}</p>
                  {recognizedText && (
                    <div className="mb-4 p-4 bg-muted/30 rounded-xl text-left">
                      <p className="text-xs text-muted-foreground mb-1">You said:</p>
                      <p className="font-medium text-sm">{recognizedText}</p>
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex justify-center gap-3">
                      {!isListening ? (
                        <Button onClick={handleStartSpeechRecognition} variant="outline">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                            <line x1="12" y1="19" x2="12" y2="23"/>
                            <line x1="8" y1="23" x2="16" y2="23"/>
                          </svg>
                          Start Speaking
                        </Button>
                      ) : (
                        <Button variant="destructive" onClick={handleStopSpeechRecognition}>
                          <div className="w-3 h-3 rounded-full bg-white animate-pulse mr-2" />
                          Stop
                        </Button>
                      )}
                      <Button
                        variant="default"
                        onClick={handleSpeakingScore}
                        disabled={!recognizedText || checking}
                      >
                        {checking ? 'Scoring...' : 'Score'}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground/60">
                      Uses browser speech recognition (Chrome, Edge, Safari)
                    </p>
                  </div>
                </div>
              )}

              {/* Flashcard Actions */}
              {mode === 'flashcard' && flashcardPair?.shown && !loadingTranslation && !showFlashcardCorrection && (
                <div className="flex gap-4 justify-center mt-10">
                  <Button
                    size="lg"
                    variant="outline"
                    className="min-w-[120px] border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleFlashcardAnswer(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Incorrect
                  </Button>
                  <Button
                    size="lg"
                    className="min-w-[120px] bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleFlashcardAnswer(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Correct
                  </Button>
                </div>
              )}

              {/* Flashcard Correction */}
              {mode === 'flashcard' && showFlashcardCorrection && flashcardPair?.correct && (
                <div className="mt-8 p-5 bg-amber-50 border border-amber-100 rounded-xl animate-fade-in">
                  <p className="text-sm text-amber-800">
                    Correct translation: <span className="font-semibold">{flashcardPair.correct}</span>
                  </p>
                  <Button onClick={handleContinueAfterCorrection} className="mt-4" size="sm">
                    Continue
                  </Button>
                </div>
              )}

              {/* Cloze / Listening Check */}
              {mode === 'cloze' && (
                <div className="mt-6">
                  <Button onClick={() => handleCheckText(clozeData.answer)}>Check Answer</Button>
                </div>
              )}
              {mode === 'listening' && (
                <div className="mt-6">
                  <Button onClick={() => handleCheckText(currentItem.content)}>Check Answer</Button>
                </div>
              )}

              {/* Writing Actions */}
              {mode === 'writing' && (
                <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                  <Button onClick={handleWritingCheck} disabled={checking}>
                    {checking ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Checking...
                      </span>
                    ) : 'Check with AI'}
                  </Button>
                  <Button variant="outline" onClick={handleSaveWritingResult} disabled={aiScore === null}>
                    Save Result
                  </Button>
                </div>
              )}

              {/* Speaking Save */}
              {mode === 'speaking' && (
                <div className="mt-6">
                  <Button variant="outline" onClick={() => handleAnswer((aiScore ?? 0) >= 70 ? 'correct' : 'incorrect')} disabled={aiScore === null}>
                    Save Result
                  </Button>
                </div>
              )}

              {/* Feedback */}
              {feedback && (
                <p className="mt-5 text-sm text-muted-foreground animate-fade-in">{feedback}</p>
              )}

              {/* AI Results Panel */}
              {(aiScore !== null || aiCorrections.length > 0 || aiTranscript) && (
                <div className="mt-6 p-5 bg-muted/30 rounded-xl text-left text-sm space-y-3 animate-fade-in">
                  {aiScore !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</span>
                      <span className={`text-lg font-bold ${aiScore >= 70 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {aiScore}
                      </span>
                    </div>
                  )}
                  {aiTranscript && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Transcript</span>
                      <p className="mt-1 text-sm">{aiTranscript}</p>
                    </div>
                  )}
                  {aiPronunciationIssues.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pronunciation Issues</span>
                      <ul className="mt-1 space-y-1">
                        {aiPronunciationIssues.map((issue, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5">&#8226;</span>
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiCorrections.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Corrections</span>
                      <ul className="mt-1 space-y-1">
                        {aiCorrections.map((c, idx) => (
                          <li key={idx} className="text-sm">
                            <span className="text-red-400 line-through">{c.original}</span>
                            <span className="mx-1.5 text-muted-foreground">&rarr;</span>
                            <span className="text-emerald-600 font-medium">{c.corrected}</span>
                            <span className="text-xs text-muted-foreground ml-2">({c.category})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
