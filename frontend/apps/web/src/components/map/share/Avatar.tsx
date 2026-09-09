const AVATAR_COLORS = [
  "#3b82f6",
  "#22d3a0",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

function hashColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export const Avatar = ({
  name,
  email,
  src,
  size = 32,
}: {
  name?: string;
  email: string;
  src?: string;
  size?: number;
}) => {
  const label = name || email;
  const initials = (name ?? email)
    .split(/[\s.@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  if (src) {
    return (
      <img
        alt={label}
        className="shrink-0 rounded-full object-cover"
        src={src}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none"
      title={label}
      style={{
        width: size,
        height: size,
        background: hashColor(email),
        fontSize: size * 0.38,
      }}
    >
      {initials || "?"}
    </div>
  );
};
