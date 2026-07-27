// components/primitives/Text.tsx
import React, { forwardRef, useMemo } from 'react';

export type TextVariant = 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'h4' 
  | 'h5' 
  | 'h6' 
  | 'subtitle1' 
  | 'subtitle2' 
  | 'body1' 
  | 'body2' 
  | 'caption' 
  | 'overline' 
  | 'code' 
  | 'kbd'
  | 'mark'
  | 'del'
  | 'ins'
  | 'abbr'
  | 'label';

export type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
export type TextWeight = 'thin' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';
export type TextDecoration = 'none' | 'underline' | 'line-through' | 'overline';

export interface TextProps extends Omit<React.HTMLAttributes<HTMLElement>, 'color'> {
  /** Text variant/semantic type */
  variant?: TextVariant;
  /** Custom element to render */
  as?: keyof JSX.IntrinsicElements;
  /** Text size */
  size?: TextSize;
  /** Font weight */
  weight?: TextWeight;
  /** Text color */
  color?: string;
  /** Text alignment */
  align?: TextAlign;
  /** Text transformation */
  transform?: TextTransform;
  /** Text decoration */
  decoration?: TextDecoration;
  /** Line height */
  lineHeight?: 'none' | 'tight' | 'snug' | 'normal' | 'relaxed' | 'loose' | number;
  /** Letter spacing */
  letterSpacing?: 'tighter' | 'tight' | 'normal' | 'wide' | 'wider' | 'widest';
  /** Truncate text with ellipsis */
  truncate?: boolean;
  /** Number of lines before truncating (requires truncate) */
  lineClamp?: number;
  /** Make text italic */
  italic?: boolean;
  /** Disable text selection */
  noSelect?: boolean;
  /** Make text inline */
  inline?: boolean;
  /** Preserve whitespace */
  whiteSpace?: 'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line';
  /** Word break behavior */
  wordBreak?: 'normal' | 'break-all' | 'break-word' | 'keep-all';
  /** Enable gradient text */
  gradient?: {
    from: string;
    to: string;
    direction?: 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  };
  /** Highlight/mark the text */
  highlight?: boolean;
  /** Highlight color */
  highlightColor?: string;
  /** Muted/secondary text */
  muted?: boolean;
  /** Dimmed text (even more subtle) */
  dimmed?: boolean;
  /** Font family */
  fontFamily?: 'sans' | 'serif' | 'mono';
  /** Make text responsive */
  responsive?: Partial<Record<'sm' | 'md' | 'lg' | 'xl', TextSize>>;
  /** Custom className */
  className?: string;
  /** Children */
  children?: React.ReactNode;
}

// Variant to element mapping
const variantElementMap: Record<TextVariant, keyof JSX.IntrinsicElements> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  subtitle1: 'p',
  subtitle2: 'p',
  body1: 'p',
  body2: 'p',
  caption: 'span',
  overline: 'span',
  code: 'code',
  kbd: 'kbd',
  mark: 'mark',
  del: 'del',
  ins: 'ins',
  abbr: 'abbr',
  label: 'label'
};

// Size styles
const sizeStyles: Record<TextSize, React.CSSProperties> = {
  xs: { fontSize: '0.75rem', lineHeight: '1rem' },
  sm: { fontSize: '0.875rem', lineHeight: '1.25rem' },
  md: { fontSize: '1rem', lineHeight: '1.5rem' },
  lg: { fontSize: '1.125rem', lineHeight: '1.75rem' },
  xl: { fontSize: '1.25rem', lineHeight: '1.75rem' },
  '2xl': { fontSize: '1.5rem', lineHeight: '2rem' },
  '3xl': { fontSize: '1.875rem', lineHeight: '2.25rem' },
  '4xl': { fontSize: '2.25rem', lineHeight: '2.5rem' },
  '5xl': { fontSize: '3rem', lineHeight: '1' }
};

