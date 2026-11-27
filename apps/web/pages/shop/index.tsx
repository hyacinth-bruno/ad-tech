import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Alert, Button, Pagination, Skeleton } from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import type { ShopSearch } from "@retail-media/shared";
import { shopSearch, shopToken } from "@/lib/shop";
import { ProductCard } from "@/components/shop/ProductCard";
import { SponsoredPlacement } from "@/components/shop/SponsoredPlacement";
import styles from "@/components/shop/shop.module.css";

const text = (v: string | string[] | undefined) => typeof v === "string" ? v : "";
export default function StorefrontPage() {
  const router = useRouter();
  const q = text(router.query.q), category = text(router.query.category), brand = text(router.query.brand);
  const minPrice = text(router.query.minPrice), maxPrice = text(router.query.maxPrice);
  const page = text(router.query.page) || "1";
  const [data, setData] = useState<ShopSearch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [range, setRange] = useState({ min: "", max: "" });
  useEffect(() => { setRange({ min: minPrice, max: maxPrice }); }, [minPrice, maxPrice]);
  useEffect(() => {
    if (!router.isReady) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    shopSearch({ q, category: category || undefined, brand: brand || undefined, minPrice: minPrice || undefined, maxPrice: maxPrice || undefined, page, userToken: shopToken() }, controller.signal)
      .then((r) => { if (!controller.signal.aborted) setData(r); })
      .catch(() => { if (!controller.signal.aborted) setError("We couldn’t load the collection. Check your filters or try again."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [q, category, brand, minPrice, maxPrice, page, router.isReady, retry]);
  function filter(patch: Record<string, string | undefined>) {
    const next: Record<string, string> = { ...(q ? { q } : {}), ...(category ? { category } : {}), ...(brand ? { brand } : {}), ...(minPrice ? { minPrice } : {}), ...(maxPrice ? { maxPrice } : {}) };
    Object.entries(patch).forEach(([k, v]) => { if (v) next[k] = v; else delete next[k]; });
    void router.push({ pathname: "/shop", query: next }, undefined, { shallow: true });
  }
  const categories = Object.entries(data?.facets.categories ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const brands = Object.entries(data?.facets.brand ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const isDiscovery = !q && !category && !brand && !minPrice && !maxPrice;
  const CollectionHeading = isDiscovery ? "h2" : "h1";
  return <>
    <div className={styles.breadcrumbs}><Link href="/shop">Home</Link><span>/</span><span>{q ? "Search" : category || "The collection"}</span></div>
    {isDiscovery && <section className={styles.hero}>
      <div className={styles.heroCopy}><div className={styles.heroEyebrow}>CURATED BY CURIOSITY. FOUND BY YOU.</div><h1>Everyday,<br />a little upgraded.</h1><p>For the way you work, play, listen and live.<br />Discover the tech that feels like you.</p><Link className={styles.heroLink} href={{ pathname: "/shop", query: { q: "headphones" } }}>Find your sound <span>↗</span></Link></div>
      <div className={styles.heroArt}><div className={styles.orbit} /><img src="https://cdn-demo.algolia.com/bestbuy/9089058_sb.jpg" alt="Sony earbud headphones from the sample collection" /><span className={styles.floatingTag}>A little more you. ↗</span></div>
    </section>}
    <div className={styles.collectionHeader}><div><CollectionHeading>{q ? `Results for “${q}”` : category || "The discovery edit"}</CollectionHeading><p role="status" aria-live="polite">{loading ? "Finding your next favorite…" : `${(data?.total ?? 0).toLocaleString()} products to explore`}{brand && ` · ${brand}`}</p></div><div className={styles.searchMeta}><strong>✦ {data?.engine === "mongodb" ? "Catalog search" : "Search by Algolia"}</strong><br />{data ? `${data.processingTimeMS} ms · ranked by relevance` : "Finding the good things"}</div><Button className={styles.mobileFilter} startIcon={<TuneIcon />} aria-expanded={mobileFilters} aria-controls="product-filters" onClick={() => setMobileFilters(!mobileFilters)}>Filters</Button></div>
    <div className={styles.catalog}>
      <aside id="product-filters" className={`${styles.filters} ${mobileFilters ? styles.filtersOpen : ""}`} aria-label="Filter products">
        <div className={styles.filterHeading}><h2 style={{ fontSize: 14, margin: 0 }}>Refine your finds</h2><button onClick={() => { void router.push({ pathname: "/shop", query: q ? { q } : {} }); }}>Reset all</button></div>
        <section className={styles.filterGroup}><h3>Category</h3>{categories.map(([name, count]) => <button key={name} className={`${styles.facet} ${category === name ? styles.facetActive : ""}`} onClick={() => filter({ category: category === name ? undefined : name })} aria-pressed={category === name}><span className={styles.check}>{category === name ? "✓" : ""}</span><span className={styles.facetName}>{name}</span><span>{count.toLocaleString()}</span></button>)}{!categories.length && <span className={styles.filterNote}>Categories appear with your results.</span>}</section>
        <section className={styles.filterGroup}><h3>Brand</h3>{brands.map(([name, count]) => <button key={name} className={`${styles.facet} ${brand === name ? styles.facetActive : ""}`} onClick={() => filter({ brand: brand === name ? undefined : name })} aria-pressed={brand === name}><span className={styles.check}>{brand === name ? "✓" : ""}</span><span className={styles.facetName}>{name}</span><span>{count.toLocaleString()}</span></button>)}</section>
        <form className={styles.filterGroup} onSubmit={(e) => { e.preventDefault(); filter({ minPrice: range.min || undefined, maxPrice: range.max || undefined }); }}><h3>Sample price (USD)</h3><div className={styles.priceInputs}><input type="number" min="0" step="0.01" aria-label="Minimum price" placeholder="$ Min" value={range.min} onChange={(e) => setRange({ ...range, min: e.target.value })} /><input type="number" min="0" step="0.01" aria-label="Maximum price" placeholder="$ Max" value={range.max} onChange={(e) => setRange({ ...range, max: e.target.value })} /></div><button className={styles.priceApply}>Apply price range</button></form>
        <p className={styles.filterNote}>A sample collection for exploring search and discovery. Prices and availability are historical.</p>
      </aside>
      <div>
        {(category || brand || minPrice || maxPrice) && <div className={styles.selectedFilters}>{category && <button onClick={() => filter({ category: undefined })}>{category} ×</button>}{brand && <button onClick={() => filter({ brand: undefined })}>{brand} ×</button>}{(minPrice || maxPrice) && <button onClick={() => filter({ minPrice: undefined, maxPrice: undefined })}>${minPrice || "0"} – ${maxPrice || "Any"} ×</button>}</div>}
        {error && <Alert severity="warning" action={<Button onClick={() => setRetry((n) => n + 1)}>Try again</Button>} sx={{ mb: 3 }}>{error}</Alert>}
        <div className={styles.productGrid} aria-busy={loading}>
          {!loading && !error && data && <SponsoredPlacement category={category || data.products[0]?.categories[0]} placement={q ? "search" : "category"} keyword={q || undefined} />}
          {loading ? Array.from({ length: 9 }, (_, i) => <div key={i}><Skeleton variant="rounded" height={230} /><Skeleton width="40%" sx={{ mt: 2 }} /><Skeleton /><Skeleton width="65%" /></div>) : !error && data?.products.map((product, i) => <ProductCard key={product.objectID} product={product} searchId={data.searchId} position={(data.page - 1) * data.pageSize + i + 1} />)}
          {!loading && !error && data?.total === 0 && <div className={styles.empty}><span className={styles.largeStar}>✳</span><h2>A little too specific?</h2><p>We couldn’t find a match. Try fewer words or remove a filter.</p><Button onClick={() => { void router.push("/shop"); }}>Explore all products →</Button></div>}
        </div>
        {!loading && !error && data && data.pages > 1 && <div className={styles.pagination}><Pagination count={data.pages} page={data.page} onChange={(_, value) => filter({ page: String(value) })} size="small" shape="rounded" /></div>}
      </div>
    </div>
  </>;
}
