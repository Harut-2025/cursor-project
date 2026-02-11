## Социальный вишлист WishTogether

**Стек**:
- **Backend**: Node.js, Express, Prisma, PostgreSQL, Socket.IO (realtime)
- **Frontend**: React + Vite, React Router, Axios, socket.io-client

### Как запустить локально

- **База данных**: поднимите PostgreSQL и создайте базу (например, `wishlist`).
- В `backend/.env` пропишите корректный `DATABASE_URL` и при необходимости `JWT_SECRET`.

```bash
cd backend
npx prisma migrate dev --name init
npm run dev
```

Backend по умолчанию слушает `http://localhost:4000`.

Frontend:

```bash
cd frontend
echo "VITE_API_BASE=http://localhost:4000" > .env.local
npm run dev
```

Откройте адрес, который покажет Vite (обычно `http://localhost:5173`).

### Деплой (рекомендуемый вариант)

- **Бэкенд**: Render / Railway / Fly.io
  - Создайте новый сервис из папки `backend`.
  - Команда билд/старт: `npm install && npx prisma migrate deploy && npm run start`.
  - В переменных окружения задайте:
    - `DATABASE_URL` (PostgreSQL, можно взять управляемую БД на Render/Railway/Supabase),
    - `JWT_SECRET` — длинная случайная строка,
    - `CLIENT_ORIGIN` — URL фронтенда (например, `https://your-wishlist-frontend.vercel.app`).

- **Фронтенд**: Vercel / Netlify
  - Задеплойте папку `frontend` как SPA.
  - В переменных окружения укажите:
    - `VITE_API_BASE` — URL бэкенда, например `https://your-wishlist-backend.onrender.com`.
  - Команда билд: `npm install && npm run build`.
  - Output directory: `dist`.

После деплоя:
- Зарегистрируйтесь через `/register`.
- Создайте список, добавьте подарки.
- Откройте публичную ссылку вида `/w/:slug`, чтобы проверить резервы и групповые взносы в реальном времени.