// Variant styles
const variantStyles: Record<TextVariant, React.CSSProperties> = {
  h1: { fontSize: '2.5rem', lineHeight: '1.2', fontWeight: 700 },
  h2: { fontSize: '2rem', lineHeight: '1.25', fontWeight: 700 },
  h3: { fontSize: '1.75rem', lineHeight: '1.3', fontWeight: 600 },
  h4: { fontSize: '1.5rem', lineHeight: '1.35', fontWeight: 600 },
  h5: { fontSize: '1.25rem', lineHeight: '1.4', fontWeight: 600 },
  h6: { fontSize: '1.125rem', lineHeight: '1.4', fontWeight: 600 },
  subtitle1: { fontSize: '1.125rem', lineHeight: '1.5', fontWeight: 500 },
  subtitle2: { fontSize: '1rem', lineHeight: '1.5', fontWeight: 500 },
  body1: { fontSize: '1rem', lineHeight: '1.6' },
  body2: { fontSize: '0.875rem', lineHeight: '1.5' },
  caption: { fontSize: '0.75rem', lineHeight: '1.4', color: '#666' },
  overline: { fontSize: '0.75rem', lineHeight: '1.4', textTransform: 'uppercase', letterSpacing: '0.1em' },
  code: { fontSize: '0.875em', fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.05)', padding: '0.2em 0.4em', borderRadius: '3px' },
  kbd: { fontSize: '0.875em', fontFamily: 'monospace', backgroundColor: '#f4f4f4', padding: '0.2em 0.4em', borderRadius: '3px', border: '1px solid #ccc', boxShadow: '0 1px 0 #bbb' },
  mark: { backgroundColor: '#ffeb3b', padding: '0 0.2em' },
  del: { textDecoration: 'line-through', color: '#999' },
  ins: { textDecoration: 'underline', textDecorationColor: '#4caf50' },
  abbr: { textDecoration: 'underline dotted', cursor: 'help' },
  label: { fontSize: '0.875rem', fontWeight: 500 }
};

// Weight values
const weightValues: Record<TextWeight, number> = {
  thin: 100,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900
};

// Line height values
const lineHeightValues: Record<string, string | number> = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2
};

// Letter spacing values
const letterSpacingValues: Record<string, string> = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em'
};

// Font family values
const fontFamilyValues: Record<string, string> = {
  sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
};

// Gradient direction mapping
const gradientDirections: Record<string, string> = {
  left: 'to left',
  right: 'to right',
  top: 'to top',
  bottom: 'to bottom',
  'top-left': 'to top left',
  'top-right': 'to top right',
  'bottom-left': 'to bottom left',
  'bottom-right': 'to bottom right'
};

