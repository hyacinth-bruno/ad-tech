import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, Box, Button, Divider, Drawer, IconButton, Stack, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { CartItem, CatalogProduct, DemoOrder } from "@retail-media/shared";
import { checkout, money, shopEvent, shopToken } from "@/lib/shop";

const ShopContext = createContext<{ count: number; openCart: () => void; add: (product: CatalogProduct, searchId?: string, position?: number) => void }>({ count: 0, openCart() {}, add() {} });
export const useShop = () => useContext(ShopContext);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<DemoOrder | null>(null);
  const orderId = useRef<string>();
  useEffect(() => {
    try {
      shopToken();
      const saved = JSON.parse(localStorage.getItem("retail-shop-cart") || "[]");
      if (Array.isArray(saved)) setItems(saved.filter((i) => i?.product?.objectID && typeof i.product.name === "string" && Number.isInteger(i.quantity) && i.quantity >= 1 && i.quantity <= 20).slice(0, 20));
    } catch { /* A fresh cart is safe when saved browser data is unavailable. */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem("retail-shop-cart", JSON.stringify(items)); } catch {} } }, [items, ready]);
  function change(next: CartItem[]) { setItems(next); orderId.current = undefined; setOrder(null); setError(""); }
  function add(product: CatalogProduct, searchId?: string, position?: number) {
    const existing = items.find((i) => i.product.objectID === product.objectID);
    if (!existing && items.length >= 20) { setError("Your demo bag can hold up to 20 different products."); setOpen(true); return; }
    change(existing ? items.map((i) => i === existing ? { ...i, quantity: Math.min(20, i.quantity + 1) } : i) : [...items, { product, quantity: 1, searchId, position }]);
    setOpen(true);
    void shopEvent({ type: "cart", objectID: product.objectID, searchId, position }).catch(() => {});
  }
  async function complete() {
    if (busy) return;
    setBusy(true); setError("");
    orderId.current ??= crypto.randomUUID();
    try {
      const receipt = await checkout(orderId.current, items);
      setOrder(receipt); setItems([]); orderId.current = undefined;
    } catch { setError("We couldn’t complete the demo order. Your bag is saved; please try again."); }
    finally { setBusy(false); }
  }
  return (
    <ShopContext.Provider value={{ count: items.reduce((n, i) => n + i.quantity, 0), openCart: () => setOpen(true), add }}>
      {children}
      <Drawer anchor="right" open={open} onClose={() => { if (!busy) setOpen(false); }} PaperProps={{ role: "dialog", "aria-modal": true, "aria-labelledby": "cart-title", "aria-describedby": "cart-description", "aria-busy": busy, sx: { width: { xs: "100%", sm: 460 }, p: 3, borderRadius: 0 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
          <Typography id="cart-title" component="h2" variant="h5" fontWeight={700}>Your bag <Typography component="span" color="text.secondary">({items.reduce((n, i) => n + i.quantity, 0)})</Typography></Typography>
          <IconButton aria-label="Close bag" onClick={() => setOpen(false)} disabled={busy}><CloseIcon /></IconButton>
        </Stack>
        <Typography id="cart-description" variant="body2" color="text.secondary" mb={3}>A demo bag with historical sample prices. No payment will be collected.</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {order && <Alert role="status" severity="success" sx={{ mb: 2 }}>Demo order complete · {money(order.totalCents / 100)}<br />Reference {order.orderId.slice(0, 8)}. No payment was taken.</Alert>}
        {!items.length && !order && <Typography sx={{ py: 5 }}>Something good is waiting. Explore the collection to fill your bag.</Typography>}
        <Stack gap={3} sx={{ flexGrow: 1 }}>
          {items.map((item) => <Stack direction="row" gap={2} key={item.product.objectID}>
            <Box component="img" src={item.product.imageUrl} alt={item.product.name} sx={{ width: 80, height: 90, objectFit: "contain", bgcolor: "white", p: 1 }} />
            <Stack gap={1} flex={1}>
              <Typography variant="body2" fontWeight={600}>{item.product.name}</Typography>
              <Typography variant="body2">{money(item.product.price)}</Typography>
              <Stack direction="row" gap={1} alignItems="center">
                <Button size="small" disabled={busy || item.quantity <= 1} aria-label={`Decrease quantity of ${item.product.name}`} onClick={() => change(items.map((i) => i === item ? { ...i, quantity: i.quantity - 1 } : i))}>−</Button>
                <Typography>{item.quantity}</Typography>
                <Button size="small" disabled={busy || item.quantity >= 20} aria-label={`Increase quantity of ${item.product.name}`} onClick={() => change(items.map((i) => i === item ? { ...i, quantity: i.quantity + 1 } : i))}>+</Button>
                <Button size="small" aria-label={`Remove ${item.product.name} from bag`} disabled={busy} onClick={() => change(items.filter((i) => i !== item))}>Remove</Button>
              </Stack>
            </Stack>
          </Stack>)}
        </Stack>
        {items.length > 0 && <Stack gap={2} mt={3}>
          <Divider />
          <Stack direction="row" justifyContent="space-between"><Typography fontWeight={700}>Sample total</Typography><Typography fontWeight={700}>{money(items.reduce((n, i) => n + Math.round((i.product.price ?? 0) * 100) * i.quantity, 0) / 100)}</Typography></Stack>
          <Button size="large" variant="contained" disabled={busy} onClick={complete}>{busy ? "Completing…" : "Complete demo checkout"}</Button>
        </Stack>}
      </Drawer>
    </ShopContext.Provider>
  );
}
