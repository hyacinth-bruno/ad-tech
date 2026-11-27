import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Formik, Form, setIn } from "formik";
import { Stack, Typography, Stepper, Step, StepLabel, Button, Alert, Box, Card, CardContent, Chip } from "@mui/material";
import { formikValidateCampaign, type CampaignInput } from "@retail-media/shared";
import { StepBasics } from "@/components/wizard/StepBasics";
import { StepTargeting } from "@/components/wizard/StepTargeting";
import { StepCreative } from "@/components/wizard/StepCreative";
import { StepReview } from "@/components/wizard/StepReview";
import { createCampaign } from "@/lib/api";
import { CampaignCreative, ConsoleHeading } from "@/components/console/ConsoleComponents";
import Link from "next/link";
import { campaignFieldLabel, campaignFieldError } from "@/lib/campaignAccessibility";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const STEPS = ["Basics", "Targeting & budget", "Creative", "Review & create"];

// Fields relevant to each step, used to decide whether "Next" should be blocked.
const STEP_FIELDS: string[][] = [
  ["advertiserName", "productSku", "productName", "destinationUrl"],
  ["targeting.categories", "targeting.placements", "budget.dailyCapCents", "budget.totalCapCents", "frequencyCap.impressionsPerUserPerDay", "schedule.startDate", "schedule.endDate"],
  ["headline", "bodyCopy"],
  ["status"],
];

const initialValues: CampaignInput = {
  status: "active",
  advertiserName: "",
  productSku: "",
  productName: "",
  headline: "",
  bodyCopy: "",
  destinationUrl: "",
  imageUrl: "",
  budget: { dailyCapCents: 5000, totalCapCents: 100000 },
  targeting: { categories: [], keywords: [], placements: [] },
  frequencyCap: { impressionsPerUserPerDay: 3 },
  schedule: { startDate: "", endDate: "" },
};

function getIn(obj: Record<string, unknown>, path: string): unknown {
  if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
  return path.split(".").reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), obj);
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(activeStep);
  useEffect(() => {
    if (previousStep.current === activeStep) return;
    previousStep.current = activeStep;
    headingRef.current?.focus();
  }, [activeStep]);
  function focusField(path: string) {
    const element = document.getElementById(`field-${path.replace(/[^a-zA-Z0-9]/g, "-")}`);
    const input = element?.matches("input, select, textarea") ? element : element?.querySelector<HTMLElement>("input, select, textarea");
    input?.focus();
  }

  return (
    <Stack gap={3.5}>
      <ConsoleHeading eyebrow="MAKE YOUR NEXT CONNECTION" title="Create a campaign." description="Start with a product. Find your audience. Make a little room for discovery." action={<Button component={Link} href="/" startIcon={<ArrowBackIcon />}>Back to campaigns</Button>} />

      <Stepper activeStep={activeStep} alternativeLabel>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Formik<CampaignInput>
        initialValues={initialValues}
        validate={(values) => Object.entries(formikValidateCampaign(values)).reduce((nested, [path, message]) => setIn(nested, path, message), {})}
        onSubmit={async (values, helpers) => {
          setSubmitError(null);
          try {
            await createCampaign(values);
            await router.push("/");
          } catch (err) {
            setSubmitError("Couldn't create the campaign. Please try again.");
          } finally {
            helpers.setSubmitting(false);
          }
        }}
      >
        {({ values, errors, touched, setTouched, validateForm, submitForm, isSubmitting }) => (
          <Form noValidate>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "minmax(0,1.6fr) minmax(0,1fr)" }, gap: 3, alignItems: "start" }}>
            <Card><CardContent sx={{ p: { xs: 2.5, sm: 4 }, "&:last-child": { pb: { xs: 2.5, sm: 4 } } }}><Stack gap={3}>
              <Box><Typography variant="overline" color="secondary">STEP {activeStep + 1} OF {STEPS.length}</Typography><Typography variant="h5" component="h2" ref={headingRef} tabIndex={-1} mt={0.5}>{STEPS[activeStep]}</Typography></Box>
              {attempted && STEP_FIELDS[activeStep].some((path) => getIn(errors as Record<string, unknown>, path)) && <Alert severity="error" role="alert"><Typography component="p" fontWeight={600}>Check the highlighted fields before continuing.</Typography><ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>{STEP_FIELDS[activeStep].filter((path) => getIn(errors as Record<string, unknown>, path)).map((path) => <li key={path}><button type="button" className="error-link" onClick={() => focusField(path)}>{campaignFieldLabel(path)}: {campaignFieldError(path, String(getIn(errors as Record<string, unknown>, path)))}</button></li>)}</ul></Alert>}
              {activeStep === 0 && <StepBasics />}
              {activeStep === 1 && <StepTargeting />}
              {activeStep === 2 && <StepCreative />}
              {activeStep === 3 && <StepReview />}

              {submitError ? <Alert severity="error">{submitError}</Alert> : null}

              <Stack direction="row" justifyContent="space-between">
                <Button disabled={activeStep === 0 || isSubmitting} onClick={() => { setAttempted(false); setActiveStep((s) => s - 1); }}>
                  Back
                </Button>

                {activeStep < STEPS.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={async () => {
                      const stepErrors = await validateForm();
                      const relevantFields = STEP_FIELDS[activeStep];
                      const blocking = relevantFields.some((f) => getIn(stepErrors as Record<string, unknown>, f));
                      let nextTouched = touched;
                      relevantFields.forEach((f) => { nextTouched = setIn(nextTouched, f, true); });
                      setTouched(nextTouched, false);
                      setAttempted(blocking);
                      if (!blocking) setActiveStep((s) => s + 1);
                      else requestAnimationFrame(() => focusField(relevantFields.find((f) => getIn(stepErrors as Record<string, unknown>, f))!));
                    }}
                  >
                    Next
                  </Button>
                ) : (
                  <Button variant="contained" color="primary" onClick={submitForm} disabled={isSubmitting}>
                    {isSubmitting ? "Saving…" : values.status === "active" ? "Launch campaign" : values.status === "draft" ? "Save draft" : `Create ${values.status} campaign`}
                  </Button>
                )}
              </Stack>
            </Stack></CardContent></Card>
            <Stack gap={2} sx={{ position: { md: "sticky" }, top: 175 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="overline" color="text.secondary">YOUR SPONSORED LISTING</Typography><Chip label="Live preview" size="small" variant="outlined" /></Stack>
              <Card><CampaignCreative creative={values} /></Card>
              <Box sx={{ bgcolor: "#eef3e7", border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5 }}><Typography variant="subtitle2" fontSize={12}>A little preview. A clearer picture.</Typography><Typography variant="body2" fontSize={11} color="text.secondary" mt={0.7}>Your creative updates as you build. Review your product, audience and campaign details before saving.</Typography></Box>
            </Stack>
            </Box>
          </Form>
        )}
      </Formik>
    </Stack>
  );
}
