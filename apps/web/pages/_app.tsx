import { useEffect, useRef } from "react";
import type { AppProps } from "next/app";
import Head from "next/head";
import "@/styles/globals.css";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { theme, shopTheme } from "@/lib/theme";
import { AppShell } from "@/components/AppShell";
import { ShopShell } from "@/components/shop/ShopShell";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isShop = router.pathname.startsWith("/shop");
  const routePath = router.asPath.split(/[?#]/)[0];
  const previousPath = useRef(routePath);
  useEffect(() => {
    if (previousPath.current === routePath) return;
    previousPath.current = routePath;
    requestAnimationFrame(() => {
      const main = document.getElementById("main-content");
      const heading = main?.querySelector<HTMLElement>("h1");
      if (heading) heading.tabIndex = -1;
      (heading ?? main)?.focus({ preventScroll: true });
    });
  }, [routePath]);
  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const update = () => document.documentElement.style.setProperty("--site-header-height", `${header.getBoundingClientRect().height}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, [isShop]);
  const title = ({ "/": "Campaigns", "/campaigns/new": "Create campaign", "/preview": "Live ad preview", "/studio": "Search studio", "/shop": "The collection" } as Record<string, string>)[router.pathname] ?? "Northstar";
  return (
    <ThemeProvider theme={isShop ? shopTheme : theme}>
      <CssBaseline />
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Head>
        <title>{title} — Northstar</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      {isShop ? <ShopShell><Component {...pageProps} /></ShopShell> : <AppShell><Component {...pageProps} /></AppShell>}
    </ThemeProvider>
  );
}
