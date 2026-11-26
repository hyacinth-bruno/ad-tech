import { useEffect, useRef, useState } from "react";
import { Stack, Typography, Card, Chip, Box, Skeleton, Alert, Button, TextField, InputAdornment, Tab, Tabs, Divider } from "@mui/material";
import Link from "next/link";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import EditNoteIcon from "@mui/icons-material/EditNote";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import type { Campaign, CampaignStatus as Status } from "@retail-media/shared";
import { listCampaigns, setCampaignStatus } from "@/lib/api";
import { CampaignStatusControl } from "@/components/console/CampaignStatusControl";
import { CampaignCreative, ConsoleHeading, ConsoleStat } from "@/components/console/ConsoleComponents";
import { northstar } from "@/lib/theme";

const euro = (cents: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);
const statuses = ["all", "active", "draft", "paused", "ended"];
const placementNames: Record<string, string> = { search: "Search", category: "Category", pdp: "Product page" };
const campaignId = (campaign: Campaign) => campaign.id ?? (campaign as unknown as { _id: string })._id;
export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("all"), [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const mutationVersion = useRef(0), pendingUpdates = useRef(0);
  useEffect(() => {
    let disposed = false;
    const refresh = async () => {
      if (pendingUpdates.current) return;
      const version = mutationVersion.current;
      try { const rows = await listCampaigns(); if (!disposed && version === mutationVersion.current) { setCampaigns(rows); setError(null); } }
      catch { if (!disposed && version === mutationVersion.current) setError("Your campaigns couldn’t be refreshed. We’ll try again shortly."); }
    };
    void refresh(); const timer = window.setInterval(refresh, 5000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, []);
  async function updateStatus(campaign: Campaign, nextStatus: Status) {
    pendingUpdates.current++;
    mutationVersion.current++;
    setNotice("");
    try {
      const updated = await setCampaignStatus(campaignId(campaign), nextStatus);
      setCampaigns((rows) => rows?.map((row) => campaignId(row) === campaignId(campaign) ? updated : row) ?? null);
      setNotice(`${campaign.productName}: campaign status changed to ${updated.status}.`);
      if (status !== "all" && status !== updated.status) {
        window.requestAnimationFrame(() => document.getElementById(`campaign-tab-${status}`)?.focus());
      }
    } finally {
      pendingUpdates.current--;
      mutationVersion.current++;
    }
  }
  const shown = campaigns?.filter((c) => (status === "all" || c.status === status) && `${c.productName} ${c.headline} ${c.advertiserName} ${c.productSku}`.toLowerCase().includes(query.toLowerCase()));
  const categories = new Set(campaigns?.flatMap((c) => c.targeting?.categories ?? []));
  return <Stack gap={3.5}>
    <ConsoleHeading eyebrow="YOUR RETAIL MEDIA WORKSPACE" title="A place for your next big idea." description="Turn products into discoveries. Create, review and bring your campaigns to the storefront." action={<Button component={Link} href="/campaigns/new" variant="contained" startIcon={<AddIcon />} sx={{ alignSelf: { xs: "flex-start", sm: "auto" }, whiteSpace: "nowrap" }}>New campaign</Button>} />
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" }, gap: 2 }}>
      <ConsoleStat label="Recent campaigns" value={campaigns?.length ?? "—"} note="In your latest 100 campaigns" icon={<CampaignOutlinedIcon fontSize="small" />} />
      <ConsoleStat label="Active campaigns" value={campaigns?.filter((c) => c.status === "active").length ?? "—"} note="Marked active for ad delivery" icon={<RadioButtonCheckedIcon fontSize="small" />} />
      <ConsoleStat label="Drafts to discover" value={campaigns?.filter((c) => c.status === "draft").length ?? "—"} note="Ready for your next review" icon={<EditNoteIcon fontSize="small" />} />
      <ConsoleStat label="Targeted categories" value={campaigns ? categories.size : "—"} note="Across these campaigns" icon={<GridViewOutlinedIcon fontSize="small" />} />
    </Box>
    <Box sx={{ bgcolor: northstar.soft, border: `1px solid ${northstar.border}`, borderRadius: 3, p: { xs: 2.5, sm: 3 }, display: "flex", alignItems: "center", gap: 2.5 }}><Box sx={{ fontSize: 40, color: "#789153", display: { xs: "none", sm: "block" }, lineHeight: 1 }} aria-hidden="true">✳</Box><Box flex={1}><Typography variant="subtitle2" fontWeight={600}>Good products. A story worth sharing.</Typography><Typography variant="body2" color="text.secondary" fontSize={12} mt={0.5}>Start with a product from your catalog, then make the campaign your own.</Typography></Box><Button component={Link} href="/shop" endIcon={<ArrowOutwardIcon />} sx={{ whiteSpace: "nowrap", fontSize: 11, display: { xs: "none", sm: "inline-flex" } }}>Explore the collection</Button></Box>
    <Stack gap={2}>
      <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems={{ sm: "center" }} justifyContent="space-between"><Box><Typography variant="h5" component="h2">Your campaigns</Typography><Typography role="status" variant="caption" color="text.secondary">{campaigns ? `${shown?.length ?? 0} ${shown?.length === 1 ? "campaign" : "campaigns"} in this view` : "Loading your workspace…"}</Typography></Box><TextField size="small" label="Search campaigns" placeholder="Product, brand or SKU" value={query} onChange={(e) => setQuery(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} sx={{ width: { xs: "100%", sm: 285 } }} /></Stack>
      <Tabs value={status} onChange={(_, value) => setStatus(value)} variant="scrollable" scrollButtons="auto" aria-label="Filter campaigns by status">{statuses.map((s) => <Tab key={s} id={`campaign-tab-${s}`} aria-controls="campaign-results" value={s} label={`${s === "all" ? "All campaigns" : s[0].toUpperCase() + s.slice(1)}${campaigns ? ` (${s === "all" ? campaigns.length : campaigns.filter((c) => c.status === s).length})` : ""}`} />)}</Tabs>
    </Stack>
    <Box role="tabpanel" id="campaign-results" aria-labelledby={`campaign-tab-${status}`} tabIndex={0}>
    <Box role="status" aria-atomic="true">{notice && <Alert severity="success" role="presentation" sx={{ mb: 2 }}>{notice}</Alert>}</Box>
    {error && <Alert severity="warning">{error}</Alert>}
    {!campaigns && !error && <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", md: "repeat(3,1fr)" }, gap: 2.5 }}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={420} />)}</Box>}
    {campaigns && shown?.length === 0 && <Card sx={{ py: 7, px: 3, textAlign: "center", borderStyle: "dashed" }}><Typography sx={{ color: "#8ca171", fontSize: 48 }} aria-hidden="true">✳</Typography><Typography variant="h5" component="h3" mt={1}>{campaigns.length ? "A little too specific?" : "Your next campaign starts here."}</Typography><Typography variant="body2" color="text.secondary" my={2}>{campaigns.length ? "Try another search or a different status." : "Choose a product, add your story and find your audience."}</Typography>{campaigns.length ? <Button onClick={() => { setQuery(""); setStatus("all"); }}>Clear filters</Button> : <Button component={Link} href="/campaigns/new" variant="contained">Create your first campaign</Button>}</Card>}
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2,minmax(0,1fr))", md: "repeat(3,minmax(0,1fr))" }, gap: 2.5 }}>
      {shown?.map((c) => <Card key={campaignId(c)} sx={{ minWidth: 0, display: "flex", flexDirection: "column", transition: "border-color .2s", "&:hover": { borderColor: "#a6b993" } }}>
        <Box sx={{ px: 2.5, pt: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}><Typography variant="caption" color="text.secondary" fontSize={9} sx={{ letterSpacing: ".05em" }}>{c.productSku}</Typography><CampaignStatusControl campaign={c} onChange={(nextStatus) => updateStatus(c, nextStatus)} /></Box>
        <CampaignCreative creative={c} compact />
        <Box sx={{ px: 2.5, pb: 2, mt: "auto" }}><Stack direction="row" gap={0.6} flexWrap="wrap" mb={2}>{c.targeting?.categories?.slice(0, 2).map((cat) => <Chip key={cat} label={cat} size="small" variant="outlined" sx={{ maxWidth: "100%" }} />)}{c.targeting?.categories?.length > 2 && <Chip label={`+${c.targeting.categories.length - 2}`} size="small" />}</Stack><Divider /><Stack direction="row" justifyContent="space-between" gap={1} py={1.7}><Box><Typography variant="caption" fontSize={9} color="text.secondary">Daily cap</Typography><Typography variant="body2" fontWeight={600}>{euro(c.budget?.dailyCapCents ?? 0)}</Typography></Box><Box textAlign="right"><Typography variant="caption" fontSize={9} color="text.secondary">Placements</Typography><Typography variant="body2" fontSize={11}>{c.targeting?.placements?.map((p) => placementNames[p] ?? p).join(" · ")}</Typography></Box></Stack><Typography variant="caption" color="text.secondary" fontSize={10}>{c.schedule?.startDate} → {c.schedule?.endDate}</Typography>{c.status === "active" && <Button component={Link} href={`/preview?${new URLSearchParams({ category: c.targeting?.categories?.[0] ?? "", placement: c.targeting?.placements?.[0] ?? "pdp" }).toString()}`} size="small" endIcon={<ArrowOutwardIcon />} sx={{ mt: 1, width: "100%", bgcolor: "#f2f6ec" }}>Test placement</Button>}</Box>
      </Card>)}
    </Box>
    </Box>
  </Stack>;
}
