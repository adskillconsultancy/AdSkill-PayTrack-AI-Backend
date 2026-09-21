export type TCreateSupportInquiryPayload = {
  caseId?: string;
  category: "BILLING_PAYMENT" | "MILESTONE_SCHEDULE" | "DOCUMENT_VERIFICATION" | "CASE_STATUS" | "GENERAL";
  subject: string;
  message: string;
  priority?: "LOW" | "NORMAL" | "URGENT";
};

export type TSupportContact = {
  name: string;
  role: string;
  email: string;
  phone?: string | null;
  whatsapp?: string | null;
  officeHours: string;
};

export type TFaqItem = {
  id: string;
  category: string;
  question: string;
  answer: string;
};

export type TSupportOverviewResponse = {
  assignedConsultant: TSupportContact | null;
  centralSupport: {
    agencyName: string;
    email: string;
    hotline: string;
    whatsapp: string;
    officeAddress: string;
    businessHours: string;
    responseTime: string;
  };
  activeCases: Array<{
    id: string;
    caseCode: string;
    serviceName: string;
    destinationCountry?: string | null;
    status: string;
    financialStatus: string;
  }>;
  faqs: TFaqItem[];
};
