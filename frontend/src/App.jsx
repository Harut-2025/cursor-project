import { Routes, Route, Navigate, Link } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './auth/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MyWishlistsPage from './pages/MyWishlistsPage';
import PublicWishlistPage from './pages/PublicWishlistPage';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function Layout({ children }) {
  const { user, logout } = useAuth();
  return (
    <div className="app-root">
      <header className="app-header">
        <Link to="/" className="logo">
          WishTogether
        </Link>
        <nav>
          {user ? (
            <>
              <span className="header-user">Привет, {user.name || user.email}</span>
              <button className="btn-secondary" onClick={logout}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="link">
                Войти
              </Link>
              <Link to="/register" className="link">
                Регистрация
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route
            path="/"
            element={
              <PrivateRoute>
                <MyWishlistsPage />
              </PrivateRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/w/:slug" element={<PublicWishlistPage />} />
        </Routes>
      </Layout>
    </AuthProvider>
  );
}

export default App;
