# English Partner

A web application for learning English through daily review, spaced repetition, and AI-powered corrections.

## Features

- 📚 **Smart Review System**: Multiple review modes (flashcards, cloze, speaking, writing)
- 🎯 **AI-Powered Corrections**: Get instant feedback from OpenAI or Anthropic
- 🧠 **Spaced Repetition**: Learn efficiently with SM-2 algorithm
- 📊 **Progress Tracking**: Monitor accuracy, streaks, and mistakes
- 🔄 **Duplicate Detection**: Prevents duplicate entries with smart normalization

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Database with JSON support
- **SQLAlchemy** - ORM with Alembic migrations
- **OpenAI/Anthropic** - AI provider abstraction

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components

## Project Structure

```
english-partner/
├── backend/
│   ├── alembic/              # Database migrations
│   ├── ai/                   # AI provider abstraction
│   │   ├── base.py
│   │   ├── openai_provider.py
│   │   ├── anthropic_provider.py
│   │   └── factory.py
│   ├── routers/              # API endpoints
│   │   ├── auth_router.py
│   │   ├── items_router.py
│   │   ├── reviews_router.py
│   │   └── ai_router.py
│   ├── models.py             # Database models
│   ├── schemas.py            # Pydantic schemas
│   ├── database.py           # DB connection
│   ├── config.py             # Settings
│   ├── auth.py               # Authentication
│   ├── utils.py              # Helper functions
│   ├── main.py               # FastAPI app
│   └── requirements.txt
│
└── frontend/
    ├── app/                  # Next.js pages
    │   ├── page.tsx          # Landing page
    │   ├── login/
    │   ├── register/
    │   ├── dashboard/
    │   └── review/
    ├── components/           # React components
    │   └── ui/               # shadcn/ui components
    ├── lib/                  # Utilities
    │   ├── api.ts            # API client
    │   └── utils.ts
    └── package.json
```

## Setup Instructions

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 14+

### Backend Setup

1. **Create virtual environment**:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # Linux/Mac
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**:
   - Copy `.env.example` to `.env`
   - Update database URL and API keys:
   ```env
   DATABASE_URL=postgresql://user:password@localhost/english_partner
   AI_PROVIDER=openai  # or anthropic
   OPENAI_API_KEY=sk-...
   SECRET_KEY=your-secret-key
   ```

4. **Create database**:
   ```bash
   createdb english_partner
   ```

5. **Run migrations**:
   ```bash
   alembic upgrade head
   ```

6. **Start server**:
   ```bash
   python main.py
   # or
   uvicorn main:app --reload
   ```

   API will be available at http://localhost:8000
   OpenAPI docs at http://localhost:8000/docs

### Frontend Setup

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment**:
   - Create `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

   Frontend will be available at http://localhost:3000

## Mobile Support

The application is fully optimized for mobile phones and tablets:

### Features
- 📱 **Responsive Design** - Adapts perfectly to all screen sizes (mobile, tablet, desktop)
- 🎯 **Touch-Friendly** - Large buttons (44x44px minimum) optimized for touch interaction
- ⌨️ **Mobile Keyboard** - Font size 16px to prevent iOS auto-zoom on input focus
- 🔤 **Readable Text** - Optimized font sizes for mobile screens
- 📞 **Speech Recognition** - Native browser Web Speech API for speaking mode (Chrome, Safari, Edge)
- 🔊 **Text-to-Speech** - Built-in speech synthesis without external dependencies

### Mobile Optimization Details
1. **Responsive Breakpoints**:
   - Mobile: `< 640px` (sm breakpoint)
   - Tablet: `640px - 1024px`
   - Desktop: `> 1024px`

2. **Touch Targets**: All interactive elements meet 44x44px minimum size for mobile

3. **Fullscreen Input Mode**: Batch input with dedicated fullscreen editor on mobile

4. **Viewport Configuration**: Proper meta viewport for responsive layout

5. **Text Input Optimization**:
   - 16px font size prevents iOS zoom-on-focus
   - Native input controls for better mobile UX
   - Optimized placeholder text

### Supported Mobile Browsers
- Chrome (Android) - Full support including Web Speech API
- Safari (iOS) - Full support including Web Speech API  
- Edge (Android/iOS) - Full support
- Firefox (Android) - Full support (without Web Speech API)

### Mobile Usage Tips
1. Use portrait or landscape mode - both are fully supported
2. Batch input supports multiline entry with fullscreen editor
3. Speaking mode uses device microphone via Web Speech API
4. All AI features work seamlessly on mobile

## Usage

1. **Register** a new account
2. **Add learning items** (words, phrases, sentences)
3. **Review yesterday's items** using different modes
4. **Track progress** and improve with AI feedback

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get token

### Learning Items
- `POST /items` - Create learning item
- `GET /items` - List all items
- `GET /items/{id}` - Get specific item

### Reviews
- `GET /reviews/yesterday` - Get items for review
- `POST /reviews/submit` - Submit review session
- `GET /reviews/history` - Get review history

### AI Corrections
- `POST /ai/correct-text` - Correct written text
- `POST /ai/speaking-score` - Score pronunciation

## Development

### Database Migrations

Create a new migration:
```bash
alembic revision --autogenerate -m "description"
```

Apply migrations:
```bash
alembic upgrade head
```

Rollback:
```bash
alembic downgrade -1
```

### Testing

Backend:
```bash
pytest
```

Frontend:
```bash
npm test
```

## Configuration

### AI Provider

The app supports both OpenAI and Anthropic. Set in `.env`:

```env
AI_PROVIDER=openai  # or anthropic
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

