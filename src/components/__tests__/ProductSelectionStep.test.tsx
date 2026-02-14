import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductSelectionStep } from "@/components/ProductSelectionStep";

const options = [
  {
    id: "optionA",
    label: "Option A",
    description: "Description for A",
    image: "/images/products/option-a.svg",
    price: 100,
  },
  {
    id: "optionB",
    label: "Option B",
    description: "Description for B",
    image: "/images/products/option-b.svg",
    price: 0,
  },
  {
    id: "optionC",
    label: "Option C",
    description: "Description for C",
    image: "/images/products/option-c.svg",
    price: 250,
  },
];

describe("ProductSelectionStep", () => {
  it("renders title and description", () => {
    render(
      <ProductSelectionStep
        title="Pick a product"
        description="Choose wisely"
        options={options}
        selectedId="optionA"
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText("Pick a product")).toBeInTheDocument();
    expect(screen.getByText("Choose wisely")).toBeInTheDocument();
  });

  it("renders all option cards", () => {
    render(
      <ProductSelectionStep
        title="Pick"
        description="Desc"
        options={options}
        selectedId="optionA"
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText("Option A")).toBeInTheDocument();
    expect(screen.getByText("Option B")).toBeInTheDocument();
    expect(screen.getByText("Option C")).toBeInTheDocument();
  });

  it("does not display pricing on cards", () => {
    render(
      <ProductSelectionStep
        title="Pick"
        description="Desc"
        options={options}
        selectedId="optionA"
        onSelect={vi.fn()}
      />
    );

    expect(screen.queryByText("+$100")).not.toBeInTheDocument();
    expect(screen.queryByText("Included")).not.toBeInTheDocument();
    expect(screen.queryByText("+$250")).not.toBeInTheDocument();
  });

  it("calls onSelect when a card is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <ProductSelectionStep
        title="Pick"
        description="Desc"
        options={options}
        selectedId="optionA"
        onSelect={onSelect}
      />
    );

    await user.click(screen.getByText("Option B"));
    expect(onSelect).toHaveBeenCalledWith("optionB");
  });

  it("highlights the selected card", () => {
    render(
      <ProductSelectionStep
        title="Pick"
        description="Desc"
        options={options}
        selectedId="optionA"
        onSelect={vi.fn()}
      />
    );

    const selectedButton = screen.getByText("Option A").closest("button");
    expect(selectedButton?.className).toContain("selected");

    const unselectedButton = screen.getByText("Option B").closest("button");
    expect(unselectedButton?.className).not.toContain("selected");
  });
});
