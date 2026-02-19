import { WizardData } from "@/lib/types";
import { calculateQuote, getDefaultConfig } from "@/lib/pricing";

const formatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

interface EstimateStepProps {
  data: WizardData;
}

export function EstimateStep({ data }: EstimateStepProps) {
  const totalLawn = data.lawnAreas.reduce((sum, a) => sum + a.sqm, 0);
  const totalGarden = data.gardenAreas.reduce((sum, a) => sum + a.sqm, 0);

  const quote = calculateQuote(
    {
      lawnAreaSqm: totalLawn,
      gardenAreaSqm: totalGarden,
      lawnSprinklerType: data.lawnAreas.length > 0 ? data.lawnSprinklerType : undefined,
      gardenSprinklerType: data.gardenAreas.length > 0 ? data.gardenSprinklerType : undefined,
      lawnNozzleType: data.lawnAreas.length > 0 && data.lawnSprinklerType === "popUp" ? data.lawnNozzleType : undefined,
      gardenNozzleType: data.gardenAreas.length > 0 && data.gardenSprinklerType === "popUp" ? data.gardenNozzleType : undefined,
      controllerType: data.controllerType,
    },
    getDefaultConfig()
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-forest-deep mb-1">Your Estimate</h2>
        <p className="text-sm text-txt-muted">Here&apos;s a breakdown of your guide price.</p>
      </div>

      <div className="bg-cream/60 rounded-2xl border border-border-light p-5">
        <table className="w-full">
          <tbody>
            {quote.lineItems.map((item, i) => (
              <tr key={item.label} className="estimate-row" style={{ animationDelay: `${i * 0.05}s` }}>
                <td className="py-3 text-sm text-txt-secondary">
                  {item.label}
                  {item.detail && (
                    <span className="text-xs text-txt-muted ml-1.5">({item.detail})</span>
                  )}
                </td>
                <td className="py-3 text-right text-sm font-semibold text-txt-primary tabular-nums">
                  {formatter.format(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-forest-mid/20">
              <td className="pt-4 pb-2">
                <span className="font-display text-xl text-forest-deep">Guide Price Total</span>
              </td>
              <td className="pt-4 pb-2 text-right">
                <span className="font-display text-2xl text-forest-deep tabular-nums">
                  {formatter.format(quote.total)}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-txt-muted italic leading-relaxed">
        This is a guide price only and would need to be confirmed based on a site assessment.
        Actual costs may vary depending on site conditions and material availability.
      </p>
    </div>
  );
}
