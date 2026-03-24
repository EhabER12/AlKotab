import axiosInstance from "@/lib/axios";
import { createAsyncThunk } from "@reduxjs/toolkit";

// New Interfaces based on API response

export interface SocialLink {
  platform: string;
  url: string;
  _id: string;
}

export interface ThemeSettings {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  adminPrimary: string;
  _id?: string;
}

export interface EmailNotificationTemplate {
  subject: string;
  body: string;
}

export interface EmailNotifications {
  templates: {
    newForm?: EmailNotificationTemplate;
    newPurchase?: EmailNotificationTemplate;
    newMessage?: EmailNotificationTemplate;
    // Add other templates if needed
  };
  enabled: boolean;
  recipients: string[];
}

export interface WhatsAppNotifications {
  templates: {
    newForm?: string;
    newPurchase?: string;
    newMessage?: string;
    // Add other templates if needed
  };
  enabled: boolean;
  numbers: string[];
}

export interface Notifications {
  email: EmailNotifications;
  whatsapp: WhatsAppNotifications;
  _id: string;
}

export interface ManualPaymentMethod {
  _id: string;
  title: string | { ar: string; en: string };
  description: string | { ar: string; en: string };
  imageUrl: string;
  isEnabled: boolean;
  requiresAttachment: boolean;
  instructions?: string | { ar: string; en: string };
  order: number;
}

export interface PaymentGateways {
  manualMethods?: ManualPaymentMethod[];
  _id: string;
}

export interface HeroButton {
  text: string;
  url: string;
  variant?: "primary" | "secondary" | "outline" | "ghost"; // Optional style variant
  _id?: string;
}

export interface MarketingBannerItem {
  _id?: string;
  text: { ar: string; en: string };
  linkUrl?: string;
  linkText?: { ar: string; en: string };
  icon?: string;
  isEnabled: boolean;
  order: number;
  backgroundColor?: string;
  textColor?: string;
}

export interface MarketingBannersSettings {
  enabled: boolean;
  autoSlideInterval: number;
  banners: MarketingBannerItem[];
}

export interface HeaderDisplaySettings {
  showLogo: boolean;
  showTitle: boolean;
  logoWidth: number;
}

export interface NavbarLink {
  _id?: string;
  title: { ar: string; en: string };
  url: string;
  order: number;
  isEnabled: boolean;
  isExternal: boolean;
}

export interface HeroTextSizes {
  titleMobile: number;
  titleDesktop: number;
  subtitleMobile: number;
  subtitleDesktop: number;
}

export interface MethodologyStep {
  title: { ar: string; en: string };
  subtitle: { ar: string; en: string };
  description: { ar: string; en: string };
}

export const DEFAULT_HERO_TEXT_SIZES: HeroTextSizes = {
  titleMobile: 40,
  titleDesktop: 72,
  subtitleMobile: 18,
  subtitleDesktop: 24,
};

export const DEFAULT_METHODOLOGY_TITLE = {
  ar: "رحلة النجاح",
  en: "Journey to Success",
};

export const DEFAULT_METHODOLOGY_TITLE_HIGHLIGHT = {
  ar: "معنا",
  en: "With Us",
};

export const DEFAULT_METHODOLOGY_SUBTITLE = {
  ar: "منهجية عمل مدروسة لضمان تحقيق أهدافك",
  en: "A thoughtful methodology to ensure achieving your goals",
};

