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

export function CheckboxList({
  options,
  selected,
  emptyMessage,
  onChange,
}: CheckboxListProps) {
  return (
    <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-border-primary bg-surface-hover p-3">
      {options.length === 0 ? (
        <p className="text-sm text-text-tertiary">{emptyMessage}</p>
      ) : (
        options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
          >
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              onChange={() => onChange(option.id)}
            />
            {option.label}
          </label>
        ))
      )}
    </div>
  );
}
