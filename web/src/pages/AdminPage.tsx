import { useState, useCallback } from 'react';
import { Shield, AlertTriangle, Ban, RefreshCw, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import ReportList from '@/components/admin/ReportList';
import BanList from '@/components/admin/BanList';

export default function AdminPage() {
  const navigate = useNavigate();
  const [adminSecret, setAdminSecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'reports' | 'bans'>('reports');

  const {
    reports,
    bans,
    isLoading,
    error,
    fetchReports,
    fetchBans,
    updateReportStatus,
    banUser,
    unbanUser,
  } = useAdmin({ adminSecret: isAuthenticated ? adminSecret : '' });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminSecret.trim()) {
      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminSecret('');
  };

  const handleRefresh = useCallback(() => {
    fetchReports();
    fetchBans();
  }, [fetchReports, fetchBans]);

  const handleBanFromReport = useCallback(
    async (userId: string, reason: string): Promise<boolean> => {
      return banUser(userId, reason, { isGlobal: true });
    },
    [banUser]
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md p-6 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">管理者ログイン</h1>
              <p className="text-sm text-muted-foreground">
                管理者シークレットを入力してください
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                管理者シークレット
              </label>
              <input
                type="password"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                placeholder="シークレットを入力"
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!adminSecret.trim()}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
            >
              ログイン
            </button>
          </form>

          <button
            onClick={() => navigate('/')}
            className="w-full mt-4 px-4 py-2 border border-border rounded-md hover:bg-accent"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold">管理者ダッシュボード</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 hover:bg-accent rounded-md disabled:opacity-50"
              title="更新"
            >
              <RefreshCw
                className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 hover:bg-accent rounded-md"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">ログアウト</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'reports'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-accent'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            通報一覧
            {reports.filter((r) => r.status === 'pending').length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-destructive text-white rounded-full">
                {reports.filter((r) => r.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('bans')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'bans'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-accent'
            }`}
          >
            <Ban className="h-4 w-4" />
            BAN一覧
            <span className="px-2 py-0.5 text-xs bg-muted-foreground/20 rounded-full">
              {bans.length}
            </span>
          </button>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {activeTab === 'reports' ? (
            <ReportList
              reports={reports}
              onUpdateStatus={updateReportStatus}
              onBanUser={handleBanFromReport}
            />
          ) : (
            <BanList bans={bans} onUnban={unbanUser} onBanUser={banUser} />
          )}
        </div>
      </main>
    </div>
  );
}