export const DEFAULT_METHODOLOGY_STEPS: MethodologyStep[] = [
  {
    title: { ar: "التحليل", en: "Analysis" },
    subtitle: { ar: "تحليل", en: "Analyze" },
    description: {
      ar: "دراسة السوق والمنافسين وفهم احتياجات العميل بعمق",
      en: "Market and competitor study, deep understanding of client needs",
    },
  },
  {
    title: { ar: "التخطيط", en: "Planning" },
    subtitle: { ar: "تخطيط", en: "Plan" },
    description: {
      ar: "رسم خارطة طريق واضحة واستراتيجية محكمة",
      en: "Drawing a clear roadmap and solid strategy",
    },
  },
  {
    title: { ar: "التنفيذ", en: "Execution" },
    subtitle: { ar: "تنفيذ", en: "Execute" },
    description: {
      ar: "إنتاج وتطوير وفق أعلى معايير الجودة العالمية",
      en: "Production and development according to the highest global quality standards",
    },
  },
  {
    title: { ar: "النمو", en: "Growth" },
    subtitle: { ar: "نمو", en: "Grow" },
    description: {
      ar: "تسليم، متابعة، وتحسين مستمر لضمان استدامة النمو",
      en: "Delivery, follow-up, and continuous improvement to ensure sustainable growth",
    },
  },
];

export interface SectionConfig {
  _id?: string;
  badge?: { ar: string; en: string };
  title: { ar: string; en: string };
  titleHighlight?: { ar: string; en: string };
  subtitle: { ar: string; en: string };
  content: { ar: string; en: string };
  buttonText: { ar: string; en: string };
  buttonLink: string;
  isEnabled: boolean;
  backgroundImage?: string;
  textSizes?: HeroTextSizes;
  steps?: MethodologyStep[];
  order?: number;
}

export interface HomepageSections {
  hero: SectionConfig;
  features: SectionConfig;
  services: SectionConfig;
  stats: SectionConfig;
  about: SectionConfig;
  cta: SectionConfig;
  testimonials: SectionConfig;
}

export interface HomepageBannerSettings {
  isEnabled: boolean;
  imageUrl: string;
  title: { ar: string; en: string };
  subtitle: { ar: string; en: string };
  buttonText: { ar: string; en: string };
  buttonLink: string;
}

export interface HomepageCoursesSettings {
  isEnabled: boolean;
  displayCount: number; // Number of courses to display
  title: { ar: string; en: string };
  subtitle: { ar: string; en: string };
  buttonText: { ar: string; en: string };
}

export interface CoursesPageHeroSettings {
  isEnabled: boolean;
  badge: { ar: string; en: string };
  title: { ar: string; en: string };
  subtitle: { ar: string; en: string };
  backgroundImage?: string;
}

export interface BooksPageHeroSettings {
  title: { ar: string; en: string };
  subtitle: { ar: string; en: string };
}

export interface ProductsPageHeroSettings {
  isEnabled: boolean;
  badge: { ar: string; en: string };
  title: { ar: string; en: string };
  subtitle: { ar: string; en: string };
  backgroundImage?: string;
}

export interface ArticlesPageHeroSettings {
  badge: { ar: string; en: string };
  title: { ar: string; en: string };
  subtitle: { ar: string; en: string };
  latestArticles: { ar: string; en: string };
}

export interface HomepageArticlesSectionSettings {
  isEnabled: boolean;
  badge: { ar: string; en: string };
  title: { ar: string; en: string };
  titleHighlight: { ar: string; en: string };
  subtitle: { ar: string; en: string };
  viewAllText: { ar: string; en: string };
}

export interface EmailSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export interface AuthSettings {
  requireEmailVerification: boolean;
}

// Authority Bar Settings (NEW)
export interface AuthorityBarItem {
  icon: string;
  text: { ar: string; en: string };
}

export interface AuthorityBarSettings {
  isEnabled: boolean;
  title: { ar: string; en: string };
  order?: number;
  items: AuthorityBarItem[];
}

// Reviews Section Settings (NEW)
export interface ReviewsSectionSettings {
  isEnabled?: boolean;
  title?: { ar: string; en: string };
  subtitle?: { ar: string; en: string };
  order?: number;
  showRating?: boolean;
  showDate?: boolean;
  displayCount?: number;
  useFakeReviews?: boolean;
  fakeReviews?: Array<{
    name: string;
    comment: string;
    rating: number;
  }>;
}

