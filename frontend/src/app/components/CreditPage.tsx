import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, TrendingDown, TrendingUp, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CREDIT_SCORE = 67;
const MAX_SCORE = 100;

interface CreditRecord {
  id: string;
  type: 'deduct' | 'add';
  amount: number;
  reason: string;
  detail: string;
  date: string;
  orderId?: string;
}

const RECORDS: CreditRecord[] = [
  {
    id: 'CR-001',
    type: 'deduct',
    amount: -10,
    reason: '取消已确认订单',
    detail: '在订单确认后48小时内单方面取消订单（ORD-20260301-005），违反平台规则。',
    date: '2026-03-02',
    orderId: 'ORD-20260301-005',
  },
  {
    id: 'CR-002',
    type: 'deduct',
    amount: -8,
    reason: '旅行者投诉',
    detail: '旅行者王芳反馈行程中出现重大变更且未提前告知，经平台核实属实。',
    date: '2026-02-20',
    orderId: 'ORD-20260515-002',
  },
  {
    id: 'CR-003',
    type: 'deduct',
    amount: -15,
    reason: '长期未回复消息',
    detail: '在收到旅行者咨询后超过72小时未回复，已连续发生2次。',
    date: '2026-01-15',
  },
  {
    id: 'CR-004',
    type: 'add',
    amount: 5,
    reason: '连续好评奖励',
    detail: '连续获得5个五星好评，系统自动奖励信誉分。',
    date: '2026-06-01',
  },
  {
    id: 'CR-005',
    type: 'add',
    amount: 3,
    reason: '实名认证完成',
    detail: '完成身份证和导游证实名认证，信誉基础分奖励。',
    date: '2025-12-10',
  },
];

const RULES = [
  {
    category: '扣分项',
    type: 'deduct',
    items: [
      { rule: '确认后取消订单', points: '-10分', note: '每次' },
      { rule: '旅行者有效投诉', points: '-8分', note: '每次核实后' },
      { rule: '超72小时未回复', points: '-5分', note: '每次' },
      { rule: '虚假信息认定', points: '-20分', note: '一次性' },
      { rule: '恶意刷单', points: '-30分', note: '一次性，可能封号' },
    ],
  },
  {
    category: '加分项',
    type: 'add',
    items: [
      { rule: '连续5个五星好评', points: '+5分', note: '每组' },
      { rule: '实名认证完成', points: '+3分', note: '一次性' },
      { rule: '完成100个订单', points: '+5分', note: '里程碑奖励' },
      { rule: '平台特约认证', points: '+10分', note: '申请后审核' },
      { rule: '无投诉连续30天', points: '+2分', note: '每月' },
    ],
  },
];

function getScoreColor(score: number): { stroke: string; bg: string; text: string; label: string } {
  if (score >= 80) return { stroke: '#22c55e', bg: 'bg-green-50', text: 'text-green-600', label: '信誉良好' };
  if (score >= 60) return { stroke: '#f97316', bg: 'bg-orange-50', text: 'text-orange-600', label: '需要改善' };
  return { stroke: '#ef4444', bg: 'bg-red-50', text: 'text-red-600', label: '信誉警告' };
}

function interpolateColor(score: number): string {
  // green(0,score≥80) → orange(score=60) → red(score≤40)
  if (score >= 80) {
    const t = (score - 80) / 20;
    const r = Math.round(34 + (0) * (1 - t));
    const g = Math.round(197 - (197 - 193) * (1 - t));
    return `rgb(34, ${Math.round(197 - (197 - 240) * (1 - t))}, ${Math.round(94 - 94 * (1 - t))})`;
  }
  if (score >= 60) {
    // orange to green: score 60 → 80
    const t = (score - 60) / 20; // 0=orange, 1=green
    const r = Math.round(249 - (249 - 34) * t);
    const g = Math.round(115 + (197 - 115) * t);
    const b = Math.round(22 + (94 - 22) * t);
    return `rgb(${r},${g},${b})`;
  }
  // red to orange: score 0 → 60
  const t = score / 60; // 0=red, 1=orange
  const r = Math.round(239 + (249 - 239) * t);
  const g = Math.round(68 + (115 - 68) * t);
  const b = Math.round(68 + (22 - 68) * t);
  return `rgb(${r},${g},${b})`;
}

