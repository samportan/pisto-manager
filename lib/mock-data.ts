export const mockNetWorth = 14400.52;
export const mockSpendThisMonth = 1842.0;
export const mockSavingsTotal = 5200.0;

export const mockRecentTransactions = [
  {
    id: "1",
    title: "Coffee — Roastery",
    category: "Food",
    amount: -4.5,
    date: "2026-03-27",
    account: "Checking",
  },
  {
    id: "2",
    title: "Salary deposit",
    category: "Income",
    amount: 3200.0,
    date: "2026-03-26",
    account: "Checking",
  },
  {
    id: "3",
    title: "Electric bill",
    category: "Utilities",
    amount: -86.2,
    date: "2026-03-25",
    account: "Checking",
  },
  {
    id: "4",
    title: "Transfer to savings",
    category: "Transfer",
    amount: -200.0,
    date: "2026-03-24",
    account: "Savings",
  },
  {
    id: "5",
    title: "Groceries",
    category: "Food",
    amount: -67.35,
    date: "2026-03-24",
    account: "Checking",
  },
] as const;

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

export const mockTransactionsByDate = [
  {
    date: "2026-03-27",
    items: [
      {
        id: "t1",
        title: "Coffee — Roastery",
        category: "Food",
        amount: -4.5,
        account: "Checking",
      },
      {
        id: "t2",
        title: "Bus pass",
        category: "Transport",
        amount: -35.0,
        account: "Checking",
      },
    ],
  },
  {
    date: "2026-03-26",
    items: [
      {
        id: "t3",
        title: "Salary deposit",
        category: "Income",
        amount: 3200.0,
        account: "Checking",
      },
    ],
  },
  {
    date: "2026-03-25",
    items: [
      {
        id: "t4",
        title: "Electric bill",
        category: "Utilities",
        amount: -86.2,
        account: "Checking",
      },
    ],
  },
] as const;
