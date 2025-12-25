export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          管理者ダッシュボード
        </h1>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="p-6 border border-border rounded-lg bg-card">
            <h2 className="text-xl font-semibold mb-4">通報一覧</h2>
            <p className="text-muted-foreground">通報がありません</p>
          </div>
          <div className="p-6 border border-border rounded-lg bg-card">
            <h2 className="text-xl font-semibold mb-4">BAN一覧</h2>
            <p className="text-muted-foreground">BANされたユーザーはいません</p>
          </div>
        </div>
      </div>
    </div>
  );
}