function CreditRing({ score, animated }: { score: number; animated: boolean }) {
  const [displayScore, setDisplayScore] = useState(animated ? MAX_SCORE : score);
  const [animatedProgress, setAnimatedProgress] = useState(animated ? 1 : score / MAX_SCORE);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const DURATION = 2400; // ms

  const radius = 88;
  const stroke = 14;
  const circumference = 2 * Math.PI * radius;
  const gap = circumference * 0.25; // 25% gap at bottom

  useEffect(() => {
    if (!animated) return;

    const startProgress = 1;
    const endProgress = score / MAX_SCORE;

    const animate = (ts: number) => {
      if (!startTimeRef.current) startTimeRef.current = ts;
      const elapsed = ts - startTimeRef.current;
      const t = Math.min(elapsed / DURATION, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = startProgress + (endProgress - startProgress) * eased;
      setAnimatedProgress(current);
      setDisplayScore(Math.round(MAX_SCORE + (score - MAX_SCORE) * eased));
      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    const delay = setTimeout(() => {
      animRef.current = requestAnimationFrame(animate);
    }, 500);

    return () => {
      clearTimeout(delay);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [animated, score]);

  const arcLength = (circumference - gap) * animatedProgress;
  const color = interpolateColor(displayScore);
  const colorMeta = getScoreColor(score);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={220} height={220} className="-rotate-[112.5deg]">
          {/* Background track */}
          <circle
            cx={110}
            cy={110}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference - gap} ${gap}`}
          />
          {/* Colored progress arc */}
          <circle
            cx={110}
            cy={110}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
            style={{ transition: 'none', filter: `drop-shadow(0 0 6px ${color}55)` }}
          />
        </svg>

        {/* Center Score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-black" style={{ color }}>{displayScore}</span>
          <span className="text-sm text-gray-500 mt-1">/ {MAX_SCORE}</span>
          <span className={`text-xs font-semibold mt-2 px-3 py-1 rounded-full ${colorMeta.bg} ${colorMeta.text}`}>
            {colorMeta.label}
          </span>
        </div>
      </div>
    </div>
  );
}

function RulesSheet({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 310 }}
        className="bg-white w-full rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold">信誉分规则</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 leading-relaxed">
            信誉分满分为 <strong>100分</strong>，初始为 <strong>100分</strong>。分数影响你的搜索排名、接单资质及平台认证资格。
          </div>

          {RULES.map(section => (
            <div key={section.category}>
              <div className={`flex items-center gap-2 mb-3 ${section.type === 'deduct' ? 'text-red-600' : 'text-green-600'}`}>
                {section.type === 'deduct' ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                <h4 className="font-bold">{section.category}</h4>
              </div>
              <div className="space-y-2">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.rule}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>
                    </div>
                    <span className={`font-bold text-sm ${section.type === 'deduct' ? 'text-red-600' : 'text-green-600'}`}>
                      {item.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-orange-50 rounded-xl p-4 text-sm text-orange-700 leading-relaxed">
            当信誉分低于 <strong>60分</strong> 时，账号将进入限流状态，搜索排名下降。低于 <strong>40分</strong> 时，将暂停接单资质。
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CreditPage() {
  const navigate = useNavigate();
  const [showRules, setShowRules] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    setHasAnimated(true);
  }, []);

  const colorMeta = getScoreColor(CREDIT_SCORE);
  const totalDeducted = RECORDS.filter(r => r.type === 'deduct').reduce((s, r) => s + r.amount, 0);
  const totalAdded = RECORDS.filter(r => r.type === 'add').reduce((s, r) => s + r.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-30">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold flex-1">信誉记录</h1>
        <button
          onClick={() => setShowRules(true)}
          className="flex items-center gap-1.5 px-3 py-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
        >
          <BookOpen size={18} />
          <span className="text-sm font-medium">规则</span>
        </button>
      </div>

      {/* Ring Section */}
      <div className={`bg-white mx-4 mt-4 rounded-3xl shadow-sm px-6 pt-8 pb-6`}>
        <CreditRing score={CREDIT_SCORE} animated={hasAnimated} />

        {/* Score delta row */}
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-1.5 text-sm">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-gray-500">已扣</span>
            <span className="font-bold text-red-600">{totalDeducted}分</span>
          </div>
          <div className="w-px h-5 bg-gray-200" />
          <div className="flex items-center gap-1.5 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-500">已加</span>
            <span className="font-bold text-green-600">+{totalAdded}分</span>
          </div>
        </div>

        {/* Warning Banner */}
        {CREDIT_SCORE < 80 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8 }}
            className={`mt-5 rounded-xl p-3 text-sm flex items-start gap-2 ${
              CREDIT_SCORE < 60 ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
            }`}
          >
            <span className="text-base flex-shrink-0">{CREDIT_SCORE < 60 ? '🚨' : '⚠️'}</span>
            <p>
              {CREDIT_SCORE < 60
                ? '信誉分低于60分，账号已进入限流状态。请改善服务质量以提升分数。'
                : '信誉分有所下降，请注意服务质量，避免进一步扣分。'}
            </p>
          </motion.div>
        )}
      </div>

      {/* Records */}
      <div className="px-4 mt-4 mb-6">
        <h2 className="text-base font-bold text-gray-800 mb-3">扣分 / 加分记录</h2>
        <div className="space-y-3">
          {RECORDS.sort((a, b) => b.date.localeCompare(a.date)).map((record, idx) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * idx }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="flex items-start gap-4 p-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  record.type === 'deduct' ? 'bg-red-100' : 'bg-green-100'
                }`}>
                  {record.type === 'deduct'
                    ? <TrendingDown size={20} className="text-red-600" />
                    : <TrendingUp size={20} className="text-green-600" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-gray-900 text-sm">{record.reason}</p>
                    <span className={`text-base font-bold ${record.type === 'deduct' ? 'text-red-600' : 'text-green-600'}`}>
                      {record.amount > 0 ? '+' : ''}{record.amount}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{record.date}</p>
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{record.detail}</p>
                  {record.orderId && (
                    <p className="text-xs text-blue-500 font-mono mt-1">{record.orderId}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Rules Sheet */}
      <AnimatePresence>
        {showRules && <RulesSheet onClose={() => setShowRules(false)} />}
      </AnimatePresence>
    </div>
  );
}
