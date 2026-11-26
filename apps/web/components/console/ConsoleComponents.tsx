import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import type { CampaignInput } from "@retail-media/shared";
import { northstar } from "@/lib/theme";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import { useState } from "react";

export function ConsoleHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <Stack direction={{ xs: "column", sm: "row" }} gap={2} justifyContent="space-between" alignItems={{ sm: "flex-end" }}>
    <Box><Typography variant="overline" color="secondary">{eyebrow}</Typography><Typography variant="h4" component="h1" mt={0.5}>{title}</Typography><Typography variant="body2" color="text.secondary" mt={1} maxWidth={660}>{description}</Typography></Box>{action}
  </Stack>;
}

const statuses: Record<string, { color: string; background: string; label: string }> = {
  active: { color: "#365c32", background: "#eaf3df", label: "Active" },
  draft: { color: "#526249", background: "#f0f2ec", label: "Draft" },
  paused: { color: "#8a682c", background: "#faf2df", label: "Paused" },
  ended: { color: "#8b594e", background: "#f7ede8", label: "Ended" },
};
export function CampaignStatus({ status }: { status: string }) {
  const style = statuses[status] ?? statuses.draft;
  return <Chip component="span" size="small" label={<Stack direction="row" gap={0.8} alignItems="center"><Box sx={{ width: 5, height: 5, bgcolor: style.color, borderRadius: "50%" }} />{style.label}</Stack>} sx={{ bgcolor: style.background, color: style.color, fontSize: ".66rem", border: "1px solid", borderColor: `${style.color}18` }} />;
}
export function ConsoleStat({ label, value, note, icon }: { label: string; value: string | number; note: string; icon: React.ReactNode }) {
  return <Card><CardContent><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="caption" color="text.secondary">{label}</Typography><Box sx={{ display: "flex", p: 0.8, bgcolor: "#f1f5e9", color: "secondary.main", borderRadius: 1.5 }}>{icon}</Box></Stack><Typography variant="h4" component="p" mt={1} fontSize={30} sx={{ fontVariantNumeric: "tabular-nums" }}>{value}</Typography><Typography variant="caption" color="text.secondary" fontSize={10}>{note}</Typography></CardContent></Card>;
}
type Creative = Partial<Pick<CampaignInput, "productName" | "advertiserName" | "headline" | "bodyCopy" | "imageUrl">>;
export function CampaignCreative({ creative, compact = false }: { creative: Creative; compact?: boolean }) {
  const [failedImage, setFailedImage] = useState("");
  return <Box sx={{ bgcolor: "white", borderRadius: 2, overflow: "hidden", height: "100%" }}>
    <Box sx={{ height: compact ? 165 : 225, bgcolor: "#fff", display: "flex", alignItems: "center", justifyContent: "center", p: compact ? 2.5 : 4, borderBottom: `1px solid ${northstar.border}` }}>
      {creative.imageUrl && creative.imageUrl !== failedImage ? <Box component="img" src={creative.imageUrl} alt={creative.productName || "Campaign creative"} onError={() => setFailedImage(creative.imageUrl!)} sx={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Stack alignItems="center" gap={1.5} sx={{ color: "#526249" }}><ImageOutlinedIcon sx={{ fontSize: 38 }} /><Typography variant="caption">{creative.imageUrl ? "Image unavailable" : "Your product image"}</Typography></Stack>}
    </Box>
    <Box sx={{ p: compact ? 2.5 : 3 }}><Typography variant="overline" color="secondary" fontSize={9}>Sponsored {creative.advertiserName ? `· ${creative.advertiserName}` : "listing"}</Typography><Typography variant="subtitle1" component="h3" mt={0.7} fontWeight={600} lineHeight={1.5} sx={compact ? { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 48, fontSize: 14 } : {}}>{creative.headline || creative.productName || "Your next great campaign"}</Typography><Typography variant="body2" color="text.secondary" mt={1} sx={compact ? { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 42, fontSize: 12 } : { fontSize: 12 }}>{creative.bodyCopy || "Choose a product and add your copy to see your sponsored listing take shape."}</Typography></Box>
  </Box>;
}
