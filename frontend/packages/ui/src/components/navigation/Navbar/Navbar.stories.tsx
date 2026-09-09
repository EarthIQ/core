import { Navbar } from "./Navbar";
import { Button } from "../../primitives/Button/Button";

import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Navbar> = {
  title: "Navigation/Navbar",
  component: Navbar,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A responsive top navigation bar with mobile hamburger menu support and glassmorphism styling.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    sticky: {
      control: "boolean",
      description: "Whether the navbar sticks to the top on scroll",
    },
    transparent: {
      control: "boolean",
      description: "Whether to use a transparent background",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Navbar>;

// Icon components for demos
const HomeIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  </svg>
);

const InfoIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  </svg>
);

const PhoneIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  </svg>
);

const Logo = () => (
  <div className="flex items-center gap-2">
    <div className="from-primary-400 to-primary-600 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br font-bold text-white">
      A
    </div>
    <span className="text-lg font-semibold text-white">Acme</span>
  </div>
);

const basicItems = [
  { key: "home", label: "Home", href: "#", active: true },
  { key: "about", label: "About", href: "#" },
  { key: "services", label: "Services", href: "#" },
  { key: "contact", label: "Contact", href: "#" },
];

const itemsWithIcons = [
  { key: "home", label: "Home", href: "#", icon: <HomeIcon />, active: true },
  { key: "about", label: "About", href: "#", icon: <InfoIcon /> },
  { key: "contact", label: "Contact", href: "#", icon: <PhoneIcon /> },
];

/**
 * Default navbar with basic navigation.
 */
export const Default: Story = {
  args: {
    logo: <Logo />,
    items: basicItems,
    sticky: true,
    transparent: false,
  },
  render: (args) => (
    <div className="min-h-[200vh] bg-slate-950">
      <Navbar {...args} />
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white">Page Content</h1>
        <p className="mt-2 text-white/60">
          Scroll down to see sticky behavior.
        </p>
      </div>
    </div>
  ),
};

/**
 * Navbar with right-side content (buttons).
 */
export const WithRightContent: Story = {
  args: {
    logo: <Logo />,
    items: basicItems,
    rightContent: (
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="ghost"
        >
          Login
        </Button>
        <Button
          size="sm"
          variant="primary"
        >
          Sign Up
        </Button>
      </div>
    ),
  },
  render: (args) => (
    <div className="min-h-screen bg-slate-950">
      <Navbar {...args} />
    </div>
  ),
};

/**
 * Navbar with icons in navigation items.
 */
export const WithIcons: Story = {
  args: {
    logo: <Logo />,
    items: itemsWithIcons,
    rightContent: (
      <Button
        size="sm"
        variant="primary"
      >
        Get Started
      </Button>
    ),
  },
  render: (args) => (
    <div className="min-h-screen bg-slate-950">
      <Navbar {...args} />
    </div>
  ),
};

/**
 * Transparent navbar for hero sections.
 */
export const Transparent: Story = {
  args: {
    logo: <Logo />,
    items: basicItems,
    transparent: true,
    rightContent: (
      <Button
        size="sm"
        variant="outline"
      >
        Contact Us
      </Button>
    ),
  },
  render: (args) => (
    <div className="min-h-screen">
      {/* Hero with gradient background */}
      <div className="from-primary-600 relative h-screen bg-gradient-to-br via-purple-600 to-pink-500">
        <Navbar {...args} />
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h1 className="mb-4 text-5xl font-bold text-white">
              Welcome to Acme
            </h1>
            <p className="text-xl text-white/80">
              Building the future, one pixel at a time.
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
};

/**
 * Non-sticky navbar.
 */
export const NonSticky: Story = {
  args: {
    logo: <Logo />,
    items: basicItems,
    sticky: false,
    rightContent: (
      <Button
        size="sm"
        variant="primary"
      >
        Sign Up
      </Button>
    ),
  },
  render: (args) => (
    <div className="min-h-[200vh] bg-slate-950">
      <Navbar {...args} />
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white">Non-Sticky Navbar</h1>
        <p className="mt-2 text-white/60">
          Scroll down - the navbar will scroll away with the content.
        </p>
        <div className="mt-8 space-y-4">
          {Array.from({ length: 20 }, (_, i) => (
            <p
              key={i}
              className="text-white/40"
            >
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Paragraph{" "}
              {i + 1}.
            </p>
          ))}
        </div>
      </div>
    </div>
  ),
};

/**
 * Mobile responsive demo (resize browser to see hamburger menu).
 */
export const MobileResponsive: Story = {
  args: {
    logo: <Logo />,
    items: basicItems,
    rightContent: (
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="w-full sm:w-auto"
          size="sm"
          variant="ghost"
        >
          Login
        </Button>
        <Button
          className="w-full sm:w-auto"
          size="sm"
          variant="primary"
        >
          Sign Up
        </Button>
      </div>
    ),
  },
  render: (args) => (
    <div className="min-h-screen bg-slate-950">
      <Navbar {...args} />
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white">Mobile Responsive</h1>
        <p className="mt-2 text-white/60">
          Resize your browser window to see the hamburger menu appear on smaller
          screens.
        </p>
      </div>
    </div>
  ),
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};

/**
 * Navbar with many items.
 */
export const ManyItems: Story = {
  args: {
    logo: <Logo />,
    items: [
      { key: "home", label: "Home", href: "#", active: true },
      { key: "products", label: "Products", href: "#" },
      { key: "solutions", label: "Solutions", href: "#" },
      { key: "pricing", label: "Pricing", href: "#" },
      { key: "resources", label: "Resources", href: "#" },
      { key: "docs", label: "Docs", href: "#" },
      { key: "blog", label: "Blog", href: "#" },
    ],
    rightContent: (
      <Button
        size="sm"
        variant="primary"
      >
        Get Started
      </Button>
    ),
  },
  render: (args) => (
    <div className="min-h-screen bg-slate-950">
      <Navbar {...args} />
    </div>
  ),
};

/**
 * Minimal navbar with just logo and action.
 */
export const Minimal: Story = {
  args: {
    logo: <Logo />,
    items: [],
    rightContent: (
      <Button
        size="sm"
        variant="primary"
      >
        Download App
      </Button>
    ),
  },
  render: (args) => (
    <div className="min-h-screen bg-slate-950">
      <Navbar {...args} />
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white">Minimal Navbar</h1>
        <p className="mt-2 text-white/60">
          Just logo and a call-to-action button.
        </p>
      </div>
    </div>
  ),
};
