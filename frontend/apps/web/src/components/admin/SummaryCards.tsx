interface SummaryCard {
  label: string;
  value: number;
}

interface SummaryCardsProps {
  cards: SummaryCard[];
}

export const SummaryCards = ({ cards }: SummaryCardsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="card p-5"
        >
          <div className="text-text-tertiary text-sm">{card.label}</div>
          <div className="text-text-primary mt-2 text-3xl font-semibold">
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
};
