import { Stack, Typography } from "@mui/material";
import { FormField } from "@/components/FormField";
import { ProductPicker } from "./ProductPicker";

export function StepBasics() {
  return (
    <Stack gap={3}>
      <Typography variant="body2" color="text.secondary">
        Choose a catalog product to fill the details, or introduce a product of your own.
      </Typography>
      <ProductPicker />
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
