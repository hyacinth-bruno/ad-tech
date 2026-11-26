import { useEffect, useState } from "react";
import { Stack, Typography, Card, CardContent, Chip, Box, CircularProgress, Alert, Button } from "@mui/material";
import Link from "next/link";
import type { Campaign } from "@retail-media/shared";
import { listCampaigns } from "@/lib/api";
import { monoFont, tokens } from "@/lib/theme";

const STATUS_COLOR: Record<string, string> = {
  active: tokens.amber,
  draft: tokens.textDim,
  paused: tokens.teal,
  ended: tokens.danger,
};

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const refresh = async () => {
      try {
        const rows = await listCampaigns();
        if (!disposed) { setCampaigns(rows); setError(null); }
      } catch {
        if (!disposed) setError("Couldn't reach campaign-api. Is it running on :4001? See README for docker-compose up.");
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, []);

  return (
    <Stack gap={4}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
        <Stack gap={0.5}>
          <Typography variant="h4">Campaigns</Typography>
          <Typography variant="body2" color="text.secondary">
            Ads created in Codex appear here automatically. Drafts are ready for review.
          </Typography>
        </Stack>
        <Link href="/campaigns/new" passHref legacyBehavior>
          <Button component="a" variant="contained">
            New campaign
          </Button>
        </Link>
      </Stack>

      {error ? <Alert severity="warning">{error}</Alert> : null}

      {!campaigns && !error ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress size={28} />
        </Box>
      ) : null}

      {campaigns && campaigns.length === 0 ? (
        <Box sx={{ py: 8, textAlign: "center" }}>
          <Typography color="text.secondary">No campaigns yet. Build your first one to see it here and in the live preview.</Typography>
        </Box>
      ) : null}

      <Stack gap={1.5}>
        {campaigns?.map((c) => (
          <Card key={c.id ?? (c as unknown as { _id: string })._id}>
            <CardContent>
              {c.imageUrl ? <Box component="img" src={c.imageUrl} alt={c.productName} sx={{ width: 120, height: 100, objectFit: "contain", mb: 2 }} /> : null}
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Stack gap={0.5}>
                  <Typography variant="caption" sx={{ fontFamily: monoFont, color: "text.secondary" }}>
                    {c.productSku}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {c.headline}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {c.advertiserName} · {c.productName}
                  </Typography>
                  <Typography variant="body2">{c.bodyCopy}</Typography>
                  <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                    {c.targeting?.categories?.map((cat) => (
                      <Chip key={cat} label={cat} size="small" variant="outlined" color="secondary" />
                    ))}
                  </Stack>
                </Stack>
                <Chip
                  label={c.status}
                  size="small"
                  sx={{ borderColor: STATUS_COLOR[c.status] ?? tokens.textDim, color: STATUS_COLOR[c.status] ?? tokens.textDim }}
                  variant="outlined"
                />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
