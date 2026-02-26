'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { itemsAPI, reviewsAPI, aiAPI } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [reviewHistory, setReviewHistory] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({
    type: 'word',
    content: '',
    example: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classifying, setClassifying] = useState(false);
  const [typeExplanation, setTypeExplanation] = useState('');
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadReviewItems();
    loadReviewHistory();
  }, []);

  const loadReviewItems = async () => {
    try {
      const response = await reviewsAPI.getYesterday();
      setReviewItems(response.data.items);
    } catch (err: any) {
      setError('Failed to load review items');
    } finally {
      setLoading(false);
    }
  };

  const loadReviewHistory = async () => {
    try {
      const response = await reviewsAPI.getHistory(5);
      setReviewHistory(response.data);
      // Auto-expand the latest session
      if (response.data.length > 0) {
        setExpandedSessions(new Set([response.data[0].id]));
      }
    } catch (err: any) {
      console.error('Failed to load review history');
    }
  };

  const classifyContent = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        setTypeExplanation('');
        return;
      }
      
      setClassifying(true);
      try {
        const response = await aiAPI.classify({ text });
        setNewItem(prev => ({ ...prev, type: response.data.type }));
        setTypeExplanation(response.data.explanation);
      } catch (err) {
        console.error('Classification failed');
      } finally {
        setClassifying(false);
      }
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (newItem.content) {
        classifyContent(newItem.content);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [newItem.content, classifyContent]);

  const toggleSession = (sessionId: number) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await itemsAPI.create(newItem);
      setNewItem({ type: 'word', content: '', example: '' });
      loadReviewItems();
    } catch (err: any) {
      if (err.response?.status === 409) {
        const detail = err.response.data.detail;
        setError(detail.message || 'Item already exists');
      } else {
        setError('Failed to add item');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">English Partner</h1>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.push('/review')}>
              Start Review
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Add New Item */}
          <Card>
            <CardHeader>
              <CardTitle>Add Learning Item</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddItem} className="space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Type {classifying && <span className="text-xs text-gray-500">(detecting...)</span>}
                  </label>
                  <div className="w-full h-10 rounded-md border border-input bg-gray-50 px-3 py-2 flex items-center justify-between">
                    <span className="capitalize font-medium">{newItem.type}</span>
                    {typeExplanation && (
                      <span className="text-xs text-gray-500">✓ AI detected</span>
                    )}
                  </div>
                  {typeExplanation && (
                    <p className="text-xs text-gray-600 mt-1">{typeExplanation}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Content</label>
                  <Input
                    value={newItem.content}
                    onChange={(e) =>
                      setNewItem({ ...newItem, content: e.target.value })
                    }
                    placeholder="Enter word, phrase, or sentence"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Example</label>
                  <Input
                    value={newItem.example}
                    onChange={(e) =>
                      setNewItem({ ...newItem, example: e.target.value })
                    }
                    placeholder="Usage example (optional)"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Add Item
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Today's Review */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Review ({reviewItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : reviewItems.length === 0 ? (
                <p className="text-gray-500">No items to review today. Add some learning items!</p>
              ) : (
                <div className="space-y-2">
                  {reviewItems.slice(0, 5).map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 bg-gray-50 rounded-md"
                    >
                      <p className="font-medium">{item.content}</p>
                      <p className="text-sm text-gray-500">{item.type}</p>
                    </div>
                  ))}
                  {reviewItems.length > 5 && (
                    <p className="text-sm text-gray-500 text-center mt-4">
                      +{reviewItems.length - 5} more items
                    </p>
                  )}
                  <Button
                    className="w-full mt-4"
                    onClick={() => router.push('/review')}
                  >
                    Start Review Session
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Review History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Review History</CardTitle>
          </CardHeader>
          <CardContent>
            {reviewHistory.length === 0 ? (
              <p className="text-gray-500">No review history yet. Complete a review session to see your progress!</p>
            ) : (
              <div className="space-y-3">
                {reviewHistory.map((session: any, index: number) => {
                  const isExpanded = expandedSessions.has(session.id);
                  const isLatest = index === 0;
                  
                  return (
                    <div key={session.id} className="border rounded-lg overflow-hidden">
                      <div 
                        className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleSession(session.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold capitalize">{session.mode} Review</p>
                              {isLatest && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Latest</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {new Date(session.date).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                            </p>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <p className="text-lg font-bold">
                                {session.score?.toFixed(0)}%
                              </p>
                              <p className="text-sm text-gray-500">
                                {session.items.filter((i: any) => i.result === 'correct').length}/{session.items.length} correct
                              </p>
                            </div>
                            <span className="text-gray-400">
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="p-4 space-y-2 bg-white">
                          {session.items.map((item: any) => (
                            <div
                              key={item.id}
                              className={`flex items-center gap-2 p-2 rounded ${
                                item.result === 'correct' 
                                  ? 'bg-green-50 border border-green-200' 
                                  : 'bg-red-50 border border-red-200'
                              }`}
                            >
                              <span className="text-lg">
                                {item.result === 'correct' ? '✓' : '✗'}
                              </span>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{item.item.content}</p>
                                <p className="text-xs text-gray-600 capitalize">{item.item.type}</p>
                              </div>
                              {item.score !== null && (
                                <span className={`text-sm font-semibold ${
                                  item.result === 'correct' ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {item.score.toFixed(0)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
