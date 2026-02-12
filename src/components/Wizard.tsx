"use client";

import { useState } from "react";
import { WizardData, initialWizardData, STEP_ORDER, WizardStep } from "@/lib/types";
import { DetailsStep } from "@/components/DetailsStep";

export function Wizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<WizardData>(initialWizardData);

  const currentStep = STEP_ORDER[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEP_ORDER.length - 1;

  function next() {
    if (!isLast) setStepIndex((i) => i + 1);
  }

  function back() {
    if (!isFirst) setStepIndex((i) => i - 1);
  }

  function updateData(partial: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <p className="text-sm text-gray-500 mb-4">
        Step {stepIndex + 1} of {STEP_ORDER.length}
      </p>

      <div className="min-h-[300px]">
        {currentStep === "welcome" && <WelcomePlaceholder />}
        {currentStep === "map" && <p>Map step placeholder</p>}
        {currentStep === "details" && <DetailsStep data={data} onUpdate={updateData} />}
        {currentStep === "estimate" && <p>Estimate step placeholder</p>}
        {currentStep === "lead" && <p>Lead capture placeholder</p>}
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
