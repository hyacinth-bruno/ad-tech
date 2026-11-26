import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { Alert, Skeleton } from "@mui/material";
import type { ShopArticle } from "@retail-media/shared";
import { shopArticle } from "@/lib/shop";
import styles from "@/components/shop/shop.module.css";

export default function GuidePage() {
  const router = useRouter();
  const [article, setArticle] = useState<ShopArticle | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { let disposed = false; setArticle(null); setError(false); if (typeof router.query.id === "string") shopArticle(router.query.id).then((a) => { if (!disposed) setArticle(a); }).catch(() => { if (!disposed) setError(true); }); return () => { disposed = true; }; }, [router.query.id]);
  if (error) return <Alert severity="warning">This field guide couldn’t be loaded. <Link href="/shop">Explore the collection</Link>.</Alert>;
  if (!article) return <Skeleton height={400} />;
  return <article className={styles.guide}><Head><title>{article.title} — Northstar</title></Head><div className={styles.heroEyebrow}>THE NORTHSTAR FIELD GUIDES</div><h1>{article.title}</h1><p className={styles.summary}>{article.summary}</p><p>{article.body}</p><Link className={styles.heroLink} href={{ pathname: "/shop", query: { q: article.category } }}>Explore {article.category.toLowerCase()} ↗</Link></article>;
}
