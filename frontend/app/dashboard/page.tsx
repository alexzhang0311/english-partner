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
        const classifyRes = await aiAPI.classify({ text: item.content });
        const type = classifyRes.data.type;
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
    const message = `Added ${successCount} items${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}${failureCount > 0 ? `, ${failureCount} failed` : ''}`;
    setBatchFeedback(message);
    if (errors.length > 0) {
      setBatchFeedback(prev => prev + '\n' + errors.join('\n'));
    }
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
    <div className="min-h-screen-safe bg-premium-surface">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-border/50 safe-top">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </div>
            <h1 className="text-base sm:text-lg font-semibold text-foreground tracking-tight hidden xs:block">English Partner</h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Review button - hidden on mobile, shown in bottom bar */}
            <Button
              variant="default"
              size="sm"
              onClick={() => router.push('/review')}
              className="text-xs hidden sm:inline-flex h-9"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                <polyline points="9 11 12 14 22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              Review
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-xs text-muted-foreground h-9 px-2.5 sm:px-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:mr-1.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 md:py-8 pb-24 sm:pb-6 md:pb-8">
        {/* Grid: single column on mobile, 2-col on tablet, 5-col on desktop */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 md:gap-6">
          {/* Left Column - Add Items */}
          <div className="md:col-span-1 lg:col-span-3 space-y-4 sm:space-y-5 md:space-y-6">
            {/* Quick Add Card */}
            <Card className="card-premium">
              <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-sm sm:text-base">Add Learning Items</CardTitle>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">AI auto-detects type and generates translations</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFullscreen(true)}
                    className="text-xs flex-shrink-0 h-8 sm:h-9"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                    </svg>
                    <span className="hidden sm:inline">Expand</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <form onSubmit={handleBatchAddItems} className="space-y-3 sm:space-y-4">
                  {batchFeedback && (
                    <div className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm animate-fade-in ${
                      batchFeedback.includes('Added') && !batchFeedback.includes('0 items')
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                      {batchFeedback.split('\n').map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </div>
                  )}

                  <textarea
                    value={batchContent}
                    onChange={(e) => setBatchContent(e.target.value)}
                    placeholder="Enter words, phrases, or sentences — one per line or comma-separated&#10;&#10;hello&#10;good morning&#10;endorsement - 代言"
                    className="w-full h-32 sm:h-40 md:h-48 bg-muted/30 border border-border/50 rounded-xl px-3 sm:px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground/20 transition-all duration-200 placeholder:text-muted-foreground/40"
                  />

                  <Button type="submit" className="w-full h-11 touch-target" disabled={processingBatch}>
                    {processingBatch ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Processing...
                      </span>
                    ) : 'Add Items'}
                  </Button>
                </form>

                {/* Manual Add - Collapsible */}
                <details className="mt-5 sm:mt-6 group">
                  <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1.5 py-1 touch-target">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-open:rotate-90">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                    Manual Add (Single Item)
                  </summary>
                  <form onSubmit={handleAddItem} className="space-y-3 sm:space-y-4 mt-4 pt-4 border-t border-border/30">
                    {error && (
                      <div className="bg-red-50 text-red-600 border border-red-100 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm animate-fade-in">
                        {error}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-muted-foreground">Content</label>
                      <Input
                        value={newItem.content}
                        onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                        placeholder="Enter word, phrase, or sentence"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-muted-foreground">Translation / Example (Optional)</label>
                      <Input
                        value={newItem.example}
                        onChange={(e) => setNewItem({ ...newItem, example: e.target.value })}
                        placeholder="Chinese translation or usage example"
                      />
                    </div>
                    <Button type="submit" variant="outline" className="w-full h-10 touch-target">
                      Add Item
                    </Button>
                  </form>
                </details>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Review & History */}
          <div className="md:col-span-1 lg:col-span-2 space-y-4 sm:space-y-5 md:space-y-6">
            {/* Today's Review */}
            <Card className="card-premium">
              <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm sm:text-base">Today&apos;s Review</CardTitle>
                  <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                    {reviewItems.length} items
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <svg className="animate-spin h-5 w-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                  </div>
                ) : reviewItems.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                      </svg>
                    </div>
                    <p className="text-sm text-muted-foreground">No items to review today</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Add some learning items to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reviewItems.slice(0, 5).map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-muted/30 rounded-xl">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{item.content}</p>
                          <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                        </div>
                      </div>
                    ))}
                    {reviewItems.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center py-1">
                        +{reviewItems.length - 5} more items
                      </p>
                    )}
                    {/* Desktop review button */}
                    <Button
                      className="w-full h-11 mt-3 hidden sm:flex touch-target"
                      variant="premium"
                      onClick={() => router.push('/review')}
                    >
                      Start Review Session
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Review History */}
            <Card className="card-premium">
              <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
                <CardTitle className="text-sm sm:text-base">Recent History</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                {reviewHistory.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">No review history yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Complete a review session to see progress</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reviewHistory.map((session: any, index: number) => {
                      const isExpanded = expandedSessions.has(session.id);
                      const isLatest = index === 0;
                      const correctCount = session.items.filter((i: any) => i.result === 'correct').length;
                      const scoreColor = (session.score ?? 0) >= 80 ? 'text-emerald-600' : (session.score ?? 0) >= 60 ? 'text-amber-600' : 'text-red-500';

                      return (
                        <div key={session.id} className="rounded-xl border border-border/50 overflow-hidden">
                          <div
                            className="p-3 sm:p-3.5 cursor-pointer hover:bg-muted/30 active:bg-muted/40 transition-colors touch-target"
                            onClick={() => toggleSession(session.id)}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm capitalize truncate">{session.mode}</p>
                                    {isLatest && (
                                      <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md flex-shrink-0">Latest</span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    {new Date(session.date).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
                                <div className="text-right">
                                  <p className={`text-sm sm:text-base font-bold ${scoreColor}`}>
                                    {session.score?.toFixed(0)}%
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {correctCount}/{session.items.length}
                                  </p>
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted-foreground/40 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                                  <polyline points="9 18 15 12 9 6"/>
                                </svg>
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-3 sm:px-3.5 pb-3 sm:pb-3.5 space-y-1.5 animate-fade-in">
                              {session.items.map((item: any) => (
                                <div
                                  key={item.id}
                                  className={`flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-lg text-sm ${
                                    item.result === 'correct'
                                      ? 'bg-emerald-50/80 border border-emerald-100'
                                      : 'bg-red-50/80 border border-red-100'
                                  }`}
                                >
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    item.result === 'correct' ? 'bg-emerald-500' : 'bg-red-400'
                                  }`}>
                                    {item.result === 'correct' ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"/>
                                      </svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"/>
                                        <line x1="6" y1="6" x2="18" y2="18"/>
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-xs truncate">{item.item.content}</p>
                                    <p className="text-[10px] text-muted-foreground capitalize">{item.item.type}</p>
                                  </div>
                                  {item.score !== null && (
                                    <span className={`text-xs font-semibold flex-shrink-0 ${
                                      item.result === 'correct' ? 'text-emerald-600' : 'text-red-500'
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
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/90 backdrop-blur-xl border-t border-border/50 safe-bottom">
        <div className="flex items-center justify-around px-4 py-2">
          <button
            onClick={() => setIsFullscreen(true)}
            className="flex flex-col items-center gap-0.5 py-1.5 px-3 text-muted-foreground touch-target"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span className="text-[10px] font-medium">Add</span>
          </button>
          <button
            onClick={() => router.push('/review')}
            className="flex flex-col items-center gap-0.5 py-1.5 px-3 touch-target"
          >
            <div className="w-12 h-12 -mt-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <span className="text-[10px] font-medium text-amber-600">Review</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 py-1.5 px-3 text-muted-foreground touch-target"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="text-[10px] font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Fullscreen Batch Input Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-6 animate-fade-in">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl md:max-w-4xl h-[90dvh] sm:h-[85vh] flex flex-col overflow-hidden safe-bottom">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border/50">
              {/* Mobile drag indicator */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-muted sm:hidden" />
              <div className="mt-1 sm:mt-0">
                <h2 className="text-base sm:text-lg font-semibold">Batch Input</h2>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Add multiple items at once</p>
              </div>
              <button
                onClick={() => setIsFullscreen(false)}
                className="w-9 h-9 rounded-lg hover:bg-muted/50 active:bg-muted/70 flex items-center justify-center transition-colors touch-target"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="flex-1 p-4 sm:p-6 overflow-hidden">
              <form onSubmit={handleBatchAddItems} className="h-full flex flex-col gap-3 sm:gap-4">
                {batchFeedback && (
                  <div className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm ${
                    batchFeedback.includes('Added') && !batchFeedback.includes('0 items')
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-red-50 text-red-600 border border-red-100'
                  }`}>
                    {batchFeedback.split('\n').map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                )}

                <div className="flex-1 flex flex-col min-h-0">
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Enter words, phrases, or sentences (one per line or comma-separated)
                  </label>
                  <textarea
                    value={batchContent}
                    onChange={(e) => setBatchContent(e.target.value)}
                    placeholder="hello&#10;good morning&#10;how are you&#10;endorsement - 代言&#10;make a difference"
                    className="flex-1 w-full bg-muted/20 border border-border/50 rounded-xl px-3 sm:px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground/20 transition-all duration-200 placeholder:text-muted-foreground/30"
                    autoFocus
                  />
                  <p className="text-[11px] sm:text-xs text-muted-foreground/60 mt-2">
                    AI will auto-detect type and generate Chinese translations. Add notes after &quot; - &quot; separator.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-11 touch-target"
                    onClick={() => setIsFullscreen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-11 touch-target"
                    disabled={processingBatch}
                  >
                    {processingBatch ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Processing...
                      </span>
                    ) : 'Add Items'}
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