// Why Genoun Settings (NEW)
export interface WhyGenounFeature {
  icon: string;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
}

export interface WhyGenounSettings {
  isEnabled: boolean;
  title: { ar: string; en: string };
  titleHighlight: { ar: string; en: string };
  subtitle: { ar: string; en: string };
  order?: number;
  features: WhyGenounFeature[];
}

export interface FinanceSettings {
  baseCurrency: "SAR" | "EGP" | "USD";
  exchangeRates: {
    USD: number;
    SAR: number;
    EGP: number;
    EGPtoSAR?: number;
  };
  lastRatesUpdate?: Date | string;
}

export interface ApiKeysSettings {
  geminiApiKey?: string;
  googleCloudCredentials?: string;
  lastUpdated?: Date | string;
}

export interface TeacherProfitSettings {
  enabled?: boolean;
  courseSalesPercentage?: number;
  subscriptionPercentage?: number;
  lastUpdated?: Date | string;
}

export interface SubscriptionStudentProfitSettings {
  enabled?: boolean;
  defaultPercentage?: number;
  lastUpdated?: Date | string;
}

export interface SubscriptionTeacher {
  _id?: string;
  name: { ar: string; en: string };
  email?: string;
  phone?: string;
  profitPercentage?: number;
  salaryAmount?: number;
  salaryDueDate?: string;
  notes?: string;
  isActive?: boolean;
}

export interface PromoModalSettings {
  isEnabled: boolean;
  title: { ar: string; en: string };
  content: { ar: string; en: string };
  imageUrl?: string;
  buttonText: { ar: string; en: string };
  buttonLink: string;
  displayDelay: number;
  showOnce: boolean;
}

// Hero Stats Settings (for Hero Section statistics bar)
export interface HeroStatItem {
  value: string;
  label: { ar: string; en: string };
}

export interface HeroStatsSettings {
  enabled: boolean;
  projects: HeroStatItem;
  growth: HeroStatItem;
  countries: HeroStatItem;
  satisfiedStudents: HeroStatItem;
}

export interface WhatsAppDeliverySettings {
  messageDelayMs: number;
  messageDelayJitterMs: number;
  messageWrapperEnabled: boolean;
  messageWrapper: { ar: string; en: string };
  lastUpdated?: Date | string;
}


export interface WebsiteSettingsData {
  whatsappConnected: boolean;
  whatsappQrCode?: string;
  whatsappConnectionStatus?:
    | "disconnected"
    | "initializing"
    | "qr"
    | "authenticated"
    | "connected"
    | "auth_failure"
    | "error";
  whatsappPhoneNumber?: string;
  whatsappDisplayName?: string;
  whatsappLastError?: string;
  whatsappLastConnectedAt?: string;
  whatsappSettings?: WhatsAppDeliverySettings;
  qrCode?: string;
  _id: string;
  siteName: string;
  siteName_ar?: string;
  siteDescription: string;
  siteDescription_ar?: string;
  defaultSiteLanguage?: "ar" | "en";
  logo: string;
  logo_ar?: string;
  favicon: string;
  socialLinks: SocialLink[];
  contactEmail: string;
  contactPhone: string;
  whatsappNumber?: string;
  floatingWhatsAppEnabled?: boolean;
  address: string;
  address_ar?: string;
  theme?: ThemeSettings;
  headerDisplay?: HeaderDisplaySettings; // Added Header Display
  marketingBanners?: MarketingBannersSettings; // Added Marketing Banners
  navbarLinks?: NavbarLink[];
  homepageSections?: HomepageSections;
  promoModal?: PromoModalSettings;
  homepageBanner?: HomepageBannerSettings;
  homepageCourses?: HomepageCoursesSettings;
  coursesPageHero?: CoursesPageHeroSettings;
  booksPageHero?: BooksPageHeroSettings;
  productsPageHero?: ProductsPageHeroSettings;
  articlesPageHero?: ArticlesPageHeroSettings;
  homepageArticlesSection?: HomepageArticlesSectionSettings;
  authorityBar?: AuthorityBarSettings;
  reviewsSettings?: ReviewsSectionSettings;
  whyGenounSettings?: WhyGenounSettings;
  emailSettings?: EmailSettings;
  authSettings?: AuthSettings;
  financeSettings?: FinanceSettings;
  apiKeys?: ApiKeysSettings;
  teacherProfitSettings?: TeacherProfitSettings;
  subscriptionStudentProfitSettings?: SubscriptionStudentProfitSettings;
  subscriptionTeachers?: SubscriptionTeacher[];
  heroStats?: HeroStatsSettings;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
  notifications: Notifications;
  paymentGateways: PaymentGateways;
}

