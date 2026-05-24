import { useEffect, useState, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { MapPin, Users, Calendar, MessageCircle, User } from 'lucide-react';
import { MapView } from './components/MapView';
import { DiscoverPage } from './components/DiscoverPage';
import { PlansPage } from './components/PlansPage';
import { MessagesPage } from './components/MessagesPage';
import { ProfilePage } from './components/ProfilePage';
import { OrderPage } from './components/OrderPage';
import { ChatPage } from './components/ChatPage';
import { UserProfilePage } from './components/UserProfilePage';
import { ReviewsDetailPage } from './components/ReviewsDetailPage';
import { OrdersPage } from './components/OrdersPage';
import { MyReviewsPage } from './components/MyReviewsPage';
import { CreditPage } from './components/CreditPage';
import { LoginPage } from './components/LoginPage';
import { VerificationPage } from './components/VerificationPage';
import { AdminPage } from './components/AdminPage';
import { apiClient, ApiError } from './api/client';
import { clearTokens, readTokens, saveTokens } from './api/auth-store';
import type { AppBootstrapData, AuthResponse, CurrentUser, UserRole } from './api/types';

interface AppContextType {
  role: UserRole;
  user: CurrentUser | null;
  data: AppBootstrapData | null;
  apiError: string | null;
  refreshAppData: () => Promise<void>;
  toggleRole: () => Promise<void>;
  logout: () => void;
}

const AppContext = createContext<AppContextType>({
  role: 'traveler',
  user: null,
  data: null,
  apiError: null,
  refreshAppData: async () => {},
  toggleRole: async () => {},
  logout: () => {},
});

export const useApp = () => useContext(AppContext);

function BottomNav() {
  const location = useLocation();
  const { role } = useApp();

  const navItems = [
    { path: '/', icon: MapPin, label: '地图' },
    { path: '/discover', icon: Users, label: '发现' },
    { path: '/plans', icon: Calendar, label: role === 'traveler' ? '我的计划' : '我的服务' },
    { path: '/messages', icon: MessageCircle, label: '消息' },
    { path: '/profile', icon: User, label: '我的' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16 max-w-screen-xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <Icon size={24} />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function AppContent() {
  const location = useLocation();
  const hidesBottomNav = location.pathname.startsWith('/order/');

  return (
    <div className={`${hidesBottomNav ? '' : 'pb-16'} min-h-screen bg-gray-50`}>
      <Routes>
        <Route path="/" element={<MapView />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/user/:id" element={<UserProfilePage />} />
        <Route path="/user/:id/reviews" element={<ReviewsDetailPage />} />
        <Route path="/order/:id" element={<OrderPage />} />
        <Route path="/chat/:id" element={<ChatPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/reviews" element={<MyReviewsPage />} />
        <Route path="/credit" element={<CreditPage />} />
        <Route path="/verification" element={<VerificationPage />} />
        <Route path="/notifications" element={<MessagesPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
      {!hidesBottomNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState<UserRole>('traveler');
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [data, setData] = useState<AppBootstrapData | null>(null);
  const [loading, setLoading] = useState(Boolean(readTokens()));
  const [apiError, setApiError] = useState<string | null>(null);

  const refreshAppData = async () => {
    const bootstrap = await apiClient.bootstrap();
    setData(bootstrap);
  };

  useEffect(() => {
    const bootstrapSession = async () => {
      if (!readTokens()) {
        setLoading(false);
        return;
      }
      try {
        const [me] = await Promise.all([apiClient.me(), refreshAppData()]);
        setUser(me);
        const hasGuideRole = me.roles.some(item => item.code === 'guide');
        setRole(hasGuideRole ? 'guide' : 'traveler');
      } catch (error) {
        clearTokens();
        setUser(null);
        setData(null);
        setApiError(error instanceof ApiError ? error.message : '登录状态已失效，请重新登录');
      } finally {
        setLoading(false);
      }
    };
    bootstrapSession();
  }, []);

  const toggleRole = async () => {
    const nextRole = role === 'traveler' ? 'guide' : 'traveler';
    const marketId = data?.selectedMarket?.id ?? null;
    try {
      const result = await apiClient.switchRole(nextRole, marketId);
      setUser(result.user);
      setRole(nextRole);
      setApiError(null);
      await refreshAppData();
    } catch (error) {
      setApiError(error instanceof ApiError ? error.message : '身份切换失败，请稍后重试');
      setRole(nextRole);
    }
  };

  const handleLogin = async (auth: AuthResponse) => {
    saveTokens(auth.tokens);
    setUser(auth.user);
    setApiError(null);
    const hasGuideRole = auth.user.roles.some(item => item.code === 'guide');
    setRole(hasGuideRole ? 'guide' : 'traveler');
    await refreshAppData();
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    setData(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-sm text-white/70">正在连接 Trip Guide...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} initialError={apiError} />;
  }

  return (
    <AppContext.Provider value={{ role, user, data, apiError, refreshAppData, toggleRole, logout }}>
      <Router>
        <AppContent />
      </Router>
    </AppContext.Provider>
  );
}
