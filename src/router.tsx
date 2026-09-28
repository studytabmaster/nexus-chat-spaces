export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 1. 一度取得したデータは5分間「新鮮」とみなし、再取得しない
      staleTime: 5 * 60 * 1000,
      // 2. メモリ上に15分間キャッシュを保持
      gcTime: 15 * 60 * 1000,
      // 3. ブラウザのタブを切り替えて戻ってきた時の自動再取得をオフ（これが一番クレジットを食います）
      refetchOnWindowFocus: false,
      // 4. 通信切断後の復旧時のみ再取得
      refetchOnReconnect: true,
      // 5. 失敗時の再試行は1回のみ（サーバー障害時の連続リクエスト防止）
      retry: 1,
    },
  },
});
