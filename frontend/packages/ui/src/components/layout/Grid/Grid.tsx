import React, { type ReactNode, type HTMLAttributes } from "react";
import { cn } from "../../../utils/cn";

/**
 * Column count options for the Grid component.
 * Determines how many columns the grid will have.
 */
type ColCount = 1 | 2 | 3 | 4 | 5 | 6 | 12;

/**
 * Gap size options for spacing between grid items.
 * - `none`: 0px gap
 * - `xs`: 4px gap (0.25rem)
 * - `sm`: 8px gap (0.5rem)
 * - `md`: 16px gap (1rem)
 * - `lg`: 24px gap (1.5rem)
 * - `xl`: 32px gap (2rem)
 */
type GapSize = "none" | "xs" | "sm" | "md" | "lg" | "xl";

/**
 * Row span options for GridItem.
 * Determines how many rows an item will span.
 */
type RowSpanCount = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Props for the Grid container component.
 *
 * @example
 * ```tsx
 * <Grid cols={3} gap="md" responsive>
 *   <GridItem>Item 1</GridItem>
 *   <GridItem>Item 2</GridItem>
 * </Grid>
 * ```
 */
interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The content to be rendered inside the grid.
   * Typically contains GridItem components.
   *
   * @example
   * ```tsx
   * <Grid>
   *   <GridItem>Child 1</GridItem>
   *   <GridItem>Child 2</GridItem>
   * </Grid>
   * ```
   */
  children: ReactNode;

  /**
   * Number of columns in the grid layout.
   *
   * Available options: `1 | 2 | 3 | 4 | 5 | 6 | 12`
   *
   * @default 3
   *
   * @example
   * ```tsx
   * // Creates a 4-column grid
   * <Grid cols={4}>...</Grid>
   *
   * // Creates a 12-column grid (useful for complex layouts)
   * <Grid cols={12}>...</Grid>
   * ```
   */
  cols?: ColCount;

  /**
   * Gap size between grid items.
   *
   * | Value  | Size         |
   * |--------|--------------|
   * | `none` | 0px          |
   * | `xs`   | 4px (0.25rem)|
   * | `sm`   | 8px (0.5rem) |
   * | `md`   | 16px (1rem)  |
   * | `lg`   | 24px (1.5rem)|
   * | `xl`   | 32px (2rem)  |
   *
   * @default "md"
   *
   * @example
   * ```tsx
   * // Large spacing between items
   * <Grid gap="lg">...</Grid>
   *
   * // No spacing between items
   * <Grid gap="none">...</Grid>
   * ```
   */
  gap?: GapSize;

  /**
   * When `true`, the grid automatically adjusts column count
   * based on screen size (mobile-first responsive design).
   *
   * **Responsive Breakpoints:**
   * | Cols | Mobile | sm (640px+) | lg (1024px+) | xl (1280px+) |
   * |------|--------|-------------|--------------|--------------|
   * | 2    | 1 col  | 2 cols      | 2 cols       | 2 cols       |
   * | 3    | 1 col  | 2 cols      | 3 cols       | 3 cols       |
   * | 4    | 1 col  | 2 cols      | 4 cols       | 4 cols       |
   * | 6    | 2 cols | 3 cols      | 6 cols       | 6 cols       |
   *
   * @default true
   *
   * @example
   * ```tsx
   * // Responsive grid (recommended)
   * <Grid cols={4} responsive>...</Grid>
   *
   * // Fixed columns on all screen sizes
   * <Grid cols={4} responsive={false}>...</Grid>
   * ```
   */
  responsive?: boolean;
}

/**
 * Props for the GridItem component.
 *
 * @example
 * ```tsx
 * <GridItem colSpan={2} rowSpan={1}>
 *   Wide content spanning 2 columns
 * </GridItem>
 * ```
 */
interface GridItemProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The content to be rendered inside the grid item.
   *
   * @example
   * ```tsx
   * <GridItem>
   *   <Card>Card content here</Card>
   * </GridItem>
   * ```
   */
  children: ReactNode;

  /**
   * Number of columns this item should span.
   *
   * Available options: `1 | 2 | 3 | 4 | 5 | 6 | 12`
   *
   * ⚠️ **Note:** Ensure the parent Grid has enough columns
   * to accommodate the span value.
   *
   * @example
   * ```tsx
   * // Item spans 2 columns
   * <GridItem colSpan={2}>Wide content</GridItem>
   *
   * // Full-width item in a 12-column grid
   * <GridItem colSpan={12}>Full width</GridItem>
   * ```
   */
  colSpan?: ColCount;

  /**
   * Number of rows this item should span.
   *
   * Available options: `1 | 2 | 3 | 4 | 5 | 6`
   *
   * Useful for creating featured items or complex layouts
   * where certain items need more vertical space.
   *
   * @example
   * ```tsx
   * // Item spans 2 rows
   * <GridItem rowSpan={2}>Tall content</GridItem>
   *
   * // Item spans 2 columns and 3 rows
   * <GridItem colSpan={2} rowSpan={3}>
   *   Featured content
   * </GridItem>
   * ```
   */
  rowSpan?: RowSpanCount;
}

