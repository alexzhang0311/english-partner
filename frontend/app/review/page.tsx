'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { reviewsAPI } from '@/lib/api';

export default function ReviewPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [mode] = useState('flashcard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviewItems();
  }, []);

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

          <Card className="min-h-[400px] flex flex-col justify-center">
            <CardContent className="p-8">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4 uppercase">
                  {currentItem.type}
                </p>
                <h2 className="text-4xl font-bold mb-8">
                  {currentItem.content}
                </h2>

                {showAnswer && currentItem.example && (
                  <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                    <p className="text-gray-700 italic">
                      Example: {currentItem.example}
                    </p>
                  </div>
                )}

                {!showAnswer ? (
                  <Button
                    size="lg"
                    onClick={() => setShowAnswer(true)}
                    className="mt-8"
                  >
                    Show Answer
                  </Button>
                ) : (
                  <div className="flex gap-4 justify-center mt-8">
                    <Button
                      size="lg"
                      variant="destructive"
                      onClick={() => handleAnswer('incorrect')}
                    >
                      Incorrect
                    </Button>
                    <Button
                      size="lg"
                      onClick={() => handleAnswer('correct')}
                    >
                      Correct
                    </Button>
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
