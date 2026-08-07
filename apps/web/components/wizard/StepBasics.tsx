import { Stack, Typography } from "@mui/material";
import { FormField } from "@/components/FormField";

export function StepBasics() {
  return (
    <Stack gap={3}>
      <Typography variant="body2" color="text.secondary">
        Who's advertising, and what product is this sponsored listing for.
      </Typography>
      <FormField name="advertiserName" label="Advertiser name" placeholder="Acme Supplements" />
      <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
        <FormField name="productSku" label="Product SKU" placeholder="ACME-PROT-001" helperText="Letters, numbers, - and _ only" />
        <FormField name="productName" label="Product name" placeholder="Whey Protein 1kg" />
      </Stack>
      <FormField name="destinationUrl" label="Destination URL" placeholder="https://shop.example.com/product" />
      <FormField name="imageUrl" label="Creative image URL (optional)" placeholder="https://cdn.example.com/whey.jpg" />
    </Stack>
  );
}
