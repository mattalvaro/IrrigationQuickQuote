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
        <h2 className="font-display text-2xl text-forest-deep mb-1">{title}</h2>
        <p className="text-sm text-txt-muted">{description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={`product-card text-left ${isSelected ? "selected" : ""}`}
            >
              <div className="relative w-full aspect-[4/3] mb-3 rounded-xl overflow-hidden bg-cream-dark">
                <Image
                  src={option.image}
                  alt={option.label}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
              </div>
              <h3 className="font-semibold text-txt-primary text-[0.95rem]">{option.label}</h3>
              <p className="text-xs text-txt-muted mt-1 leading-relaxed">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
