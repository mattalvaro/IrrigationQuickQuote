import { WizardData } from "@/lib/types";

interface LeadCaptureStepProps {
  data: WizardData;
  onUpdate: (partial: Partial<WizardData>) => void;
  onSubmit: () => void;
}

export function LeadCaptureStep({ data, onUpdate, onSubmit }: LeadCaptureStepProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold">Get Your Estimate</h2>

      <p className="text-sm text-gray-500">
        Enter your details to receive your guide price estimate. A team member
        will be in touch to confirm the final price based on a site assessment.
      </p>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={data.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={data.email}
          onChange={(e) => onUpdate({ email: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone
        </label>
        <input
          id="phone"
          type="tel"
          required
          value={data.phone}
          onChange={(e) => onUpdate({ phone: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <button
        type="submit"
        className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
      >
        Get My Estimate
      </button>
    </form>
  );
}
