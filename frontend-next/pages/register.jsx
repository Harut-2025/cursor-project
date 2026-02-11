import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { API_BASE } from '../lib/api';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/register`, { name, email, password });
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth', JSON.stringify(res.data));
        window.location.href = '/';
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
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
          <h1>Регистрация</h1>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label>
              Имя (опционально)
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
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
              {loading ? 'Регистрируем…' : 'Зарегистрироваться'}
            </button>
            <p className="muted small">
              Уже есть аккаунт? <Link href="/login">Войти</Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

