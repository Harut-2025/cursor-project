import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createApiClient } from '../lib/api';

export default function Home() {
  const [user, setUser] = useState(null);
  const [wishlists, setWishlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('auth') : null;
    if (!saved) {
      setLoading(false);
      return;
    }
    const parsed = JSON.parse(saved);
    setUser(parsed.user);
    const api = createApiClient(parsed.token);
    api
      .get('/wishlists')
      .then((res) => setWishlists(res.data))
      .catch((err) =>
        setError(err.response?.data?.error || 'Не удалось загрузить списки желаний'),
      )
      .finally(() => setLoading(false));
  }, []);

  if (!user) {
    return (
      <div className="layout">
        <header className="header">
          <Link href="/" className="logo">
            WishTogether
          </Link>
          <nav>
            <Link href="/login">Войти</Link>{' '}
            <span style={{ marginInline: 4 }}>/</span>{' '}
            <Link href="/register">Регистрация</Link>
          </nav>
        </header>
        <main className="main">
          <div className="card">
            <h1>Социальный вишлист</h1>
            <p className="muted">
              Создавайте списки желаний, делитесь ссылкой с друзьями, резервируйте подарки и
              скидывайтесь на дорогие — всё в одном месте.
            </p>
            <Link href="/register" className="btn-primary">
              Начать
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="layout">
      <header className="header">
        <Link href="/" className="logo">
          WishTogether
        </Link>
        <nav>
          <span className="muted small">Привет, {user.name || user.email}</span>
          <button
            className="btn-secondary"
            onClick={() => {
              localStorage.removeItem('auth');
              window.location.href = '/';
            }}
          >
            Выйти
          </button>
        </nav>
      </header>
      <main className="main">
        <h1>Мои списки желаний</h1>
        {loading && <p>Загружаем…</p>}
        {error && <div className="error">{error}</div>}
        {!loading && wishlists.length === 0 && (
          <div className="card">
            <h2>У вас пока нет списков</h2>
            <p className="muted">
              Создайте первый список для дня рождения, Нового года или любого повода и поделитесь
              ссылкой с друзьями.
            </p>
          </div>
        )}
        <div className="grid">
          {wishlists.map((wl) => {
            const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/w/${
              wl.shareSlug
            }`;
            return (
              <div key={wl.id} className="card">
                <h2>{wl.title}</h2>
                {wl.occasion && <p className="muted">{wl.occasion}</p>}
                {wl.description && <p>{wl.description}</p>}
                <p className="muted small">Подарков: {wl.items.length}</p>
                <div className="muted small">Публичная ссылка:</div>
                <input
                  readOnly
                  value={publicUrl}
                  style={{ width: '100%', fontSize: 12, padding: 8, borderRadius: 8 }}
                  onFocus={(e) => e.target.select()}
                />
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

