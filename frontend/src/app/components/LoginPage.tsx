import { useState, useEffect } from 'react';
import type React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Eye, EyeOff, Phone, Mail, Lock, User, ChevronRight, MapPin } from 'lucide-react';
import { apiClient, ApiError } from '../api/client';
import type { AuthResponse } from '../api/types';

type Screen = 'landing' | 'login' | 'register' | 'forgot' | 'phone';
const MIN_PASSWORD_LENGTH = 8;

interface LoginPageProps {
  onLogin: (auth: AuthResponse) => Promise<void>;
  initialError?: string | null;
}

const DESTINATIONS = [
  {
    city: 'Paris',
    country: 'France',
    flag: '🇫🇷',
    url: 'https://images.unsplash.com/photo-1633982341410-a6dbc348f9d5?w=1200&h=900&fit=crop&auto=format',
  },
  {
    city: 'Tokyo',
    country: 'Japan',
    flag: '🇯🇵',
    url: 'https://images.unsplash.com/photo-1604928141064-207cea6f571f?w=1200&h=900&fit=crop&auto=format',
  },
  {
    city: 'Santorini',
    country: 'Greece',
    flag: '🇬🇷',
    url: 'https://images.unsplash.com/photo-1629470035936-3296c3bd8237?w=1200&h=900&fit=crop&auto=format',
  },
  {
    city: 'Singapore',
    country: 'Singapore',
    flag: '🇸🇬',
    url: 'https://images.unsplash.com/photo-1759909632121-17c0f7aea633?w=1200&h=900&fit=crop&auto=format',
  },
  {
    city: 'New York',
    country: 'USA',
    flag: '🇺🇸',
    url: 'https://images.unsplash.com/photo-1543349689-746a0989b92c?w=1200&h=900&fit=crop&auto=format',
  },
];

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.32.07 2.24.73 3.01.77.98-.14 1.94-.82 3.07-.88 1.32.08 2.34.62 2.99 1.6-2.59 1.57-2.03 5.08.8 6.11-.51 1.4-1.17 2.78-1.87 3.28zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}

function WechatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.328.328 0 0 0 .186-.059l2.114-1.225a.714.714 0 0 1 .366-.1.704.704 0 0 1 .195.028 9.32 9.32 0 0 0 2.763.42c.272 0 .538-.017.804-.042-.271-.74-.416-1.523-.416-2.336 0-3.799 3.528-6.88 7.88-6.88.28 0 .556.015.83.042C16.95 4.31 13.19 2.188 8.69 2.188zm-2.068 4.13a1.044 1.044 0 0 1 0 2.088 1.044 1.044 0 0 1 0-2.088zm4.14 0a1.044 1.044 0 0 1 0 2.088 1.044 1.044 0 0 1 0-2.088zM24 14.972c0-3.39-3.189-6.146-7.12-6.146s-7.12 2.756-7.12 6.146 3.189 6.146 7.12 6.146c.748 0 1.47-.1 2.151-.287a.56.56 0 0 1 .154-.022.57.57 0 0 1 .29.079l1.661.963a.26.26 0 0 0 .147.046.23.23 0 0 0 .228-.232c0-.057-.023-.112-.038-.168l-.307-1.163a.466.466 0 0 1 .168-.524C23.072 18.799 24 16.97 24 14.972zm-9.95-1.074a.826.826 0 0 1 0-1.652.826.826 0 0 1 0 1.652zm3.666 0a.826.826 0 0 1 0-1.652.826.826 0 0 1 0 1.652z"/>
    </svg>
  );
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
};

function InputField({
  icon: Icon, type = 'text', placeholder, value, onChange, right,
}: {
  icon: React.ElementType; type?: string; placeholder: string;
  value: string; onChange: (v: string) => void; right?: React.ReactNode;
}) {
  return (
    <div className="relative flex items-center bg-white/10 border border-white/20 rounded-2xl px-4 py-3.5 gap-3 focus-within:border-white/50 focus-within:bg-white/15 transition-all">
      <Icon size={18} className="text-white/50 flex-shrink-0" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-transparent text-white placeholder-white/40 text-sm focus:outline-none"
      />
      {right}
    </div>
  );
}

