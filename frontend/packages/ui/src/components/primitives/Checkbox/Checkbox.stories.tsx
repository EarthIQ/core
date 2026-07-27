import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Checkbox } from "./Checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "Components/Forms/Checkbox",
  component: Checkbox,
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "#1a1a2e" },
        { name: "darker", value: "#0f0f1a" },
      ],
    },
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size of the checkbox",
    },
    checked: {
      control: "boolean",
      description: "Whether the checkbox is checked",
    },
    indeterminate: {
      control: "boolean",
      description: "Whether the checkbox is in indeterminate state",
    },
    disabled: {
      control: "boolean",
      description: "Whether the checkbox is disabled",
    },
    label: {
      control: "text",
      description: "Label text for the checkbox",
    },
    description: {
      control: "text",
      description: "Description text below the label",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

// Basic checkbox
export const Default: Story = {
  args: {
    label: "Accept terms and conditions",
  },
};

// Controlled checkbox example
export const Controlled: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <Checkbox
        label="Controlled checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
      />
    );
  },
};

// Checked state
export const Checked: Story = {
  args: {
    label: "This is checked",
    checked: true,
  },
};

// With description
export const WithDescription: Story = {
  args: {
    label: "Email notifications",
    description: "Receive emails about your account activity",
  },
};

// Indeterminate state
export const Indeterminate: Story = {
  args: {
    label: "Select all items",
    indeterminate: true,
    checked: true,
  },
};

// Disabled states
export const Disabled: Story = {
  args: {
    label: "Disabled checkbox",
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    label: "Disabled checked",
    disabled: true,
    checked: true,
  },
};

// Sizes
export const Small: Story = {
  args: {
    label: "Small checkbox",
    size: "sm",
  },
};

export const Medium: Story = {
  args: {
    label: "Medium checkbox",
    size: "md",
  },
};

export const Large: Story = {
  args: {
    label: "Large checkbox",
    size: "lg",
  },
};

// All sizes comparison
export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Checkbox
        size="sm"
        label="Small size"
      />
      <Checkbox
        size="md"
        label="Medium size (default)"
      />
      <Checkbox
        size="lg"
        label="Large size"
      />
    </div>
  ),
};

// Without label (icon only)
export const WithoutLabel: Story = {
  args: {},
};

// Checkbox group example
export const CheckboxGroup: Story = {
  render: () => {
    const [selected, setSelected] = useState<string[]>(["email"]);

    const handleChange = (value: string) => {
      setSelected((prev) =>
        prev.includes(value)
          ? prev.filter((item) => item !== value)
          : [...prev, value]
      );
    };

    return (
      <div className="flex flex-col gap-3">
        <p className="mb-2 text-sm font-medium text-white">
          Notification preferences
        </p>
        <Checkbox
          label="Email"
          description="Receive notifications via email"
          checked={selected.includes("email")}
          onChange={() => handleChange("email")}
        />
        <Checkbox
          label="SMS"
          description="Receive notifications via text message"
          checked={selected.includes("sms")}
          onChange={() => handleChange("sms")}
        />
        <Checkbox
          label="Push notifications"
          description="Receive push notifications on your device"
          checked={selected.includes("push")}
          onChange={() => handleChange("push")}
        />
      </div>
    );
  },
};

// Select all with indeterminate example
export const SelectAllExample: Story = {
  render: () => {
    const [items, setItems] = useState([
      { id: "1", label: "Item 1", checked: true },
      { id: "2", label: "Item 2", checked: false },
      { id: "3", label: "Item 3", checked: true },
    ]);

    const allChecked = items.every((item) => item.checked);
    const someChecked = items.some((item) => item.checked);
    const indeterminate = someChecked && !allChecked;

    const handleSelectAll = () => {
      setItems((prev) =>
        prev.map((item) => ({ ...item, checked: !allChecked }))
      );
    };

    const handleItemChange = (id: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item
        )
      );
    };

    return (
      <div className="flex flex-col gap-3">
        <Checkbox
          label="Select all"
          checked={allChecked || indeterminate}
          indeterminate={indeterminate}
          onChange={handleSelectAll}
        />
        <div className="ml-6 flex flex-col gap-2 border-l border-white/20 pl-4">
          {items.map((item) => (
            <Checkbox
              key={item.id}
              label={item.label}
              checked={item.checked}
              onChange={() => handleItemChange(item.id)}
            />
          ))}
        </div>
      </div>
    );
  },
};

// Form example
export const FormExample: Story = {
  render: () => {
    const [formData, setFormData] = useState({
      terms: false,
      newsletter: false,
      marketing: false,
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      alert(JSON.stringify(formData, null, 2));
    };

    return (
      <form
        onSubmit={handleSubmit}
        className="flex w-80 flex-col gap-4"
      >
        <h3 className="text-lg font-semibold text-white">Sign up</h3>

        <Checkbox
          label="I agree to the terms and conditions"
          description="You must accept to continue"
          checked={formData.terms}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, terms: e.target.checked }))
          }
        />

        <Checkbox
          label="Subscribe to newsletter"
          description="Get weekly updates about our products"
          checked={formData.newsletter}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, newsletter: e.target.checked }))
          }
        />

        <Checkbox
          label="Receive marketing emails"
          description="Promotional offers and discounts"
          checked={formData.marketing}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, marketing: e.target.checked }))
          }
        />

        <button
          type="submit"
          disabled={!formData.terms}
          className="bg-primary-500 hover:bg-primary-600 mt-2 rounded-lg px-4 py-2 font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit
        </button>
      </form>
    );
  },
};

// All states overview
export const AllStates: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-6">
      <div className="flex flex-col gap-3">
        <p className="mb-2 text-xs font-medium tracking-wider text-white/50 uppercase">
          Default States
        </p>
        <Checkbox label="Unchecked" />
        <Checkbox
          label="Checked"
          checked
        />
        <Checkbox
          label="Indeterminate"
          indeterminate
          checked
        />
      </div>

      <div className="flex flex-col gap-3">
        <p className="mb-2 text-xs font-medium tracking-wider text-white/50 uppercase">
          Disabled States
        </p>
        <Checkbox
          label="Disabled unchecked"
          disabled
        />
        <Checkbox
          label="Disabled checked"
          disabled
          checked
        />
        <Checkbox
          label="Disabled indeterminate"
          disabled
          indeterminate
          checked
        />
      </div>

      <div className="flex flex-col gap-3">
        <p className="mb-2 text-xs font-medium tracking-wider text-white/50 uppercase">
          With Description
        </p>
        <Checkbox
          label="Option with description"
          description="This is a helpful description"
        />
        <Checkbox
          label="Checked with description"
          description="This option is selected"
          checked
        />
      </div>

      <div className="flex flex-col gap-3">
        <p className="mb-2 text-xs font-medium tracking-wider text-white/50 uppercase">
          Sizes
        </p>
        <Checkbox
          size="sm"
          label="Small"
        />
        <Checkbox
          size="md"
          label="Medium"
        />
        <Checkbox
          size="lg"
          label="Large"
        />
      </div>
    </div>
  ),
};

// Interactive playground
export const Playground: Story = {
  args: {
    label: "Checkbox label",
    description: "Optional description text",
    size: "md",
    checked: false,
    indeterminate: false,
    disabled: false,
  },
};
