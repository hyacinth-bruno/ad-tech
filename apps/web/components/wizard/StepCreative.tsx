import { useState } from "react";
import { Stack, Typography, Button, Card, CardActionArea, CardContent, Alert, CircularProgress } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useFormikContext } from "formik";
import { FormField } from "@/components/FormField";
import { getCopySuggestions, type CopySuggestion } from "@/lib/api";
import type { CampaignInput } from "@retail-media/shared";
import { tokens } from "@/lib/theme";

export function StepCreative() {
  const { values, setFieldValue } = useFormikContext<CampaignInput>();
  const [suggestions, setSuggestions] = useState<CopySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const result = await getCopySuggestions({
        productName: values.productName,
        advertiserName: values.advertiserName,
        categories: values.targeting?.categories ?? [],
        placements: values.targeting?.placements ?? [],
      });
      setSuggestions(result);
    } catch (err) {
      setError("Couldn't reach the AI copy service. You can still write copy manually below.");
    } finally {
      setLoading(false);
    }
  }

  function applySuggestion(s: CopySuggestion) {
    setFieldValue("headline", s.headline);
    setFieldValue("bodyCopy", s.bodyCopy);
  }

  return (
    <Stack gap={3}>
      <Typography variant="body2" color="text.secondary">
        Write the sponsored-listing copy, or generate a few options with Claude and pick one to refine.
      </Typography>

      <Button
        variant="outlined"
        color="secondary"
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
        onClick={handleGenerate}
        disabled={loading || !values.productName || !values.advertiserName}
        sx={{ alignSelf: "flex-start" }}
      >
        {loading ? "Generating..." : "Generate copy with AI"}
      </Button>

      {error ? <Alert severity="warning">{error}</Alert> : null}

      {suggestions.length > 0 ? (
        <Stack gap={1.5}>
          {suggestions.map((s, i) => (
            <Card key={i} sx={{ borderColor: tokens.border }}>
              <CardActionArea onClick={() => applySuggestion(s)}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {s.headline}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {s.bodyCopy}
                  </Typography>
                  <Typography variant="caption" sx={{ color: tokens.teal }}>
                    {s.rationale} · tap to use
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      ) : null}

      <FormField name="headline" label="Headline" placeholder="Fuel your workouts with Acme Whey" />
      <FormField name="bodyCopy" label="Body copy" placeholder="Clean-label whey protein, 25g per serving." multiline minRows={2} />
    </Stack>
  );
}
