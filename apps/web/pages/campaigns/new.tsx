import { useState } from "react";
import { useRouter } from "next/router";
import { Formik, Form } from "formik";
import { Stack, Typography, Stepper, Step, StepLabel, Button, Alert } from "@mui/material";
import { formikValidateCampaign, type CampaignInput } from "@retail-media/shared";
import { StepBasics } from "@/components/wizard/StepBasics";
import { StepTargeting } from "@/components/wizard/StepTargeting";
import { StepCreative } from "@/components/wizard/StepCreative";
import { StepReview } from "@/components/wizard/StepReview";
import { createCampaign, setCampaignStatus } from "@/lib/api";

const STEPS = ["Basics", "Targeting & budget", "Creative", "Review & launch"];

// Fields relevant to each step, used to decide whether "Next" should be blocked.
const STEP_FIELDS: string[][] = [
  ["advertiserName", "productSku", "productName", "destinationUrl"],
  ["targeting.categories", "targeting.placements", "budget.dailyCapCents", "budget.totalCapCents", "frequencyCap.impressionsPerUserPerDay", "schedule.startDate", "schedule.endDate"],
  ["headline", "bodyCopy"],
  [],
];

const initialValues: CampaignInput = {
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
  return path.split(".").reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), obj);
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);

  return (
    <Stack gap={4} maxWidth={720}>
      <Stack gap={0.5}>
        <Typography variant="h4">New campaign</Typography>
        <Typography variant="body2" color="text.secondary">
          Every field here is validated against the same JSON Schema campaign-api enforces on write.
        </Typography>
      </Stack>

      <Stepper activeStep={activeStep}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Formik<CampaignInput>
        initialValues={initialValues}
        validate={formikValidateCampaign}
        onSubmit={async (values, helpers) => {
          setSubmitError(null);
          setLaunching(true);
          try {
            const campaign = await createCampaign(values);
            await setCampaignStatus(campaign.id ?? (campaign as unknown as { _id: string })._id, "active");
            router.push("/");
          } catch (err) {
            setSubmitError("Couldn't create the campaign. Check that campaign-api is running (see README).");
          } finally {
            setLaunching(false);
            helpers.setSubmitting(false);
          }
        }}
      >
        {({ errors, touched, setTouched, validateForm, submitForm, isSubmitting }) => (
          <Form>
            <Stack gap={4}>
              {activeStep === 0 && <StepBasics />}
              {activeStep === 1 && <StepTargeting />}
              {activeStep === 2 && <StepCreative />}
              {activeStep === 3 && <StepReview />}

              {submitError ? <Alert severity="error">{submitError}</Alert> : null}

              <Stack direction="row" justifyContent="space-between">
                <Button disabled={activeStep === 0} onClick={() => setActiveStep((s) => s - 1)}>
                  Back
                </Button>

                {activeStep < STEPS.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={async () => {
                      const stepErrors = await validateForm();
                      const relevantFields = STEP_FIELDS[activeStep];
                      const blocking = relevantFields.some((f) => getIn(stepErrors as Record<string, unknown>, f));
                      const touchedPatch: Record<string, boolean> = {};
                      relevantFields.forEach((f) => (touchedPatch[f] = true));
                      setTouched({ ...touched, ...touchedPatch }, false);
                      if (!blocking) setActiveStep((s) => s + 1);
                    }}
                  >
                    Next
                  </Button>
                ) : (
                  <Button variant="contained" color="primary" onClick={submitForm} disabled={isSubmitting || launching}>
                    {launching ? "Launching..." : "Launch campaign"}
                  </Button>
                )}
              </Stack>
            </Stack>
          </Form>
        )}
      </Formik>
    </Stack>
  );
}
