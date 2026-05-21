import { useState, createContext, useContext } from 'react';
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

type UserRole = 'traveler' | 'guide';

interface AppContextType {
  role: UserRole;
  toggleRole: () => void;
}

const AppContext = createContext<AppContextType>({
  role: 'traveler',
  toggleRole: () => {},
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
  return (
    <div className="pb-16 min-h-screen bg-gray-50">
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
      </Routes>
      <BottomNav />
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState<UserRole>('traveler');

  const toggleRole = () => {
    setRole(prev => prev === 'traveler' ? 'guide' : 'traveler');
  };

  return (
    <AppContext.Provider value={{ role, toggleRole }}>
      <Router>
        <AppContent />
      </Router>
    </AppContext.Provider>
  );
}
