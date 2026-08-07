import { TextField, type TextFieldProps } from "@mui/material";
import { useField } from "formik";

type Props = Omit<TextFieldProps, "name" | "value" | "onChange" | "onBlur" | "error" | "helperText"> & {
  name: string;
  helperText?: string;
};

/**
 * Thin bridge between Formik and MUI. Error text comes straight from the
 * shared ajv validator (see packages/shared/src/validate.ts), so what the
 * user sees here is generated from the exact same JSON Schema the API
 * enforces server-side.
 */
export function FormField({ name, helperText, ...rest }: Props) {
  const [field, meta] = useField(name);
  const showError = Boolean(meta.touched && meta.error);
  return (
    <TextField
      {...field}
      {...rest}
      name={name}
      fullWidth
      error={showError}
      helperText={showError ? meta.error : helperText}
    />
  );
}
