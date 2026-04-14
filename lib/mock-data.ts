export const mockBudgetCategories = [
  { id: "1", name: "Food", spent: 420, budget: 600 },
  { id: "2", name: "Transport", spent: 180, budget: 250 },
  { id: "3", name: "Utilities", spent: 210, budget: 200 },
  { id: "4", name: "Entertainment", spent: 95, budget: 150 },
] as const;

export const mockAccounts = [
  {
    id: "1",
    name: "Everyday checking",
    institution: "Demo Bank",
    type: "bank",
    balance: 8420.33,
  },
  {
    id: "2",
    name: "Emergency fund",
    institution: "Demo Bank",
    type: "bank",
    balance: 5200.0,
  },
  {
    id: "3",
    name: "Travel pot",
    institution: "Demo Bank",
    type: "cash",
    balance: 780.19,
  },
] as const;
