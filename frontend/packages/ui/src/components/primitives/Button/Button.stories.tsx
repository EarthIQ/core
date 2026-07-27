import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "Components/Forms/Button",
  component: Button,
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
    variant: {
      control: "select",
      options: [
        "default",
        "primary",
        "secondary",
        "success",
        "warning",
        "error",
        "ghost",
        "outline",
        "link",
      ],
      description: "Visual style variant of the button",
    },
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl"],
      description: "Size of the button",
    },
    fullWidth: {
      control: "boolean",
      description: "Whether the button takes full width",
    },
    loading: {
      control: "boolean",
      description: "Whether the button is in loading state",
    },
    loadingText: {
      control: "text",
      description: "Text to show while loading",
    },
    disabled: {
      control: "boolean",
      description: "Whether the button is disabled",
    },
    children: {
      control: "text",
      description: "Button content",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// Icons for stories
const PlusIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4v16m8-8H4"
    />
  </svg>
);

const ArrowRightIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M14 5l7 7m0 0l-7 7m7-7H3"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const TrashIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const HeartIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
    />
  </svg>
);

// Basic button
export const Default: Story = {
  args: {
    children: "Button",
  },
};

// All variants
export const Primary: Story = {
  args: {
    variant: "primary",
    children: "Primary Button",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Secondary Button",
  },
};

export const Success: Story = {
  args: {
    variant: "success",
    children: "Success Button",
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    children: "Warning Button",
  },
};

export const Error: Story = {
  args: {
    variant: "error",
    children: "Error Button",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
    children: "Ghost Button",
  },
};

export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Outline Button",
  },
};

export const Link: Story = {
  args: {
    variant: "link",
    children: "Link Button",
  },
};

// All variants comparison
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="default">Default</Button>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="success">Success</Button>
      <Button variant="warning">Warning</Button>
      <Button variant="error">Error</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

// Sizes
export const ExtraSmall: Story = {
  args: {
    size: "xs",
    children: "Extra Small",
  },
};

export const Small: Story = {
  args: {
    size: "sm",
    children: "Small",
  },
};

export const Medium: Story = {
  args: {
    size: "md",
    children: "Medium",
  },
};

export const Large: Story = {
  args: {
    size: "lg",
    children: "Large",
  },
};

export const ExtraLarge: Story = {
  args: {
    size: "xl",
    children: "Extra Large",
  },
};

// All sizes comparison
export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
  ),
};

// With icons
export const WithLeftIcon: Story = {
  args: {
    variant: "primary",
    children: "Add Item",
    leftIcon: <PlusIcon />,
  },
};

export const WithRightIcon: Story = {
  args: {
    variant: "primary",
    children: "Continue",
    rightIcon: <ArrowRightIcon />,
  },
};

export const WithBothIcons: Story = {
  args: {
    variant: "primary",
    children: "Download",
    leftIcon: <DownloadIcon />,
    rightIcon: <ArrowRightIcon />,
  },
};

// Icon buttons (icon only)
export const IconOnly: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button
        variant="default"
        size="sm"
      >
        <PlusIcon />
      </Button>
      <Button
        variant="primary"
        size="md"
      >
        <SettingsIcon />
      </Button>
      <Button
        variant="error"
        size="md"
      >
        <TrashIcon />
      </Button>
      <Button
        variant="outline"
        size="lg"
      >
        <HeartIcon />
      </Button>
    </div>
  ),
};

// Loading states
export const Loading: Story = {
  args: {
    variant: "primary",
    children: "Submit",
    loading: true,
  },
};

export const LoadingWithText: Story = {
  args: {
    variant: "primary",
    children: "Submit",
    loading: true,
    loadingText: "Submitting...",
  },
};

export const LoadingVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button
        variant="primary"
        loading
      >
        Primary
      </Button>
      <Button
        variant="secondary"
        loading
        loadingText="Loading..."
      >
        Secondary
      </Button>
      <Button
        variant="success"
        loading
      >
        Success
      </Button>
      <Button
        variant="outline"
        loading
        loadingText="Please wait..."
      >
        Outline
      </Button>
    </div>
  ),
};

// Disabled states
export const Disabled: Story = {
  args: {
    children: "Disabled Button",
    disabled: true,
  },
};

export const DisabledVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button
        variant="default"
        disabled
      >
        Default
      </Button>
      <Button
        variant="primary"
        disabled
      >
        Primary
      </Button>
      <Button
        variant="secondary"
        disabled
      >
        Secondary
      </Button>
      <Button
        variant="outline"
        disabled
      >
        Outline
      </Button>
      <Button
        variant="ghost"
        disabled
      >
        Ghost
      </Button>
    </div>
  ),
};