function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return '请求失败，请稍后重试';
  }
  const validationErrors = (error.fieldErrors as {
    errors?: Array<{ loc?: unknown[]; msg?: string; ctx?: { min_length?: number } }>;
  }).errors;
  const passwordError = validationErrors?.find(item => item.loc?.includes('password'));
  if (passwordError) {
    return `密码至少需要 ${passwordError.ctx?.min_length ?? MIN_PASSWORD_LENGTH} 位`;
  }
  return error.message;
}

export function LoginPage({ onLogin, initialError }: LoginPageProps) {
  const [screen, setScreen] = useState<Screen>('landing');
  const [dir, setDir] = useState(1);
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setBgIndex(i => (i + 1) % DESTINATIONS.length), 5000);
    return () => clearInterval(iv);
  }, []);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(initialError ?? null);

  useEffect(() => {
    setFormError(initialError ?? null);
  }, [initialError]);

  const go = (s: Screen, d = 1) => { setDir(d); setScreen(s); };

  const runAuth = async (mode: 'login' | 'register') => {
    if (submitting) return;
    setFormError(null);
    if (!email.trim() || !password) {
      setFormError('请填写邮箱和密码');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`密码至少需要 ${MIN_PASSWORD_LENGTH} 位`);
      return;
    }
    if (mode === 'register') {
      if (!name.trim()) {
        setFormError('请填写姓名');
        return;
      }
      if (password !== confirmPw) {
        setFormError('两次输入的密码不一致');
        return;
      }
    }
    setSubmitting(true);
    try {
      const auth = mode === 'login'
        ? await apiClient.login(email.trim(), password)
        : await apiClient.register(email.trim(), password, name.trim());
      await onLogin(auth);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const showDeferredAuth = (message: string) => {
    setFormError(message);
  };

  const startCountdown = () => {
    setSmsSent(true);
    setCountdown(60);
    const iv = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(iv); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const SocialButton = ({
    icon, label, onClick, bg = 'bg-white', text = 'text-gray-800',
  }: {
    icon: React.ReactNode; label: string; onClick?: () => void;
    bg?: string; text?: string;
  }) => (
    <button
      onClick={onClick ?? (() => showDeferredAuth('第三方登录需要配置 Google/Apple/微信平台参数，当前暂未启用'))}
      className={`flex items-center gap-3 w-full px-4 py-3.5 ${bg} ${text} rounded-2xl font-medium text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-sm`}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      <ChevronRight size={16} className="opacity-40" />
    </button>
  );

  const PrimaryBtn = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      disabled={submitting}
      className="w-full py-4 bg-white text-gray-900 rounded-2xl font-bold text-base hover:bg-white/90 active:scale-[0.98] transition-all shadow-lg disabled:opacity-60 disabled:active:scale-100"
    >
      {submitting ? '处理中...' : label}
    </button>
  );

  const BackBtn = ({ to, d = -1 }: { to: Screen; d?: number }) => (
    <button
      onClick={() => go(to, d)}
      className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
    >
      <ArrowLeft size={20} className="text-white" />
    </button>
  );

  const dest = DESTINATIONS[bgIndex];

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-gray-900">
      {/* Slideshow Background */}
      <AnimatePresence mode="sync">
        <motion.div
          key={bgIndex}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <img
            src={dest.url}
            alt={dest.city}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/45 to-black/85" />
        </motion.div>
      </AnimatePresence>

      {/* Destination label */}
      {screen === 'landing' && (
        <AnimatePresence mode="wait">
          <motion.div
            key={bgIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="absolute top-14 right-5 flex items-center gap-1.5 bg-black/30 backdrop-blur-md border border-white/15 rounded-full px-3 py-1.5 z-10"
          >
            <MapPin size={12} className="text-white/70" />
            <span className="text-white/90 text-xs font-medium">{dest.city}, {dest.country}</span>
            <span className="text-sm">{dest.flag}</span>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Dot indicators */}
      {screen === 'landing' && (
        <div className="absolute top-[72px] left-5 flex gap-1.5 z-10">
          {DESTINATIONS.map((_, i) => (
            <button
              key={i}
              onClick={() => setBgIndex(i)}
              className={`rounded-full transition-all duration-500 ${
                i === bgIndex ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'
              }`}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative h-full flex flex-col">

        {/* Landing screen */}
        <AnimatePresence initial={false} custom={dir} mode="wait">
          {screen === 'landing' && (
            <motion.div
              key="landing"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: [0.32, 0, 0.18, 1] }}
              className="flex flex-col flex-1 px-6 pt-16 pb-10"
            >
              {/* Brand */}
              <div className="flex-1 flex flex-col justify-end pb-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-3xl">✈️</span>
                    <span className="text-white font-bold text-xl tracking-wide">Trip Guide</span>
                  </div>
                  <h1 className="text-4xl font-black text-white leading-tight mb-3">
                    探索世界<br />无限可能
                  </h1>
                  <p className="text-white/60 text-base leading-relaxed">
                    连接全球专业导游与旅行者<br />打造专属旅行体验
                  </p>
                </motion.div>
              </div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="space-y-3"
              >
                <button
                  onClick={() => go('login', 1)}
                  className="w-full py-4 bg-white text-gray-900 rounded-2xl font-bold text-base hover:bg-white/90 active:scale-[0.98] transition-all shadow-lg"
                >
                  登录
                </button>
                <button
                  onClick={() => go('register', 1)}
                  className="w-full py-4 bg-white/15 border border-white/30 text-white rounded-2xl font-bold text-base hover:bg-white/20 active:scale-[0.98] transition-all backdrop-blur-sm"
                >
                  注册账号
                </button>

                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-white/20" />
                  <span className="text-white/40 text-xs">或快速登录</span>
                  <div className="flex-1 h-px bg-white/20" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: <GoogleIcon />, label: 'Google' },
                    { icon: <AppleIcon />, label: 'Apple' },
                    { icon: <WechatIcon />, label: '微信' },
                  ].map(({ icon, label }) => (
                    <button
                      key={label}
                      onClick={() => showDeferredAuth('第三方登录需要配置 Google/Apple/微信平台参数，当前暂未启用')}
                      className="flex flex-col items-center gap-1.5 py-3.5 bg-white/10 border border-white/20 rounded-2xl hover:bg-white/20 active:scale-95 transition-all backdrop-blur-sm"
                    >
                      <span className="text-white">{icon}</span>
                      <span className="text-white/70 text-xs">{label}</span>
                    </button>
                  ))}
                </div>

                <p className="text-center text-white/30 text-xs pt-2">
                  登录即代表同意《用户协议》和《隐私政策》
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* Login screen */}
          {screen === 'login' && (
            <motion.div
              key="login"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: [0.32, 0, 0.18, 1] }}
              className="flex flex-col flex-1 px-6 pt-14 pb-10"
            >
              <div className="flex items-center justify-between mb-10">
                <BackBtn to="landing" d={-1} />
                <button
                  onClick={() => go('register', 1)}
                  className="text-white/70 text-sm hover:text-white transition-colors"
                >
                  没有账号？<span className="text-white font-semibold">注册</span>
                </button>
              </div>

              <h2 className="text-3xl font-black text-white mb-2">欢迎回来</h2>
              <p className="text-white/50 mb-8 text-sm">登录你的 China Trip 账号</p>
              {formError && (
                <div className="mb-4 rounded-2xl border border-red-300/30 bg-red-500/15 px-4 py-3 text-sm text-red-50">
                  {formError}
                </div>
              )}

              <div className="space-y-3 mb-6">
                <InputField
                  icon={Mail} type="email" placeholder="邮箱地址"
                  value={email} onChange={setEmail}
                />
                <InputField
                  icon={Lock} type={showPw ? 'text' : 'password'} placeholder="密码"
                  value={password} onChange={setPassword}
                  right={
                    <button onClick={() => setShowPw(p => !p)} className="text-white/40 hover:text-white/70 transition-colors">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
              </div>

              <button
                onClick={() => go('forgot', 1)}
                className="text-right text-white/50 text-sm hover:text-white transition-colors mb-6"
              >
                忘记密码？
              </button>

              <PrimaryBtn label="登录" onClick={() => runAuth('login')} />

              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-white/40 text-xs">其他登录方式</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>

              <div className="space-y-3">
                <SocialButton icon={<Phone size={18} className="text-green-400" />} label="手机号码登录" onClick={() => go('phone', 1)} bg="bg-white/10 border border-white/20 backdrop-blur-sm" text="text-white" />
                <SocialButton icon={<GoogleIcon />} label="使用 Google 登录" />
                <SocialButton icon={<AppleIcon />} label="使用 Apple 登录" bg="bg-gray-900" text="text-white" />
                <SocialButton icon={<WechatIcon />} label="使用微信登录" bg="bg-[#07C160]" text="text-white" />
              </div>
            </motion.div>
          )}

          {/* Register screen */}
          {screen === 'register' && (
            <motion.div
              key="register"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: [0.32, 0, 0.18, 1] }}
              className="flex flex-col flex-1 px-6 pt-14 pb-10 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-10">
                <BackBtn to="landing" d={-1} />
                <button
                  onClick={() => go('login', -1)}
                  className="text-white/70 text-sm hover:text-white transition-colors"
                >
                  已有账号？<span className="text-white font-semibold">登录</span>
                </button>
              </div>

              <h2 className="text-3xl font-black text-white mb-2">创建账号</h2>
              <p className="text-white/50 mb-8 text-sm">加入 China Trip，开启旅行新体验</p>
              {formError && (
                <div className="mb-4 rounded-2xl border border-red-300/30 bg-red-500/15 px-4 py-3 text-sm text-red-50">
                  {formError}
                </div>
              )}

              <div className="space-y-3 mb-8">
                <InputField
                  icon={User} placeholder="你的姓名"
                  value={name} onChange={setName}
                />
                <InputField
                  icon={Mail} type="email" placeholder="邮箱地址"
                  value={email} onChange={setEmail}
                />
                <InputField
                  icon={Lock} type={showPw ? 'text' : 'password'} placeholder="设置密码（至少 8 位）"
                  value={password} onChange={setPassword}
                  right={
                    <button onClick={() => setShowPw(p => !p)} className="text-white/40 hover:text-white/70 transition-colors">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
                <InputField
                  icon={Lock} type={showConfirm ? 'text' : 'password'} placeholder="确认密码"
                  value={confirmPw} onChange={setConfirmPw}
                  right={
                    <button onClick={() => setShowConfirm(p => !p)} className="text-white/40 hover:text-white/70 transition-colors">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
              </div>

              <PrimaryBtn label="注册账号" onClick={() => runAuth('register')} />

              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-white/40 text-xs">或使用第三方注册</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>

              <div className="space-y-3">
                <SocialButton icon={<GoogleIcon />} label="使用 Google 注册" />
                <SocialButton icon={<AppleIcon />} label="使用 Apple 注册" bg="bg-gray-900" text="text-white" />
                <SocialButton icon={<WechatIcon />} label="使用微信注册" bg="bg-[#07C160]" text="text-white" />
              </div>

              <p className="text-center text-white/30 text-xs mt-6">
                注册即代表同意《用户协议》和《隐私政策》
              </p>
            </motion.div>
          )}

          {/* Forgot password screen */}
          {screen === 'forgot' && (
            <motion.div
              key="forgot"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: [0.32, 0, 0.18, 1] }}
              className="flex flex-col flex-1 px-6 pt-14 pb-10"
            >
              <div className="flex items-center mb-10">
                <BackBtn to="login" d={-1} />
              </div>

              <AnimatePresence mode="wait">
                {!forgotSent ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="flex flex-col flex-1"
                  >
                    <h2 className="text-3xl font-black text-white mb-2">忘记密码</h2>
                    <p className="text-white/50 mb-8 text-sm leading-relaxed">
                      输入你的注册邮箱，我们将发送重置密码链接
                    </p>

                    <div className="mb-6">
                      <InputField
                        icon={Mail} type="email" placeholder="注册邮箱"
                        value={forgotEmail} onChange={setForgotEmail}
                      />
                    </div>

                    <PrimaryBtn label="发送重置链接" onClick={() => setForgotSent(true)} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="sent"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col flex-1 items-center justify-center text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 14, stiffness: 200, delay: 0.1 }}
                      className="w-24 h-24 bg-white/15 rounded-full flex items-center justify-center mb-6 border border-white/20"
                    >
                      <span className="text-4xl">📬</span>
                    </motion.div>
                    <h3 className="text-2xl font-black text-white mb-3">邮件已发送</h3>
                    <p className="text-white/60 text-sm leading-relaxed mb-8 px-4">
                      重置链接已发送至<br />
                      <span className="text-white font-medium">{forgotEmail || 'your@email.com'}</span><br />
                      请检查你的收件箱
                    </p>
                    <button
                      onClick={() => go('login', -1)}
                      className="px-8 py-3.5 bg-white text-gray-900 rounded-2xl font-bold hover:bg-white/90 transition-all"
                    >
                      返回登录
                    </button>
                    <button
                      onClick={() => setForgotSent(false)}
                      className="mt-4 text-white/40 text-sm hover:text-white/70 transition-colors"
                    >
                      重新发送
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Phone login screen */}
          {screen === 'phone' && (
            <motion.div
              key="phone"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: [0.32, 0, 0.18, 1] }}
              className="flex flex-col flex-1 px-6 pt-14 pb-10"
            >
              <div className="flex items-center mb-10">
                <BackBtn to="login" d={-1} />
              </div>

              <h2 className="text-3xl font-black text-white mb-2">手机号登录</h2>
              <p className="text-white/50 mb-8 text-sm">输入手机号接收验证码</p>
              {formError && (
                <div className="mb-4 rounded-2xl border border-red-300/30 bg-red-500/15 px-4 py-3 text-sm text-red-50">
                  {formError}
                </div>
              )}

              <div className="space-y-3 mb-6">
                {/* Phone input with country code */}
                <div className="relative flex items-center bg-white/10 border border-white/20 rounded-2xl overflow-hidden focus-within:border-white/50 focus-within:bg-white/15 transition-all">
                  <div className="flex items-center gap-2 pl-4 pr-3 border-r border-white/20 py-3.5 flex-shrink-0">
                    <span className="text-base">🇨🇳</span>
                    <span className="text-white text-sm font-medium">+86</span>
                  </div>
                  <input
                    type="tel"
                    placeholder="手机号码"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="flex-1 bg-transparent text-white placeholder-white/40 text-sm focus:outline-none px-4 py-3.5"
                  />
                </div>

                {/* SMS code */}
                <div className="relative flex items-center bg-white/10 border border-white/20 rounded-2xl overflow-hidden focus-within:border-white/50 focus-within:bg-white/15 transition-all">
                  <div className="flex items-center gap-3 pl-4 flex-1">
                    <Lock size={18} className="text-white/50 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="验证码"
                      value={smsCode}
                      onChange={e => setSmsCode(e.target.value)}
                      maxLength={6}
                      className="flex-1 bg-transparent text-white placeholder-white/40 text-sm focus:outline-none py-3.5"
                    />
                  </div>
                  <button
                    onClick={() => { if (!smsSent) startCountdown(); }}
                    disabled={smsSent && countdown > 0}
                    className={`px-4 py-3.5 border-l border-white/20 text-sm font-medium flex-shrink-0 transition-colors ${
                      smsSent && countdown > 0
                        ? 'text-white/30 cursor-not-allowed'
                        : 'text-blue-300 hover:text-blue-200'
                    }`}
                  >
                    {smsSent && countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </button>
                </div>
              </div>

              <PrimaryBtn
                label="登录"
                onClick={() => showDeferredAuth('手机号验证码登录后端尚未实现；请先使用邮箱密码登录')}
              />

              <p className="text-center text-white/40 text-xs mt-6 leading-relaxed">
                未注册手机号验证后将自动注册账号
              </p>

              <div className="flex items-center gap-3 mt-6 mb-5">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-white/40 text-xs">其他方式</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>

              <div className="space-y-3">
                <SocialButton icon={<Mail size={18} className="text-blue-400" />} label="邮箱密码登录" onClick={() => go('login', -1)} bg="bg-white/10 border border-white/20 backdrop-blur-sm" text="text-white" />
                <SocialButton icon={<GoogleIcon />} label="使用 Google 登录" />
                <SocialButton icon={<AppleIcon />} label="使用 Apple 登录" bg="bg-gray-900" text="text-white" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
