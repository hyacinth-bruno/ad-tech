import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import { CAMPAIGN_JSON_SCHEMA, type CampaignInput } from "./schemas/campaign.schema";

const ajv = new Ajv({ allErrors: true, coerceTypes: true, useDefaults: true });
addFormats(ajv);

const validateCampaignRaw = ajv.compile<CampaignInput>(CAMPAIGN_JSON_SCHEMA);

export interface FieldErrors {
  [dottedPath: string]: string;
}

/**
 * Converts ajv's instancePath-based errors ("/budget/dailyCapCents") into a
 * flat map of dotted field paths -> human readable messages ("budget.dailyCapCents").
 * This shape is what Formik expects to hang off `errors` when you point its
 * `validate` prop at a non-Yup validator.
 */
function toFieldErrors(errors: ErrorObject[] | null | undefined): FieldErrors {
  const out: FieldErrors = {};
  for (const err of errors ?? []) {
    let path = err.instancePath.replace(/^\//, "").replace(/\//g, ".");
    if (!path && err.params && "missingProperty" in err.params) {
      path = String((err.params as Record<string, unknown>).missingProperty);
    }
    if (!path) continue;
    if (!out[path]) out[path] = capitalize(`${path.split(".").pop()} ${err.message ?? "is invalid"}`);
  }
  return out;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Used server-side (campaign-api) before writing to MongoDB. */
export function validateCampaign(input: unknown): { valid: true; data: CampaignInput } | { valid: false; errors: FieldErrors } {
  const valid = validateCampaignRaw(input);
  if (valid) {
    return { valid: true, data: input as CampaignInput };
  }
  return { valid: false, errors: toFieldErrors(validateCampaignRaw.errors) };
}

/**
 * Used client-side as Formik's `validate` prop:
 *   <Formik validate={formikValidateCampaign} ... />
 * Formik expects either an empty object (valid) or a nested error object;
 * since our schema errors are flat dotted paths and Formik nests by field
 * name via `name="budget.dailyCapCents"`, a flat object keyed by dotted path
 * works directly with `getIn`/`<ErrorMessage name="budget.dailyCapCents" />`.
 */
export function formikValidateCampaign(values: unknown): FieldErrors {
  const result = validateCampaign(values);
  return result.valid ? {} : result.errors;
}