// Full width
export const FullWidth: Story = {
  args: {
    variant: "primary",
    children: "Full Width Button",
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

// Interactive example
export const Interactive: Story = {
  render: () => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleClick = async () => {
      setLoading(true);
      setSuccess(false);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    };

    return (
      <Button
        variant={success ? "success" : "primary"}
        loading={loading}
        loadingText="Saving..."
        onClick={handleClick}
        leftIcon={success ? <CheckIcon /> : undefined}
      >
        {success ? "Saved!" : "Save Changes"}
      </Button>
    );
  },
};

// Button group example
export const ButtonGroup: Story = {
  render: () => (
    <div className="flex">
      <Button
        variant="outline"
        className="rounded-r-none border-r-0"
      >
        Left
      </Button>
      <Button
        variant="outline"
        className="rounded-none"
      >
        Center
      </Button>
      <Button
        variant="outline"
        className="rounded-l-none border-l-0"
      >
        Right
      </Button>
    </div>
  ),
};

// Common use cases
export const CommonUseCases: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {/* Form actions */}
      <div>
        <p className="mb-3 text-xs font-medium tracking-wider text-white/50 uppercase">
          Form Actions
        </p>
        <div className="flex gap-3">
          <Button variant="ghost">Cancel</Button>
          <Button variant="primary">Save Changes</Button>
        </div>
      </div>

      {/* Destructive action */}
      <div>
        <p className="mb-3 text-xs font-medium tracking-wider text-white/50 uppercase">
          Destructive Action
        </p>
        <div className="flex gap-3">
          <Button variant="outline">Cancel</Button>
          <Button
            variant="error"
            leftIcon={<TrashIcon />}
          >
            Delete Account
          </Button>
        </div>
      </div>

      {/* Call to action */}
      <div>
        <p className="mb-3 text-xs font-medium tracking-wider text-white/50 uppercase">
          Call to Action
        </p>
        <Button
          variant="primary"
          size="lg"
          rightIcon={<ArrowRightIcon />}
        >
          Get Started Free
        </Button>
      </div>

      {/* Social actions */}
      <div>
        <p className="mb-3 text-xs font-medium tracking-wider text-white/50 uppercase">
          Social Actions
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            leftIcon={<HeartIcon />}
          >
            Like
          </Button>
          <Button
            variant="default"
            leftIcon={<DownloadIcon />}
          >
            Download
          </Button>
        </div>
      </div>
    </div>
  ),
};

// All states overview
export const AllStates: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-4">
      {/* Headers */}
      <div className="text-xs font-medium tracking-wider text-white/50 uppercase">
        State
      </div>
      <div className="text-xs font-medium tracking-wider text-white/50 uppercase">
        Default
      </div>
      <div className="text-xs font-medium tracking-wider text-white/50 uppercase">
        Primary
      </div>
      <div className="text-xs font-medium tracking-wider text-white/50 uppercase">
        Outline
      </div>

      {/* Normal */}
      <div className="flex items-center text-sm text-white/70">Normal</div>
      <Button variant="default">Button</Button>
      <Button variant="primary">Button</Button>
      <Button variant="outline">Button</Button>

      {/* With Icon */}
      <div className="flex items-center text-sm text-white/70">With Icon</div>
      <Button
        variant="default"
        leftIcon={<PlusIcon />}
      >
        Button
      </Button>
      <Button
        variant="primary"
        leftIcon={<PlusIcon />}
      >
        Button
      </Button>
      <Button
        variant="outline"
        leftIcon={<PlusIcon />}
      >
        Button
      </Button>

      {/* Loading */}
      <div className="flex items-center text-sm text-white/70">Loading</div>
      <Button
        variant="default"
        loading
      >
        Button
      </Button>
      <Button
        variant="primary"
        loading
      >
        Button
      </Button>
      <Button
        variant="outline"
        loading
      >
        Button
      </Button>

      {/* Disabled */}
      <div className="flex items-center text-sm text-white/70">Disabled</div>
      <Button
        variant="default"
        disabled
      >
        Button
      </Button>
      <Button
        variant="primary"
        disabled
      >
        Button
      </Button>
      <Button
        variant="outline"
        disabled
      >
        Button
      </Button>
    </div>
  ),
};

// Playground
export const Playground: Story = {
  args: {
    variant: "primary",
    size: "md",
    children: "Click me",
    fullWidth: false,
    loading: false,
    disabled: false,
  },
};
