import { WizardData } from "@/lib/types";

interface DetailsStepProps {
  data: WizardData;
  onUpdate: (partial: Partial<WizardData>) => void;
}

export function DetailsStep({ data, onUpdate }: DetailsStepProps) {
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
          onChange={(e) => onUpdate({ waterSource: e.target.value as WizardData["waterSource"] })}
          className="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="">Select...</option>
          <option value="mains">Mains</option>
          <option value="bore">Bore</option>
          <option value="tank">Tank</option>
        </select>
      </div>

      <div>
        <label htmlFor="tapPoints" className="block text-sm font-medium text-gray-700 mb-1">
          Number of Tap Points
        </label>
        <input
          id="tapPoints"
          type="number"
          min={1}
          max={10}
          value={data.tapPoints}
          onChange={(e) => onUpdate({ tapPoints: parseInt(e.target.value, 10) || 1 })}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

    </div>
  );
}
