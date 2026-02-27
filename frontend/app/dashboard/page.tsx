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
  const [batchContent, setBatchContent] = useState('');
  const [processingBatch, setProcessingBatch] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classifying, setClassifying] = useState(false);
  const [typeExplanation, setTypeExplanation] = useState('');
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const parseInputLine = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return { content: '', note: '' };

    // Split by common separators: " - ", " — ", " – ", ":", "："
    const separators = [' - ', ' — ', ' – ', ':', '：'];
    for (const sep of separators) {
      const idx = trimmed.indexOf(sep);
      if (idx > 0) {
        return {
          content: trimmed.slice(0, idx).trim(),
          note: trimmed.slice(idx + sep.length).trim(),
        };
      }
    }

    return { content: trimmed, note: '' };
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsed = parseInputLine(newItem.content);
    if (!parsed.content) {
      setError('Content is empty');
      return;
    }

    try {
      const exampleValue = newItem.example || parsed.note;
      await itemsAPI.create({
        ...newItem,
        content: parsed.content,
        example: exampleValue,
      });
      setNewItem({ type: 'word', content: '', example: '' });
      loadReviewItems();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('Item already exists');
      } else {
        setError('Failed to add item');
      }
    }
  };

  const handleBatchAddItems = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchFeedback('');
    
    if (!batchContent.trim()) {
      setBatchFeedback('Please enter at least one item');
      return;
    }

    // Parse batch input - supports multiple lines or comma-separated
    const items = batchContent
      .split(/[\n,]/)
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .map(item => parseInputLine(item))
      .filter(item => item.content.length > 0);

    if (items.length === 0) {
      setBatchFeedback('No valid items found');
      return;
    }

    setProcessingBatch(true);
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        // Classify type
        const classifyRes = await aiAPI.classify({ text: item.content });
        const type = classifyRes.data.type;

        // Translate to Chinese
        let translation = item.note || '';
        try {
          if (!translation) {
            const translateRes = await aiAPI.translate({
              text: item.content,
              source_lang: 'English',
              target_lang: 'Chinese',
            });
            translation = translateRes.data.translation;
          }
        } catch (err) {
          translation = '';
        }

        // Create item
        await itemsAPI.create({
          type,
          content: item.content,
          example: translation,
        });

        successCount++;
      } catch (err: any) {
        if (err.response?.status === 409) {
          skippedCount++;
          continue;
        }
        failureCount++;
        const errorMsg = err.response?.data?.detail?.message || err.message || 'Unknown error';
        errors.push(`"${item.content}": ${errorMsg}`);
      }
    }

    setProcessingBatch(false);
    setBatchContent('');
    
    const message = `✓ Added ${successCount} items${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}${failureCount > 0 ? `, ${failureCount} failed` : ''}`;
    setBatchFeedback(message);
    
    if (errors.length > 0) {
      setBatchFeedback(prev => prev + '\n' + errors.join('\n'));
    }

    // Reload items
    setTimeout(() => {
      loadReviewItems();
      setBatchFeedback('');
    }, 1000);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-bold text-primary truncate">English Partner</h1>
          <div className="flex gap-2 sm:gap-4">
            <Button 
              variant="outline" 
              onClick={() => router.push('/review')}
              className="text-xs sm:text-sm h-9 sm:h-10 px-2 sm:px-4"
            >
              Review
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="text-xs sm:text-sm h-9 sm:h-10 px-2 sm:px-4"
            >
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-20 sm:pb-8">
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Add New Item */}
          <Card>
            <CardHeader>
              <CardTitle>Add Learning Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Batch Add Tab */}
                <div>
                  <h3 className="font-semibold mb-3">Quick Add (Recommended)</h3>
                  <form onSubmit={handleBatchAddItems} className="space-y-3">
                    {batchFeedback && (
                      <div className={`p-3 rounded-md text-sm ${
                        batchFeedback.includes('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {batchFeedback.split('\n').map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                    )}
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium">
                          Enter words, phrases, or sentences
                        </label>
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsFullscreen(true)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                          </svg>
                          Fullscreen
                        </Button>
                      </div>
                      <textarea
                        value={batchContent}
                        onChange={(e) => setBatchContent(e.target.value)}
                        placeholder="One per line or comma-separated:&#10;hello&#10;good morning&#10;how are you"
                        className="w-full h-40 sm:h-48 border rounded-md px-3 py-2 text-base"

                      />
                      <p className="text-xs text-gray-500 mt-1">
                        💡 AI will auto-detect type and generate Chinese translations
                      </p>
                    </div>

                    <Button type="submit" className="w-full h-10 sm:h-11" disabled={processingBatch}>
                      {processingBatch ? 'Processing...' : 'Add Multiple Items'}
                    </Button>
                  </form>
                </div>

                {/* Divider */}
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 text-center">Or</p>
                </div>

                {/* Manual Add Tab */}
                <div>
                  <h3 className="font-semibold mb-3">Manual Add</h3>
                  <form onSubmit={handleAddItem} className="space-y-4">
                    {error && (
                      <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                        {error}
                      </div>
                    )}

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
                      <label className="block text-sm font-medium mb-2">
                        Example/Translation (Optional)
                      </label>
                      <Input
                        value={newItem.example}
                        onChange={(e) =>
                          setNewItem({ ...newItem, example: e.target.value })
                        }
                        placeholder="Chinese translation or usage example"
                      />
                    </div>

                    <Button type="submit" className="w-full h-10 sm:h-11">
                      Add Item
                    </Button>
                  </form>
                </div>
              </div>
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
                    className="w-full mt-4 h-10 sm:h-11"
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

      {/* Fullscreen Batch Input Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[95vh] sm:h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b">
              <h2 className="text-lg sm:text-xl font-semibold truncate">Batch Input - Fullscreen</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="ml-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </Button>
            </div>
            
            <div className="flex-1 p-3 sm:p-4 overflow-hidden">
              <form onSubmit={handleBatchAddItems} className="h-full flex flex-col gap-3 sm:gap-4">
                {batchFeedback && (
                  <div className={`p-3 rounded-md text-sm ${
                    batchFeedback.includes('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {batchFeedback.split('\n').map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                )}
                
                <div className="flex-1 flex flex-col">
                  <label className="block text-sm font-medium mb-2">
                    Enter words, phrases, or sentences (one per line or comma-separated)
                  </label>
                  <textarea
                    value={batchContent}
                    onChange={(e) => setBatchContent(e.target.value)}
                    placeholder="Examples:&#10;hello&#10;good morning&#10;how are you&#10;endorsement - 代言&#10;make a difference&#10;I would like to know more about this topic"
                    className="flex-1 w-full border rounded-md px-3 sm:px-4 py-2 sm:py-3 text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <p className="text-xs sm:text-sm text-gray-500 mt-2">
                    💡 AI will auto-detect type and generate Chinese translations. You can also add notes after " - " separator.
                  </p>
                </div>

                <div className="flex gap-2 sm:gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1 h-10 sm:h-11"
                    onClick={() => setIsFullscreen(false)}
                  >
                    Close
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 h-10 sm:h-11" 
                    disabled={processingBatch}
                  >
                    {processingBatch ? 'Processing...' : 'Add Items'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