**Note**: Speaking features require OpenAI Whisper for transcription.

### Spaced Repetition

The app uses the SM-2 algorithm with these defaults:
- Initial interval: 1 day
- Ease factor: 2.5
- Minimum ease: 1.3

Items are scheduled based on recall quality (0-100 score).

## Production Deployment

### 1) Provision Infrastructure
1. **PostgreSQL** database (managed service or VM)
2. **Linux server** (Ubuntu 22.04 recommended)
3. **Domain + DNS**
   - `your-domain` → server IP
   - `api.your-domain` → server IP
4. **Open ports**: 80 and 443

### 2) Prepare Server
1. **Install system packages**:
   - `python3`, `python3-venv`, `python3-pip`
   - `nodejs` (18+) and `npm`
   - `nginx`
2. **Create app user** (recommended):
   - `useradd -m -s /bin/bash appuser`
   - `su - appuser`

### 3) Deploy Backend (FastAPI)
1. **Clone repo** to `/home/appuser/english-partner`
2. **Configure env** in `backend/.env`:
   - `DATABASE_URL`
   - `AI_PROVIDER`
   - `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`
   - `OPENAI_BASE_URL` / `ANTHROPIC_BASE_URL` (optional)
   - `OPENAI_MODEL` / `ANTHROPIC_MODEL` (optional)
   - `SECRET_KEY`
3. **Create venv + install deps**:
   - `cd backend`
   - `python3 -m venv venv`
   - `source venv/bin/activate`
   - `pip install -r requirements.txt`
4. **Run migrations**:
   - `alembic upgrade head`
5. **Create systemd service** `/etc/systemd/system/english-partner-backend.service`:
   ```ini
   [Unit]
   Description=English Partner API
   After=network.target

   [Service]
   User=appuser
   WorkingDirectory=/home/appuser/english-partner/backend
   EnvironmentFile=/home/appuser/english-partner/backend/.env
   ExecStart=/home/appuser/english-partner/backend/venv/bin/gunicorn \
     -k uvicorn.workers.UvicornWorker -w 4 -b 127.0.0.1:8000 main:app
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```
6. **Enable and start**:
   - `sudo systemctl daemon-reload`
   - `sudo systemctl enable --now english-partner-backend`

### 4) Deploy Frontend (Next.js)
1. **Set frontend env** in `frontend/.env.local`:
   - `NEXT_PUBLIC_API_URL=https://api.your-domain`
2. **Install deps + build**:
   - `cd frontend`
   - `npm install`
   - `npm run build`
3. **Create systemd service** `/etc/systemd/system/english-partner-frontend.service`:
   ```ini
   [Unit]
   Description=English Partner Web
   After=network.target

   [Service]
   User=appuser
   WorkingDirectory=/home/appuser/english-partner/frontend
   Environment=NODE_ENV=production
   ExecStart=/usr/bin/npm run start
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```
4. **Enable and start**:
   - `sudo systemctl daemon-reload`
   - `sudo systemctl enable --now english-partner-frontend`

### 5) Nginx Reverse Proxy (Frontend required)
1. **Create Nginx config** `/etc/nginx/sites-available/english-partner`:
   ```nginx
   server {
     listen 80;
     server_name your-domain;

     location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }

   server {
     listen 80;
     server_name api.your-domain;

     location / {
       proxy_pass http://127.0.0.1:8000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```
2. **Enable site**:
   - `sudo ln -s /etc/nginx/sites-available/english-partner /etc/nginx/sites-enabled/english-partner`
   - `sudo nginx -t`
   - `sudo systemctl reload nginx`

### 6) HTTPS (Certbot)
1. **Install Certbot** and enable TLS:
   - `sudo certbot --nginx`
2. **Verify auto-renew**:
   - `sudo systemctl status certbot.timer`

### 7) Production Checklist
- Use a strong `SECRET_KEY`
- Disable CORS wildcard in production
- Restrict database access to your server IP
- Rotate API keys regularly
- Confirm `NEXT_PUBLIC_API_URL` points to `https://api.your-domain`

## License

MIT License

## Support

For issues and questions, please create an issue on GitHub.
