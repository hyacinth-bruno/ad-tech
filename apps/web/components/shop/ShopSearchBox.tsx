import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Box, ButtonBase, CircularProgress, ClickAwayListener, InputBase, Paper, Typography, IconButton } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import NorthWestIcon from "@mui/icons-material/NorthWest";
import type { ShopAutocomplete } from "@retail-media/shared";
import { autocomplete } from "@/lib/shop";
import styles from "./shop.module.css";

export function ShopSearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [data, setData] = useState<ShopAutocomplete | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suppressOpen = useRef(false);
  function closeSuggestions(returnFocus = false) {
    setOpen(false);
    if (returnFocus && document.activeElement !== inputRef.current) {
      suppressOpen.current = true;
      inputRef.current?.focus();
    }
  }
  useEffect(() => { setQ(typeof router.query.q === "string" ? router.query.q : ""); }, [router.query.q]);
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem("retail-shop-recent") || "[]"); if (Array.isArray(saved)) setRecent(saved.filter((s) => typeof s === "string").slice(0, 5)); } catch {} }, []);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setBusy(true);
    const timer = window.setTimeout(async () => {
      try { const result = await autocomplete(q.slice(0, 200), controller.signal); if (!controller.signal.aborted) { setData(result); setError(false); } }
      catch { if (!controller.signal.aborted) { setError(true); setData(null); } }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [q, open]);
  function submit(query: string) {
    const trimmed = query.trim().slice(0, 200);
    if (trimmed) { const next = [trimmed, ...recent.filter((r) => r !== trimmed)].slice(0, 5); setRecent(next); try { localStorage.setItem("retail-shop-recent", JSON.stringify(next)); } catch {} }
    setOpen(false); setQ(trimmed); void router.push({ pathname: "/shop", query: trimmed ? { q: trimmed } : {} });
  }
  return <ClickAwayListener onClickAway={() => setOpen(false)}>
    <Box ref={root} className={styles.searchWrap} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) closeSuggestions(); }} onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); closeSuggestions(true); }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault(); setOpen(true);
        const options = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-suggestion]") ?? []);
        const current = options.indexOf(document.activeElement as HTMLElement);
        const index = event.key === "ArrowDown" ? (current + 1) % options.length : (current <= 0 ? options.length - 1 : current - 1);
        options[index]?.focus();
      }
    }}>
      <Box component="form" role="search" aria-label="Catalog search" className={styles.searchInput} onSubmit={(e) => { e.preventDefault(); submit(q); }}>
        <SearchIcon sx={{ color: "#66726a", fontSize: 22 }} />
        <InputBase inputRef={inputRef} value={q} placeholder="What are you looking for?" onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => { if (suppressOpen.current) suppressOpen.current = false; else setOpen(true); }} inputProps={{ "aria-label": "Search products and guides", role: "combobox", "aria-haspopup": "dialog", "aria-autocomplete": "list", maxLength: 200, "aria-expanded": open, "aria-controls": open ? "shop-search-suggestions" : undefined, "aria-describedby": "shop-search-help", enterKeyHint: "search", autoComplete: "off" }} sx={{ flex: 1, fontSize: 14 }} />
        {busy && open ? <CircularProgress size={16} aria-label="Loading search suggestions" /> : <IconButton type="submit" aria-label="Submit search" size="small"><SearchIcon fontSize="small" /></IconButton>}
      </Box>
      <span id="shop-search-help" className="sr-only">Type to search products and guides. Use the arrow keys to move through suggestions, Enter to choose, and Escape to close.</span>
      <span role="status" className="sr-only">{open && (busy ? "Loading suggestions" : data ? `${data.products.length} products, ${data.articles.length} guides and ${data.suggestions.length} suggested searches available.` : "Suggestions unavailable")}</span>
      {open && <Paper role="dialog" aria-label="Search suggestions" id="shop-search-suggestions" className={styles.searchDropdown} elevation={8}>
        <Box className={styles.suggestionSide}>
          {!!recent.length && <><Typography className={styles.eyebrow}>RECENT SEARCHES</Typography>{recent.filter((r) => !q || r.toLowerCase().includes(q.toLowerCase())).map((r) => <ButtonBase data-suggestion key={r} className={styles.suggestion} onClick={() => submit(r)}><NorthWestIcon fontSize="small" />{r}</ButtonBase>)}</>}
          <Typography className={styles.eyebrow} mt={2}>DISCOVER</Typography>
          {data?.suggestions.map((s) => <ButtonBase data-suggestion key={s.query} className={styles.suggestion} onClick={() => submit(s.query)}><SearchIcon fontSize="small" /><Box textAlign="left">{s.query}<Typography variant="caption" display="block" color="text.secondary">{s.label}</Typography></Box></ButtonBase>)}
          {!busy && !data?.suggestions.length && <Typography variant="body2" color="text.secondary">Try “Mac book” or “headphones”.</Typography>}
        </Box>
        <Box className={styles.suggestionMain}>
          <Typography className={styles.eyebrow}>PRODUCTS</Typography>
          {data?.products.map((p) => <Link data-suggestion href={`/shop/products/${encodeURIComponent(p.objectID)}`} key={p.objectID} className={styles.suggestionProduct} onClick={() => setOpen(false)}>
            {p.imageUrl && <img src={p.imageUrl} alt="" />}<Box><Typography variant="body2" fontWeight={600}>{p.name}</Typography><Typography variant="caption" color="text.secondary">{p.brand}</Typography></Box>
          </Link>)}
          {!busy && !data?.products.length && <Typography variant="body2" color="text.secondary">{error ? "Suggestions unavailable. Press Enter to search." : "No matching products. Try a shorter search."}</Typography>}
          {!!data?.articles.length && <><Typography className={styles.eyebrow} mt={2}>FIELD GUIDES</Typography>{data.articles.map((a) => <Link data-suggestion className={styles.suggestion} href={`/shop/guides/${a.objectID}`} key={a.objectID} onClick={() => setOpen(false)}>{a.title} ↗</Link>)}</>}
          <ButtonBase data-suggestion onClick={() => submit(q)} className={styles.allResults}>View all results for “{q || "everything"}” →</ButtonBase>
        </Box>
      </Paper>}
    </Box>
  </ClickAwayListener>;
}
