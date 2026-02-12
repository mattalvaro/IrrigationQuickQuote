import Image from "next/image";

export interface ProductOption {
  id: string;
  label: string;
  description: string;
  image: string;
  price: number;
}

interface ProductSelectionStepProps {
  title: string;
  description: string;
  options: ProductOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ProductSelectionStep({
  title,
  description,
  options,
  selectedId,
  onSelect,
}: ProductSelectionStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-gray-600 mt-1">{description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={`rounded-lg border-2 p-4 text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="relative w-full aspect-[4/3] mb-3 rounded overflow-hidden bg-gray-100">
                <Image
                  src={option.image}
                  alt={option.label}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
              </div>
              <h3 className="font-medium text-gray-900">{option.label}</h3>
              <p className="text-sm text-gray-500 mt-1">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
