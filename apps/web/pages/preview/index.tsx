import { useState } from "react";
import { Stack, Typography, TextField, MenuItem, Button, Card, CardContent, Alert, CardMedia, Box } from "@mui/material";
import { serveAd, recordClick, type ServedAd } from "@/lib/api";
import { tokens, monoFont } from "@/lib/theme";

const PLACEMENTS = ["search", "category", "pdp"];

export default function PreviewPage() {
  const [category, setCategory] = useState("sports-nutrition");
  const [placement, setPlacement] = useState("pdp");
  const [userId, setUserId] = useState("demo-user-1");
  const [ad, setAd] = useState<ServedAd | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [clicked, setClicked] = useState(false);
  const [impressionsThisSession, setImpressionsThisSession] = useState(0);

  async function handleServe() {
    setError(null);
    setClicked(false);
    try {
      const result = await serveAd({ category, placement, userId });
      setAd(result);
      if (result) setImpressionsThisSession((n) => n + 1);
    } catch (err) {
      setError("Couldn't reach ad-delivery-api. Is it running on :4002? See README.");
    }
  }

  async function handleClick() {
    if (!ad) return;
    await recordClick({ campaignId: ad.campaignId, userId, placement });
    setClicked(true);
  }

  return (
    <Stack gap={4} maxWidth={640}>
      <Stack gap={0.5}>
        <Typography variant="h4">Live ad preview</Typography>
        <Typography variant="body2" color="text.secondary">
          Calls ad-delivery-api&apos;s <code>/serve</code> endpoint directly - Algolia candidate lookup, then Redis frequency capping,
          same as a real storefront placement would.
        </Typography>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
        <TextField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} fullWidth />
        <TextField select label="Placement" value={placement} onChange={(e) => setPlacement(e.target.value)} fullWidth>
          {PLACEMENTS.map((p) => (
            <MenuItem key={p} value={p}>
              {p}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Simulated user ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          fullWidth
          helperText="Change this to see a different user's frequency cap"
        />
      </Stack>

      <Button variant="contained" onClick={handleServe} sx={{ alignSelf: "flex-start" }}>
        Request ad
      </Button>

      {error ? <Alert severity="warning">{error}</Alert> : null}

      {ad === null ? (
        <Alert severity="info">
          No ad served - either nothing matches this category/placement, or {userId} has already hit the frequency cap for every
          eligible campaign today. Try a different user ID.
        </Alert>
      ) : null}

      {ad ? (
        <Card sx={{ borderColor: tokens.amber }}>
          {ad.imageUrl ? <CardMedia component="img" image={ad.imageUrl} sx={{ maxHeight: 200, objectFit: "cover" }} /> : null}
          <CardContent>
            <Typography variant="caption" sx={{ fontFamily: monoFont, color: tokens.amber }}>
              SPONSORED · {ad.campaignId}
            </Typography>
            <Typography variant="h6">{ad.headline}</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {ad.bodyCopy}
            </Typography>
            <Button size="small" onClick={handleClick} disabled={clicked} sx={{ mt: 1 }}>
              {clicked ? "Click recorded" : "Simulate click"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Box sx={{ pt: 2, borderTop: `1px solid ${tokens.border}` }}>
        <Typography variant="caption" sx={{ fontFamily: monoFont, color: "text.secondary" }}>
          impressions served this session: {impressionsThisSession}
        </Typography>
      </Box>
    </Stack>
  );
}
