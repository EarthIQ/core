import React, { type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "../../../utils/cn";

interface Step {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  optional?: boolean;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  orientation?: "horizontal" | "vertical";
  size?: "sm" | "md" | "lg";
  clickable?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: {
    circle: "w-6 h-6 text-xs",
    title: "text-sm",
    description: "text-xs",
    gap: "gap-2",
  },
  md: {
    circle: "w-8 h-8 text-sm",
    title: "text-sm",
    description: "text-xs",
    gap: "gap-3",
  },
  lg: {
    circle: "w-10 h-10 text-base",
    title: "text-base",
    description: "text-sm",
    gap: "gap-4",
  },
};

type StepStatus = "completed" | "current" | "pending";

export function Stepper({
  steps,
  currentStep,
  onStepClick,
  orientation = "horizontal",
  size = "md",
  clickable = false,
  className,
}: StepperProps) {
  const config = sizeConfig[size];

  const getStepStatus = (index: number): StepStatus => {
    if (index < currentStep) return "completed";
    if (index === currentStep) return "current";
    return "pending";
  };

  const getStepStyles = (status: StepStatus): React.CSSProperties => {
    switch (status) {
      case "completed":
        return {
          backgroundColor: "var(--success)",
          borderColor: "var(--success)",
          color: "var(--text-on-primary)",
        };
      case "current":
        return {
          backgroundColor: "var(--primary)",
          borderColor: "var(--primary)",
          color: "var(--text-on-primary)",
          boxShadow: "0 0 0 4px oklch(from var(--primary) l c h / 0.2)",
        };
      default:
        return {
          backgroundColor: "var(--surface-hover)",
          borderColor: "var(--border-primary)",
          color: "var(--text-tertiary)",
        };
    }
  };

  if (orientation === "vertical") {
    return (
      <div className={cn("space-y-0", className)}>
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const isLast = index === steps.length - 1;

          return (
            <div
              key={step.id}
              className="relative"
            >
              <div
                className={cn(
                  "flex items-start",
                  config.gap,
                  clickable && status !== "current" && "cursor-pointer"
                )}
                onClick={() => clickable && onStepClick?.(index)}
              >
                {/* Circle and Line */}
                <div className="relative flex flex-col items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: status === "current" ? 1.1 : 1,
                    }}
                    className={cn(
                      "flex items-center justify-center rounded-full border-2 font-medium",
                      config.circle
                    )}
                    style={getStepStyles(status)}
                  >
                    {status === "completed" ? (
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
                    ) : step.icon ? (
                      step.icon
                    ) : (
                      index + 1
                    )}
                  </motion.div>

                  {/* Vertical Line */}
                  {!isLast && (
                    <div
                      className="mt-2 min-h-[40px] w-0.5 flex-1"
                      style={{
                        backgroundColor:
                          status === "completed"
                            ? "var(--success)"
                            : "var(--border-primary)",
                      }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-8">
                  <div className="flex items-center gap-2">
                    <h4
                      className={cn("font-medium", config.title)}
                      style={{
                        color:
                          status === "pending"
                            ? "var(--text-tertiary)"
                            : "var(--text-primary)",
                      }}
                    >
                      {step.title}
                    </h4>
                    {step.optional && (
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        (Optional)
                      </span>
                    )}
                  </div>
                  {step.description && (
                    <p
                      className={cn("mt-0.5", config.description)}
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal orientation
  return (
    <div className={cn("flex items-start", className)}>
      {steps.map((step, index) => {
        const status = getStepStatus(index);
        const isLast = index === steps.length - 1;

        return (
          <div
            key={step.id}
            className="relative flex-1"
          >
            <div
              className={cn(
                "flex flex-col items-center",
                config.gap,
                clickable && status !== "current" && "cursor-pointer"
              )}
              onClick={() => clickable && onStepClick?.(index)}
            >
              {/* Circle */}
              <motion.div
                initial={false}
                animate={{
                  scale: status === "current" ? 1.1 : 1,
                }}
                className={cn(
                  "relative z-10 flex items-center justify-center rounded-full border-2 font-medium",
                  config.circle
                )}
                style={getStepStyles(status)}
              >
                {status === "completed" ? (
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
                ) : step.icon ? (
                  step.icon
                ) : (
                  index + 1
                )}
              </motion.div>

              {/* Content */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <h4
                    className={cn("font-medium", config.title)}
                    style={{
                      color:
                        status === "pending"
                          ? "var(--text-tertiary)"
                          : "var(--text-primary)",
                    }}
                  >
                    {step.title}
                  </h4>
                  {step.optional && (
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      (Optional)
                    </span>
                  )}
                </div>
                {step.description && (
                  <p
                    className={cn("mt-0.5", config.description)}
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {step.description}
                  </p>
                )}
              </div>
            </div>

            {/* Horizontal Line */}
            {!isLast && (
              <div
                className="absolute top-3 left-1/2 h-0.5 w-full"
                style={{
                  backgroundColor:
                    status === "completed"
                      ? "var(--success)"
                      : "var(--border-primary)",
                  transform: "translateX(50%)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