export interface PublicWebsiteSettingsData {
  siteName: string;
  siteName_ar?: string;
  siteDescription: string;
  siteDescription_ar?: string;
  defaultSiteLanguage?: "ar" | "en";
  logo: string;
  logo_ar?: string;
  favicon: string;
  socialLinks: SocialLink[];
  contactEmail: string;
  contactPhone: string;
  whatsappNumber?: string;
  floatingWhatsAppEnabled?: boolean;
  address: string;
  address_ar?: string;
  theme?: ThemeSettings;
  headerDisplay?: HeaderDisplaySettings;
  marketingBanners?: MarketingBannersSettings;
  navbarLinks?: NavbarLink[];
  homepageSections?: HomepageSections;
  promoModal?: PromoModalSettings;
  homepageBanner?: HomepageBannerSettings;
  homepageCourses?: HomepageCoursesSettings;
  coursesPageHero?: CoursesPageHeroSettings;
  booksPageHero?: BooksPageHeroSettings;
  productsPageHero?: ProductsPageHeroSettings;
  articlesPageHero?: ArticlesPageHeroSettings;
  homepageArticlesSection?: HomepageArticlesSectionSettings;
  authorityBar?: AuthorityBarSettings;
  reviewsSettings?: ReviewsSectionSettings;
  whyGenounSettings?: WhyGenounSettings;
  financeSettings?: FinanceSettings;
  heroStats?: HeroStatsSettings;
  // Excluded: _id, whatsappConnected, updatedBy, createdAt, updatedAt, __v, notifications, paymentGateways
}

export interface GetWebsiteSettingsResponse {
  success: boolean;
  data: WebsiteSettingsData;
  message: string | null;
}

export interface GetPublicWebsiteSettingsResponse {
  success: boolean;
  data: PublicWebsiteSettingsData;
  message: string | null;
}

export const getPublicWebsiteSettingsThunk = createAsyncThunk<
  GetPublicWebsiteSettingsResponse,
  void,
  { rejectValue: string }
