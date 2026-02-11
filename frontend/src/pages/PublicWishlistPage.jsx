import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function ProgressBar({ value, max }) {
  if (!max || max <= 0) return null;
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="progress">
      <div className="progress-bar" style={{ width: `${pct}%` }} />
      <span className="progress-label">
        Собрано {value.toFixed(0)} / {max.toFixed(0)} ({pct}%)
      </span>
    </div>
  );
}

function PublicWishlistPage() {
  const { slug } = useParams();
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [action, setAction] = useState('reserve');
  const [guestName, setGuestName] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let socket;
    async function load() {
      try {
        const res = await axios.get(`${API_BASE}/api/public/wishlists/${encodeURIComponent(slug)}`);
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
    socket.on('reservation_updated', () => load());
    socket.on('contribution_updated', () => load());
    socket.on('wishlist_item_added', () => load());

    return () => {
      if (socket) {
        socket.emit('leave_wishlist', slug);
        socket.disconnect();
      }
    };
  }, [slug]);

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

  const sortedItems = useMemo(() => {
    if (!wishlist?.items) return [];
    return [...wishlist.items].sort((a, b) => {
      const aReserved = a.reserved || a.isFullyFunded;
      const bReserved = b.reserved || b.isFullyFunded;
      if (aReserved === bReserved) return 0;
      return aReserved ? 1 : -1;
    });
  }, [wishlist]);

  if (loading) return <div className="page">Загружаем список...</div>;
  if (error) return <div className="page error">{error}</div>;
  if (!wishlist) return null;

  return (
    <div className="page">
      <header className="wishlist-public-header">
        <h1>{wishlist.title}</h1>
        <p className="muted">
          Список желаний от {wishlist.ownerName}. Выберите подарок и зарезервируйте его или
          поучаствуйте в сборе.
        </p>
      </header>
      {sortedItems.length === 0 && (
        <div className="card empty-state">
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
            className={`card gift-card ${
              item.isFullyFunded || item.reserved ? 'gift-card-disabled' : ''
            }`}
          >
            {item.imageUrl && (
              <div className="gift-image-wrapper">
                <img src={item.imageUrl} alt={item.title} className="gift-image" />
              </div>
            )}
            <h2>{item.title}</h2>
            {item.price && (
              <div className="price">
                {item.price.toFixed(0)} {item.currency}
              </div>
            )}
            {item.notes && <p>{item.notes}</p>}
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer" className="link small">
                Открыть ссылку на подарок
              </a>
            )}
            {item.allowGroupFunding && item.targetAmount && (
              <ProgressBar value={item.totalContributed || 0} max={item.targetAmount} />
            )}
            <div className="muted small">
              {item.isFullyFunded || item.reserved
                ? 'Подарок уже кто-то взял на себя — выберите другой, чтобы не повториться.'
                : item.allowGroupFunding
                  ? 'Вы можете скинуться на этот подарок — даже небольшой вклад имеет значение.'
                  : 'Зарезервируйте подарок, чтобы друзья не покупали его второй раз.'}
            </div>
            <div className="actions">
              {!item.isFullyFunded && !item.reserved && (
                <>
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
                </>
              )}
            </div>
          </div>
        ))}
      </div>

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
                {sending ? 'Отправляем...' : 'Подтвердить'}
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

export default PublicWishlistPage;

