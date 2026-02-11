import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { API_BASE } from '../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, { email, password });
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth', JSON.stringify(res.data));
        window.location.href = '/';
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="layout">
      <header className="header">
        <Link href="/" className="logo">
          WishTogether
        </Link>
      </header>
      <main className="main">
        <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
          <h1>Вход</h1>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Пароль
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && <div className="error">{error}</div>}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Входим…' : 'Войти'}
            </button>
            <p className="muted small">
              Нет аккаунта? <Link href="/register">Зарегистрироваться</Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

