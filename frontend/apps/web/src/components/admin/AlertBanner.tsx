interface AlertBannerProps {
  type: "error" | "success";
  message: string;
}

export function AlertBanner({ type, message }: AlertBannerProps) {
  const styles =
    type === "error"
      ? "border-danger/30 bg-danger/10 text-danger"
      : "border-success/30 bg-success/10 text-success";

  return <div className={`card border p-4 text-sm ${styles}`}>{message}</div>;
}
