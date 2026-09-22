export interface ISearchQuery {
  q?: string;
  limit?: number;
}

export type TSearchResultType = "client" | "case" | "payment" | "invoice" | "receipt";

export interface ISearchResultItem {
  id: string;
  type: TSearchResultType;
  title: string;
  subtitle: string;
  badge?: string;
  status?: string;
  amount?: string;
  currency?: string;
  date?: string;
  url: string;
  details?: {
    email?: string;
    phone?: string;
    clientId?: string;
    caseCode?: string;
    serviceName?: string;
    consultantName?: string;
    invoiceNumber?: string;
    receiptNumber?: string;
    transactionRef?: string;
  };
}

export interface ISearchResponse {
  clients: ISearchResultItem[];
  cases: ISearchResultItem[];
  payments: ISearchResultItem[];
  invoices: ISearchResultItem[];
  receipts: ISearchResultItem[];
  totalMatches: number;
}
