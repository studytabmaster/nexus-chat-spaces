import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // 1日3,000人規模でもDB問い合わせ・クラウドクレジットを最小限に抑える設定
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // 1. 一度取得したデータは5分間キャッシュ（無駄なDBクエリを激減）
        staleTime: 5 * 60 * 1000,
        // 2. メモリ上に15分間保持
        gcTime: 15 * 60 * 1000,
        // 3. ブラウザのタブを切り替えて戻ってきた時の自動再取得をOFF（これが最もクレジットを消費します）
        refetchOnWindowFocus: false,
        // 4. ネットワーク切断からの復旧時のみ再取得
        refetchOnReconnect: true,
        // 5. 失敗時のリトライは1回まで
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
