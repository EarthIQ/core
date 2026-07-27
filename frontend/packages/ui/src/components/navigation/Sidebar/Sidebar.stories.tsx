import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Sidebar } from "./Sidebar";

const meta: Meta<typeof Sidebar> = {
  title: "Navigation/Sidebar",
  component: Sidebar,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A collapsible sidebar navigation component with nested menu support and smooth animations.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    collapsed: {
      control: "boolean",
      description: "Whether the sidebar is collapsed",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

// Icon components for demos
const HomeIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const UsersIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg
    className="h-5 w-5"
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

const FolderIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
    />
  </svg>
);

const ChartIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

const basicItems = [
  { key: "home", label: "Home", icon: <HomeIcon />, active: true },
  { key: "analytics", label: "Analytics", icon: <ChartIcon />, badge: "New" },
  { key: "users", label: "Users", icon: <UsersIcon />, badge: 12 },
  { key: "projects", label: "Projects", icon: <FolderIcon /> },
  { key: "settings", label: "Settings", icon: <SettingsIcon /> },
];

const nestedItems = [
  { key: "home", label: "Home", icon: <HomeIcon />, active: true },
  { key: "analytics", label: "Analytics", icon: <ChartIcon /> },
  {
    key: "users",
    label: "Users",
    icon: <UsersIcon />,
    children: [
      { key: "all-users", label: "All Users" },
      { key: "add-user", label: "Add User" },
      { key: "user-roles", label: "Roles & Permissions" },
    ],
  },
  {
    key: "projects",
    label: "Projects",
    icon: <FolderIcon />,
    children: [
      { key: "active", label: "Active Projects", badge: 5 },
      { key: "archived", label: "Archived" },
    ],
  },
  { key: "settings", label: "Settings", icon: <SettingsIcon /> },
];

const Logo = ({ collapsed }: { collapsed?: boolean }) => (
  <div className="flex items-center gap-2">
    <div className="from-primary-400 to-primary-600 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br font-bold text-white">
      A
    </div>
    {!collapsed && <span className="font-semibold text-white">Acme Inc</span>}
  </div>
);

const UserProfile = ({ collapsed }: { collapsed?: boolean }) => (
  <div className="flex items-center gap-3">
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-sm font-medium text-white">
      JD
    </div>
    {!collapsed && (
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">John Doe</p>
        <p className="truncate text-xs text-white/50">john@example.com</p>
      </div>
    )}
  </div>
);

/**
 * Default expanded sidebar.
 */
export const Default: Story = {
  args: {
    items: basicItems,
    collapsed: false,
  },
  render: (args) => (
    <div className="h-screen bg-slate-950">
      <Sidebar {...args} />
    </div>
  ),
};

/**
 * Sidebar with header and footer.
 */
export const WithHeaderFooter: Story = {
  args: {
    items: basicItems,
    collapsed: false,
  },
  render: (args) => (
    <div className="h-screen bg-slate-950">
      <Sidebar
        {...args}
        header={<Logo collapsed={args.collapsed} />}
        footer={<UserProfile collapsed={args.collapsed} />}
      />
    </div>
  ),
};

/**
 * Collapsed sidebar state.
 */
export const Collapsed: Story = {
  args: {
    items: basicItems,
    collapsed: true,
  },
  render: (args) => (
    <div className="h-screen bg-slate-950">
      <Sidebar
        {...args}
        header={<Logo collapsed />}
        footer={<UserProfile collapsed />}
      />
    </div>
  ),
};

/**
 * Interactive sidebar with collapse toggle.
 */
export const Interactive: Story = {
  render: () => {
    const [collapsed, setCollapsed] = useState(false);

    return (
      <div className="flex h-screen bg-slate-950">
        <Sidebar
          items={basicItems}
          header={<Logo collapsed={collapsed} />}
          footer={<UserProfile collapsed={collapsed} />}
          collapsed={collapsed}
          onCollapse={setCollapsed}
        />
        <div className="flex-1 p-8">
          <h1 className="text-2xl font-bold text-white">Main Content</h1>
          <p className="mt-2 text-white/60">
            Click the toggle button on the sidebar edge to collapse/expand.
          </p>
        </div>
      </div>
    );
  },
};

/**
 * Sidebar with nested navigation items.
 */
export const NestedNavigation: Story = {
  render: () => {
    const [collapsed, setCollapsed] = useState(false);

    return (
      <div className="flex h-screen bg-slate-950">
        <Sidebar
          items={nestedItems}
          header={<Logo collapsed={collapsed} />}
          footer={<UserProfile collapsed={collapsed} />}
          collapsed={collapsed}
          onCollapse={setCollapsed}
        />
        <div className="flex-1 p-8">
          <h1 className="text-2xl font-bold text-white">Nested Navigation</h1>
          <p className="mt-2 text-white/60">
            Click on "Users" or "Projects" to expand nested items.
          </p>
        </div>
      </div>
    );
  },
};

/**
 * Sidebar with badges showing counts and labels.
 */
export const WithBadges: Story = {
  args: {
    items: [
      { key: "inbox", label: "Inbox", icon: <HomeIcon />, badge: 99 },
      { key: "drafts", label: "Drafts", icon: <FolderIcon />, badge: 3 },
      { key: "sent", label: "Sent", icon: <ChartIcon /> },
      { key: "spam", label: "Spam", icon: <UsersIcon />, badge: "New" },
    ],
    collapsed: false,
  },
  render: (args) => (
    <div className="h-screen bg-slate-950">
      <Sidebar
        {...args}
        header={<Logo />}
      />
    </div>
  ),
};
