'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            English Partner
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            Master English through daily review and spaced repetition
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>📚 Smart Review</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Review what you learned yesterday with multiple modes: flashcards, cloze, speaking, and writing.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>🎯 AI Corrections</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Get instant feedback and corrections powered by advanced AI (OpenAI or Anthropic).
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>🧠 Spaced Repetition</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Learn efficiently with scientifically-proven spaced repetition algorithms.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>📊 Track Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Monitor your accuracy, streaks, and common mistakes to improve faster.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => router.push('/register')}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/login')}>
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
