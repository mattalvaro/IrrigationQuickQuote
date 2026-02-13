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
      <h2 className="text-xl font-semibold">Additional Details</h2>

      <div>
        <label htmlFor="waterSource" className="block text-sm font-medium text-gray-700 mb-1">
          Water Source
        </label>
        <select
          id="waterSource"
          value={data.waterSource}
          onChange={(e) => handleWaterSourceChange(e.target.value as WizardData["waterSource"])}
          className="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="">Select...</option>
          <option value="mains">Mains</option>
          <option value="bore">Bore</option>
          <option value="other">Other</option>
        </select>
      </div>

      {showConnectionType && (
        <div>
          <label htmlFor="connectionType" className="block text-sm font-medium text-gray-700 mb-1">
            Connection Type
          </label>
          <select
            id="connectionType"
            value={data.connectionType}
            onChange={(e) => onUpdate({ connectionType: e.target.value as ConnectionType })}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Select...</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
