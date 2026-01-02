import { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import type { ChatMessageItem } from '@/types/room';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  message: ChatMessageItem | null;
  roomId?: string;
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader icon={<AlertTriangle className="h-5 w-5 text-destructive" />}>
          <DialogTitle>メッセージを通報</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="text-center py-8 animate-scale-in">
            <div className="w-16 h-16 mx-auto mb-4 bg-success/20 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-success" />
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
              <div className="p-3 bg-muted/50 rounded-xl">
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
                    className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                      selectedReason === reason.value
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:bg-accent/50 hover:border-primary/30'
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
                className="w-full px-4 py-2.5 border border-input rounded-xl bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 hover:border-primary/30 transition-all duration-200 text-sm resize-none"
                rows={3}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-border rounded-xl hover:bg-accent/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isLoading || !selectedReason}
                className="flex-1 px-4 py-2.5 bg-destructive text-white rounded-xl shadow-lg shadow-destructive/25 hover:shadow-xl hover:shadow-destructive/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:scale-100 transition-all duration-200"
              >
                {isLoading ? '送信中...' : '通報する'}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
