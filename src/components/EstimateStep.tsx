import { WizardData } from "@/lib/types";
import { calculateQuote, getDefaultConfig } from "@/lib/pricing";

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
      sprinklerType: data.sprinklerType,
      nozzleType: data.nozzleType,
      controllerType: data.controllerType,
    },
    getDefaultConfig()
  );

  const formatter = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Your Estimate</h2>

      <table className="w-full">
        <tbody>
          {quote.lineItems.map((item) => (
            <tr key={item.label} className="border-b border-gray-100">
              <td className="py-2 text-gray-700">
                {item.label}
                {item.detail && (
                  <span className="text-sm text-gray-400 ml-2">({item.detail})</span>
                )}
              </td>
              <td className="py-2 text-right font-medium">
                {formatter.format(item.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-900">
            <td className="py-3 font-bold text-lg">Guide Price Total</td>
            <td className="py-3 text-right font-bold text-lg">
              {formatter.format(quote.total)}
            </td>
          </tr>
        </tfoot>
      </table>

      <p className="text-sm text-gray-500 italic">
        This is a guide price only and would need to be confirmed based on a site assessment.
      </p>
    </div>
  );
}
