"use client";

import { useState, useCallback, useMemo } from "react";
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
  loading: () => <div className="w-full h-96 bg-gray-100 animate-pulse rounded" />,
});

export function Wizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<WizardData>(initialWizardData);
  const [submitted, setSubmitted] = useState(false);

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

  function next() {
    if (currentStep === "map") {
      window.dispatchEvent(new Event("wizard:beforeNext"));
    }
    if (!isLast) setStepIndex((i) => i + 1);
  }

  function back() {
    if (!isFirst) setStepIndex((i) => i - 1);
  }

  const updateData = useCallback((partial: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  async function handleSubmit() {
    const totalLawn = data.lawnAreas.reduce((sum, a) => sum + a.sqm, 0);
    const totalGarden = data.gardenAreas.reduce((sum, a) => sum + a.sqm, 0);

    await fetch("/api/leads", {
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
        inputData: data,
        mapSnapshot: data.mapSnapshot,
      }),
    });

    setSubmitted(true);
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <p className="text-sm text-gray-500 mb-2">Step {stepIndex + 1} of {activeSteps.length}</p>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / activeSteps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="min-h-[300px]">
        {currentStep === "welcome" && <WelcomePlaceholder />}
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
          <LeadCaptureStep data={data} onUpdate={updateData} onSubmit={handleSubmit} />
        )}
        {currentStep === "lead" && submitted && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Thank You!</h2>
            <p className="text-gray-600">Your guide price estimate has been sent. A team member will be in touch to confirm.</p>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-6">
        {!isFirst ? (
          <button
            onClick={back}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Back
          </button>
        ) : (
          <div />
        )}
        {!isLast && (
          <button
            onClick={next}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

function WelcomePlaceholder() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Welcome to IrrigationQuickQuote</h1>
      <p className="text-gray-600">
        Get a guide price for your DIY irrigation project in minutes.
        Measure your property on the map, answer a few questions, and
        receive an estimate.
      </p>
      <p className="text-sm text-gray-400 mt-4">
        This is a guide price only and would need to be confirmed based on a site assessment.
      </p>
    </div>
  );
}