/** @internal Mapping of column counts to Tailwind CSS classes */
const colClasses: Record<ColCount, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  12: "grid-cols-12",
};

/** @internal Mapping of column counts to responsive Tailwind CSS classes */
const responsiveColClasses: Record<ColCount, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  12: "grid-cols-4 sm:grid-cols-6 lg:grid-cols-12",
};

/** @internal Mapping of gap sizes to Tailwind CSS classes */
const gapClasses: Record<GapSize, string> = {
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

/** @internal Mapping of column span values to Tailwind CSS classes */
const colSpanClasses: Record<ColCount, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
  12: "col-span-12",
};

/** @internal Mapping of row span values to Tailwind CSS classes */
const rowSpanClasses: Record<RowSpanCount, string> = {
  1: "row-span-1",
  2: "row-span-2",
  3: "row-span-3",
  4: "row-span-4",
  5: "row-span-5",
  6: "row-span-6",
};

/**
 * A flexible CSS Grid container component for creating responsive
 * grid-based layouts with configurable columns and spacing.
 *
 * ## Features
 * - 📱 **Responsive by default** - Automatically adjusts columns for mobile
 * - 🎛️ **Configurable columns** - Support for 1, 2, 3, 4, 5, 6, or 12 columns
 * - 📏 **Flexible gap sizes** - 6 predefined gap options (none to xl)
 * - 🧩 **Works with GridItem** - Child component for spanning rows/columns
 *
 * ## Basic Usage
 * ```tsx
 * import { Grid, GridItem } from '@packages/ui';
 *
 * <Grid cols={3} gap="md">
 *   <GridItem>Item 1</GridItem>
 *   <GridItem>Item 2</GridItem>
 *   <GridItem colSpan={2}>Wide Item</GridItem>
 * </Grid>
 * ```
 *
 * ## Dashboard Layout Example
 * ```tsx
 * <Grid cols={12} gap="lg">
 *   <GridItem colSpan={12}>Header</GridItem>
 *   <GridItem colSpan={3}>Sidebar</GridItem>
 *   <GridItem colSpan={9}>Main Content</GridItem>
 *   <GridItem colSpan={12}>Footer</GridItem>
 * </Grid>
 * ```
 *
 * @see {@link GridItem} - For spanning multiple columns or rows
 */
export function Grid({
  children,
  cols = 3,
  gap = "md",
  responsive = true,
  className,
  ...props
}: GridProps): JSX.Element {
  return (
    <div
      className={cn(
        "grid",
        responsive ? responsiveColClasses[cols] : colClasses[cols],
        gapClasses[gap],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * A grid item component that can span multiple columns and/or rows.
 *
 * Must be used as a child of the `Grid` component.
 *
 * ## Features
 * - 📐 **Column spanning** - Span 1-12 columns
 * - 📏 **Row spanning** - Span 1-6 rows
 * - 🎨 **Fully customizable** - Accepts className and all div attributes
 *
 * ## Usage Examples
 *
 * ### Basic Item
 * ```tsx
 * <GridItem>Regular grid item</GridItem>
 * ```
 *
 * ### Wide Item (2 columns)
 * ```tsx
 * <GridItem colSpan={2}>
 *   This item takes up 2 columns
 * </GridItem>
 * ```
 *
 * ### Tall Item (2 rows)
 * ```tsx
 * <GridItem rowSpan={2}>
 *   This item takes up 2 rows
 * </GridItem>
 * ```
 *
 * ### Featured Item (multiple columns and rows)
 * ```tsx
 * <GridItem colSpan={2} rowSpan={2}>
 *   Featured content spanning 2x2
 * </GridItem>
 * ```
 *
 * @see {@link Grid} - Parent container component
 */
export function GridItem({
  children,
  colSpan,
  rowSpan,
  className,
  ...props
}: GridItemProps): JSX.Element {
  return (
    <div
      className={cn(
        colSpan && colSpanClasses[colSpan],
        rowSpan && rowSpanClasses[rowSpan],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * @example Complete Grid Layout
 * ```tsx
 * import { Grid, GridItem } from '@packages/ui';
 *
 * function ProductGrid({ products }) {
 *   return (
 *     <Grid cols={4} gap="lg" responsive>
 *       {products.map((product, index) => (
 *         <GridItem
 *           key={product.id}
 *           colSpan={index === 0 ? 2 : 1}
 *           rowSpan={index === 0 ? 2 : 1}
 *         >
 *           <ProductCard product={product} />
 *         </GridItem>
 *       ))}
 *     </Grid>
 *   );
 * }
 * ```
 */
export type { GridProps, GridItemProps, ColCount, GapSize, RowSpanCount };
