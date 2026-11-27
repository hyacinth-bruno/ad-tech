import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Autocomplete, Stack, Typography, TextField, MenuItem, Button, Card, CardContent, Alert, Box, Chip } from "@mui/material";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { listActiveCategories, serveAd, recordClick, type ServedAd } from "@/lib/api";
import { CampaignCreative, ConsoleHeading } from "@/components/console/ConsoleComponents";

const PLACEMENTS = [{ value: "search", label: "Search results" }, { value: "category", label: "Category page" }, { value: "pdp", label: "Product detail page" }];
export default function PreviewPage() {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [placement, setPlacement] = useState("pdp");
  const [userId, setUserId] = useState("demo-user-1");
  const [ad, setAd] = useState<ServedAd | null | undefined>(undefined);
  const [servedContext, setServedContext] = useState({ userId: "", placement: "" });
  const [error, setError] = useState<string | null>(null);
  const [clicked, setClicked] = useState(false);
  const [busy, setBusy] = useState(false), [clicking, setClicking] = useState(false);
  const [impressionsThisSession, setImpressionsThisSession] = useState(0);
  const [categoriesError, setCategoriesError] = useState(false);
  const queryCategory = typeof router.query.category === "string" ? router.query.category : "";
  const queryPlacement = typeof router.query.placement === "string" ? router.query.placement : "";
  useEffect(() => {
    if (!router.isReady) return;
    let disposed = false;
    if (queryCategory) setCategory(queryCategory);
    if (PLACEMENTS.some((p) => p.value === queryPlacement)) setPlacement(queryPlacement);
    listActiveCategories().then((items) => { if (!disposed) { setCategories(items); if (!queryCategory && items.length) setCategory(items[0]); } }).catch(() => { if (!disposed) setCategoriesError(true); });
    return () => { disposed = true; };
  }, [router.isReady, queryCategory, queryPlacement]);
  async function handleServe() {
    setError(null); setClicked(false); setBusy(true);
    const requested = { category, placement, userId };
    try { const result = await serveAd(requested); setAd(result); setServedContext(requested); if (result) setImpressionsThisSession((n) => n + 1); }
    catch { setError("Your ad preview couldn’t be loaded. Please try again."); }
    finally { setBusy(false); }
  }
  async function handleClick() {
    if (!ad || clicked || clicking) return;
    setClicking(true); setError(null);
    try { await recordClick({ campaignId: ad.campaignId, ...servedContext }); setClicked(true); }
    catch { setError("The click couldn’t be recorded. Please try again."); }
    finally { setClicking(false); }
  }
  return <Stack gap={3.5}>
    <ConsoleHeading eyebrow="SEE YOUR CAMPAIGN IN CONTEXT" title="A little preview. A bigger picture." description="Try a storefront placement and see which active campaign is selected for your audience." action={<Button component={Link} href="/shop" variant="outlined" endIcon={<ArrowOutwardIcon />}>Open storefront</Button>} />
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "minmax(0,1fr) minmax(0,1fr)" }, gap: 3, alignItems: "start" }}>
      <Stack gap={2.5}>
        <Card><CardContent><Stack gap={3}>
          <Box><Typography variant="overline" color="secondary">SET THE SCENE</Typography><Typography variant="h5" component="h2" mt={0.5}>Choose your placement</Typography><Typography variant="body2" color="text.secondary" mt={1}>Match a campaign category, pick where it appears and try a shopper identity.</Typography></Box>
          <Autocomplete freeSolo options={categories} inputValue={category} onInputChange={(_, value) => setCategory(value)} fullWidth renderInput={(params) => <TextField {...params} label="Category" helperText={categoriesError ? "Suggestions unavailable. Enter a campaign category." : "Categories from your active campaigns"} />} />
          <TextField select label="Placement" value={placement} onChange={(e) => setPlacement(e.target.value)} fullWidth>{PLACEMENTS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}</TextField>
          <TextField label="Simulated user ID" value={userId} onChange={(e) => setUserId(e.target.value)} fullWidth helperText="Use a different ID to test another shopper’s frequency cap." />
          <Button variant="contained" onClick={handleServe} disabled={busy || !category.trim() || !userId.trim()} startIcon={<VisibilityOutlinedIcon />}>{busy ? "Finding a campaign…" : "Request ad"}</Button>
        </Stack></CardContent></Card>
        <Box sx={{ p: 2.5, border: "1px solid", borderColor: "divider", bgcolor: "#eef3e7", borderRadius: 2 }}><Typography variant="subtitle2" fontSize={12}>Every placement is a new opportunity.</Typography><Typography variant="body2" fontSize={11} color="text.secondary" mt={0.7}>Only matching active campaigns are eligible. A shopper who has reached a campaign’s daily frequency cap may see another ad, or no ad.</Typography></Box>
      </Stack>
      <Stack gap={2}>
        <Stack direction="row" alignItems="center" justifyContent="space-between"><Typography variant="overline" color="text.secondary">YOUR STOREFRONT PREVIEW</Typography><Chip label={`${impressionsThisSession} session impressions`} size="small" variant="outlined" /></Stack>
        {error && <Alert severity="warning">{error}</Alert>}
        {ad === null ? <Card sx={{ py: 7, px: 3, textAlign: "center", borderStyle: "dashed" }}><Typography fontSize={44} color="secondary" aria-hidden="true">✳</Typography><Typography variant="h6" component="h2" mt={1}>No campaign for this moment.</Typography><Typography variant="body2" color="text.secondary" mt={1}>Try another category, placement or shopper ID. Matching campaigns may have reached their frequency cap.</Typography></Card> : <Card><CampaignCreative creative={ad ? { ...ad, productName: ad.headline } : { headline: "Your campaign, ready for discovery.", bodyCopy: "Choose a category and request an ad to see an active sponsored listing here." }} /><Box sx={{ px: 3, pb: 3 }}>{ad ? <><Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere", display: "block", mb: 2 }}>Campaign {ad.campaignId}</Typography><Button variant="outlined" onClick={handleClick} disabled={clicked || clicking || busy} fullWidth>{clicked ? "Click recorded ✓" : clicking ? "Recording…" : "Simulate click"}</Button></> : <Typography variant="caption" color="text.secondary" fontSize={10}>Preview only · no impression recorded yet</Typography>}</Box></Card>}
      </Stack>
    </Box>
  </Stack>;
}
