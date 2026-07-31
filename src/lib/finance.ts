export type AccountKind = "bank" | "wallet" | "cash" | "credit_card";
export type TransactionKind = "income" | "expense" | "transfer";
export type TransferSide = "outgoing" | "incoming";

export interface CreditCardDetails {
  creditLimit: number;
  statementDay: number;
  paymentDueDay: number;
  lastFourDigits: string | null;
  interestRate: number;
}

export interface Account {
  id: string;
  name: string;
  institution: string;
  kind: AccountKind;
  color: string;
  openingBalance: number;
  creditCardDetails?: CreditCardDetails | null;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string | null;
  kind: TransactionKind;
  amount: number;
  description: string;
  date: string;
  transferId?: string | null;
  transferSide?: TransferSide | null;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  date: string;
}

export interface FinanceState {
  workspaceName: string;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  transfers: Transfer[];
}

export const seedState: FinanceState = {
  workspaceName: "Mis finanzas",
  accounts: [
    { id: "primary", name: "Cuenta principal", institution: "Banco Aurora", kind: "bank", color: "#ec5564", openingBalance: 2000000, creditCardDetails: null },
    { id: "savings", name: "Ahorros", institution: "Banco Horizonte", kind: "bank", color: "#f6c945", openingBalance: 800000, creditCardDetails: null },
    { id: "wallet", name: "Gastos diarios", institution: "Billetera Nube", kind: "wallet", color: "#7d3f98", openingBalance: 300000, creditCardDetails: null },
    { id: "cash", name: "Efectivo", institution: "Efectivo", kind: "cash", color: "#3e8c73", openingBalance: 100000, creditCardDetails: null },
  ],
  categories: [
    { id: "salary", name: "Ingresos", color: "#3f8b6d", icon: "↗" },
    { id: "housing", name: "Vivienda", color: "#6278a3", icon: "⌂" },
    { id: "food", name: "Comida", color: "#e8874f", icon: "●" },
    { id: "transport", name: "Transporte", color: "#8967aa", icon: "◆" },
    { id: "services", name: "Servicios", color: "#d4ae42", icon: "◐" },
    { id: "other", name: "Otros", color: "#8d9690", icon: "•" },
  ],
  transfers: [],
  transactions: [
    { id: "t1", accountId: "primary", categoryId: "salary", kind: "income", amount: 2500000, description: "Ingreso de demostración", date: "2026-01-10" },
    { id: "t2", accountId: "primary", categoryId: "housing", kind: "expense", amount: 900000, description: "Vivienda", date: "2026-01-11" },
    { id: "t3", accountId: "wallet", categoryId: "food", kind: "expense", amount: 60000, description: "Comida", date: "2026-01-12" },
    { id: "t4", accountId: "savings", categoryId: "services", kind: "expense", amount: 120000, description: "Servicios", date: "2026-01-13" },
    { id: "t5", accountId: "wallet", categoryId: "transport", kind: "expense", amount: 40000, description: "Transporte", date: "2026-01-14" },
  ],
};

export const emptyFinanceState: FinanceState = {
  workspaceName: "Mis finanzas",
  accounts: [],
  categories: [],
  transactions: [],
  transfers: [],
};

export function accountBalance(account: Account, transactions: Transaction[]) {
  return transactions
    .filter((transaction) => transaction.accountId === account.id)
    .reduce(
      (balance, transaction) =>
        balance + (transaction.kind === "income" || (transaction.kind === "transfer" && transaction.transferSide === "incoming") ? transaction.amount : -transaction.amount),
      account.openingBalance,
    );
}

export function creditCardDebt(account: Account, transactions: Transaction[]) {
  if (account.kind !== "credit_card") return 0;
  return Math.max(0, -accountBalance(account, transactions));
}

export function creditCardAvailable(account: Account, transactions: Transaction[]) {
  if (account.kind !== "credit_card") return 0;
  return Math.max(0, (account.creditCardDetails?.creditLimit ?? 0) - creditCardDebt(account, transactions));
}

export function financialPosition(state: FinanceState) {
  const available = state.accounts
    .filter((account) => account.kind !== "credit_card")
    .reduce((sum, account) => sum + accountBalance(account, state.transactions), 0);
  const debt = state.accounts
    .filter((account) => account.kind === "credit_card")
    .reduce((sum, account) => sum + creditCardDebt(account, state.transactions), 0);
  return { available, debt, netWorth: available - debt };
}

export function totals(state: FinanceState) {
  const income = state.transactions
    .filter((item) => item.kind === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const expenses = state.transactions
    .filter((item) => item.kind === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
  const balance = state.accounts.reduce(
    (sum, account) => sum + accountBalance(account, state.transactions),
    0,
  );
  return { income, expenses, balance };
}

export function formatCOP(value: number, compact = false) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
    notation: compact ? "compact" : "standard",
  }).format(value);
}
