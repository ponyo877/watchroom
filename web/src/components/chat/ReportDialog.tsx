import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { ChatMessageItem } from '@/types/room';

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  message: ChatMessageItem | null;
  roomId: string;
  onSubmit: (reason: string) => Promise<boolean>;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'スパム・迷惑行為' },
  { value: 'harassment', label: '嫌がらせ・誹謗中傷' },
  { value: 'inappropriate', label: '不適切なコンテンツ' },
  { value: 'hate', label: 'ヘイトスピーチ' },
  { value: 'other', label: 'その他' },
];

export default function ReportDialog({
  open,
  onClose,
  message,
  roomId,
  onSubmit,
}: ReportDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason || !message) return;

    setIsLoading(true);
    setError(null);

    try {
      const reason = additionalInfo
        ? `${selectedReason}: ${additionalInfo}`
        : selectedReason;

      const result = await onSubmit(reason);
      if (result) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setSelectedReason('');
          setAdditionalInfo('');
        }, 2000);
      } else {
        setError('通報に失敗しました');
      }
    } catch {
      setError('エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-destructive/10 rounded-full">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <h2 className="font-semibold">メッセージを通報</h2>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-lg font-medium">通報を受け付けました</p>
            <p className="text-sm text-muted-foreground mt-1">
              ご協力ありがとうございます
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Reported message preview */}
            {message && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">
                  通報対象メッセージ
                </p>
                <p className="text-sm">
                  <span className="font-medium">{message.senderName}:</span>{' '}
                  {message.text}
                </p>
              </div>
            )}

            {/* Report reason */}
            <div>
              <label className="block text-sm font-medium mb-2">
                通報理由 <span className="text-destructive">*</span>
              </label>
              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason.value}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedReason === reason.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={reason.value}
                      checked={selectedReason === reason.value}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="sr-only"
                    />
                    <span className="text-sm">{reason.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Additional info */}
            <div>
              <label className="block text-sm font-medium mb-1">
                詳細（任意）
              </label>
              <textarea
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="追加の情報があれば入力してください"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm resize-none"
                rows={3}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isLoading || !selectedReason}
                className="flex-1 px-4 py-2 bg-destructive text-white rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? '送信中...' : '通報する'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