export const Text = forwardRef<HTMLElement, TextProps>(({
  variant = 'body1',
  as,
  size,
  weight,
  color,
  align,
  transform,
  decoration,
  lineHeight,
  letterSpacing,
  truncate = false,
  lineClamp,
  italic = false,
  noSelect = false,
  inline = false,
  whiteSpace,
  wordBreak,
  gradient,
  highlight = false,
  highlightColor = '#ffeb3b',
  muted = false,
  dimmed = false,
  fontFamily,
  responsive,
  className,
  style,
  children,
  ...props
}, ref) => {
  // Determine element to render
  const Element = (as || variantElementMap[variant] || 'span') as keyof JSX.IntrinsicElements;

  // Build styles
  const computedStyles = useMemo((): React.CSSProperties => {
    const styles: React.CSSProperties = {
      margin: 0,
      ...variantStyles[variant]
    };

    // Override with custom size
    if (size) {
      Object.assign(styles, sizeStyles[size]);
    }

    // Font weight
    if (weight) {
      styles.fontWeight = weightValues[weight];
    }

    // Color
    if (color) {
      styles.color = color;
    } else if (muted) {
      styles.color = '#666';
    } else if (dimmed) {
      styles.color = '#999';
    }

    // Alignment
    if (align) {
      styles.textAlign = align;
    }

    // Transform
    if (transform) {
      styles.textTransform = transform;
    }

    // Decoration
    if (decoration) {
      styles.textDecoration = decoration;
    }

    // Line height
    if (lineHeight !== undefined) {
      styles.lineHeight = typeof lineHeight === 'number' 
        ? lineHeight 
        : lineHeightValues[lineHeight] || lineHeight;
    }

    // Letter spacing
    if (letterSpacing) {
      styles.letterSpacing = letterSpacingValues[letterSpacing] || letterSpacing;
    }

    // Italic
    if (italic) {
      styles.fontStyle = 'italic';
    }

    // User select
    if (noSelect) {
      styles.userSelect = 'none';
    }

    // Display
    if (inline) {
      styles.display = 'inline';
    }

    // Whitespace
    if (whiteSpace) {
      styles.whiteSpace = whiteSpace;
    }

    // Word break
    if (wordBreak) {
      styles.wordBreak = wordBreak;
    }

    // Font family
    if (fontFamily) {
      styles.fontFamily = fontFamilyValues[fontFamily];
    }

    // Truncation
    if (truncate) {
      if (lineClamp && lineClamp > 1) {
        // Multi-line truncation
        Object.assign(styles, {
          display: '-webkit-box',
          WebkitLineClamp: lineClamp,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        });
      } else {
        // Single line truncation
        Object.assign(styles, {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        });
      }
    }

    // Gradient text
    if (gradient) {
      const direction = gradientDirections[gradient.direction || 'right'];
      Object.assign(styles, {
        background: `linear-gradient(${direction}, ${gradient.from}, ${gradient.to})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      });
    }

    // Highlight
    if (highlight) {
      styles.backgroundColor = highlightColor;
      styles.padding = '0 0.2em';
      styles.borderRadius = '2px';
    }

    return styles;
  }, [
    variant, size, weight, color, align, transform, decoration,
    lineHeight, letterSpacing, truncate, lineClamp, italic,
    noSelect, inline, whiteSpace, wordBreak, fontFamily,
    gradient, highlight, highlightColor, muted, dimmed
  ]);

  // Generate responsive CSS (would need CSS-in-JS or CSS modules for full support)
  const responsiveClassName = useMemo(() => {
    if (!responsive) return '';
    // This would integrate with your CSS solution
    // For now, we'll handle it via inline styles at largest breakpoint
    return '';
  }, [responsive]);

  return React.createElement(
    Element,
    {
      ref,
      className: `${className || ''} ${responsiveClassName}`.trim() || undefined,
      style: { ...computedStyles, ...style },
      ...props
    },
    children
  );
});

Text.displayName = 'Text';

// Convenient sub-components
export const Heading: React.FC<Omit<TextProps, 'variant'> & { level?: 1 | 2 | 3 | 4 | 5 | 6 }> = ({
  level = 1,
  ...props
}) => <Text variant={`h${level}` as TextVariant} {...props} />;

export const Paragraph: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="body1" {...props} />
);

export const Caption: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="caption" {...props} />
);

export const Label: React.FC<Omit<TextProps, 'variant'> & { required?: boolean; htmlFor?: string }> = ({
  required,
  children,
  ...props
}) => (
  <Text variant="label" as="label" {...props}>
    {children}
    {required && <span style={{ color: '#e74c3c', marginLeft: 4 }}>*</span>}
  </Text>
);

export const Code: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="code" {...props} />
);

export const Kbd: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="kbd" {...props} />
);

export const Mark: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="mark" {...props} />
);

export const Link: React.FC<Omit<TextProps, 'as'> & { 
  href?: string; 
  external?: boolean;
  underline?: 'always' | 'hover' | 'none';
}> = ({
  href,
  external = false,
  underline = 'hover',
  color = '#3498db',
  children,
  style,
  ...props
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const linkStyles: React.CSSProperties = {
    color,
    textDecoration: underline === 'always' || (underline === 'hover' && isHovered) 
      ? 'underline' 
      : 'none',
    cursor: 'pointer',
    transition: 'color 0.2s',
    ...style
  };

  return (
    <Text
      as="a"
      // @ts-ignore
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      style={linkStyles}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {children}
      {external && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ marginLeft: 4, verticalAlign: 'middle' }}
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      )}
    </Text>
  );
};

export const Blockquote: React.FC<Omit<TextProps, 'as'>> = ({
  children,
  style,
  ...props
}) => (
  <Text
    as="blockquote"
    style={{
      borderLeft: '4px solid #e0e0e0',
      paddingLeft: 16,
      marginLeft: 0,
      fontStyle: 'italic',
      color: '#666',
      ...style
    }}
    {...props}
  >
    {children}
  </Text>
);

export const Strong: React.FC<Omit<TextProps, 'as' | 'weight'>> = (props) => (
  <Text as="strong" weight="bold" inline {...props} />
);

export const Em: React.FC<Omit<TextProps, 'as' | 'italic'>> = (props) => (
  <Text as="em" italic inline {...props} />
);

export const Small: React.FC<Omit<TextProps, 'as' | 'size'>> = (props) => (
  <Text as="small" size="sm" inline {...props} />
);

export const Sup: React.FC<Omit<TextProps, 'as'>> = ({ style, ...props }) => (
  <Text
    as="sup"
    size="xs"
    inline
    style={{ verticalAlign: 'super', ...style }}
    {...props}
  />
);

export const Sub: React.FC<Omit<TextProps, 'as'>> = ({ style, ...props }) => (
  <Text
    as="sub"
    size="xs"
    inline
    style={{ verticalAlign: 'sub', ...style }}
    {...props}
  />
);

// Gradient text shorthand
export const GradientText: React.FC<Omit<TextProps, 'gradient'> & {
  from: string;
  to: string;
  direction?: 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}> = ({ from, to, direction = 'right', ...props }) => (
  <Text gradient={{ from, to, direction }} {...props} />
);

export default Text;