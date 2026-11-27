import Link from "next/link";
import { useState } from "react";
import type { CatalogProduct } from "@retail-media/shared";
import { money, shopEvent } from "@/lib/shop";
import { useShop } from "./ShopProvider";
import styles from "./shop.module.css";

export function ProductCard({ product, searchId, position }: { product: CatalogProduct; searchId?: string; position?: number }) {
  const { add } = useShop();
  const [imageFailed, setImageFailed] = useState(false);
  const href = { pathname: `/shop/products/${product.objectID}`, query: searchId ? { search: searchId } : {} };
  function clicked() { void shopEvent({ type: "click", objectID: product.objectID, searchId, position }).catch(() => {}); }
  return <article className={styles.productCard}>
    <Link href={href} onClick={clicked} className={styles.productImage} aria-label={`View ${product.name}`}>
      {product.imageUrl && !imageFailed ? <img src={product.imageUrl} alt={product.name} loading="lazy" onError={() => setImageFailed(true)} /> : <span>Image unavailable</span>}
    </Link>
    <div className={styles.cardBrand}>{product.brand}</div>
    <Link href={href} onClick={clicked} className={styles.cardName}>{product.name}</Link>
    {product.rating !== undefined && <div role="img" className={styles.cardRating} aria-label={`Sample rating ${product.rating} out of 5`}><span>{"★".repeat(Math.round(product.rating))}{"☆".repeat(5 - Math.round(product.rating))}</span>{product.rating.toFixed(1)}</div>}
    <div className={styles.cardBottom}><span className={styles.cardPrice}>{money(product.price)}</span><button className={styles.addButton} aria-label={`Add ${product.name} to bag`} disabled={product.price === undefined} onClick={() => add(product, searchId, position)}><span aria-hidden="true">+</span></button></div>
  </article>;
}
