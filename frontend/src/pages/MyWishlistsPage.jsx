import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function EmptyState() {
  return (
    <div className="empty-state card">
      <h2>У вас пока нет списков желаний</h2>
      <p className="muted">
        Создайте первый список к дню рождения, Новому году или любому другому событию и поделитесь
        ссылкой с друзьями.
      </p>
    </div>
  );
}

function NewWishlistForm({ onCreated }) {
  const { api } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [occasion, setOccasion] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/wishlists', {
        title,
        description,
        occasion,
        eventDate: eventDate || null,
        isPublic,
      });
      onCreated(res.data);
      setTitle('');
      setDescription('');
      setOccasion('');
      setEventDate('');
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось создать список');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      <h2>Новый список желаний</h2>
      <label>
        Название
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="День рождения, Новый год, переезд..."
        />
      </label>
      <label>
        Описание
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Поделитесь, что вам сейчас особенно хочется или нужно."
        />
      </label>
      <label>
        Повод
        <input
          type="text"
          value={occasion}
          onChange={(e) => setOccasion(e.target.value)}
          placeholder="Например: День рождения"
        />
      </label>
      <label>
        Дата события (опционально)
        <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
      </label>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
        />
        Список доступен по публичной ссылке без регистрации
      </label>
      {error && <div className="error">{error}</div>}
      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? 'Создаём...' : 'Создать список'}
      </button>
    </form>
  );
}

function WishlistCard({ wishlist }) {
  const publicUrl =
    wishlist.shareSlug && `${window.location.origin}/w/${encodeURIComponent(wishlist.shareSlug)}`;

  return (
    <div className="card wishlist-card">
      <div className="wishlist-header">
        <div>
          <h2>{wishlist.title}</h2>
          {wishlist.occasion && <p className="muted">{wishlist.occasion}</p>}
        </div>
        {wishlist.eventDate && (
          <span className="pill">
            {new Date(wishlist.eventDate).toLocaleDateString(undefined, {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </span>
        )}
      </div>
      {wishlist.description && <p>{wishlist.description}</p>}
      <div className="wishlist-footer">
        <div className="muted small">
          Подарков: {wishlist.items.length}{' '}
          {wishlist.items.length === 0 && '— добавьте хотя бы один, чтобы было чем делиться.'}
        </div>
        {publicUrl && (
          <div className="share">
            <span className="muted small">Публичная ссылка</span>
            <input
              type="text"
              readOnly
              className="share-input"
              value={publicUrl}
              onFocus={(e) => e.target.select()}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MyWishlistsPage() {
  const { api } = useAuth();
  const [wishlists, setWishlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/wishlists');
        setWishlists(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Не удалось загрузить списки');
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

  return (
    <div className="page">
      <h1>Мои списки желаний</h1>
      {loading && <p>Загружаем...</p>}
      {error && <div className="error">{error}</div>}
      {!loading && wishlists.length === 0 && <EmptyState />}
      <NewWishlistForm onCreated={(wl) => setWishlists((prev) => [wl, ...prev])} />
      <div className="grid">
        {wishlists.map((wl) => (
          <WishlistCard key={wl.id} wishlist={wl} />
        ))}
      </div>
    </div>
  );
}

export default MyWishlistsPage;

