import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const units = [
  { slot: 2, id: "38e6e9357a770ec2e197d038095b5345" },
  { slot: 3, id: "0923f6608b4b7f331b76b961738184d8" },
  { slot: 4, id: "e32f13c8e16dce725d86f39b7bb236ee" },
] as const;

function AdUnit({ slot, id }: (typeof units)[number]) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Keep third-party scripts away from the app's session and DOM.
  const document = `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="strict-origin-when-cross-origin"><style>html,body{margin:0;width:300px;height:250px;overflow:hidden}body{display:flex;align-items:center;justify-content:center}</style></head><body><script src="https://adm.shinobi.jp/s/${id}"></script></body></html>`;
  return (
    <div ref={ref} className="h-[250px] w-[300px] shrink-0 overflow-hidden bg-sidebar" data-ad-slot={slot}>
      {visible && <iframe
        title={`広告 ${slot}`}
        srcDoc={document}
        width="300"
        height="250"
        className="block border-0"
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        allow="autoplay 'none'; camera 'none'; microphone 'none'; geolocation 'none'"
        referrerPolicy="strict-origin-when-cross-origin"
      />}
    </div>
  );
}

export function SidebarAds() {
  const ref = useRef<HTMLElement>(null);
  const [eligible, setEligible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try { setDismissed(sessionStorage.getItem("nexa:sidebar-ads-hidden") === "1"); } catch { /* Storage may be disabled. */ }
    const element = ref.current;
    if (!element) return;
    const media = window.matchMedia("(min-width: 1536px) and (min-height: 800px)");
    const update = () => setEligible(media.matches && element.clientWidth >= 300);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    media.addEventListener("change", update);
    update();
    return () => { observer.disconnect(); media.removeEventListener("change", update); };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem("nexa:sidebar-ads-hidden", "1"); } catch { /* Dismiss still works without storage. */ }
  };

  return (
    <section ref={ref} aria-label="広告" className="w-full min-w-0">
      {eligible && !dismissed && <div className="mt-6 border-t pt-3">
        <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center">
          <span className="min-w-0 text-[11px] text-muted-foreground">広告</span>
          <Button variant="ghost" size="icon" className="size-6 shrink-0" aria-label="広告を非表示" title="広告を非表示" onClick={dismiss}>
            <X className="size-3.5" />
          </Button>
        </div>
        <div className="flex flex-col items-center gap-4">
          {units.map((unit) => <AdUnit key={unit.id} {...unit} />)}
        </div>
      </div>}
    </section>
  );
}