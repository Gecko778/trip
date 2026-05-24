import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, User, Shield, CreditCard, Bell, HelpCircle, Settings, Star, Award, MapPin, LogOut, Edit, RefreshCw } from 'lucide-react';
import { useApp } from '../App';
import { motion, AnimatePresence } from 'motion/react';

export function ProfilePage() {
  const { role, user, toggleRole } = useApp();
  const [isAnimating, setIsAnimating] = useState(false);
  const hasAdminEntry = user?.roles.some(item =>
    ['sys_admin', 'market_admin', 'support_agent', 'guide_reviewer', 'risk_reviewer'].includes(item.code)
  );

  const handleRoleSwitch = () => {
    setIsAnimating(true);
    setTimeout(async () => {
      await toggleRole();
      setTimeout(() => setIsAnimating(false), 600);
    }, 300);
  };

  const userProfile = {
    name: role === 'traveler' ? '陈晓' : '张伟',
    avatar: role === 'traveler'
      ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=chen'
      : 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang',
    verified: true,
    rating: role === 'guide' ? 4.9 : undefined,
    completedTrips: role === 'traveler' ? 12 : 89,
    memberSince: '2024-01',
    creditScore: 95,
  };

  const stats = role === 'traveler'
    ? [
        { label: '旅行计划', value: 3, color: 'blue' },
        { label: '进行中', value: 1, color: 'green' },
        { label: '已完成', value: 12, color: 'purple' },
      ]
    : [
        { label: '待服务', value: 3, color: 'blue' },
        { label: '进行中', value: 2, color: 'green' },
        { label: '已完成', value: 89, color: 'purple' },
      ];

  const menuItems = [
    {
      section: '我的订单',
      items: [
        { icon: CreditCard, label: '订单管理', path: '/orders', badge: role === 'guide' ? '3' : undefined },
        { icon: Star, label: '我的评价', path: '/reviews' },
        { icon: Award, label: '信誉记录', path: '/credit' },
      ],
    },
    {
      section: '账号安全',
      items: [
        { icon: Shield, label: '安全中心', path: '/safety' },
        { icon: User, label: '认证管理', path: '/verification' },
        { icon: Bell, label: '通知设置', path: '/notifications' },
      ],
    },
    {
      section: '帮助与设置',
      items: [
        { icon: HelpCircle, label: '帮助中心', path: '/help' },
        { icon: Settings, label: '设置', path: '/settings' },
      ],
    },
  ];
  if (hasAdminEntry) {
    menuItems.splice(2, 0, {
      section: '后台',
      items: [
        { icon: Shield, label: '后台基础', path: '/admin' },
      ],
    });
  }

  return (
    <div className="max-w-screen-xl mx-auto pb-4">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-b-3xl mb-4">
        <div className="flex items-center gap-4 mb-6">
          {/* Clickable Avatar for Role Switch */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.button
                key={role}
                onClick={handleRoleSwitch}
                disabled={isAnimating}
                initial={{ scale: 0.8, rotate: -180, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.8, rotate: 180, opacity: 0 }}
                transition={{ duration: 0.6, type: "spring" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative block disabled:opacity-50 cursor-pointer"
              >
                <div className="relative">
                  <img
                    src={userProfile.avatar}
                    alt={userProfile.name}
                    className="w-20 h-20 rounded-full border-4 border-white/30 bg-white"
                  />
                  {userProfile.verified && (
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center">
                      <Shield size={14} className="text-white" />
                    </div>
                  )}

                  {/* Role Indicator Overlay */}
                  <div className="absolute -top-1 -left-1 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-lg">
                    {isAnimating ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.6, ease: "linear", repeat: Infinity }}
                      >
                        <RefreshCw size={14} className="text-blue-600" />
                      </motion.div>
                    ) : (
                      <span>{role === 'traveler' ? '😎' : '🧑‍✈️'}</span>
                    )}
                  </div>
                </div>
              </motion.button>
            </AnimatePresence>

            {/* Tap Hint */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-white/70 bg-white/10 px-2 py-1 rounded"
            >
              点击切换身份
            </motion.div>
          </div>

          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={role}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold text-white">{userProfile.name}</h2>
                  {role === 'guide' && (
                    <span className="px-2 py-0.5 bg-yellow-500 text-white rounded text-xs font-medium">
                      认证导游
                    </span>
                  )}
                  {role === 'traveler' && (
                    <span className="px-2 py-0.5 bg-green-500 text-white rounded text-xs font-medium">
                      旅行者
                    </span>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-3 text-white/90 text-sm">
              {role === 'guide' && (
                <div className="flex items-center gap-1">
                  <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  <span>{userProfile.rating}分</span>
                </div>
              )}
              <span>信用分: {userProfile.creditScore}</span>
              <span>加入于 {userProfile.memberSince}</span>
            </div>
          </div>

          <Link to="/profile/edit" className="p-2 bg-white/20 hover:bg-white/30 rounded-lg">
            <Edit size={20} className="text-white" />
          </Link>
        </div>

        {/* Stats */}
        <AnimatePresence mode="wait">
          <motion.div
            key={role}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="grid grid-cols-3 gap-4"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
                className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center"
              >
                <p className={`text-2xl font-bold text-white mb-1`}>{stat.value}</p>
                <p className="text-xs text-white/90">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Guide Info (for guide role) */}
      {role === 'guide' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6 mx-4 mb-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">导游资料</h3>
            <Link to="/guide/settings" className="text-sm text-blue-600 hover:text-blue-700">
              编辑
            </Link>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">服务地区</p>
                <p className="font-medium">上海、江苏、浙江</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CreditCard size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">每日价格</p>
                <p className="text-xl font-bold text-blue-600">¥1000</p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">接单状态</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                  可接单
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Menu Sections */}
      <div className="px-4 space-y-4">
        {menuItems.map(section => (
          <div key={section.section} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <h3 className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">
              {section.section}
            </h3>
            <div className="divide-y divide-gray-100">
              {section.items.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} className="text-gray-400" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span className="px-2 py-0.5 bg-red-600 text-white rounded-full text-xs font-medium">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight size={18} className="text-gray-400" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="px-4 mt-4">
        <button className="w-full py-4 bg-white rounded-xl shadow-sm text-red-600 font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
          <LogOut size={20} />
          退出登录
        </button>
      </div>

      {/* Version Info */}
      <p className="text-center text-sm text-gray-400 mt-6">
        China Travel v1.0.0
      </p>
    </div>
  );
}
