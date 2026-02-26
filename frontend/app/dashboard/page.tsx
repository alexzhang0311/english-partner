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
  const [newItem, setNewItem] = useState({
    type: 'word',
    content: '',
    example: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classifying, setClassifying] = useState(false);
  const [typeExplanation, setTypeExplanation] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadReviewItems();
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
        <div className="grid md:grid-cols-2 gap-6">
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
      </main>
    </div>
  );
}
