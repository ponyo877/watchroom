import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  X,
  Ban,
  Eye,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { Report } from '@/hooks/useAdmin';

interface ReportListProps {
  reports: Report[];
  onUpdateStatus: (reportId: string, status: Report['status']) => Promise<boolean>;
  onBanUser: (userId: string, reason: string) => Promise<boolean>;
}

const STATUS_LABELS: Record<Report['status'], { label: string; color: string }> = {
  pending: { label: '未対応', color: 'bg-yellow-100 text-yellow-800' },
  reviewed: { label: '確認済み', color: 'bg-blue-100 text-blue-800' },
  actioned: { label: '対応済み', color: 'bg-green-100 text-green-800' },
  dismissed: { label: '却下', color: 'bg-gray-100 text-gray-800' },
};

export default function ReportList({
  reports,
  onUpdateStatus,
  onBanUser,
}: ReportListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (
    reportId: string,
    action: 'review' | 'action' | 'dismiss' | 'ban',
    report?: Report
  ) => {
    setActionLoading(reportId);

    try {
      if (action === 'review') {
        await onUpdateStatus(reportId, 'reviewed');
      } else if (action === 'action') {
        await onUpdateStatus(reportId, 'actioned');
      } else if (action === 'dismiss') {
        await onUpdateStatus(reportId, 'dismissed');
      } else if (action === 'ban' && report) {
        const success = await onBanUser(report.targetId, report.reason);
        if (success) {
          await onUpdateStatus(reportId, 'actioned');
        }
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (reports.length === 0) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">通報はありません</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {reports.map((report) => (
        <div key={report.id} className="p-4">
          <div
            className="flex items-start justify-between cursor-pointer"
            onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    STATUS_LABELS[report.status].color
                  }`}
                >
                  {STATUS_LABELS[report.status].label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(new Date(report.createdAt))}
                </span>
              </div>
              <p className="text-sm font-medium">
                {report.reporterName} が {report.targetName} を通報
              </p>
              <p className="text-sm text-muted-foreground truncate max-w-md">
                理由: {report.reason}
              </p>
            </div>
            {expandedId === report.id ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          {expandedId === report.id && (
            <div className="mt-4 pl-4 border-l-2 border-border">
              <div className="mb-4">
                <h4 className="text-xs font-medium text-muted-foreground mb-1">
                  通報されたメッセージ
                </h4>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">{report.messageText}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-muted-foreground">通報者:</span>{' '}
                  {report.reporterName}
                </div>
                <div>
                  <span className="text-muted-foreground">対象者:</span>{' '}
                  {report.targetName}
                </div>
                <div>
                  <span className="text-muted-foreground">ルームID:</span>{' '}
                  <code className="text-xs bg-muted px-1 rounded">
                    {report.roomId.slice(0, 8)}...
                  </code>
                </div>
              </div>

              {report.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(report.id, 'review')}
                    disabled={actionLoading === report.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50"
                  >
                    <Eye className="h-4 w-4" />
                    確認済みにする
                  </button>
                  <button
                    onClick={() => handleAction(report.id, 'dismiss')}
                    disabled={actionLoading === report.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    却下
                  </button>
                </div>
              )}

              {report.status === 'reviewed' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(report.id, 'ban', report)}
                    disabled={actionLoading === report.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-destructive text-white rounded-md hover:opacity-90 disabled:opacity-50"
                  >
                    <Ban className="h-4 w-4" />
                    BANする
                  </button>
                  <button
                    onClick={() => handleAction(report.id, 'action')}
                    disabled={actionLoading === report.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    対応済みにする
                  </button>
                  <button
                    onClick={() => handleAction(report.id, 'dismiss')}
                    disabled={actionLoading === report.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    却下
                  </button>
                </div>
              )}

              {(report.status === 'actioned' || report.status === 'dismissed') && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  この通報は既に処理されています
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
