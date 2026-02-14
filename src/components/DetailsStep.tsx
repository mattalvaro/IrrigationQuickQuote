import { WizardData, ConnectionType } from "@/lib/types";

interface DetailsStepProps {
  data: WizardData;
  onUpdate: (partial: Partial<WizardData>) => void;
}

const connectionOptions: Record<"mains" | "bore", { value: ConnectionType; label: string }[]> = {
  mains: [
    { value: "20mmGateValve", label: "20mm Gate Valve" },
    { value: "tap", label: "Tap" },
    { value: "unsure", label: "Unsure" },
  ],
  bore: [
    { value: "pumpInWell", label: "Pump in Well" },
    { value: "submersible", label: "Submersible" },
    { value: "unsure", label: "Unsure" },
  ],
};

export function DetailsStep({ data, onUpdate }: DetailsStepProps) {
  const showConnectionType = data.waterSource === "mains" || data.waterSource === "bore";
  const options = showConnectionType ? connectionOptions[data.waterSource as "mains" | "bore"] : [];

  function handleWaterSourceChange(value: WizardData["waterSource"]) {
    onUpdate({ waterSource: value, connectionType: "" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-forest-deep mb-1">Additional Details</h2>
        <p className="text-sm text-txt-muted">Tell us about your water supply so we can refine your quote.</p>
      </div>

      <div className="space-y-5 stagger-children">
        <div>
          <label htmlFor="waterSource" className="form-label">
            Water Source
          </label>
          <div className="relative">
            <select
              id="waterSource"
              value={data.waterSource}
              onChange={(e) => handleWaterSourceChange(e.target.value as WizardData["waterSource"])}
              className="form-input appearance-none pr-10 cursor-pointer"
            >
              <option value="">Select your water source...</option>
              <option value="mains">Mains</option>
              <option value="bore">Bore</option>
              <option value="other">Other</option>
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-txt-muted pointer-events-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
          </div>
        </div>

        {showConnectionType && (
          <div className="animate-fade-in-up">
            <label htmlFor="connectionType" className="form-label">
              Connection Type
            </label>
            <div className="relative">
              <select
                id="connectionType"
                value={data.connectionType}
                onChange={(e) => onUpdate({ connectionType: e.target.value as ConnectionType })}
                className="form-input appearance-none pr-10 cursor-pointer"
              >
                <option value="">Select connection type...</option>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-txt-muted pointer-events-none">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
