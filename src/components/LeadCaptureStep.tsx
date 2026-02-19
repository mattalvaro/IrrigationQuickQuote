import { WizardData } from "@/lib/types";

interface LeadCaptureStepProps {
  data: WizardData;
  onUpdate: (partial: Partial<WizardData>) => void;
  onSubmit: () => void;
  submitting?: boolean;
  error?: string | null;
}

export function LeadCaptureStep({ data, onUpdate, onSubmit, submitting, error }: LeadCaptureStepProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-forest-deep mb-1">Get Your Estimate</h2>
        <p className="text-sm text-txt-muted">
          Enter your details to receive your guide price. A team member
          will be in touch to confirm the final price based on a site assessment.
        </p>
      </div>

      <div className="space-y-4 stagger-children">
        <div>
          <label htmlFor="name" className="form-label">Full Name</label>
          <input
            id="name"
            type="text"
            required
            value={data.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="form-input"
            placeholder="Your full name"
          />
        </div>

        <div>
          <label htmlFor="email" className="form-label">Email Address</label>
          <input
            id="email"
            type="email"
            required
            value={data.email}
            onChange={(e) => onUpdate({ email: e.target.value })}
            className="form-input"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="phone" className="form-label">Phone Number</label>
          <input
            id="phone"
            type="tel"
            required
            value={data.phone}
            onChange={(e) => onUpdate({ phone: e.target.value })}
            className="form-input"
            placeholder="04XX XXX XXX"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed">
        <span className="flex items-center justify-center gap-2">
          {submitting ? "Submitting..." : "Get My Estimate"}
          {!submitting && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          )}
        </span>
      </button>
    </form>
  );
}
