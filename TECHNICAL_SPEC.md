# English Partner – Technical Specification

Date: 2026-02-25

## 1) Goal
Build a web app that helps users review what they learned yesterday using multiple review modes, corrects mistakes, and tracks progress. Backend must use FastAPI and the AI provider must be configurable (OpenAI or Anthropic).

## 2) Scope
### In scope
- Daily “Yesterday Review” set generation
- Multiple review modes (flashcards, cloze, listening+dictation, speaking, short writing)
- Mistake detection, correction, explanations
- Configurable AI provider (OpenAI/Anthropic)
- Spaced repetition scheduling
- Duplicate entry detection with user reminder
- Basic analytics (accuracy, streaks, common mistakes)- Review history with per-item results (correct/incorrect indicators)
### Out of scope (MVP)
- Social features, classrooms
- Payment/billing
- Mobile apps

## 3) MVP Definition
Minimum Viable Product = smallest version that delivers core value:
- Create learning items
- Yesterday review list
- Flashcards + cloze
- Writing correction
- Track results and next review date

## 4) Architecture Overview
### Frontend
- Next.js + TypeScript
- Tailwind CSS + shadcn/ui
- Browser audio recording (Web Audio API)

### Backend
- FastAPI (Python)
- REST API with OpenAPI docs
- Provider abstraction for AI
- Background tasks for batch processing (optional)

### Database
- PostgreSQL (recommended)
- SQLAlchemy + Alembic

## 5) Reason for PostgreSQL (vs MySQL)
- Better JSON/JSONB querying for AI responses, mistakes, metadata
- Strong full‑text search for review items, corrections
- Advanced indexing for analytics and spaced repetition queries

MySQL is acceptable if required, but PostgreSQL provides easier long‑term flexibility for AI‑heavy data.

## 6) AI Provider Design
### Configuration
- Environment variables:
  - AI_PROVIDER=openai|anthropic
  - OPENAI_API_KEY=...
  - ANTHROPIC_API_KEY=...

### Provider Interface
- `AIProvider.correct_text()`
- `AIProvider.score_speaking()`
- `AIProvider.generate_review_items()`

### Factory
- `AIProviderFactory.get()` returns provider based on config

### Standardized Output
- `corrections`: list of edits
- `explanations`: list of rules
- `score`: numeric 0–100
- `tags`: grammar/vocab/pronunciation

## 7) Speaking Feature (MVP)
### Flow
1. User speaks into browser microphone
2. Browser's Web Speech API transcribes speech to text
3. Frontend sends transcript to backend
4. Backend compares transcript to target sentence
5. Return score + corrections based on similarity

### Technology
- **Browser Speech Recognition API** (Chrome, Edge, Safari)
- No external ASR service required (no OpenAI Whisper dependency)
- Text-based similarity scoring with difflib
- Works with any AI provider backend (OpenAI/Anthropic/Aliyun)

## 8) Data Model (MVP)
### Tables
- `users`
- `learning_items` (type, content, example, tags, created_at, normalized_content)
- `review_sessions` (user_id, date, mode, score)
- `review_items` (session_id, item_id, result)
- `mistakes` (item_id, original, corrected, explanation, category)
- `srs_states` (item_id, interval, ease, next_review)

## 9) Core APIs (MVP)
### Auth
- `POST /auth/register`
- `POST /auth/login`

### Learning Items
- `POST /items`
- `GET /items?date=YYYY-MM-DD`

### Reviews
- `GET /reviews/yesterday`
- `POST /reviews/submit`
- `GET /reviews/history` - Returns detailed history with per-item results

### Corrections
- `POST /ai/correct-text`
- `POST /ai/speaking-score` - Legacy audio-based (requires Whisper)
- `POST /ai/speaking-score-text` - Text-based scoring (no ASR required)
- `POST /ai/translate` - Translate text with AI (English to Chinese)
- `POST /ai/classify` - Auto-detect content type (word/phrase/sentence)

## 10) Non‑Functional Requirements
- Response time: < 2s for normal review operations
- AI calls: async with retry/backoff
- Logging: structured logs + request IDs
- Security: store keys in env, never client-side
- Timezone: All timestamps use Asia/Shanghai (Beijing) timezone

## 11) Memory Science Requirements
- Use Ebbinghaus forgetting curve principles for review intervals.
- Implement spaced repetition scheduling (e.g., SM‑2) with increasing intervals after correct recalls.
- Prioritize error-based review: items with recent mistakes appear sooner.
- Ensure “yesterday review” includes items learned within the last 24 hours.

## 12) Duplicate Entry Behavior
- Normalize input (lowercase, trim, remove punctuation/extra spaces).
- If a user submits an existing word/phrase, return a reminder message.
- Reminder text should be configurable; default: “You already recorded this before.”
- Do not create a duplicate record; update `updated_at` or increment a `seen_count`.

## 13) Milestones
1. Backend skeleton + DB schema ✓
2. Review generation + flashcards/cloze ✓
3. Writing correction ✓
4. Speaking MVP ✓
5. Analytics + polish ✓
6. Review history with detailed results ✓
7. AI auto-classification and translation ✓
