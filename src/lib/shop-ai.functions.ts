import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SHOP_KINDS } from "@/lib/shop";

const Input = z.object({
  prompt: z.string().min(2).max(400),
  kind: z.string().min(1),
  withImage: z.boolean(),
});

export type AiShopDraft = {
  name: string;
  description: string;
  payload: string;
  price: number;
  season: string;
  imagePath: string | null;
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

/** 運営スタッフだけが使えるAI商品案の作成。生成物は下書き扱いで自動公開しない。 */
export const generateShopItemDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<AiShopDraft> => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("運営スタッフのみが利用できます");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI機能の設定が見つかりません");

    const kindLabel = SHOP_KINDS.find((k) => k.value === data.kind)?.label ?? data.kind;

    const textRes = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "あなたはコミュニティアプリの公式ショップ担当です。日本語で商品案をJSONで返します。" +
              'JSON形式: {"name":string,"description":string,"payload":string,"price":number,"season":string}。' +
              "payloadは種類に応じた見た目の値：フレーム/背景/テーマはCSSの色またはlinear-gradient、称号は短い日本語、絵文字・リアクションは絵文字1文字、その他は英小文字のキー。" +
              "priceは100〜3000の整数。seasonは季節やイベント名（不要なら空文字）。",
          },
          { role: "user", content: `種類: ${kindLabel}\nリクエスト: ${data.prompt}` },
        ],
      }),
    });
    if (!textRes.ok) {
      const body = await textRes.text();
      if (textRes.status === 402) throw new Error("AIの利用枠が不足しています。クレジットを追加してください。");
      if (textRes.status === 429) throw new Error("AIが混み合っています。少し待ってからお試しください。");
      throw new Error(`AIの生成に失敗しました (${textRes.status}) ${body.slice(0, 200)}`);
    }
    const textJson = (await textRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = textJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]) as Record<string, unknown>;
    }

    const price = Number(parsed["price"]);
    const draft: AiShopDraft = {
      name: String(parsed["name"] ?? "").slice(0, 60) || "新しいアイテム",
      description: String(parsed["description"] ?? "").slice(0, 300),
      payload: String(parsed["payload"] ?? "").slice(0, 200),
      price: Number.isFinite(price) ? Math.min(3000, Math.max(100, Math.round(price))) : 500,
      season: String(parsed["season"] ?? "").slice(0, 40),
      imagePath: null,
    };

    if (data.withImage) {
      const imgRes = await fetch(`${GATEWAY}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image",
          modalities: ["image", "text"],
          messages: [
            {
              role: "user",
              content: `コミュニティアプリの公式ショップ用の商品画像。${kindLabel}。${data.prompt}。${draft.name}。文字は入れない、正方形に近い構図、シンプルで高品質なイラスト。`,
            },
          ],
        }),
      });
      if (imgRes.ok) {
        const imgJson = (await imgRes.json()) as {
          choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
        };
        const dataUrl = imgJson.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (dataUrl?.startsWith("data:")) {
          const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
          const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const path = `shop/${crypto.randomUUID()}.png`;
          const { error } = await supabaseAdmin.storage
            .from("uploads")
            .upload(path, bytes, { contentType: "image/png", upsert: false });
          if (!error) draft.imagePath = path;
        }
      }
    }

    return draft;
  });
