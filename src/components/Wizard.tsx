"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { WizardData, initialWizardData, STEP_ORDER } from "@/lib/types";
import { DetailsStep } from "@/components/DetailsStep";
import { EstimateStep } from "@/components/EstimateStep";
import { LeadCaptureStep } from "@/components/LeadCaptureStep";
import { ProductSelectionStep } from "@/components/ProductSelectionStep";
import {
  lawnSprinklerOptions,
  gardenSprinklerOptions,
  lawnNozzleOptions,
  gardenNozzleOptions,
  controllerOptions,
} from "@/config/productOptions";
import dynamic from "next/dynamic";

const MapStep = dynamic(() => import("@/components/MapStep").then((m) => m.MapStep), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 rounded-2xl bg-cream-dark animate-pulse" />
  ),
});

const STEP_LABELS: Record<string, string> = {
  welcome: "Welcome",
  map: "Property",
  lawnSprinklerType: "Lawn Sprinklers",
  gardenSprinklerType: "Garden Sprinklers",
  lawnNozzleType: "Lawn Nozzles",
  gardenNozzleType: "Garden Nozzles",
  controllerType: "Controller",
  details: "Details",
  estimate: "Estimate",
  lead: "Contact",
};

export function Wizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<WizardData>(initialWizardData);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const activeSteps = useMemo(() => {
    return STEP_ORDER.filter((step) => {
      if (step === "lawnSprinklerType") return data.lawnAreas.length > 0;
      if (step === "gardenSprinklerType") return data.gardenAreas.length > 0;
      if (step === "lawnNozzleType") return data.lawnAreas.length > 0 && data.lawnSprinklerType === "popUp";
      if (step === "gardenNozzleType") return data.gardenAreas.length > 0 && data.gardenSprinklerType === "popUp";
      return true;
    });
  }, [data.lawnAreas.length, data.gardenAreas.length, data.lawnSprinklerType, data.gardenSprinklerType]);

  const currentStep = activeSteps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === activeSteps.length - 1;

  function animateTransition(newIndex: number) {
    setTransitioning(true);
    setTimeout(() => {
      setStepIndex(newIndex);
      setAnimKey((k) => k + 1);
      setTransitioning(false);
    }, 250);
  }

  function next() {
    if (currentStep === "map") {
      window.dispatchEvent(new Event("wizard:beforeNext"));
    }
    if (!isLast) animateTransition(stepIndex + 1);
  }

  function back() {
    if (!isFirst) animateTransition(stepIndex - 1);
  }

  const updateData = useCallback((partial: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const totalLawn = data.lawnAreas.reduce((sum, a) => sum + a.sqm, 0);
      const totalGarden = data.gardenAreas.reduce((sum, a) => sum + a.sqm, 0);

      const { mapSnapshot, ...inputDataWithoutSnapshot } = data;

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          estimate: {
            totalLawn,
            totalGarden,
            lawnSprinklerType: data.lawnSprinklerType,
            gardenSprinklerType: data.gardenSprinklerType,
            lawnNozzleType: data.lawnNozzleType,
            gardenNozzleType: data.gardenNozzleType,
            controllerType: data.controllerType,
            waterSource: data.waterSource,
            connectionType: data.connectionType,
          },
          inputData: inputDataWithoutSnapshot,
          mapSnapshot: mapSnapshot,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit");
      }

      setSubmitted(true);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Scroll to top on step change
  useEffect(() => {
    contentRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [stepIndex]);

  const progress = ((stepIndex + 1) / activeSteps.length) * 100;

  return (
    <div ref={contentRef} className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6 animate-fade-in">
        <div className="inline-flex items-center gap-2 mb-3">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="text-lawn">
            <path d="M16 2C16 2 6 10 6 18c0 5.523 4.477 10 10 10s10-4.477 10-10C26 10 16 2 16 2z" fill="currentColor" opacity="0.15"/>
            <path d="M16 4C16 4 8 11 8 18c0 4.418 3.582 8 8 8s8-3.582 8-8C24 11 16 4 16 4z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path d="M16 12v10M12 16c2 2 6 2 8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="font-display text-xl text-forest-mid tracking-tight">IrrigationQuickQuote</span>
        </div>
      </div>

      {/* Card Container */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-[0_4px_40px_rgba(0,0,0,0.06)] border border-border-light/60 overflow-hidden">
        {/* Progress Section */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-txt-secondary">
              {STEP_LABELS[currentStep] || currentStep}
            </span>
            <span className="text-xs font-medium text-txt-muted tabular-nums">
              {stepIndex + 1} / {activeSteps.length}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="progress-track h-1.5">
            <div
              className="progress-fill h-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step Dots */}
          <div className="flex justify-between mt-3 px-0.5">
            {activeSteps.map((step, i) => (
              <div
                key={step}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                  i < stepIndex
                    ? "bg-lawn scale-100"
                    : i === stepIndex
                      ? "bg-forest-mid scale-125"
                      : "bg-border scale-100"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="grass-divider mx-6" />

        {/* Step Content */}
        <div
          className={`px-6 py-8 min-h-[340px] transition-opacity duration-250 ${
            transitioning ? "opacity-0" : "opacity-100"
          }`}
        >
          <div key={animKey} className="animate-step-in">
            {currentStep === "welcome" && <WelcomeStep />}
            {currentStep === "map" && <MapStep data={data} onUpdate={updateData} />}
            {currentStep === "lawnSprinklerType" && (
              <ProductSelectionStep
                title="Choose Lawn Sprinklers"
                description="Select the sprinkler style best suited to your lawn areas."
                options={lawnSprinklerOptions}
                selectedId={data.lawnSprinklerType}
                onSelect={(id) => updateData({ lawnSprinklerType: id as WizardData["lawnSprinklerType"] })}
              />
            )}
            {currentStep === "gardenSprinklerType" && (
              <ProductSelectionStep
                title="Choose Garden Sprinklers"
                description="Select the sprinkler style best suited to your garden areas."
                options={gardenSprinklerOptions}
                selectedId={data.gardenSprinklerType}
                onSelect={(id) => updateData({ gardenSprinklerType: id as WizardData["gardenSprinklerType"] })}
              />
            )}
            {currentStep === "lawnNozzleType" && (
              <ProductSelectionStep
                title="Choose Lawn Nozzles"
                description="Pick the nozzle that matches your lawn watering needs."
                options={lawnNozzleOptions}
                selectedId={data.lawnNozzleType}
                onSelect={(id) => updateData({ lawnNozzleType: id as WizardData["lawnNozzleType"] })}
              />
            )}
            {currentStep === "gardenNozzleType" && (
              <ProductSelectionStep
                title="Choose Garden Nozzles"
                description="Pick the nozzle that matches your garden watering needs."
                options={gardenNozzleOptions}
                selectedId={data.gardenNozzleType}
                onSelect={(id) => updateData({ gardenNozzleType: id as WizardData["gardenNozzleType"] })}
              />
            )}
            {currentStep === "controllerType" && (
              <ProductSelectionStep
                title="Choose Your Controller"
                description="Select how you want to control your irrigation system."
                options={controllerOptions}
                selectedId={data.controllerType}
                onSelect={(id) => updateData({ controllerType: id as WizardData["controllerType"] })}
              />
            )}
            {currentStep === "details" && <DetailsStep data={data} onUpdate={updateData} />}
            {currentStep === "estimate" && <EstimateStep data={data} />}
            {currentStep === "lead" && !submitted && (
              <LeadCaptureStep data={data} onUpdate={updateData} onSubmit={handleSubmit} submitting={submitting} error={submitError} />
            )}
            {currentStep === "lead" && submitted && <SuccessStep />}
          </div>
        </div>

        {/* Navigation */}
        <div className="px-6 pb-6">
          <div className="grass-divider mb-5" />
          <div className="flex justify-between items-center">
            {!isFirst ? (
              <button onClick={back} className="btn-secondary">
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                  Back
                </span>
              </button>
            ) : (
              <div />
            )}
            {!isLast && (
              <button onClick={next} className="btn-primary">
                <span className="flex items-center gap-2">
                  Next
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-txt-muted mt-6">
        Guide prices are estimates only and subject to site assessment confirmation.
      </p>
    </div>
  );
}

function WelcomeStep() {
  return (
    <div className="text-center py-4 stagger-children">
      <div className="mb-6">
        <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-lawn/10 to-forest-mid/10 flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
            <path d="M24 4C24 4 8 16 8 28c0 8.837 7.163 16 16 16s16-7.163 16-16C40 16 24 4 24 4z" fill="#22c55e" opacity="0.15"/>
            <path d="M24 8C24 8 12 18 12 28c0 6.627 5.373 12 12 12s12-5.373 12-12C36 18 24 8 24 8z" stroke="#1e4430" strokeWidth="2" fill="none"/>
            <path d="M24 18v14M18 24c3 3 9 3 12 0" stroke="#1e4430" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="24" cy="14" r="2" fill="#22c55e"/>
          </svg>
        </div>
        <h1 className="font-display text-3xl text-forest-deep mb-3 tracking-tight">
          Get Your Irrigation Quote
        </h1>
        <p className="text-txt-secondary text-base max-w-md mx-auto leading-relaxed">
          Map your property, choose your products, and receive a guide price
          for your DIY irrigation project — all in just a few minutes.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mt-8">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-lawn-pale flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e4430" strokeWidth="1.5" strokeLinecap="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <p className="text-xs font-medium text-txt-secondary">Map It</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-lawn-pale flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e4430" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <p className="text-xs font-medium text-txt-secondary">Choose</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-lawn-pale flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e4430" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <p className="text-xs font-medium text-txt-secondary">Quote</p>
        </div>
      </div>
    </div>
  );
}

function SuccessStep() {
  return (
    <div className="text-center py-8 animate-scale-in">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-lawn-pale flex items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
      <h2 className="font-display text-2xl text-forest-deep mb-3">Thank You!</h2>
      <p className="text-txt-secondary max-w-sm mx-auto leading-relaxed">
        Your guide price estimate has been sent. A team member will be in touch
        shortly to confirm the details and schedule a site assessment.
      </p>
    </div>
  );
}