>("settings/getPublic", async (_, thunkAPI) => {
  try {
    const response = await axiosInstance.get("/settings/public"); // New endpoint
    return response.data as GetPublicWebsiteSettingsResponse;
  } catch (error: any) {
    console.error("Error fetching public website settings:", error);
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

// Thunk for FULL settings (Admin Dashboard)
export const getWebsiteSettingsThunk = createAsyncThunk<
  GetWebsiteSettingsResponse, // Uses full response type
  void,
  { rejectValue: string }
>("settings/get", async (_, thunkAPI) => {
  try {
    const response = await axiosInstance.get("/settings"); // Existing endpoint
    return response.data as GetWebsiteSettingsResponse;
  } catch (error: any) {
    console.error("Error fetching website settings:", error);
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const updateWebsiteSettingsThunk = createAsyncThunk<
  GetWebsiteSettingsResponse,
  Partial<WebsiteSettingsData> | FormData,
  { rejectValue: string }
>("settings/update", async (settingsData, thunkAPI) => {
  try {
    const isFormData = settingsData instanceof FormData;

    const response = await axiosInstance.put("/settings", settingsData, {
      headers: {
        ...(isFormData ? { "Content-Type": "multipart/form-data" } : {}),
      },
    });

    return response.data as GetWebsiteSettingsResponse;
  } catch (error: any) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

// WhatsApp Operations
export interface WhatsAppConnectResponse {
  success: boolean;
  data: {
    status: string;
    connected?: boolean;
    qrCode?: string;
    phoneNumber?: string;
    displayName?: string;
    lastError?: string;
  };
  message: string | null;
}

export interface WhatsAppDisconnectResponse {
  success: boolean;
  data: {
    status: string;
    connected?: boolean;
  };
  message: string | null;
}

export interface WhatsAppTestMessageResponse {
  success: boolean;
  data: {
    id?: string;
    to?: string;
  };
  message: string | null;
}

const getApiErrorMessage = (error: any) =>
  error.response?.data?.message ||
  error.response?.data?.error?.message ||
  error.message ||
  error.toString();

export const connectWhatsAppThunk = createAsyncThunk<
  WhatsAppConnectResponse,
  void,
  { rejectValue: string }
>("settings/connectWhatsApp", async (_, thunkAPI) => {
  try {
    const response = await axiosInstance.post("/settings/whatsapp/connect", {});

    return response.data as WhatsAppConnectResponse;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getApiErrorMessage(error));
  }
});

export const disconnectWhatsAppThunk = createAsyncThunk<
  WhatsAppDisconnectResponse,
  void,
  { rejectValue: string }
>("settings/disconnectWhatsApp", async (_, thunkAPI) => {
  try {
    const response = await axiosInstance.post(
      "/settings/whatsapp/disconnect",
      {}
    );

    return response.data as WhatsAppDisconnectResponse;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getApiErrorMessage(error));
  }
});

export const sendWhatsAppTestMessageThunk = createAsyncThunk<
  WhatsAppTestMessageResponse,
  { number: string; message: string },
  { rejectValue: string }
>("settings/sendWhatsAppTestMessage", async (payload, thunkAPI) => {
  try {
    const response = await axiosInstance.post(
      "/settings/whatsapp/test-message",
      payload
    );

    return response.data as WhatsAppTestMessageResponse;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(getApiErrorMessage(error));
  }
});

// Add this function to test WhatsApp form notifications
export const sendWhatsAppFormTestNotificationThunk = createAsyncThunk(
  "settings/sendWhatsAppFormTestNotification",
  async (
    {
      formTitle,
      formData,
      fieldLabels,
    }: {
      formTitle: string;
      formData: any;
      fieldLabels?: Record<string, string>;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post(
        "/settings/whatsapp/test-form-notification",
        {
          formTitle,
          formData,
          fieldLabels,
        }
      );
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data) {
        return rejectWithValue(error.response.data);
      }
      return rejectWithValue({ message: error.message });
    }
  }
);

// Manual Payment Methods Operations
export const getManualPaymentMethodsThunk = createAsyncThunk<
  { success: boolean; methods: ManualPaymentMethod[] },
  void,
  { rejectValue: string }
>("settings/manualPaymentMethods/get", async (_, thunkAPI) => {
  try {
    const response = await axiosInstance.get(
      "/settings/manual-payment-methods"
    );
    return response.data;
  } catch (error: any) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

// New thunk for fetching enabled gateways (PayPal, Cashier, etc.)
export const getPaymentGatewaysThunk = createAsyncThunk<
  any,
  void,
  { rejectValue: string }
>("settings/getPaymentGateways", async (_, thunkAPI) => {
  try {
    // Source of truth for gateway enable/disable is /payment-methods
    const response = await axiosInstance.get("/payment-methods");
    const methods = Array.isArray(response.data?.data) ? response.data.data : [];

    const gateways = methods.reduce((acc: Record<string, any>, method: any) => {
      if (!method?.provider) return acc;
      acc[method.provider] = {
        isEnabled: method.isActive !== false,
        mode: method.mode,
      };
      return acc;
    }, {});

    return gateways;
  } catch (error: any) {
    // Backward-compatible fallback in case legacy deployments still depend on settings.public
    try {
      const fallbackResponse = await axiosInstance.get("/settings/public");
      return fallbackResponse.data?.data?.paymentGateways || {};
    } catch {
      return {};
    }
  }
});

export const createManualPaymentMethodThunk = createAsyncThunk<
  { success: boolean; method: ManualPaymentMethod; message: string },
  { method: Partial<ManualPaymentMethod>; image?: File },
  { rejectValue: string }
>(
  "settings/manualPaymentMethods/create",
  async ({ method, image }, thunkAPI) => {
    try {
      const formData = new FormData();

      formData.append(
        "title",
        typeof method.title === "object"
          ? JSON.stringify(method.title)
          : method.title || ""
      );
      formData.append(
        "description",
        typeof method.description === "object"
          ? JSON.stringify(method.description)
          : method.description || ""
      );
      formData.append("isEnabled", String(method.isEnabled ?? true));
      formData.append(
        "requiresAttachment",
        String(method.requiresAttachment ?? true)
      );
      formData.append(
        "instructions",
        typeof method.instructions === "object"
          ? JSON.stringify(method.instructions)
          : method.instructions || ""
      );
      if (method.order !== undefined) {
        formData.append("order", String(method.order));
      }

      // Append image if provided
      if (image) {
        formData.append("image", image);
      }

      const response = await axiosInstance.post(
        "/settings/manual-payment-methods",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      return response.data;
    } catch (error: any) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const updateManualPaymentMethodThunk = createAsyncThunk<
  { success: boolean; method: ManualPaymentMethod; message: string },
  { id: string; method: Partial<ManualPaymentMethod>; image?: File },
  { rejectValue: string }
>(
  "settings/manualPaymentMethods/update",
  async ({ id, method, image }, thunkAPI) => {
    try {
      const formData = new FormData();

      // Append all method fields to FormData - serialize objects as JSON
      if (method.title)
        formData.append(
          "title",
          typeof method.title === "object"
            ? JSON.stringify(method.title)
            : method.title
        );
      if (method.description)
        formData.append(
          "description",
          typeof method.description === "object"
            ? JSON.stringify(method.description)
            : method.description
        );
      if (method.isEnabled !== undefined)
        formData.append("isEnabled", String(method.isEnabled));
      if (method.requiresAttachment !== undefined)
        formData.append(
          "requiresAttachment",
          String(method.requiresAttachment)
        );
      if (method.instructions !== undefined)
        formData.append(
          "instructions",
          typeof method.instructions === "object"
            ? JSON.stringify(method.instructions)
            : method.instructions
        );
      if (method.order !== undefined)
        formData.append("order", String(method.order));

      // Append image if provided
      if (image) {
        formData.append("image", image);
      }

      const response = await axiosInstance.put(
        `/settings/manual-payment-methods/${id}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      return response.data;
    } catch (error: any) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const toggleManualPaymentMethodThunk = createAsyncThunk<
  { success: boolean; method: ManualPaymentMethod; message: string },
  { id: string; isEnabled: boolean },
  { rejectValue: string }
>(
  "settings/manualPaymentMethods/toggle",
  async ({ id, isEnabled }, thunkAPI) => {
    try {
      const response = await axiosInstance.patch(
        `/settings/manual-payment-methods/${id}`,
        { isEnabled }
      );

      return response.data;
    } catch (error: any) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const deleteManualPaymentMethodThunk = createAsyncThunk<
  { success: boolean; message: string },
  string,
  { rejectValue: string }
>("settings/manualPaymentMethods/delete", async (id, thunkAPI) => {
  try {
    const response = await axiosInstance.delete(
      `/settings/manual-payment-methods/${id}`
    );

    return response.data;
  } catch (error: any) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});
