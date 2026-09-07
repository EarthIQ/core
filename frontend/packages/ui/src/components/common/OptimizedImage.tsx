interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
}

export const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  priority = false,
}: OptimizedImageProps) => {
  return (
    <img
      alt={alt}
      className="object-cover"
      decoding="async"
      height={height}
      loading={priority ? "eager" : "lazy"}
      src={src}
      width={width}
    />
  );
}
