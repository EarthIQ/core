import type { Meta, StoryObj } from '@storybook/react';
import { Stack, HStack, VStack } from './Stack';

const meta: Meta<typeof Stack> = {
  title: 'Layout/Stack',
  component: Stack,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A flexible layout component for arranging elements in rows or columns with configurable spacing.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    direction: {
      control: 'radio',
      options: ['row', 'column'],
      description: 'The direction of the stack layout',
    },
    gap: {
      control: 'select',
      options: ['none', 'xs', 'sm', 'md', 'lg', 'xl'],
      description: 'The spacing between elements',
    },
    align: {
      control: 'select',
      options: ['start', 'center', 'end', 'stretch', 'baseline'],
      description: 'Cross-axis alignment',
    },
    justify: {
      control: 'select',
      options: ['start', 'center', 'end', 'between', 'around', 'evenly'],
      description: 'Main-axis distribution',
    },
    wrap: {
      control: 'boolean',
      description: 'Whether items should wrap',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Stack>;

// Helper component for visual demos
const Box = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-primary-500/20 border border-primary-500/30 rounded-lg px-4 py-2 text-white ${className}`}>
    {children}
  </div>
);

/**
 * Default vertical stack with medium gap.
 */
export const Default: Story = {
  args: {
    direction: 'column',
    gap: 'md',
    align: 'stretch',
    justify: 'start',
  },
  render: (args) => (
    <Stack {...args}>
      <Box>Item 1</Box>
      <Box>Item 2</Box>
      <Box>Item 3</Box>
    </Stack>
  ),
};

/**
 * Horizontal stack layout.
 */
export const Horizontal: Story = {
  render: () => (
    <Stack direction="row" gap="md" align="center">
      <Box>Item 1</Box>
      <Box>Item 2</Box>
      <Box>Item 3</Box>
    </Stack>
  ),
};

/**
 * Using the HStack shorthand component.
 */
export const HStackExample: Story = {
  name: 'HStack (Horizontal)',
  render: () => (
    <HStack gap="lg" align="center">
      <Box>Left</Box>
      <Box>Center</Box>
      <Box>Right</Box>
    </HStack>
  ),
};

/**
 * Using the VStack shorthand component.
 */
export const VStackExample: Story = {
  name: 'VStack (Vertical)',
  render: () => (
    <VStack gap="lg" align="start">
      <Box>Top</Box>
      <Box>Middle</Box>
      <Box>Bottom</Box>
    </VStack>
  ),
};

/**
 * Different gap sizes comparison.
 */
export const GapSizes: Story = {
  render: () => (
    <VStack gap="xl">
      {(['none', 'xs', 'sm', 'md', 'lg', 'xl'] as const).map((gapSize) => (
        <VStack key={gapSize} gap="sm">
          <span className="text-white/60 text-sm">gap="{gapSize}"</span>
          <HStack gap={gapSize}>
            <Box>A</Box>
            <Box>B</Box>
            <Box>C</Box>
          </HStack>
        </VStack>
      ))}
    </VStack>
  ),
};

/**
 * Different alignment options.
 */
export const Alignments: Story = {
  render: () => (
    <HStack gap="xl">
      {(['start', 'center', 'end', 'stretch'] as const).map((alignment) => (
        <VStack key={alignment} gap="sm" className="flex-1">
          <span className="text-white/60 text-sm">align="{alignment}"</span>
          <HStack gap="sm" align={alignment} className="h-24 bg-white/5 rounded-lg p-2">
            <Box className="h-8">A</Box>
            <Box className="h-12">B</Box>
            <Box className="h-6">C</Box>
          </HStack>
        </VStack>
      ))}
    </HStack>
  ),
};

/**
 * Different justify options.
 */
export const Justifications: Story = {
  render: () => (
    <VStack gap="lg">
      {(['start', 'center', 'end', 'between', 'around', 'evenly'] as const).map((justification) => (
        <VStack key={justification} gap="sm">
          <span className="text-white/60 text-sm">justify="{justification}"</span>
          <HStack gap="sm" justify={justification} className="bg-white/5 rounded-lg p-2">
            <Box>A</Box>
            <Box>B</Box>
            <Box>C</Box>
          </HStack>
        </VStack>
      ))}
    </VStack>
  ),
};

/**
 * Wrapping items when they overflow.
 */
export const Wrapping: Story = {
  render: () => (
    <Stack direction="row" gap="sm" wrap className="max-w-md">
      {Array.from({ length: 10 }, (_, i) => (
        <Box key={i}>Item {i + 1}</Box>
      ))}
    </Stack>
  ),
};

/**
 * Nested stacks for complex layouts.
 */
export const NestedLayout: Story = {
  render: () => (
    <VStack gap="lg" className="p-4 bg-white/5 rounded-xl">
      <HStack gap="md" justify="between" align="center">
        <Box>Logo</Box>
        <HStack gap="sm">
          <Box>Nav 1</Box>
          <Box>Nav 2</Box>
          <Box>Nav 3</Box>
        </HStack>
      </HStack>
      <HStack gap="lg">
        <VStack gap="sm" className="flex-1">
          <Box className="h-20">Sidebar Item 1</Box>
          <Box className="h-20">Sidebar Item 2</Box>
        </VStack>
        <Box className="flex-[3] h-48">Main Content</Box>
      </HStack>
    </VStack>
  ),
};