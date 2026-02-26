'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    
    // If no translation exists, generate one with AI
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

    // Get incorrect translation from other items
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
      {
        item_id: items[currentIndex].id,
        result,
        score,
      },
    ]);

    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    } else {
      // Finish review
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
      finishReview([
        ...results,
      ]);
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
    
    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFeedback('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
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
      setFeedback('Speech captured! Click "Score Speaking" to evaluate.');
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
    // Deprecated - kept for backward compatibility
    handleStartSpeechRecognition();
  };

  const handleStopRecording = () => {
    // Deprecated - kept for backward compatibility
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
      setFeedback(`Similarity: ${(response.data.similarity * 100).toFixed(0)}% - Speaking score ready.`);
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Loading review...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Items to Review</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">You don't have any items to review today.</p>
            <Button onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Review Session</h1>
            <span className="text-gray-600">
              {currentIndex + 1} / {items.length}
            </span>
          </div>

          <div className="mb-4 flex items-center gap-3">
            <label className="text-sm text-gray-600">Mode</label>
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
            >
              <option value="flashcard">Flashcards</option>
              <option value="cloze">Cloze</option>
              <option value="listening">Listening + Dictation</option>
              <option value="speaking">Speaking</option>
              <option value="writing">Short Writing</option>
            </select>
          </div>

          <Card className="min-h-[400px] flex flex-col justify-center">
            <CardContent className="p-8">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4 uppercase">
                  {currentItem.type}
                </p>
                {mode === 'flashcard' && (
                  <div>
                    <h2 className="text-4xl font-bold mb-4">{currentItem.content}</h2>
                    {loadingTranslation ? (
                      <p className="text-sm text-gray-500">Generating translation...</p>
                    ) : flashcardPair?.shown ? (
                      <p className="text-2xl text-gray-700">{flashcardPair.shown}</p>
                    ) : (
                      <p className="text-sm text-gray-500">Loading...</p>
                    )}
                  </div>
                )}

                {mode === 'cloze' && (
                  <div className="mb-6">
                    <p className="text-2xl font-semibold">{clozeData.prompt}</p>
                    <div className="mt-6">
                      <input
                        className="w-full border rounded-md px-3 py-2"
                        placeholder="Fill the blank"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {mode === 'listening' && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-500 mb-3">Listen and type what you hear</p>
                    <Button onClick={handlePlayAudio} className="mb-4">Play Audio</Button>
                    <input
                      className="w-full border rounded-md px-3 py-2"
                      placeholder="Type what you hear"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    />
                  </div>
                )}

                {mode === 'writing' && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-500 mb-3">
                      Write a short sentence using: <span className="font-semibold">{currentItem.content}</span>
                    </p>
                    <textarea
                      className="w-full border rounded-md px-3 py-2 min-h-[120px]"
                      placeholder="Write your sentence"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    />
                  </div>
                )}

                {mode === 'speaking' && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-500 mb-3">Read aloud:</p>
                    <p className="text-xl font-semibold mb-4">{currentItem.content}</p>
                    {recognizedText && (
                      <div className="mb-3 p-3 bg-blue-50 rounded-md">
                        <p className="text-sm text-gray-600">You said:</p>
                        <p className="font-medium">{recognizedText}</p>
                      </div>
                    )}
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-center gap-3">
                        {!isListening ? (
                          <Button onClick={handleStartSpeechRecognition}>Start Speaking</Button>
                        ) : (
                          <Button variant="destructive" onClick={handleStopSpeechRecognition}>Stop</Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={handleSpeakingScore}
                          disabled={!recognizedText || checking}
                        >
                          {checking ? 'Scoring...' : 'Score Speaking'}
                        </Button>
                      </div>
                      <p className="text-xs text-center text-gray-500">
                        💡 Uses browser speech recognition (Chrome, Edge, Safari)
                      </p>
                    </div>
                  </div>
                )}

                {mode === 'flashcard' && flashcardPair?.shown && !loadingTranslation && (
                  <div className="flex gap-4 justify-center mt-8">
                    <Button
                      size="lg"
                      variant="destructive"
                      onClick={() => handleFlashcardAnswer(false)}
                    >
                      Incorrect
                    </Button>
                    <Button
                      size="lg"
                      onClick={() => handleFlashcardAnswer(true)}
                    >
                      Correct
                    </Button>
                  </div>
                )}

                {mode === 'flashcard' && showFlashcardCorrection && flashcardPair?.correct && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-gray-700">
                      Correct translation: <span className="font-semibold">{flashcardPair.correct}</span>
                    </p>
                    <div className="mt-4 flex justify-center">
                      <Button onClick={handleContinueAfterCorrection}>Next</Button>
                    </div>
                  </div>
                )}

                {mode === 'cloze' && (
                  <div className="mt-6 flex justify-center gap-3">
                    <Button onClick={() => handleCheckText(clozeData.answer)}>
                      Check
                    </Button>
                  </div>
                )}

                {mode === 'listening' && (
                  <div className="mt-6 flex justify-center gap-3">
                    <Button onClick={() => handleCheckText(currentItem.content)}>
                      Check
                    </Button>
                  </div>
                )}

                {mode === 'writing' && (
                  <div className="mt-6 flex justify-center gap-3">
                    <Button onClick={handleWritingCheck} disabled={checking}>
                      {checking ? 'Checking...' : 'Check with AI'}
                    </Button>
                    <Button variant="outline" onClick={handleSaveWritingResult} disabled={aiScore === null}>
                      Save Result
                    </Button>
                  </div>
                )}

                {mode === 'speaking' && (
                  <div className="mt-6 flex justify-center">
                    <Button variant="outline" onClick={() => handleAnswer((aiScore ?? 0) >= 70 ? 'correct' : 'incorrect')} disabled={aiScore === null}>
                      Save Result
                    </Button>
                  </div>
                )}

                {feedback && (
                  <p className="mt-4 text-sm text-gray-600">{feedback}</p>
                )}

                {(aiScore !== null || aiCorrections.length > 0 || aiTranscript) && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
                    {aiScore !== null && (
                      <p className="font-semibold">Score: {aiScore}</p>
                    )}
                    {aiTranscript && (
                      <p className="mt-2">Transcript: {aiTranscript}</p>
                    )}
                    {aiPronunciationIssues.length > 0 && (
                      <div className="mt-2">
                        <p className="font-semibold">Pronunciation issues:</p>
                        <ul className="list-disc list-inside">
                          {aiPronunciationIssues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiCorrections.length > 0 && (
                      <div className="mt-2">
                        <p className="font-semibold">Corrections:</p>
                        <ul className="list-disc list-inside">
                          {aiCorrections.map((c, idx) => (
                            <li key={idx}>
                              {c.original} → {c.corrected} ({c.category})
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

          <div className="mt-6 flex justify-between">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
            >
              Exit Review
            </Button>
            <div className="w-full max-w-xs mx-4">
              <div className="bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${((currentIndex + 1) / items.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
