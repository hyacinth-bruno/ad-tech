import { Stack, Typography } from "@mui/material";
import { FormField } from "@/components/FormField";

export function StepCreative() {
  return (
    <Stack gap={3}>
      <Typography variant="body2" color="text.secondary">
        Give your product a story. Refine the catalog copy or write your own headline and description.
      </Typography>
      <FormField name="headline" label="Headline" placeholder="Fuel your workouts with Acme Whey" />
      <FormField name="bodyCopy" label="Body copy" placeholder="Clean-label whey protein, 25g per serving." multiline minRows={2} />
    </Stack>
  );
}
