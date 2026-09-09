interface CheckboxOption {
  id: string;
  label: string;
}

interface CheckboxListProps {
  options: CheckboxOption[];
  selected: string[];
  emptyMessage: string;
  onChange: (id: string) => void;
}

export const CheckboxList = ({
  options,
  selected,
  emptyMessage,
  onChange,
}: CheckboxListProps) => {
  return (
    <div className="border-border-primary bg-surface-hover max-h-40 space-y-2 overflow-y-auto rounded-xl border p-3">
      {options.length === 0 ? (
        <p className="text-text-tertiary text-sm">{emptyMessage}</p>
      ) : (
        options.map((option) => (
          <label
            key={option.id}
            className="text-text-secondary hover:text-text-primary flex cursor-pointer items-center gap-2 text-sm"
          >
            <input
              checked={selected.includes(option.id)}
              type="checkbox"
              onChange={() => onChange(option.id)}
            />
            {option.label}
          </label>
        ))
      )}
    </div>
  );
};
