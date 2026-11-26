import { Stack, Typography, Divider, Chip, Box } from "@mui/material";
import { useFormikContext } from "formik";
import type { CampaignInput } from "@retail-media/shared";
import { monoFont } from "@/lib/theme";
import { FormField } from "@/components/FormField";

const statusDescriptions = {
  active: "The campaign will be active and eligible for matching ad placements.",
  draft: "Save for later review. Ads won’t serve until you activate the campaign.",
  paused: "Create the campaign on hold. Ads won’t serve until you activate it.",
  ended: "Create the campaign as ended. Ads won’t serve unless you reactivate it.",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" gap={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ textAlign: "right", overflowWrap: "anywhere", minWidth: 0 }}>
        {value}
      </Typography>
    </Stack>
  );
}

export function StepReview() {
  const { values, isSubmitting } = useFormikContext<CampaignInput>();

  return (
    <Stack gap={2}>
      <Typography variant="body2" color="text.secondary">
        One last look. Review the details and choose the campaign’s initial status.
      </Typography>

      <Box sx={{ p: 2.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
        <Typography variant="overline" sx={{ fontFamily: monoFont, letterSpacing: 1 }}>
          {values.productSku || "SKU"}
        </Typography>
        <Typography variant="h6" component="h3">{values.headline || "(headline)"}</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {values.bodyCopy || "(body copy)"}
        </Typography>
        <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 1 }}>
          {(values.targeting?.categories ?? []).map((c) => (
            <Chip key={c} label={c} size="small" color="secondary" variant="outlined" />
          ))}
          {(values.targeting?.placements ?? []).map((p) => (
            <Chip key={p} label={p} size="small" variant="outlined" />
          ))}
        </Stack>
      </Box>

      <Divider />

      <FormField name="status" label="Initial campaign status" select disabled={isSubmitting}
        SelectProps={{ native: true }} helperText={statusDescriptions[values.status ?? "draft"]}>
        <option value="draft">Draft</option>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
        <option value="ended">Ended</option>
      </FormField>

      <Row label="Advertiser" value={values.advertiserName} />
      <Row label="Product" value={values.productName} />
      <Row label="Destination" value={values.destinationUrl} />
      <Row label="Daily budget cap" value={`${((values.budget?.dailyCapCents ?? 0) / 100).toFixed(2)} EUR`} />
      <Row label="Total budget cap" value={`${((values.budget?.totalCapCents ?? 0) / 100).toFixed(2)} EUR`} />
      <Row label="Frequency cap" value={`${values.frequencyCap?.impressionsPerUserPerDay ?? 0} / user / day`} />
      <Row label="Schedule" value={`${values.schedule?.startDate ?? "?"} → ${values.schedule?.endDate ?? "?"}`} />
    </Stack>
  );
}
