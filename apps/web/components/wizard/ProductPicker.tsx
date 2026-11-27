import { useEffect, useState } from "react";
import { Alert, Autocomplete, Box, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import { useFormikContext } from "formik";
import { productCampaignFields, type CampaignInput, type CatalogProduct } from "@retail-media/shared";
import { searchProducts } from "@/lib/api";

export function ProductPicker() {
  const { setValues } = useFormikContext<CampaignInput>();
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CatalogProduct[]>([]);
  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await searchProducts(query.slice(0, 200), controller.signal);
        if (!controller.signal.aborted) {
          setOptions(result.products);
          setTotal(result.total);
          setError(false);
        }
      } catch {
        if (!controller.signal.aborted) { setError(true); setOptions([]); }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  function selectProduct(product: CatalogProduct | null) {
    setSelected(product);
    if (!product) return;
    void setValues((values) => ({
      ...values,
      ...productCampaignFields(product),
      targeting: { ...values.targeting, categories: product.categories },
    }));
  }

  return (
    <Stack gap={1.5}>
      <Autocomplete
        disablePortal
        options={options}
        value={selected}
        inputValue={query}
        loading={loading}
        filterOptions={(items) => items}
        getOptionLabel={(product) => product.name}
        isOptionEqualToValue={(a, b) => a.objectID === b.objectID}
        onInputChange={(_, value) => setQuery(value)}
        onChange={(_, product) => selectProduct(product)}
        noOptionsText={error ? "Catalog unavailable" : "No products found"}
        renderOption={(props, product) => (
          <li {...props} key={product.objectID}>
            <Stack>
              <Typography variant="body2">{product.name}</Typography>
              <Typography variant="caption" color="text.secondary">{product.brand} · {product.sku}</Typography>
            </Stack>
          </li>
        )}
        renderInput={(params) => (
          <TextField {...params} label="Find a catalog product" placeholder="Search products, brands or SKUs"
            helperText={total === null ? "Choose a product to fill its details and suggested copy." : `${total.toLocaleString()} ${query ? "matching" : "available"} products. Selecting one replaces product details, categories and suggested copy.`}
            InputProps={{ ...params.InputProps, endAdornment: <>{loading ? <CircularProgress size={18} aria-label="Searching the product catalog" /> : null}{params.InputProps.endAdornment}</> }} />
        )}
      />
      {error ? <Alert severity="warning">The catalog couldn&apos;t be loaded. You can enter product details below.</Alert> : null}
      {!loading && total === 0 && !query && !error ? <Alert severity="info">The sample catalog hasn&apos;t been imported yet. You can still enter a product below.</Alert> : null}
      {selected ? (
        <Stack direction="row" gap={2} alignItems="center">
          {selected.imageUrl ? <Box component="img" src={selected.imageUrl} alt={selected.name} sx={{ width: 72, height: 72, objectFit: "contain" }} /> : null}
          <Typography variant="caption" color="text.secondary">Historical Best Buy sample data. Review the copy, image and destination before launching.</Typography>
        </Stack>
      ) : null}
    </Stack>
  );
}
