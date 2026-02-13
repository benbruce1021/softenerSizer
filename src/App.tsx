import { type ReactNode, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type HardnessUnit = "mg/L (ppm) as CaCO₃" | "grains per gallon (gpg)";
type SaltDose = 6 | 8 | 10 | 12 | 15;

type FormValues = {
  hardnessValue: string;
  hardnessUnits: HardnessUnit;
  useCompensation: boolean;
  ironPpm: string;
  manganesePpm: string;
  gallonsPerDay: string;
  daysBetweenRegen: string;
  reservePercent: string;
  saltDose: SaltDose;
  overrideCapacity: boolean;
  overrideCapacityValue: string;
  saltDissolutionFactor: string;
  peakFlowGpm: string;
  serviceLoadingRate: string;
  backwashRate: string;
};

const CAPACITY_BY_SALT_DOSE: Record<SaltDose, number> = {
  6: 20000,
  8: 22500,
  10: 25000,
  12: 27500,
  15: 30000,
};

const SALT_DOSES: SaltDose[] = [6, 8, 10, 12, 15];

const DEFAULT_VALUES: FormValues = {
  hardnessValue: "",
  hardnessUnits: "mg/L (ppm) as CaCO₃",
  useCompensation: false,
  ironPpm: "0",
  manganesePpm: "0",
  gallonsPerDay: "",
  daysBetweenRegen: "",
  reservePercent: "15",
  saltDose: 8,
  overrideCapacity: false,
  overrideCapacityValue: "",
  saltDissolutionFactor: "3",
  peakFlowGpm: "",
  serviceLoadingRate: "7",
  backwashRate: "7",
};

type StepCardProps = {
  number: number;
  title: string;
  formula: ReactNode;
  result: string;
  explanation: string;
  blockedMessage?: string | null;
};

function StepCard({ number, title, formula, result, explanation, blockedMessage }: StepCardProps) {
  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-base">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/90 to-blue-600/90 text-white font-semibold shadow-sm">
            {number}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Formula Used</p>
          <div className="mt-1 space-y-1 rounded-md bg-muted/70 px-3 py-2 text-sm leading-relaxed [&_p]:m-0">{formula}</div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Computed Result</p>
          {blockedMessage ? (
            <p className="mt-1 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {blockedMessage}
            </p>
          ) : (
            <p className={`mt-1 text-lg font-semibold ${result === '—' ? 'text-muted-foreground/50' : 'text-foreground'}`}>{result}</p>
          )}
        </div>
        <p className="leading-relaxed text-muted-foreground">{explanation}</p>
      </CardContent>
    </Card>
  );
}

function parseInputNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isPositive(value: number | null): value is number {
  return value !== null && value > 0;
}

function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatResult(value: number | null, unit: string, decimals = 2): string {
  if (value === null) {
    return "—";
  }

  return `${formatNumber(value, decimals)} ${unit}`;
}

