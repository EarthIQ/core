import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
  type FormEvent,
} from "react";
import { cn } from "../../../utils/cn";

// Form Context
interface FormContextValue {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  setValue: (name: string, value: any) => void;
  setError: (name: string, error: string) => void;
  setTouched: (name: string, touched: boolean) => void;
  getFieldProps: (name: string) => {
    name: string;
    value: any;
    onChange: (e: any) => void;
    onBlur: () => void;
    error?: string;
  };
}

const FormContext = createContext<FormContextValue | null>(null);

export function useFormContext() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useFormContext must be used within a Form");
  }
  return context;
}

// Validation types
type ValidationRule = {
  required?: boolean | string;
  min?: number | { value: number; message: string };
  max?: number | { value: number; message: string };
  minLength?: number | { value: number; message: string };
  maxLength?: number | { value: number; message: string };
  pattern?: RegExp | { value: RegExp; message: string };
  validate?: (value: any, values: Record<string, any>) => boolean | string;
};

type ValidationSchema = Record<string, ValidationRule>;

interface FormProps {
  children: ReactNode;
  initialValues?: Record<string, any>;
  validationSchema?: ValidationSchema;
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
  onChange?: (values: Record<string, any>) => void;
  className?: string;
}

function validateField(
  name: string,
  value: any,
  rules?: ValidationRule,
  allValues?: Record<string, any>
): string {
  if (!rules) return "";

  // Required
  if (rules.required) {
    const isEmpty = value === undefined || value === null || value === "";
    if (isEmpty) {
      return typeof rules.required === "string"
        ? rules.required
        : `${name} is required`;
    }
  }

  // Min (number)
  if (rules.min !== undefined && typeof value === "number") {
    const minValue =
      typeof rules.min === "object" ? rules.min.value : rules.min;
    const message =
      typeof rules.min === "object"
        ? rules.min.message
        : `Minimum value is ${minValue}`;
    if (value < minValue) return message;
  }

  // Max (number)
  if (rules.max !== undefined && typeof value === "number") {
    const maxValue =
      typeof rules.max === "object" ? rules.max.value : rules.max;
    const message =
      typeof rules.max === "object"
        ? rules.max.message
        : `Maximum value is ${maxValue}`;
    if (value > maxValue) return message;
  }

  // MinLength (string)
  if (rules.minLength !== undefined && typeof value === "string") {
    const minLen =
      typeof rules.minLength === "object"
        ? rules.minLength.value
        : rules.minLength;
    const message =
      typeof rules.minLength === "object"
        ? rules.minLength.message
        : `Minimum length is ${minLen}`;
    if (value.length < minLen) return message;
  }

  // MaxLength (string)
  if (rules.maxLength !== undefined && typeof value === "string") {
    const maxLen =
      typeof rules.maxLength === "object"
        ? rules.maxLength.value
        : rules.maxLength;
    const message =
      typeof rules.maxLength === "object"
        ? rules.maxLength.message
        : `Maximum length is ${maxLen}`;
    if (value.length > maxLen) return message;
  }

  // Pattern
  if (rules.pattern && typeof value === "string") {
    const pattern =
      rules.pattern instanceof RegExp ? rules.pattern : rules.pattern.value;
    const message =
      rules.pattern instanceof RegExp
        ? "Invalid format"
        : rules.pattern.message;
    if (!pattern.test(value)) return message;
  }

  // Custom validate
  if (rules.validate) {
    const result = rules.validate(value, allValues || {});
    if (typeof result === "string") return result;
    if (result === false) return `${name} is invalid`;
  }

  return "";
}

export function Form({
  children,
  initialValues = {},
  validationSchema,
  onSubmit,
  onChange,
  className,
}: FormProps) {
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouchedState] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback(
    (name: string, value: any) => {
      setValues((prev) => {
        const newValues = { ...prev, [name]: value };
        onChange?.(newValues);
        return newValues;
      });

      // Validate on change if field is touched
      if (touched[name] && validationSchema?.[name]) {
        const error = validateField(
          name,
          value,
          validationSchema[name],
          values
        );
        setErrors((prev) => ({ ...prev, [name]: error }));
      }
    },
    [touched, validationSchema, values, onChange]
  );

  const setError = useCallback((name: string, error: string) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  const setTouched = useCallback(
    (name: string, isTouched: boolean) => {
      setTouchedState((prev) => ({ ...prev, [name]: isTouched }));

      // Validate on blur
      if (isTouched && validationSchema?.[name]) {
        const error = validateField(
          name,
          values[name],
          validationSchema[name],
          values
        );
        setErrors((prev) => ({ ...prev, [name]: error }));
      }
    },
    [validationSchema, values]
  );

  const getFieldProps = useCallback(
    (name: string) => ({
      name,
      value: values[name] ?? "",
      onChange: (e: any) => {
        const value = e?.target?.value ?? e;
        setValue(name, value);
      },
      onBlur: () => setTouched(name, true),
      error: touched[name] ? errors[name] : undefined,
    }),
    [values, errors, touched, setValue, setTouched]
  );

  const validateAll = useCallback((): boolean => {
    if (!validationSchema) return true;

    const newErrors: Record<string, string> = {};
    let isValid = true;

    Object.keys(validationSchema).forEach((name) => {
      const error = validateField(
        name,
        values[name],
        validationSchema[name],
        values
      );
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouchedState(
      Object.keys(validationSchema).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {}
      )
    );

    return isValid;
  }, [validationSchema, values]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateAll()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormContext.Provider
      value={{
        values,
        errors,
        touched,
        isSubmitting,
        setValue,
        setError,
        setTouched,
        getFieldProps,
      }}
    >
      <form
        onSubmit={handleSubmit}
        className={cn("space-y-4", className)}
      >
        {children}
      </form>
    </FormContext.Provider>
  );
}

// Form Field wrapper component
interface FormFieldProps {
  name: string;
  children: (props: ReturnType<FormContextValue["getFieldProps"]>) => ReactNode;
}

export function FormField({ name, children }: FormFieldProps) {
  const { getFieldProps } = useFormContext();
  return <>{children(getFieldProps(name))}</>;
}

// Submit button that auto-disables during submission
interface FormSubmitProps {
  children: ReactNode;
  className?: string;
}

export function FormSubmit({ children, className }: FormSubmitProps) {
  const { isSubmitting } = useFormContext();

  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className={cn(
        "w-full rounded-[var(--radius-lg)] px-4 py-2.5 font-medium transition-colors",
        "border border-[var(--primary)] bg-[var(--primary)] text-[var(--text-on-primary)]",
        "hover:border-[var(--primary-dark)] hover:bg-[var(--primary-dark)]",
        "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset)] focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {isSubmitting ? (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Submitting...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
