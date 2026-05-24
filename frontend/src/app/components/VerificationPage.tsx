import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileUp, ShieldCheck, AlertCircle } from 'lucide-react';
import { apiClient, ApiError } from '../api/client';
import { useApp } from '../App';
import type { GuideVerification } from '../api/types';

export function VerificationPage() {
  const navigate = useNavigate();
  const { data, refreshAppData } = useApp();
  const guideProfile = data?.profiles?.guide_profiles?.[0] ?? null;
  const [verification, setVerification] = useState<GuideVerification | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!guideProfile) return;
    apiClient.guideVerification(guideProfile.id)
      .then(setVerification)
      .catch(() => setVerification(null));
  }, [guideProfile?.id]);

  const submitVerification = async () => {
    if (!guideProfile) return;
    try {
      const submitted = await apiClient.submitGuideVerification(guideProfile.id);
      setVerification(submitted);
      setMessage('认证已提交，等待 reviewer 审核。');
      await refreshAppData();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : '认证提交失败');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white px-4 py-4 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-30">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold flex-1">导游认证</h1>
      </div>

      <div className="max-w-screen-md mx-auto p-4 space-y-4">
        {!guideProfile ? (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-600 flex-shrink-0" size={22} />
              <div>
                <p className="font-semibold">当前账号还没有导游资料</p>
                <p className="text-sm text-gray-600 mt-1">请先创建导游身份资料，再提交认证。</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="text-blue-600" size={24} />
                <div>
                  <p className="font-semibold">认证状态</p>
                  <p className="text-sm text-gray-500">导游资料 ID: {guideProfile.id.slice(0, 8)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500">当前徽章</p>
                  <p className="font-medium">{verification?.badge_status ?? guideProfile.verification_status}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500">提交时间</p>
                  <p className="font-medium">{verification?.submitted_at ?? '未提交'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500">身份审核</p>
                  <p className="font-medium">{verification?.identity_status ?? 'not_started'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-gray-500">服务地区审核</p>
                  <p className="font-medium">{verification?.service_region_status ?? 'not_started'}</p>
                </div>
              </div>
              {verification?.failure_reason && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {verification.failure_reason}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <FileUp className="text-gray-500 flex-shrink-0" size={22} />
                <div>
                  <p className="font-semibold">认证材料上传</p>
                  <p className="text-sm text-gray-600 mt-1">
                    M10 暂不做材料上传。后续需要补齐对象存储、文件权限、MIME 校验和审核访问规则。
                  </p>
                </div>
              </div>
              <button
                onClick={submitVerification}
                className="w-full rounded-lg bg-blue-600 py-3 text-white font-medium hover:bg-blue-700"
              >
                提交认证
              </button>
              {message && (
                <p className="mt-3 text-sm text-gray-600">{message}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
