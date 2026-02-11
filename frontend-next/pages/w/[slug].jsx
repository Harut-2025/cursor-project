import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { API_BASE } from '../../lib/api';

function ProgressBar({ value, max }) {
  if (!max || max <= 0) return null;
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <>
      <div className="progress">
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-label">
        Собрано {value.toFixed(0)} / {max.toFixed(0)} ({pct}%)
      </span>
    </>
  );
}

export default function PublicWishlistPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [action, setAction] = useState('reserve');
  const [guestName, setGuestName] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let socket;

    async function load() {
      try {
        const res = await axios.get(`${API_BASE}/api/public/wishlists/${slug}`);
        setWishlist(res.data);
        setError('');
      } catch (err) {
        setError(err.response?.data?.error || 'Список не найден');
      } finally {
        setLoading(false);
      }
    }

    load();

    socket = io(API_BASE, { transports: ['websocket'] });
    socket.emit('join_wishlist', slug);
    socket.on('reservation_updated', load);
    socket.on('contribution_updated', load);
    socket.on('wishlist_item_added', load);

    return () => {
      if (socket) {
        socket.emit('leave_wishlist', slug);
        socket.disconnect();
      }
    };
  }, [slug]);

  const sortedItems = useMemo(() => {
    if (!wishlist?.items) return [];
    return [...wishlist.items].sort((a, b) => {
      const aTaken = a.isFullyFunded || a.reserved;
      const bTaken = b.isFullyFunded || b.reserved;
      if (aTaken === bTaken) return 0;
      return aTaken ? 1 : -1;
    });
  }, [wishlist]);

  const handleAction = async () => {
    if (!selectedItem) return;
    setSending(true);
    try {
      if (action === 'reserve') {
        await axios.post(`${API_BASE}/api/public/items/${selectedItem.id}/reserve`, {
          guestName: guestName || null,
        });
      } else {
        await axios.post(`${API_BASE}/api/public/items/${selectedItem.id}/contribute`, {
          amount: Number(amount),
          guestName: guestName || null,
        });
      }
      setGuestName('');
      setAmount('');
      setSelectedItem(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Не удалось выполнить действие');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="layout">
        <main className="main">
          <p>Загружаем список…</p>
        </main>
      </div>
    );
  }

  if (error || !wishlist) {
    return (
      <div className="layout">
        <main className="main">
          <div className="card error">{error || 'Список не найден'}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="layout">
      <header className="header">
        <span className="logo">WishTogether</span>
      </header>
      <main className="main">
        <div className="card">
          <h1>{wishlist.title}</h1>
          <p className="muted">
            Список желаний от {wishlist.ownerName}. Выберите подарок и зарезервируйте его или
            поучаствуйте в сборе.
          </p>
        </div>
        {sortedItems.length === 0 && (
          <div className="card">
            <h2>Пока здесь пусто</h2>
            <p className="muted">
              Владелец ещё не добавил подарки. Загляните позже или напомните о списке :)
            </p>
          </div>
        )}
        <div className="grid">
          {sortedItems.map((item) => (
            <div
              key={item.id}
              className="card"
              style={item.isFullyFunded || item.reserved ? { opacity: 0.6 } : {}}
            >
              <h2>{item.title}</h2>
              {item.price && (
                <p>
                  <strong>
                    {item.price} {item.currency}
                  </strong>
                </p>
              )}
              {item.notes && <p>{item.notes}</p>}
              {item.allowGroupFunding && item.targetAmount && (
                <ProgressBar value={item.totalContributed || 0} max={item.targetAmount} />
              )}
              <p className="muted small">
                {item.isFullyFunded || item.reserved
                  ? 'Подарок уже кто-то взял — выберите другой, чтобы не повторяться.'
                  : item.allowGroupFunding
                  ? 'Вы можете скинуться на этот подарок — даже небольшой вклад имеет значение.'
                  : 'Зарезервируйте подарок, чтобы друзья не покупали его второй раз.'}
              </p>
              {!item.isFullyFunded && !item.reserved && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setSelectedItem(item);
                      setAction('reserve');
                    }}
                  >
                    Зарезервировать
                  </button>
                  {item.allowGroupFunding && (
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setSelectedItem(item);
                        setAction('contribute');
                      }}
                    >
                      Скинуться
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {selectedItem && (
        <div className="modal-backdrop" onClick={() => !sending && setSelectedItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>
              {action === 'reserve' ? 'Зарезервировать подарок' : 'Скинуться на подарок'} —{' '}
              {selectedItem.title}
            </h2>
            <label>
              Как вас подписать (опционально)
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Например, Катя"
              />
            </label>
            {action === 'contribute' && (
              <label>
                Сумма
                <input
                  type="number"
                  min={selectedItem.minContribution || 1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {selectedItem.minContribution && (
                  <span className="muted small">
                    Минимальный вклад: {selectedItem.minContribution} {selectedItem.currency}
                  </span>
                )}
              </label>
            )}
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setSelectedItem(null)}
                disabled={sending}
              >
                Отмена
              </button>
              <button className="btn-primary" onClick={handleAction} disabled={sending}>
                {sending ? 'Отправляем…' : 'Подтвердить'}
              </button>
            </div>
            <p className="muted small">
              Владелец списка не увидит, кто именно зарезервировал подарок или сколько вы внесли —
              сюрприз останется сюрпризом.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

