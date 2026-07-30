interface SummaryCard {
  label: string;
  value: number;
}

interface SummaryCardsProps {
  cards: SummaryCard[];
}

export function SummaryCards({ cards }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="card p-5">
          <div className="text-sm text-text-tertiary">{card.label}</div>
          <div className="mt-2 text-3xl font-semibold text-text-primary">
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
}
