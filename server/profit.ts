// Profit for a period, two ways:
// - earned:   what was charged (hotels + walk-in), paid or not  -> estimated profit
// - received: money that actually came in                       -> cash profit

export type MoneyInputs = {
  hotelEarned: number;
  walkInEarned: number;
  hotelReceived: number;
  walkInReceived: number;
  expenses: number;
};

export function profitSummary(m: MoneyInputs) {
  const revenue = m.hotelEarned + m.walkInEarned;
  const received = m.hotelReceived + m.walkInReceived;
  return {
    ...m,
    revenue,
    received,
    estimatedProfit: revenue - m.expenses,
    cashProfit: received - m.expenses,
  };
}

export type ProfitSummary = ReturnType<typeof profitSummary>;
