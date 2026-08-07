import { Stack, Typography, Autocomplete, TextField, FormGroup, FormControlLabel, Checkbox, FormHelperText } from "@mui/material";
import { useField, useFormikContext } from "formik";
import { FormField } from "@/components/FormField";
import type { CampaignInput, Placement } from "@retail-media/shared";

const PLACEMENT_OPTIONS: { value: Placement; label: string }[] = [
  { value: "search", label: "Search results" },
  { value: "category", label: "Category page" },
  { value: "pdp", label: "Product detail page" },
];

function TagsField({ name, label, placeholder }: { name: string; label: string; placeholder: string }) {
  const [field, meta, helpers] = useField<string[]>(name);
  return (
    <Autocomplete
      multiple
      freeSolo
      options={[]}
      value={field.value ?? []}
      onChange={(_e, value) => helpers.setValue(value as string[])}
      onBlur={() => helpers.setTouched(true)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          error={Boolean(meta.touched && meta.error)}
          helperText={meta.touched && meta.error ? meta.error : "Press enter after each one"}
        />
      )}
    />
  );
}

export function StepTargeting() {
  const { values, errors, touched, setFieldValue, handleBlur } = useFormikContext<CampaignInput>();
  const placements = values.targeting?.placements ?? [];
  const placementError = touched.targeting?.placements && (errors.targeting as Record<string, string> | undefined)?.["placements"];

  function togglePlacement(value: Placement, checked: boolean) {
    const next = checked ? [...placements, value] : placements.filter((p) => p !== value);
    setFieldValue("targeting.placements", next);
  }

  return (
    <Stack gap={3}>
      <Typography variant="body2" color="text.secondary">
        Where this ad is eligible to show, and the spend / frequency limits enforced on the serving path.
      </Typography>

      <TagsField name="targeting.categories" label="Categories" placeholder="sports-nutrition" />
      <TagsField name="targeting.keywords" label="Keywords (optional)" placeholder="protein, whey" />

      <Stack>
        <Typography variant="subtitle2" gutterBottom>
          Placements
        </Typography>
        <FormGroup row onBlur={handleBlur}>
          {PLACEMENT_OPTIONS.map((opt) => (
            <FormControlLabel
              key={opt.value}
              control={
                <Checkbox
                  name="targeting.placements"
                  checked={placements.includes(opt.value)}
                  onChange={(e) => togglePlacement(opt.value, e.target.checked)}
                />
              }
              label={opt.label}
            />
          ))}
        </FormGroup>
        {placementError ? <FormHelperText error>{placementError}</FormHelperText> : null}
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
        <FormField name="budget.dailyCapCents" label="Daily budget cap (cents)" type="number" placeholder="5000" />
        <FormField name="budget.totalCapCents" label="Total budget cap (cents)" type="number" placeholder="100000" />
        <FormField name="frequencyCap.impressionsPerUserPerDay" label="Max impressions / user / day" type="number" placeholder="3" />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
        <FormField name="schedule.startDate" label="Start date" type="date" InputLabelProps={{ shrink: true }} />
        <FormField name="schedule.endDate" label="End date" type="date" InputLabelProps={{ shrink: true }} />
      </Stack>
    </Stack>
  );
}
