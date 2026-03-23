/**
 * API endpoint constants
 */

export const API_ENDPOINTS = {
  // Onboarding endpoints
  ONBOARDING: {
    STATE: '/api/v1/tenant/onboarding/state/',
    STEP: (step: number) => `/api/v1/tenant/onboarding/step/${step}/`,
    COMPLETE: '/api/v1/tenant/onboarding/complete/',
    CHECKLIST: '/api/v1/tenant/onboarding/checklist/',
    TEMPLATES: '/api/v1/tenant/onboarding/templates/',
  },
  // User management endpoints
  USERS: {
    LIST: '/api/v1/tenant/users/',
    COACHES_FOR_MANAGEMENT: '/api/v1/tenant/users/coaches-for-management/',
    PARENTS_FOR_MANAGEMENT: '/api/v1/tenant/users/parents-for-management/',
    INVITE: '/api/v1/tenant/users/invite/',
    DETAIL: (id: number) => `/api/v1/tenant/users/${id}/`,
    UPDATE: (id: number) => `/api/v1/tenant/users/${id}/`,
    DISABLE: (id: number) => `/api/v1/tenant/users/${id}/`,
    RESEND_INVITE: (id: number) => `/api/v1/tenant/users/${id}/resend_invite/`,
  },
  // Auth endpoints
  AUTH: {
    LOGIN: '/api/v1/auth/token/',
    VALIDATE_INVITE: (token: string) =>
      `/api/v1/auth/invite/validate/?token=${encodeURIComponent(token)}`,
    ACCEPT_INVITE: '/api/v1/auth/invite/accept/',
    FORGOT_PASSWORD: '/api/v1/auth/forgot-password/',
    RESET_PASSWORD: '/api/v1/auth/reset-password/',
  },
  // Platform endpoints
  PLATFORM: {
    ACADEMIES: {
      LIST: '/api/v1/platform/academies/',
      CREATE: '/api/v1/platform/academies/',
      DETAIL: (id: number | string) => `/api/v1/platform/academies/${id}/`,
      UPDATE: (id: number | string) => `/api/v1/platform/academies/${id}/`,
      PLAN: (id: number | string) => `/api/v1/platform/academies/${id}/plan/`,
      QUOTA: (id: number | string) => `/api/v1/platform/academies/${id}/quota/`,
      INVITE_LINK: (id: number | string) => `/api/v1/platform/academies/${id}/invite-link/`,
      EXPORT: (id: number | string) => `/api/v1/platform/academies/${id}/export/`,
    },
    PLANS: {
      LIST: '/api/v1/platform/plans/',
      CREATE: '/api/v1/platform/plans/',
      DETAIL: (id: number | string) => `/api/v1/platform/plans/${id}/`,
      UPDATE: (id: number | string) => `/api/v1/platform/plans/${id}/`,
    },
    STATS: '/api/v1/platform/stats/',
    ERRORS: '/api/v1/platform/error-logs/',
    AUDIT_LOGS: {
      LIST: '/api/v1/platform/audit-logs/',
      DETAIL: (id: number | string) => `/api/v1/platform/audit-logs/${id}/`,
    },
    FINANCE: {
      SUMMARY: '/api/v1/platform/finance/summary/',
      PAYMENTS: {
        LIST: '/api/v1/platform/finance/payments/',
        DETAIL: (id: number | string) => `/api/v1/platform/finance/payments/${id}/`,
      },
      EXPENSES: {
        LIST: '/api/v1/platform/finance/expenses/',
        DETAIL: (id: number | string) => `/api/v1/platform/finance/expenses/${id}/`,
      },
      EXPORT: '/api/v1/platform/finance/payments/export/',
    },
    MASTERS: {
      CURRENCIES: {
        LIST: '/api/v1/platform/masters/currencies/',
        DETAIL: (id: number | string) => `/api/v1/platform/masters/currencies/${id}/`,
      },
      TIMEZONES: {
        LIST: '/api/v1/platform/masters/timezones/',
        DETAIL: (id: number | string) => `/api/v1/platform/masters/timezones/${id}/`,
      },
      COUNTRIES: {
        LIST: '/api/v1/platform/masters/countries/',
        DETAIL: (id: number | string) => `/api/v1/platform/masters/countries/${id}/`,
      },
    },
  },
  // Tenant endpoints
  TENANT: {
    ACCOUNT: {
      DETAIL: '/api/v1/tenant/account/',
      UPDATE: '/api/v1/tenant/account/',
      CHANGE_PASSWORD: '/api/v1/tenant/account/change-password/',
    },
    OVERVIEW: '/api/v1/tenant/overview/',
    REPORTS: '/api/v1/tenant/reports/',
    REPORTS_EXPORT: '/api/v1/tenant/reports/export/',
    FEEDBACK: {
      LIST: '/api/v1/tenant/feedback/',
      CREATE: '/api/v1/tenant/feedback/',
      DETAIL: (id: number | string) => `/api/v1/tenant/feedback/${id}/`,
      UPDATE: (id: number | string) => `/api/v1/tenant/feedback/${id}/`,
    },
    STUDENTS: {
      LIST: '/api/v1/tenant/students/',
      CREATE: '/api/v1/tenant/students/',
      DETAIL: (id: number | string) => `/api/v1/tenant/students/${id}/`,
      UPDATE: (id: number | string) => `/api/v1/tenant/students/${id}/`,
      DELETE: (id: number | string) => `/api/v1/tenant/students/${id}/`,
    },
    PARENTS: {
      LIST: '/api/v1/tenant/parents/',
      CREATE: '/api/v1/tenant/parents/',
      DETAIL: (id: number | string) => `/api/v1/tenant/parents/${id}/`,
      UPDATE: (id: number | string) => `/api/v1/tenant/parents/${id}/`,
      DELETE: (id: number | string) => `/api/v1/tenant/parents/${id}/`,
      INVITE: (id: number | string) => `/api/v1/tenant/parents/${id}/invite/`,
    },
    CLASSES: {
      LIST: '/api/v1/tenant/classes/',
      CREATE: '/api/v1/tenant/classes/',
      DETAIL: (id: number | string) => `/api/v1/tenant/classes/${id}/`,
      UPDATE: (id: number | string) => `/api/v1/tenant/classes/${id}/`,
      DELETE: (id: number | string) => `/api/v1/tenant/classes/${id}/`,
      ENROLL: (id: number | string) => `/api/v1/tenant/classes/${id}/enroll/`,
      ENROLLMENTS: (id: number | string) => `/api/v1/tenant/classes/${id}/enrollments/`,
    },
    ENROLLMENTS: {
      LIST: '/api/v1/tenant/enrollments/',
      CREATE: '/api/v1/tenant/enrollments/',
      DETAIL: (id: number | string) => `/api/v1/tenant/enrollments/${id}/`,
      UPDATE: (id: number | string) => `/api/v1/tenant/enrollments/${id}/`,
      DELETE: (id: number | string) => `/api/v1/tenant/enrollments/${id}/`,
    },
    ATTENDANCE: {
      LIST: '/api/v1/tenant/attendance/',
      CREATE: '/api/v1/tenant/attendance/',
      MARK: '/api/v1/tenant/attendance/mark/',
      DETAIL: (id: number | string) => `/api/v1/tenant/attendance/${id}/`,
      UPDATE: (id: number | string) => `/api/v1/tenant/attendance/${id}/`,
      DELETE: (id: number | string) => `/api/v1/tenant/attendance/${id}/`,
    },
    COACH_ATTENDANCE: {
      LIST: '/api/v1/tenant/coach-attendance/',
      CREATE: '/api/v1/tenant/coach-attendance/',
      MARK: '/api/v1/tenant/coach-attendance/mark/',
      DETAIL: (id: number | string) => `/api/v1/tenant/coach-attendance/${id}/`,
      UPDATE: (id: number | string) => `/api/v1/tenant/coach-attendance/${id}/`,
      DELETE: (id: number | string) => `/api/v1/tenant/coach-attendance/${id}/`,
    },
    BILLING: {
      ITEMS: {
        LIST: '/api/v1/tenant/items/',
        CREATE: '/api/v1/tenant/items/',
        DETAIL: (id: number | string) => `/api/v1/tenant/items/${id}/`,
        UPDATE: (id: number | string) => `/api/v1/tenant/items/${id}/`,
        DELETE: (id: number | string) => `/api/v1/tenant/items/${id}/`,
      },
      INVOICES: {
        LIST: '/api/v1/tenant/invoices/',
        CREATE: '/api/v1/tenant/invoices/',
        DETAIL: (id: number | string) => `/api/v1/tenant/invoices/${id}/`,
        UPDATE: (id: number | string) => `/api/v1/tenant/invoices/${id}/`,
        DELETE: (id: number | string) => `/api/v1/tenant/invoices/${id}/`,
      },
      RECEIPTS: {
        LIST: '/api/v1/tenant/receipts/',
        CREATE: '/api/v1/tenant/receipts/',
        DETAIL: (id: number | string) => `/api/v1/tenant/receipts/${id}/`,
        UPDATE: (id: number | string) => `/api/v1/tenant/receipts/${id}/`,
        DELETE: (id: number | string) => `/api/v1/tenant/receipts/${id}/`,
      },
    },
    FACILITIES: {
      RENT_CONFIGS: {
        LIST: '/api/v1/tenant/facilities/rent-configs/',
        CREATE: '/api/v1/tenant/facilities/rent-configs/',
        DETAIL: (id: number | string) => `/api/v1/tenant/facilities/rent-configs/${id}/`,
        UPDATE: (id: number | string) => `/api/v1/tenant/facilities/rent-configs/${id}/`,
        DELETE: (id: number | string) => `/api/v1/tenant/facilities/rent-configs/${id}/`,
      },
      RENT_INVOICES: {
        LIST: '/api/v1/tenant/facilities/rent-invoices/',
        CREATE: '/api/v1/tenant/facilities/rent-invoices/',
        DETAIL: (id: number | string) => `/api/v1/tenant/facilities/rent-invoices/${id}/`,
        UPDATE: (id: number | string) => `/api/v1/tenant/facilities/rent-invoices/${id}/`,
        DELETE: (id: number | string) => `/api/v1/tenant/facilities/rent-invoices/${id}/`,
        ADD_PAYMENT: (id: number | string) => `/api/v1/tenant/facilities/rent-invoices/${id}/add_payment/`,
        MARK_PAID: (id: number | string) => `/api/v1/tenant/facilities/rent-invoices/${id}/mark_paid/`,
      },
      RENT_RECEIPTS: {
        LIST: '/api/v1/tenant/facilities/rent-receipts/',
        DETAIL: (id: number | string) => `/api/v1/tenant/facilities/rent-receipts/${id}/`,
      },
      BILLS: {
        LIST: '/api/v1/tenant/facilities/bills/',
        CREATE: '/api/v1/tenant/facilities/bills/',
        DETAIL: (id: number | string) => `/api/v1/tenant/facilities/bills/${id}/`,
        UPDATE: (id: number | string) => `/api/v1/tenant/facilities/bills/${id}/`,
        DELETE: (id: number | string) => `/api/v1/tenant/facilities/bills/${id}/`,
        MARK_PAID: (id: number | string) => `/api/v1/tenant/facilities/bills/${id}/mark_paid/`,
      },
      BILL_LINE_ITEMS: {
        LIST: '/api/v1/tenant/facilities/bill-line-items/',
        CREATE: '/api/v1/tenant/facilities/bill-line-items/',
        DETAIL: (id: number | string) => `/api/v1/tenant/facilities/bill-line-items/${id}/`,
        UPDATE: (id: number | string) => `/api/v1/tenant/facilities/bill-line-items/${id}/`,
        DELETE: (id: number | string) => `/api/v1/tenant/facilities/bill-line-items/${id}/`,
      },
      INVENTORY_ITEMS: {
        LIST: '/api/v1/tenant/facilities/inventory-items/',
        CREATE: '/api/v1/tenant/facilities/inventory-items/',
        DETAIL: (id: number | string) => `/api/v1/tenant/facilities/inventory-items/${id}/`,
        UPDATE: (id: number | string) => `/api/v1/tenant/facilities/inventory-items/${id}/`,
        DELETE: (id: number | string) => `/api/v1/tenant/facilities/inventory-items/${id}/`,
        ADJUST_QUANTITY: (id: number | string) => `/api/v1/tenant/facilities/inventory-items/${id}/adjust_quantity/`,
      },
    },
    MEDIA: {
      LIST: '/api/v1/tenant/media/',
      UPLOAD: '/api/v1/tenant/media/',
      DETAIL: (id: number | string) => `/api/v1/tenant/media/${id}/`,
      DELETE: (id: number | string) => `/api/v1/tenant/media/${id}/`,
    },
    COACHES: {
      LIST: '/api/v1/tenant/coaches/',
      CREATE: '/api/v1/tenant/coaches/',
      DETAIL: (id: number | string) => `/api/v1/tenant/coaches/${id}/`,
      UPDATE: (id: number | string) => `/api/v1/tenant/coaches/${id}/`,
      DELETE: (id: number | string) => `/api/v1/tenant/coaches/${id}/`,
      INVITE: (id: number | string) => `/api/v1/tenant/coaches/${id}/invite/`,
    },
    COACH_PAY_SCHEMES: {
      LIST: '/api/v1/tenant/pay-schemes/',
      CREATE: '/api/v1/tenant/pay-schemes/',
      DETAIL: (id: number | string) => `/api/v1/tenant/pay-schemes/${id}/`,
      UPDATE: (id: number | string) => `/api/v1/tenant/pay-schemes/${id}/`,
      DELETE: (id: number | string) => `/api/v1/tenant/pay-schemes/${id}/`,
    },
    COACH_PAYMENTS: {
      LIST: '/api/v1/tenant/coach-payments/',
      CREATE: '/api/v1/tenant/coach-payments/',
      DETAIL: (id: number | string) => `/api/v1/tenant/coach-payments/${id}/`,
      UPDATE: (id: number | string) => `/api/v1/tenant/coach-payments/${id}/`,
      DELETE: (id: number | string) => `/api/v1/tenant/coach-payments/${id}/`,
    },
    STAFF_INVOICES: {
      LIST: '/api/v1/tenant/staff-invoices/',
      CREATE: '/api/v1/tenant/staff-invoices/',
      DETAIL: (id: number | string) => `/api/v1/tenant/staff-invoices/${id}/`,
      UPDATE: (id: number | string) => `/api/v1/tenant/staff-invoices/${id}/`,
      DELETE: (id: number | string) => `/api/v1/tenant/staff-invoices/${id}/`,
    },
    STAFF_RECEIPTS: {
      LIST: '/api/v1/tenant/staff-receipts/',
      DETAIL: (id: number | string) => `/api/v1/tenant/staff-receipts/${id}/`,
    },
    SETTINGS: {
      BULK_IMPORTS: {
        SCHEMA: (datasetType: 'students' | 'coaches') => `/api/v1/tenant/bulk-imports/${datasetType}/schema/`,
        PREVIEW: (datasetType: 'students' | 'coaches') => `/api/v1/tenant/bulk-imports/${datasetType}/preview/`,
        COMMIT: (datasetType: 'students' | 'coaches') => `/api/v1/tenant/bulk-imports/${datasetType}/commit/`,
      },
      LOCATIONS: {
        LIST: '/api/v1/tenant/locations/',
        CREATE: '/api/v1/tenant/locations/',
        DETAIL: (id: number | string) => `/api/v1/tenant/locations/${id}/`,
        UPDATE: (id: number | string) => `/api/v1/tenant/locations/${id}/`,
        DELETE: (id: number | string) => `/api/v1/tenant/locations/${id}/`,
      },
      SPORTS: {
        LIST: '/api/v1/tenant/sports/',
        CREATE: '/api/v1/tenant/sports/',
        DETAIL: (id: number | string) => `/api/v1/tenant/sports/${id}/`,
        UPDATE: (id: number | string) => `/api/v1/tenant/sports/${id}/`,
        DELETE: (id: number | string) => `/api/v1/tenant/sports/${id}/`,
      },
      AGE_CATEGORIES: {
        LIST: '/api/v1/tenant/age-categories/',
        CREATE: '/api/v1/tenant/age-categories/',
        DETAIL: (id: number | string) => `/api/v1/tenant/age-categories/${id}/`,
        UPDATE: (id: number | string) => `/api/v1/tenant/age-categories/${id}/`,
        DELETE: (id: number | string) => `/api/v1/tenant/age-categories/${id}/`,
      },
      TERMS: {
        LIST: '/api/v1/tenant/terms/',
        CREATE: '/api/v1/tenant/terms/',
        DETAIL: (id: number | string) => `/api/v1/tenant/terms/${id}/`,
        UPDATE: (id: number | string) => `/api/v1/tenant/terms/${id}/`,
        DELETE: (id: number | string) => `/api/v1/tenant/terms/${id}/`,
      },
    },
    ACADEMY: {
      DETAIL: '/api/v1/tenant/academy/',
      UPDATE: '/api/v1/tenant/academy/',
      SUBSCRIPTION: '/api/v1/tenant/academy/subscription/',
      USAGE: '/api/v1/tenant/academy/usage/',
      TAX_SETTINGS: '/api/v1/tenant/academy/tax-settings/',
    },
    MASTERS: {
      TIMEZONES: '/api/v1/tenant/masters/timezones/',
      CURRENCIES: '/api/v1/tenant/masters/currencies/',
      COUNTRIES: '/api/v1/tenant/masters/countries/',
    },
  },
} as const;
