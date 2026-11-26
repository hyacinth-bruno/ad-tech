import { AppBar, Box, Stack, Button, Container, Typography, Breadcrumbs } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/router";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import { BrandMark } from "./BrandMark";
import { northstar } from "@/lib/theme";

const navigation = [{ href: "/", label: "Campaigns" }, { href: "/campaigns/new", label: "Create campaign" }, { href: "/preview", label: "Live preview" }, { href: "/studio", label: "Search studio" }];
export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useRouter();
  const current = navigation.find((n) => n.href === pathname)?.label ?? "Workspace";
  return <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
    <Box component="aside" aria-label="Workspace introduction" sx={{ bgcolor: northstar.green, color: "#e8efdf", py: 0.8, textAlign: "center", fontSize: 10, letterSpacing: ".06em" }}>A little more reach. A better connection.</Box>
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: "#ffffffed", backdropFilter: "blur(12px)", color: "text.primary", border: 0, borderBottom: `1px solid ${northstar.border}` }}>
      <Container maxWidth="lg"><Stack direction="row" alignItems="center" gap={{ xs: 1.5, sm: 3 }} py={2} sx={{ flexWrap: "wrap" }}>
        <BrandMark href="/" /><Box sx={{ borderLeft: `1px solid ${northstar.border}`, pl: { xs: 1.5, sm: 3 } }}><Typography variant="overline" sx={{ display: "block", lineHeight: 1.5, fontSize: { xs: 8, sm: 9 } }}>Campaign workspace</Typography><Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" }, fontSize: 10 }}>Made for meaningful discovery.</Typography></Box>
        <Box flex={1} /><Button component={Link} href="/shop" variant="outlined" endIcon={<ArrowOutwardIcon sx={{ fontSize: "15px !important" }} />} sx={{ whiteSpace: "nowrap", px: { xs: 1, sm: 2 }, fontSize: { xs: 10, sm: 12 } }}><Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Open&nbsp;</Box>storefront</Button>
      </Stack><Box component="nav" aria-label="Campaign workspace" sx={{ display: "flex", gap: { xs: 2.5, sm: 4 }, overflowX: "auto", scrollbarWidth: "none" }}>{navigation.map((n) => <Link key={n.href} href={n.href} aria-current={n.href === pathname ? "page" : undefined} style={{ padding: "10px 0 15px", fontSize: 12, fontWeight: n.href === pathname ? 650 : 450, color: n.href === pathname ? northstar.green : northstar.muted, borderBottom: `2px solid ${n.href === pathname ? northstar.green : "transparent"}`, whiteSpace: "nowrap" }}>{n.label}</Link>)}</Box></Container>
    </AppBar>
    <Container component="main" id="main-content" tabIndex={-1} maxWidth="lg" sx={{ pt: 3, pb: 6, flexGrow: 1, minWidth: 0 }}><Breadcrumbs separator="/" sx={{ mb: 3.5, fontSize: 10, color: "text.secondary" }}><Link href="/">Workspace</Link>{pathname !== "/" && <Link href="/">Campaigns</Link>}<Typography fontSize={10} color="text.secondary">{current}</Typography></Breadcrumbs>{children}</Container>
    <Box component="footer" sx={{ borderTop: `1px solid ${northstar.border}`, bgcolor: "#f1f5eb", py: 3.5 }}><Container maxWidth="lg"><Stack direction={{ xs: "column", sm: "row" }} gap={2} justifyContent="space-between" alignItems={{ sm: "center" }}><Box><Typography variant="subtitle2" fontWeight={600}>Good campaigns start with a little curiosity.</Typography><Typography variant="caption" color="text.secondary" fontSize={10}>Your products, your story, a place to be discovered.</Typography></Box><Stack direction="row" gap={3} fontSize={11}><Link href="/shop">Explore storefront ↗</Link><Link href="/studio">Search studio</Link></Stack></Stack></Container></Box>
  </Box>;
}
