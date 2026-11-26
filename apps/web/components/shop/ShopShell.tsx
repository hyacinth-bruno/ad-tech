import Link from "next/link";
import Head from "next/head";
import { Badge, Button, IconButton } from "@mui/material";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import { ShopSearchBox } from "./ShopSearchBox";
import { ShopProvider, useShop } from "./ShopProvider";
import styles from "./shop.module.css";
import { BrandMark } from "@/components/BrandMark";

function Shell({ children }: { children: React.ReactNode }) {
  const { count, openCart } = useShop();
  return <div className={styles.shop}>
    <Head><title>Northstar — Everyday, upgraded.</title><meta name="description" content="Discover technology for your everyday. Search our 10,000-product demo collection." /></Head>
    <aside aria-label="Store introduction" className={styles.announcement}>A world of possibilities. A little closer. <span>Explore the demo collection ↗</span></aside>
    <header className={styles.header}>
      <div className={styles.headerMain}>
        <BrandMark className={styles.wordmark} />
        <ShopSearchBox />
        <div className={styles.headerActions}><Link href="/studio" className={styles.studioLink}>Search studio ↗</Link><IconButton aria-label={`Open bag, ${count} items`} onClick={openCart}><Badge badgeContent={count} color="primary"><ShoppingBagOutlinedIcon /></Badge></IconButton></div>
      </div>
      <nav className={styles.nav} aria-label="Shop departments">
        <Link href="/shop">Discover all</Link>{["Laptops", "Headphones", "Cameras", "Gaming", "Speakers"].map((q) => <Link key={q} href={{ pathname: "/shop", query: { q } }}>{q}</Link>)}
        <Link href="/shop/guides/choosing-a-laptop" className={styles.navGuide}>A little guidance ↗</Link>
      </nav>
    </header>
    <main id="main-content" tabIndex={-1} className={styles.main}>{children}</main>
    <section aria-labelledby="shop-discovery-heading" className={styles.bottomNote}><span className={styles.largeStar}>✳</span><div><h2 id="shop-discovery-heading">Good things start with a little curiosity.</h2><p>Keep exploring. Your next everyday essential is out there.</p></div><Link href="/shop">Explore the collection ↗</Link></section>
    <footer className={styles.footer}><BrandMark className={styles.wordmark} /><p>A working retail media demo. Historical product data and sample USD prices.</p><div><Link href="/">Campaign console</Link><Link href="/studio">Search studio</Link><Link href="/preview">Ad preview</Link></div></footer>
  </div>;
}
export function ShopShell({ children }: { children: React.ReactNode }) { return <ShopProvider><Shell>{children}</Shell></ShopProvider>; }
