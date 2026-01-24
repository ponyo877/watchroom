import { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { t } from '@lingui/macro';
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

const getReportReasons = () => [
  { value: 'spam', label: t`Spam or abuse` },
  { value: 'harassment', label: t`Harassment or defamation` },
  { value: 'inappropriate', label: t`Inappropriate content` },
  { value: 'hate', label: t`Hate speech` },
  { value: 'other', label: t`Other` },
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
        setError(t`Failed to report`);
      }
    } catch {
      setError(t`An error occurred`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader icon={<AlertTriangle className="h-5 w-5 text-destructive" />}>
          <DialogTitle>{t`Report Message`}</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="text-center py-8 animate-scale-in">
            <div className="w-16 h-16 mx-auto mb-4 bg-success/20 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-success" />
            </div>
            <p className="text-lg font-medium">{t`Report received`}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t`Thank you for your cooperation`}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto space-y-4 -mx-6 px-6">
              {/* Reported message preview */}
              {message && (
                <div className="p-3 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t`Message being reported`}
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
                  {t`Report reason`} <span className="text-destructive">*</span>
                </label>
                <div className="space-y-2">
                  {getReportReasons().map((reason) => (
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
                  {t`Details (optional)`}
                </label>
                <textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder={t`Enter additional information if available`}
                  className="w-full px-4 py-2.5 border border-input rounded-xl bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 hover:border-primary/30 transition-all duration-200 text-sm resize-none"
                  rows={3}
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive pt-2">{error}</p>}

            <DialogFooter className="flex-shrink-0 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-border rounded-xl hover:bg-accent/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {t`Cancel`}
              </button>
              <button
                type="submit"
                disabled={isLoading || !selectedReason}
                className="flex-1 px-4 py-2.5 bg-destructive text-white rounded-xl shadow-lg shadow-destructive/25 hover:shadow-xl hover:shadow-destructive/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:scale-100 transition-all duration-200"
              >
                {isLoading ? t`Submitting...` : t`Report`}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