export default function App() {
  const [form, setForm] = useState<FormValues>(DEFAULT_VALUES);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  const calculated = useMemo(() => {
    const hardnessValue = parseInputNumber(form.hardnessValue);
    const gallonsPerDay = parseInputNumber(form.gallonsPerDay);
    const daysBetweenRegen = parseInputNumber(form.daysBetweenRegen);
    const reservePercent = parseInputNumber(form.reservePercent);
    const overrideCapacityValue = parseInputNumber(form.overrideCapacityValue);
    const saltDissolutionFactor = parseInputNumber(form.saltDissolutionFactor);
    const peakFlowGpm = parseInputNumber(form.peakFlowGpm);
    const serviceLoadingRate = parseInputNumber(form.serviceLoadingRate);
    const backwashRate = parseInputNumber(form.backwashRate);

    const ironPpm = form.useCompensation ? Math.max(0, parseInputNumber(form.ironPpm) ?? 0) : 0;
    const manganesePpm = form.useCompensation ? Math.max(0, parseInputNumber(form.manganesePpm) ?? 0) : 0;

    const requiredInputMissing =
      !isPositive(hardnessValue) ||
      !isPositive(gallonsPerDay) ||
      !isPositive(daysBetweenRegen) ||
      !isPositive(form.saltDose) ||
      !isPositive(peakFlowGpm) ||
      !isPositive(serviceLoadingRate);

    const reserveTooHigh = reservePercent !== null && reservePercent >= 100;
    const reserveBlockMessage = reserveTooHigh
      ? "Reserve Capacity must be below 100%. Step 5 and all later steps are blocked."
      : null;

    const serviceLoadingError =
      serviceLoadingRate !== null && serviceLoadingRate <= 0
        ? "Service Loading Rate must be greater than 0. Steps 10 through 12 are blocked."
        : null;

    let step1HardnessGpg: number | null = null;
    if (isPositive(hardnessValue)) {
      step1HardnessGpg =
        form.hardnessUnits === "mg/L (ppm) as CaCO₃" ? hardnessValue / 17.1 : hardnessValue;
    }

    let step2DesignHardnessGpg: number | null = null;
    if (step1HardnessGpg !== null) {
      step2DesignHardnessGpg = form.useCompensation
        ? step1HardnessGpg + 4 * (ironPpm + manganesePpm)
        : step1HardnessGpg;
    }

    let step3GrainsPerDay: number | null = null;
    if (step2DesignHardnessGpg !== null && isPositive(gallonsPerDay)) {
      step3GrainsPerDay = step2DesignHardnessGpg * gallonsPerDay;
    }

    let step4RequiredGrainsPerRun: number | null = null;
    if (step3GrainsPerDay !== null && isPositive(daysBetweenRegen)) {
      step4RequiredGrainsPerRun = step3GrainsPerDay * daysBetweenRegen;
    }

    let step5DesignGrainsPerRun: number | null = null;
    let step5Message: string | null = reserveBlockMessage;
    if (!reserveBlockMessage && step4RequiredGrainsPerRun !== null) {
      if (reservePercent === null) {
        step5Message = "Enter Reserve Capacity to calculate Step 5.";
      } else if (reservePercent < 0) {
        step5Message = "Reserve Capacity cannot be negative.";
      } else {
        step5DesignGrainsPerRun = step4RequiredGrainsPerRun / (1 - reservePercent / 100);
      }
    }

    let step6CapacityPerFt3: number | null = null;
    let step6Message: string | null = reserveBlockMessage;
    if (!reserveBlockMessage) {
      if (form.overrideCapacity) {
        if (isPositive(overrideCapacityValue)) {
          step6CapacityPerFt3 = overrideCapacityValue;
        } else {
          step6Message = "Override capacity per cubic foot must be greater than 0.";
        }
      } else {
        step6CapacityPerFt3 = CAPACITY_BY_SALT_DOSE[form.saltDose];
      }
    }

    let step7ResinFt3: number | null = null;
    let step7Message: string | null = reserveBlockMessage;
    if (!reserveBlockMessage && step5DesignGrainsPerRun !== null && step6CapacityPerFt3 !== null) {
      step7ResinFt3 = step5DesignGrainsPerRun / step6CapacityPerFt3;
      step7Message = null;
    } else if (!reserveBlockMessage && !step7Message) {
      step7Message = "Complete Steps 5 and 6 to calculate resin volume.";
    }

    let step8SaltLbsPerRegen: number | null = null;
    let step8Message: string | null = reserveBlockMessage;
    if (!reserveBlockMessage && step7ResinFt3 !== null) {
      step8SaltLbsPerRegen = step7ResinFt3 * form.saltDose;
      step8Message = null;
    } else if (!reserveBlockMessage && !step8Message) {
      step8Message = "Complete Step 7 to calculate salt per regeneration.";
    }

    let step9BrineWaterGallons: number | null = null;
    let step9Message: string | null = reserveBlockMessage;
    if (!reserveBlockMessage && step8SaltLbsPerRegen !== null) {
      if (isPositive(saltDissolutionFactor)) {
        step9BrineWaterGallons = step8SaltLbsPerRegen / saltDissolutionFactor;
        step9Message = null;
      } else {
        step9Message = "Salt Dissolution Factor must be greater than 0.";
      }
    } else if (!reserveBlockMessage && !step9Message) {
      step9Message = "Complete Step 8 to calculate brine refill water.";
    }

    let step10BedAreaFt2: number | null = null;
    let step10Message: string | null = reserveBlockMessage;
    if (!reserveBlockMessage) {
      if (!isPositive(peakFlowGpm)) {
        step10Message = "Peak Flow Rate must be greater than 0.";
      } else if (!isPositive(serviceLoadingRate)) {
        step10Message = "Service Loading Rate must be greater than 0. Steps 10 through 12 are blocked.";
      } else {
        step10BedAreaFt2 = peakFlowGpm / serviceLoadingRate;
        step10Message = null;
      }
    }

    let step11DiameterFt: number | null = null;
    let step11DiameterIn: number | null = null;
    let step11Message: string | null = reserveBlockMessage;
    if (!reserveBlockMessage && step10BedAreaFt2 !== null) {
      step11DiameterFt = 2 * Math.sqrt(step10BedAreaFt2 / Math.PI);
      step11DiameterIn = step11DiameterFt * 12;
      step11Message = null;
    } else if (!reserveBlockMessage && step10Message) {
      step11Message = step10Message;
    }

    let step12BackwashFlowGpm: number | null = null;
    let step12Message: string | null = reserveBlockMessage;
    if (!reserveBlockMessage && step10BedAreaFt2 !== null) {
      if (isPositive(backwashRate)) {
        step12BackwashFlowGpm = step10BedAreaFt2 * backwashRate;
        step12Message = null;
      } else {
        step12Message = "Backwash Rate must be greater than 0.";
      }
    } else if (!reserveBlockMessage && step10Message) {
      step12Message = step10Message;
    }

    return {
      requiredInputMissing,
      reserveTooHigh,
      serviceLoadingError,
      step1HardnessGpg,
      step2DesignHardnessGpg,
      step3GrainsPerDay,
      step4RequiredGrainsPerRun,
      step5DesignGrainsPerRun,
      step5Message,
      step6CapacityPerFt3,
      step6Message,
      step7ResinFt3,
      step7Message,
      step8SaltLbsPerRegen,
      step8Message,
      step9BrineWaterGallons,
      step9Message,
      step10BedAreaFt2,
      step10Message,
      step11DiameterFt,
      step11DiameterIn,
      step11Message,
      step12BackwashFlowGpm,
      step12Message,
    };
  }, [form]);

  const updateField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const resetToDefaults = () => {
    setForm(DEFAULT_VALUES);
    setCopyStatus("idle");
  };

  const summaryText = [
    "Industrial Water Softener Sizer Summary",
    `Design hardness: ${formatResult(calculated.step2DesignHardnessGpg, "grains per gallon", 2)}`,
    `Resin volume: ${formatResult(calculated.step7ResinFt3, "ft³", 2)}`,
    `Salt per regeneration: ${formatResult(calculated.step8SaltLbsPerRegen, "pounds", 2)}`,
    `Estimated brine refill water: ${formatResult(calculated.step9BrineWaterGallons, "gallons", 2)}`,
    `Minimum tank diameter estimate: ${formatResult(calculated.step11DiameterIn, "in", 2)}`,
    `Required backwash flow: ${formatResult(calculated.step12BackwashFlowGpm, "gallons per minute", 2)}`,
  ].join("\n");

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }

    setTimeout(() => {
      setCopyStatus("idle");
    }, 1800);
  };

  return (
    <main className="relative mx-auto min-h-screen max-w-[1440px] px-3 py-5 sm:px-4 md:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Industrial Water Softener Sizer</h1>
            <p className="text-xs font-medium uppercase tracking-wider text-cyan-700/80 md:text-sm">Industrial Ion Exchange Calculations</p>
          </div>
        </div>
        <p className="max-w-4xl text-sm text-muted-foreground md:text-base">
          Enter operating assumptions on the left, then review each step of the softener sizing math on the right. Values update live as you type.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,390px)_minmax(0,1fr)]">
        <section className="space-y-4 md:space-y-5">
          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Section 1 - Water Quality
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hardnessValue">Raw Hardness Value</Label>
                <Input
                  id="hardnessValue"
                  type="number"
                  min="0"
                  step="any"
                  value={form.hardnessValue}
                  onChange={(event) => updateField("hardnessValue", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hardnessUnits">Hardness Units</Label>
                <Select
                  id="hardnessUnits"
                  value={form.hardnessUnits}
                  onChange={(event) => updateField("hardnessUnits", event.target.value as HardnessUnit)}
                >
                  <option value="mg/L (ppm) as CaCO₃">mg/L (ppm) as CaCO₃</option>
                  <option value="grains per gallon (gpg)">grains per gallon (gpg)</option>
                </Select>
              </div>

              <div className="rounded-lg border border-input bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="comp-toggle">Use compensated hardness (include iron &amp; manganese)?</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{form.useCompensation ? "YES" : "NO"}</span>
                    <Switch
                      id="comp-toggle"
                      checked={form.useCompensation}
                      onCheckedChange={(checked) => updateField("useCompensation", checked)}
                    />
                  </div>
                </div>
              </div>

              {form.useCompensation && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ironPpm">Iron (Fe) (ppm)</Label>
                    <Input
                      id="ironPpm"
                      type="number"
                      min="0"
                      step="any"
                      value={form.ironPpm}
                      onChange={(event) => updateField("ironPpm", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manganesePpm">Manganese (Mn) (ppm)</Label>
                    <Input
                      id="manganesePpm"
                      type="number"
                      min="0"
                      step="any"
                      value={form.manganesePpm}
                      onChange={(event) => updateField("manganesePpm", event.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Section 2 - Demand / Operating Targets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gallonsPerDay">Total Water Use (gallons per day)</Label>
                <Input
                  id="gallonsPerDay"
                  type="number"
                  min="0"
                  step="any"
                  value={form.gallonsPerDay}
                  onChange={(event) => updateField("gallonsPerDay", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daysBetweenRegen">Target Days Between Regenerations (days)</Label>
                <Input
                  id="daysBetweenRegen"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="2"
                  value={form.daysBetweenRegen}
                  onChange={(event) => updateField("daysBetweenRegen", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reservePercent">
                  Reserve Capacity (%)
                  <span
                    className="ml-2 inline-block cursor-help rounded-full border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground"
                    title="Reserve is a safety buffer so you do not run the bed completely to zero before regeneration."
                  >
                    info
                  </span>
                </Label>
                <Input
                  id="reservePercent"
                  type="number"
                  min="0"
                  step="any"
                  value={form.reservePercent}
                  onChange={(event) => updateField("reservePercent", event.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Section 3 - Regeneration / Capacity Assumptions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="saltDose">Salt Dose (pounds of sodium chloride per cubic foot of resin)</Label>
                <Select
                  id="saltDose"
                  value={String(form.saltDose)}
                  onChange={(event) => updateField("saltDose", Number(event.target.value) as SaltDose)}
                >
                  {SALT_DOSES.map((dose) => (
                    <option key={dose} value={dose}>
                      {dose}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="rounded-lg border border-input bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="overrideCapacity">Override capacity per cubic foot?</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{form.overrideCapacity ? "ON" : "OFF"}</span>
                    <Switch
                      id="overrideCapacity"
                      checked={form.overrideCapacity}
                      onCheckedChange={(checked) => updateField("overrideCapacity", checked)}
                    />
                  </div>
                </div>
              </div>

              {form.overrideCapacity && (
                <div className="space-y-2">
                  <Label htmlFor="overrideCapacityValue">Capacity per cubic foot (grains per cubic foot)</Label>
                  <Input
                    id="overrideCapacityValue"
                    type="number"
                    min="0"
                    step="any"
                    value={form.overrideCapacityValue}
                    onChange={(event) => updateField("overrideCapacityValue", event.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="saltDissolutionFactor">Salt Dissolution Factor (pounds of salt per gallon of water)</Label>
                <Input
                  id="saltDissolutionFactor"
                  type="number"
                  min="0"
                  step="any"
                  value={form.saltDissolutionFactor}
                  onChange={(event) => updateField("saltDissolutionFactor", event.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Section 4 - Flow / Vessel Sizing Assumptions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="peakFlowGpm">Peak Flow Rate (gallons per minute)</Label>
                <Input
                  id="peakFlowGpm"
                  type="number"
                  min="0"
                  step="any"
                  value={form.peakFlowGpm}
                  onChange={(event) => updateField("peakFlowGpm", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceLoadingRate">Service Loading Rate (gallons per minute per square foot of bed area)</Label>
                <Input
                  id="serviceLoadingRate"
                  type="number"
                  min="0"
                  step="any"
                  value={form.serviceLoadingRate}
                  onChange={(event) => updateField("serviceLoadingRate", event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Lower is more conservative (less risk of hardness leakage).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="backwashRate">Backwash Rate (gallons per minute per square foot)</Label>
                <Input
                  id="backwashRate"
                  type="number"
                  min="0"
                  step="any"
                  value={form.backwashRate}
                  onChange={(event) => updateField("backwashRate", event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
                <Button onClick={resetToDefaults} variant="secondary" className="w-full sm:w-auto">
                  Reset to defaults
                </Button>
                <Button onClick={() => setCopyStatus("idle")} variant="outline" className="w-full sm:w-auto">
                  Calculate
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader className="flex flex-col gap-3 border-b border-slate-100 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Summary
                </CardTitle>
                <CardDescription>Key design outputs based on the current assumptions.</CardDescription>
              </div>
              <Button onClick={copySummary} variant="outline" className="w-full md:w-auto">
                Copy Summary to Clipboard
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {calculated.requiredInputMissing && (
                <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-3 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                      <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Ready to Calculate</p>
                      <p className="mt-0.5 text-xs text-slate-600">Complete the required fields on the left to generate sizing results</p>
                    </div>
                  </div>
                </div>
              )}
              {calculated.reserveTooHigh && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Reserve Capacity must be less than 100. Step 5 and beyond are blocked.
                </p>
              )}
              {calculated.serviceLoadingError && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {calculated.serviceLoadingError}
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Design hardness</p>
                  <p className={`mt-1 text-lg font-semibold ${calculated.step2DesignHardnessGpg === null ? 'text-muted-foreground/50' : ''}`}>
                    {formatResult(calculated.step2DesignHardnessGpg, "grains per gallon", 2)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Resin volume</p>
                  <p className={`mt-1 text-lg font-semibold ${calculated.step7ResinFt3 === null ? 'text-muted-foreground/50' : ''}`}>
                    {formatResult(calculated.step7ResinFt3, "ft³", 2)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Salt per regeneration</p>
                  <p className={`mt-1 text-lg font-semibold ${calculated.step8SaltLbsPerRegen === null ? 'text-muted-foreground/50' : ''}`}>
                    {formatResult(calculated.step8SaltLbsPerRegen, "pounds", 2)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estimated brine refill water</p>
                  <p className={`mt-1 text-lg font-semibold ${calculated.step9BrineWaterGallons === null ? 'text-muted-foreground/50' : ''}`}>
                    {formatResult(calculated.step9BrineWaterGallons, "gallons", 2)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Minimum tank diameter estimate</p>
                  <p className={`mt-1 text-lg font-semibold ${calculated.step11DiameterIn === null ? 'text-muted-foreground/50' : ''}`}>
                    {formatResult(calculated.step11DiameterIn, "in", 2)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Required backwash flow</p>
                  <p className={`mt-1 text-lg font-semibold ${calculated.step12BackwashFlowGpm === null ? 'text-muted-foreground/50' : ''}`}>
                    {formatResult(calculated.step12BackwashFlowGpm, "gallons per minute", 2)}
                  </p>
                </div>
              </div>

              {copyStatus === "copied" && <p className="text-sm text-emerald-700">Summary copied to clipboard.</p>}
              {copyStatus === "error" && (
                <p className="text-sm text-destructive">Could not copy summary. Clipboard access may be blocked.</p>
              )}
            </CardContent>
          </Card>

          <StepCard
            number={1}
            title="Step 1 - Convert Hardness to Grains per Gallon"
            formula={
              <>
                <p>If hardness is entered as milligrams per liter as CaCO₃: hardness in grains per gallon = hardness value ÷ 17.1.</p>
                <p>If hardness is already in grains per gallon: hardness in grains per gallon = hardness value.</p>
              </>
            }
            result={formatResult(calculated.step1HardnessGpg, "grains per gallon", 2)}
            explanation="This converts the hardness to grains per gallon so every later step is in one consistent unit. Softener capacity ratings are commonly expressed in grains, so grains per gallon makes the sizing math straightforward and comparable."
          />

          <StepCard
            number={2}
            title="Step 2 - Determine Design Hardness (Compensated or Not)"
            formula={
              <>
                <p>When compensation is off: design hardness = hardness in grains per gallon.</p>
                <p>When compensation is on: design hardness = hardness in grains per gallon + 4 × (iron in ppm + manganese in ppm).</p>
              </>
            }
            result={formatResult(calculated.step2DesignHardnessGpg, "grains per gallon", 2)}
            explanation="Iron and manganese can consume exchange capacity and cause the resin bed to exhaust earlier than hardness-only calculations predict. Compensation adds a conservative load so the design is less likely to leak hardness before regeneration."
          />

          <StepCard
            number={3}
            title="Step 3 - Daily Hardness Load (grains per day)"
            formula="Daily hardness load = design hardness × gallons per day."
            result={formatResult(calculated.step3GrainsPerDay, "grains per day", 0)}
            explanation="This value is the total ion-exchange workload the softener must handle every day. It links water chemistry and water volume into one operating demand number."
          />

          <StepCard
            number={4}
            title="Step 4 - Required Capacity Per Run (before reserve)"
            formula="Required capacity per run = daily hardness load × target days between regenerations."
            result={formatResult(calculated.step4RequiredGrainsPerRun, "grains", 0)}
            explanation="This is the theoretical capacity needed for the selected regeneration interval with no safety margin. It establishes the baseline run length requirement before adding reserve."
          />

          <StepCard
            number={5}
            title="Step 5 - Add Reserve (design grains per run)"
            formula="Reserve fraction = reserve capacity percent ÷ 100. Design grains per run = required grains per run ÷ (1 − reserve fraction)."
            result={formatResult(calculated.step5DesignGrainsPerRun, "grains", 0)}
            blockedMessage={calculated.step5Message}
            explanation="Reserve capacity keeps the bed from operating right at the edge of exhaustion. This buffer reduces the chance of surprise hardness breakthrough during flow spikes or schedule drift."
          />

          <StepCard
            number={6}
            title="Step 6 - Determine Working Capacity per Cubic Foot of Resin"
            formula={
              <>
                <p>When override is off: use the built-in capacity table for the selected salt dose.</p>
                <p>When override is on: use the manually entered capacity per cubic foot.</p>
              </>
            }
            result={formatResult(calculated.step6CapacityPerFt3, "grains per cubic foot", 0)}
            blockedMessage={calculated.step6Message}
            explanation="Working capacity per cubic foot depends strongly on salt dose. Higher salt dose usually recovers more capacity, but it increases salt use and operating cost."
          />

          <StepCard
            number={7}
            title="Step 7 - Required Resin Volume (cubic feet)"
            formula="Required resin volume = design grains per run ÷ working capacity per cubic foot."
            result={formatResult(calculated.step7ResinFt3, "ft³", 2)}
            blockedMessage={calculated.step7Message}
            explanation="This is the amount of resin required to carry the design grain load each run. More resin means more exchange sites available before exhaustion."
          />

          <StepCard
            number={8}
            title="Step 8 - Salt Required Per Regeneration (pounds)"
            formula="Salt required per regeneration = resin volume × salt dose."
            result={formatResult(calculated.step8SaltLbsPerRegen, "pounds", 2)}
            blockedMessage={calculated.step8Message}
            explanation="This estimates how much salt each regeneration event will consume. It is a key operating metric for salt delivery planning and ongoing cost tracking."
          />

          <StepCard
            number={9}
            title="Step 9 - Estimated Brine Refill Water (gallons)"
            formula="Estimated brine refill water = salt required per regeneration ÷ salt dissolution factor."
            result={formatResult(calculated.step9BrineWaterGallons, "gallons", 2)}
            blockedMessage={calculated.step9Message}
            explanation="This provides a practical estimate of refill water needed to dissolve regeneration salt. It helps size refill settings and confirms the brine system can support expected regeneration demand."
          />

          <StepCard
            number={10}
            title="Step 10 - Required Bed Area (square feet) from Peak Flow"
            formula="Required bed area = peak flow rate ÷ service loading rate."
            result={formatResult(calculated.step10BedAreaFt2, "ft²", 2)}
            blockedMessage={calculated.step10Message}
            explanation="This checks whether bed surface area is large enough for the expected peak service flow. Keeping loading rate in range lowers the risk of channeling and hardness leakage."
          />

          <StepCard
            number={11}
            title="Step 11 - Minimum Tank Diameter Estimate (inches)"
            formula="Tank diameter in feet = 2 × square root of (bed area ÷ pi). Tank diameter in inches = tank diameter in feet × 12."
            result={
              calculated.step11DiameterFt === null || calculated.step11DiameterIn === null
                ? "—"
                : `${formatNumber(calculated.step11DiameterFt, 2)} feet (${formatNumber(calculated.step11DiameterIn, 2)} inches)`
            }
            blockedMessage={calculated.step11Message}
            explanation="This converts required flow area into an equivalent circular vessel diameter. Treat it as a first-pass diameter before checking standard vessel sizes and bed depth limits."
          />

          <StepCard
            number={12}
            title="Step 12 - Backwash Flow Requirement (gallons per minute)"
            formula="Backwash flow requirement = bed area × backwash rate."
            result={formatResult(calculated.step12BackwashFlowGpm, "gallons per minute", 2)}
            blockedMessage={calculated.step12Message}
            explanation="Backwash reclassifies and cleans the resin bed after service. This flow requirement must be supported by the water source and drain system so cleaning is effective."
          />
        </section>
      </div>
    </main>
  );
}
