import { useEffect, useState } from "react";
import Link from "next/link";
import { serveAd, recordClick, type ServedAd } from "@/lib/api";
import { shopToken } from "@/lib/shop";
import styles from "./shop.module.css";

// React's development Strict Mode remounts effects; share an in-flight request
// so it doesn't consume two frequency-cap slots for one placement.
const pendingPlacements = new Map<string, Promise<ServedAd | null>>();

export function SponsoredPlacement({ category, placement, keyword }: { category?: string; placement: "search" | "category" | "pdp"; keyword?: string }) {
  const [ad, setAd] = useState<ServedAd | null>(null);
  useEffect(() => {
    let disposed = false;
    setAd(null);
    if (category) {
      const userId = shopToken();
      const key = JSON.stringify([category, placement, keyword, userId]);
      let request = pendingPlacements.get(key);
      if (!request) {
        request = serveAd({ category, placement, keyword, userId });
        pendingPlacements.set(key, request);
        void request.finally(() => pendingPlacements.delete(key)).catch(() => {});
      }
      void request.then((a) => { if (!disposed) setAd(a); }).catch(() => {});
    }
    return () => { disposed = true; };
  }, [category, placement, keyword]);
  if (!ad) return null;
  return <aside className={styles.sponsored} aria-label="Sponsored product">
    {ad.imageUrl && <img src={ad.imageUrl} alt="" />}<div><small>SPONSORED</small><h2>{ad.headline}</h2><p>{ad.bodyCopy}</p></div>
    <Link href={`/shop/products/${encodeURIComponent(ad.productSku)}`} onClick={() => { void recordClick({ campaignId: ad.campaignId, userId: shopToken(), placement }).catch(() => {}); }}>Discover more →</Link>
  </aside>;
}
