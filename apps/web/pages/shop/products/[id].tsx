import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { Alert, Button, Chip, Skeleton, Stack } from "@mui/material";
import type { CatalogProduct, ShopSearch } from "@retail-media/shared";
import { money, shopProduct, shopSearch, shopEvent, shopToken } from "@/lib/shop";
import { useShop } from "@/components/shop/ShopProvider";
import { ProductCard } from "@/components/shop/ProductCard";
import { SponsoredPlacement } from "@/components/shop/SponsoredPlacement";
import styles from "@/components/shop/shop.module.css";

export default function ProductPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : undefined;
  const searchId = typeof router.query.search === "string" ? router.query.search : undefined;
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [related, setRelated] = useState<ShopSearch | null>(null);
  const [error, setError] = useState("");
  const { add } = useShop();
  useEffect(() => {
    let disposed = false;
    setProduct(null); setRelated(null); setError("");
    if (id) shopProduct(id).then((p) => {
      if (disposed) return;
      setProduct(p);
      void shopEvent({ type: "view", objectID: p.objectID }).catch(() => {});
      void shopSearch({ category: p.categories[p.categories.length - 1], userToken: shopToken(), preview: "1" }).then((r) => { if (!disposed) setRelated(r); }).catch(() => {});
    }).catch(() => { if (!disposed) setError("This product couldn’t be found. Explore the collection to find something else."); });
    return () => { disposed = true; };
  }, [id]);
  if (error) return <Alert severity="warning" action={<Button href="/shop">Explore</Button>}>{error}</Alert>;
  if (!product) return <div className={styles.detail}><Skeleton variant="rounded" height={440} /><Stack gap={2}><Skeleton height={80} /><Skeleton height={40} /><Skeleton height={200} /></Stack></div>;
  return <>
    <Head><title>{product.name} — Northstar</title></Head>
    <div className={styles.breadcrumbs}><Link href="/shop">The collection</Link><span>/</span><Link href={{ pathname: "/shop", query: { category: product.categories[0] } }}>{product.categories[0]}</Link><span>/</span><span>{product.brand}</span></div>
    <section className={styles.detail}>
      <div className={styles.detailImage}>{product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : "Image unavailable"}</div>
      <div className={styles.detailCopy}><div className={styles.heroEyebrow}>{product.brand}</div><h1>{product.name}</h1>
        {product.rating !== undefined && <div role="img" aria-label={`Sample rating ${product.rating} out of 5`} className={styles.cardRating}><span>{"★".repeat(Math.round(product.rating))}{"☆".repeat(5 - Math.round(product.rating))}</span>{product.rating.toFixed(1)} / 5 · sample catalog rating</div>}
        <div className={styles.detailPrice}>{money(product.price)}</div><small className={styles.filterNote}>Historical sample price · USD</small><p>{product.description}</p>
        <Button variant="contained" size="large" fullWidth sx={{ py: 1.8, mt: 2 }} disabled={product.price === undefined} onClick={() => add(product, searchId)}>Add to bag <span style={{ marginLeft: "auto" }}>+</span></Button>
        <Button component="a" href={product.destinationUrl} target="_blank" rel="noopener noreferrer" fullWidth sx={{ mt: 1 }}>View original retailer listing ↗</Button>
        <div className={styles.detailMeta}>SKU {product.sku}<br />Sample collection · availability isn’t verified<br /><Stack direction="row" gap={0.5} flexWrap="wrap" mt={1}>{product.categories.map((c) => <Chip key={c} component="a" clickable href={`/shop?category=${encodeURIComponent(c)}`} label={c} size="small" variant="outlined" />)}</Stack></div>
      </div>
    </section>
    <SponsoredPlacement category={product.categories[0]} placement="pdp" />
    {!!related?.products.filter((p) => p.objectID !== product.objectID).length && <section><h2 className={styles.sectionTitle}>A few more good finds.</h2><div className={styles.productGrid}>{related.products.filter((p) => p.objectID !== product.objectID).slice(0, 4).map((p) => <ProductCard key={p.objectID} product={p} />)}</div></section>}
  </>;
}
