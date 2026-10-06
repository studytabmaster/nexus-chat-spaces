import { useEffect, useState } from "react";

/** 画面が表示されているかどうか。裏に回ったらリアルタイム接続を切って通信を節約する */
export function usePageVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}
