import { useState, useCallback } from 'react';
import { Shield, AlertTriangle, Ban, RefreshCw, LogOut } from 'lucide-react';
import { t } from '@lingui/macro';
import { useAdmin } from '@/hooks/useAdmin';
import { useLanguage } from '@/i18n/useLanguage';
import ReportList from '@/components/admin/ReportList';
import BanList from '@/components/admin/BanList';

export default function AdminPage() {
  const { navigateHome } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
  } = useAdmin({
    username: isAuthenticated ? username : '',
    password: isAuthenticated ? password : '',
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
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
              <h1 className="text-xl font-bold">{t`Admin Login`}</h1>
              <p className="text-sm text-muted-foreground">
                {t`Enter administrator credentials`}
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t`Username`}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t`Enter username`}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {t`Password`}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t`Enter password`}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              />
            </div>

            <button
              type="submit"
              disabled={!username.trim() || !password.trim()}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {t`Login`}
            </button>
          </form>

          <button
            onClick={() => navigateHome()}
            className="w-full mt-4 px-4 py-2 border border-border rounded-md hover:bg-accent"
          >
            {t`Back to home`}
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
            <h1 className="text-xl font-bold">{t`Admin Dashboard`}</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 hover:bg-accent rounded-md disabled:opacity-50"
              title={t`Refresh`}
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
              <span className="text-sm">{t`Logout`}</span>
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
            {t`Reports`}
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
            {t`Ban List`}
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
