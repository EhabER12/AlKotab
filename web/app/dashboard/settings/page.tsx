"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LanguageSwitcher } from "@/components/dashboard/common/LanguageSwitcher";
import {
  Loader2,
  AlertCircle,
  ShieldCheck,
  Plus,
  Trash2,
  X,
  QrCode,
  Send,
  Smartphone,
  RefreshCcw,
  DollarSign,
  BookOpen,
  Users,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import toast from "react-hot-toast";
import {
  getWebsiteSettingsThunk,
  updateWebsiteSettingsThunk,
  WebsiteSettingsData,
  SocialLink,
  Notifications,
  AuthSettings,
  NavbarLink,
  HomepageSections,
  PromoModalSettings as PromoModalSettingsType,
  AuthorityBarSettings,
  ReviewsSectionSettings,
  WhyGenounSettings,
  AuthorityBarItem,
  WhyGenounFeature,
  FinanceSettings,
  ApiKeysSettings,
  CoursesPageHeroSettings as CoursesPageHeroSettingsType,
  BooksPageHeroSettings as BooksPageHeroSettingsType,
  ProductsPageHeroSettings as ProductsPageHeroSettingsType,
  HeroStatsSettings as HeroStatsSettingsType,
  ArticlesPageHeroSettings as ArticlesPageHeroSettingsType,
  HomepageArticlesSectionSettings as HomepageArticlesSectionSettingsType,
  DEFAULT_HERO_TEXT_SIZES,
  DEFAULT_METHODOLOGY_STEPS,
  DEFAULT_METHODOLOGY_SUBTITLE,
  DEFAULT_METHODOLOGY_TITLE,
  DEFAULT_METHODOLOGY_TITLE_HIGHLIGHT,
  type MethodologyStep,
} from "@/store/services/settingsService";
import { resetSettingsStatus } from "@/store/slices/settingsSlice";
import { revalidateSettings } from "@/app/actions/settings";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminLocale } from "@/hooks/dashboard/useAdminLocale";
import { AiArticlesSettings } from "@/components/dashboard/settings/AiArticlesSettings";
import { MarketingBannersSettings } from "@/components/dashboard/settings/MarketingBannersSettings";
import { NavbarSettings } from "@/components/dashboard/settings/NavbarSettings";
import { HomepageSectionsSettings } from "@/components/dashboard/settings/HomepageSectionsSettings";
import { SectionOrderSettings } from "@/components/dashboard/settings/SectionOrderSettings";
import { PromoModalSettings } from "@/components/dashboard/settings/PromoModalSettings";
import { EmailSettings } from "@/components/dashboard/settings/EmailSettings";
import { AuthorityBarSettings as AuthorityBarSettingsComponent } from "@/components/dashboard/settings/AuthorityBarSettings";
import { ReviewsSectionSettings as ReviewsSectionSettingsComponent } from "@/components/dashboard/settings/ReviewsSectionSettings";
import { WhyGenounSettings as WhyGenounSettingsComponent } from "@/components/dashboard/settings/WhyGenounSettings";
import { ApiKeysSettings as ApiKeysSettingsComponent } from "@/components/dashboard/settings/ApiKeysSettings";
import { CoursesPageHeroSettings as CoursesPageHeroSettingsComponent } from "@/components/dashboard/settings/CoursesPageHeroSettings";
import { BooksPageHeroSettings as BooksPageHeroSettingsComponent } from "@/components/dashboard/settings/BooksPageHeroSettings";
import { ProductsPageHeroSettings as ProductsPageHeroSettingsComponent } from "@/components/dashboard/settings/ProductsPageHeroSettings";
import { HeroStatsSettings as HeroStatsSettingsComponent } from "@/components/dashboard/settings/HeroStatsSettings";
import { WhatsAppSettings } from "@/components/dashboard/settings/WhatsAppSettings";

interface SettingsFormData extends Partial<WebsiteSettingsData> {
  logoFile?: File;
  logoArFile?: File;
  faviconFile?: File;
  heroBackgroundFile?: File;
}

// Color picker component
interface ColorPickerProps {
  id: string;
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

const ColorPickerComponent = ({
  id,
  value,
  onChange,
  disabled,
}: ColorPickerProps) => {
  return (
    <div className="flex items-center">
      <input
        type="color"
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-9 cursor-pointer appearance-none overflow-hidden rounded-md border border-input bg-transparent p-0"
        disabled={disabled}
      />
    </div>
  );
};

interface LocalHeroButton {
  text: string;
  url: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  _id?: string;
}

const defaultArticlesPageHero: ArticlesPageHeroSettingsType = {
  badge: { ar: "", en: "Genoun Blog" },
  title: { ar: "", en: "Digital Insights & Knowledge" },
  subtitle: {
    ar: "",
    en: "Latest articles and insights in digital marketing and e-commerce",
  },
  latestArticles: { ar: "", en: "Latest Articles" },
};

const defaultHomepageArticlesSection: HomepageArticlesSectionSettingsType = {
  isEnabled: true,
  badge: { ar: "", en: "Blog" },
  title: { ar: "", en: "Latest" },
  titleHighlight: { ar: "", en: "Articles" },
  subtitle: {
    ar: "",
    en: "Insights and ideas in digital marketing and e-commerce",
  },
  viewAllText: { ar: "", en: "View All Articles" },
};

const mergeMethodologySteps = (
  steps?: MethodologyStep[]
): MethodologyStep[] =>
  DEFAULT_METHODOLOGY_STEPS.map((defaultStep, index) => {
    const step = steps?.[index];

    return {
      title: {
        ...defaultStep.title,
        ...(step?.title || {}),
      },
      subtitle: {
        ...defaultStep.subtitle,
        ...(step?.subtitle || {}),
      },
      description: {
        ...defaultStep.description,
        ...(step?.description || {}),
      },
    };
  });

const mergeLocalizedText = (
  base: { ar: string; en: string },
  value?: Partial<{ ar: string; en: string }>
): { ar: string; en: string } => ({
  ar: value?.ar ?? base.ar,
  en: value?.en ?? base.en,
});

export default function SettingsDashboardPage() {
  const dispatch = useAppDispatch();
  const { t, isRtl } = useAdminLocale();
  const { settings, isLoading, isError, isSuccess, message } = useAppSelector(
    (state) => state.settings
  );

  const [formData, setFormData] = useState<SettingsFormData>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoArPreview, setLogoArPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [heroBackgroundPreview, setHeroBackgroundPreview] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [formLang, setFormLang] = useState<"en" | "ar">("en");
  const [clearingCache, setClearingCache] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [navbarLinks, setNavbarLinks] = useState<NavbarLink[]>([]);
  const [homepageSections, setHomepageSections] = useState<HomepageSections>({
    hero: { badge: { ar: "", en: "" }, title: { ar: "", en: "" }, subtitle: { ar: "", en: "" }, content: { ar: "", en: "" }, buttonText: { ar: "", en: "" }, buttonLink: "", isEnabled: true, textSizes: DEFAULT_HERO_TEXT_SIZES, order: 0 },
    features: { badge: { ar: "", en: "" }, title: { ar: "", en: "" }, subtitle: { ar: "", en: "" }, content: { ar: "", en: "" }, buttonText: { ar: "", en: "" }, buttonLink: "", isEnabled: true, order: 1 },
    services: { badge: { ar: "", en: "" }, title: { ar: "", en: "" }, subtitle: { ar: "", en: "" }, content: { ar: "", en: "" }, buttonText: { ar: "", en: "" }, buttonLink: "", isEnabled: true, order: 2 },
    stats: { badge: { ar: "", en: "" }, title: { ar: "", en: "" }, subtitle: { ar: "", en: "" }, content: { ar: "", en: "" }, buttonText: { ar: "", en: "" }, buttonLink: "", isEnabled: true, order: 3 },
    about: { badge: { ar: "", en: "" }, title: DEFAULT_METHODOLOGY_TITLE, titleHighlight: DEFAULT_METHODOLOGY_TITLE_HIGHLIGHT, subtitle: DEFAULT_METHODOLOGY_SUBTITLE, content: { ar: "", en: "" }, buttonText: { ar: "", en: "" }, buttonLink: "", isEnabled: true, steps: DEFAULT_METHODOLOGY_STEPS, order: 4 },
    cta: { badge: { ar: "", en: "" }, title: { ar: "", en: "" }, subtitle: { ar: "", en: "" }, content: { ar: "", en: "" }, buttonText: { ar: "", en: "" }, buttonLink: "", isEnabled: true, order: 5 },
    testimonials: { badge: { ar: "", en: "" }, title: { ar: "", en: "" }, subtitle: { ar: "", en: "" }, content: { ar: "", en: "" }, buttonText: { ar: "", en: "" }, buttonLink: "", isEnabled: true, order: 6 },
  });
  const [promoModal, setPromoModal] = useState<PromoModalSettingsType>({
    isEnabled: false,
    title: { ar: "", en: "" },
    content: { ar: "", en: "" },
    buttonText: { ar: "", en: "" },
    buttonLink: "",
    displayDelay: 3000,
    showOnce: true,
  });
  const [theme, setTheme] = useState({
    primary: "#1a472a",
    secondary: "#f97316",
    accent: "#22c55e",
    background: "#ffffff",
    text: "#0f172a",
    adminPrimary: "#1a472a",
  });
  const [homepageBanner, setHomepageBanner] = useState({
    isEnabled: false,
    imageUrl: "",
    title: { ar: "", en: "" },
    subtitle: { ar: "", en: "" },
    buttonText: { ar: "", en: "" },
    buttonLink: "",
  });
  const [homepageCourses, setHomepageCourses] = useState({
    isEnabled: true,
    displayCount: 6,
    title: { ar: "الدورات المتاحة", en: "Available Courses" },
    subtitle: { ar: "تصفح أحدث دوراتنا", en: "Browse our latest courses" },
    buttonText: { ar: "عرض جميع الدورات", en: "View All Courses" },
  });
  const [articlesPageHero, setArticlesPageHero] =
    useState<ArticlesPageHeroSettingsType>(defaultArticlesPageHero);
  const [homepageArticlesSection, setHomepageArticlesSection] =
    useState<HomepageArticlesSectionSettingsType>(
      defaultHomepageArticlesSection
    );

  const [emailSettings, setEmailSettings] = useState({
    enabled: false,
    host: "",
    port: 587,
    secure: false,
    user: "",
    pass: "",
    fromName: "",
    fromEmail: "",
  });

  const [authSettings, setAuthSettings] = useState<AuthSettings>({
    requireEmailVerification: true,
  });

  const [authorityBar, setAuthorityBar] = useState<AuthorityBarSettings>({
    isEnabled: true,
    title: { ar: "موثوق من قبل المؤسسات الرائدة", en: "Trusted by Leading Institutions" },
    items: [],
  });

  const [reviewsSettings, setReviewsSettings] = useState<ReviewsSectionSettings>({
    isEnabled: true,
    title: { ar: "آراء طلابنا", en: "Student Reviews" },
    subtitle: { ar: "ماذا يقول طلابنا عنا", en: "What our students say about us" },
    showRating: true,
    showDate: true,
    displayCount: 6,
  });

  const [whyGenounSettings, setWhyGenounSettings] = useState<WhyGenounSettings>({
    isEnabled: true,
    title: { ar: "لماذا تختار", en: "Why Choose" },
    titleHighlight: { ar: "منصة جنون", en: "Genoun Platform" },
    subtitle: { ar: "منصة متكاملة لحفظ القرآن الكريم", en: "Complete platform for Quran memorization" },
    features: [],
  });

  const [financeSettings, setFinanceSettings] = useState({
    baseCurrency: "EGP" as "SAR" | "EGP" | "USD",
    exchangeRates: {
      USD: 1,
      SAR: 3.75,
      EGP: 50.0,
      EGPtoSAR: 13.33,
    },
    lastRatesUpdate: new Date(),
  });

  const [apiKeys, setApiKeys] = useState<ApiKeysSettings>({
    geminiApiKey: "",
    googleCloudCredentials: "",
  });

  const [teacherProfitSettings, setTeacherProfitSettings] = useState({
    enabled: true,
    courseSalesPercentage: 40,
    subscriptionPercentage: 35,
    lastUpdated: new Date(),
  });
  const [subscriptionStudentProfitSettings, setSubscriptionStudentProfitSettings] =
    useState({
      enabled: true,
      defaultPercentage: 35,
      lastUpdated: new Date(),
    });

  const [heroStats, setHeroStats] = useState<HeroStatsSettingsType>({
    enabled: false,
    projects: { value: "+1000", label: { ar: "ختمة", en: "Projects" } },
    growth: { value: "+250", label: { ar: "طالب جديد", en: "New Students" } },
    countries: { value: "6", label: { ar: "دول", en: "Countries" } },
    satisfiedStudents: {
      value: "+500",
      label: { ar: "طالب راضٍ", en: "Happy Students" },
    },
  });

  // All available platforms
  const allPlatforms = [
    "facebook",
    "instagram",
    "whatsapp",
    "x",
    "snapchat",
    "email",
  ];

  // Get platforms that are already in use
  const usedPlatforms = socialLinks.map((link) => link.platform.toLowerCase());

  // Get available platforms (not yet added)
  const availablePlatforms = allPlatforms.filter(
    (platform) => !usedPlatforms.includes(platform)
  );

  // Check if all platforms are used
  const allPlatformsUsed = availablePlatforms.length === 0;

  const [headerDisplay, setHeaderDisplay] = useState({
    showLogo: true,
    showTitle: true,
    logoWidth: 40,
  });

  const [formFields, setFormFields] = useState<
    { id: string; label: string; value: string }[]
  >([{ id: "", label: "", value: "" }]);

  useEffect(() => {
    dispatch(getWebsiteSettingsThunk());

    return () => {
      dispatch(resetSettingsStatus());
    };
  }, [dispatch]);

  useEffect(() => {
    if (isSuccess && message) {
      toast.dismiss();
      toast.success(message);
      // Revalidate the settings cache so changes appear on the website
      revalidateSettings().catch(console.error);
    } else if (isError && message) {
      toast.dismiss();
      toast.error(message);
    }
  }, [isSuccess, isError, message]);

  useEffect(() => {
    if (settings) {
      setFormData({
        siteName: settings.siteName,
        siteName_ar: settings.siteName_ar || "",
        siteDescription: settings.siteDescription,
        siteDescription_ar: settings.siteDescription_ar || "",
        defaultSiteLanguage: settings.defaultSiteLanguage || "ar",
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        whatsappNumber: settings.whatsappNumber || "",
        floatingWhatsAppEnabled: settings.floatingWhatsAppEnabled !== false,
        address: settings.address,
        address_ar: settings.address_ar || "",
        coursesPageHero: settings.coursesPageHero || undefined,
        booksPageHero: settings.booksPageHero || undefined,
        productsPageHero: settings.productsPageHero || undefined,
      });

      setLogoPreview(settings.logo);
      setLogoArPreview(settings.logo_ar || null);
      setFaviconPreview(settings.favicon);

      if (settings.socialLinks && Array.isArray(settings.socialLinks)) {
        setSocialLinks(settings.socialLinks);
      }

      if (settings.headerDisplay) {
        setHeaderDisplay({
          showLogo: settings.headerDisplay.showLogo ?? true,
          showTitle: settings.headerDisplay.showTitle ?? true,
          logoWidth: settings.headerDisplay.logoWidth ?? 40,
        });
      }

      if (settings.theme) {
        setTheme({
          primary: settings.theme.primary || "#1a472a",
          secondary: settings.theme.secondary || "#f97316",
          accent: settings.theme.accent || "#22c55e",
          background: settings.theme.background || "#ffffff",
          text: settings.theme.text || "#0f172a",
          adminPrimary: settings.theme.adminPrimary || "#1a472a",
        });
      }

      if (settings.navbarLinks) {
        setNavbarLinks(settings.navbarLinks);
      }

      const homepageSectionsFromSettings = settings.homepageSections;

      if (homepageSectionsFromSettings) {
        setHomepageSections((prev) => ({
          ...prev,
          ...homepageSectionsFromSettings,
          hero: {
            ...prev.hero,
            ...(homepageSectionsFromSettings.hero || {}),
            badge: mergeLocalizedText(
              prev.hero.badge ?? { ar: "", en: "" },
              homepageSectionsFromSettings.hero?.badge
            ),
            title: mergeLocalizedText(
              prev.hero.title,
              homepageSectionsFromSettings.hero?.title
            ),
            subtitle: mergeLocalizedText(
              prev.hero.subtitle,
              homepageSectionsFromSettings.hero?.subtitle
            ),
            content: mergeLocalizedText(
              prev.hero.content,
              homepageSectionsFromSettings.hero?.content
            ),
            buttonText: mergeLocalizedText(
              prev.hero.buttonText,
              homepageSectionsFromSettings.hero?.buttonText
            ),
            textSizes: {
              ...DEFAULT_HERO_TEXT_SIZES,
              ...(homepageSectionsFromSettings.hero?.textSizes || {}),
            },
          },
          about: {
            ...prev.about,
            ...(homepageSectionsFromSettings.about || {}),
            title: {
              ...DEFAULT_METHODOLOGY_TITLE,
              ...(homepageSectionsFromSettings.about?.title || {}),
            },
            titleHighlight: {
              ...DEFAULT_METHODOLOGY_TITLE_HIGHLIGHT,
              ...(homepageSectionsFromSettings.about?.titleHighlight || {}),
            },
            subtitle: {
              ...DEFAULT_METHODOLOGY_SUBTITLE,
              ...(homepageSectionsFromSettings.about?.subtitle || {}),
            },
            steps: mergeMethodologySteps(homepageSectionsFromSettings.about?.steps),
          },
        }));
      }

      if (settings.promoModal) {
        setPromoModal(settings.promoModal);
      }

      if (settings.homepageBanner) {
        setHomepageBanner(settings.homepageBanner);
      }

      if (settings.homepageCourses) {
        setHomepageCourses(settings.homepageCourses);
      }
      if (settings.articlesPageHero) {
        setArticlesPageHero({
          ...defaultArticlesPageHero,
          ...settings.articlesPageHero,
          badge: {
            ...defaultArticlesPageHero.badge,
            ...(settings.articlesPageHero.badge || {}),
          },
          title: {
            ...defaultArticlesPageHero.title,
            ...(settings.articlesPageHero.title || {}),
          },
          subtitle: {
            ...defaultArticlesPageHero.subtitle,
            ...(settings.articlesPageHero.subtitle || {}),
          },
          latestArticles: {
            ...defaultArticlesPageHero.latestArticles,
            ...(settings.articlesPageHero.latestArticles || {}),
          },
        });
      }
      if (settings.homepageArticlesSection) {
        setHomepageArticlesSection({
          ...defaultHomepageArticlesSection,
          ...settings.homepageArticlesSection,
          badge: {
            ...defaultHomepageArticlesSection.badge,
            ...(settings.homepageArticlesSection.badge || {}),
          },
          title: {
            ...defaultHomepageArticlesSection.title,
            ...(settings.homepageArticlesSection.title || {}),
          },
          titleHighlight: {
            ...defaultHomepageArticlesSection.titleHighlight,
            ...(settings.homepageArticlesSection.titleHighlight || {}),
          },
          subtitle: {
            ...defaultHomepageArticlesSection.subtitle,
            ...(settings.homepageArticlesSection.subtitle || {}),
          },
          viewAllText: {
            ...defaultHomepageArticlesSection.viewAllText,
            ...(settings.homepageArticlesSection.viewAllText || {}),
          },
        });
      }

      if (settings.emailSettings) {
        setEmailSettings({
          enabled: settings.emailSettings.enabled ?? false,
          host: settings.emailSettings.host || "",
          port: settings.emailSettings.port || 587,
          secure: settings.emailSettings.secure ?? false,
          user: settings.emailSettings.user || "",
          pass: settings.emailSettings.pass || "",
          fromName: settings.emailSettings.fromName || "",
          fromEmail: settings.emailSettings.fromEmail || "",
        });
      }

      if (settings.authSettings) {
        setAuthSettings({
          requireEmailVerification:
            settings.authSettings.requireEmailVerification !== false,
        });
      }

      if (settings.authorityBar) {
        setAuthorityBar(settings.authorityBar);
      }

      if (settings.reviewsSettings) {
        setReviewsSettings(settings.reviewsSettings);
      }

      if (settings.whyGenounSettings) {
        setWhyGenounSettings(settings.whyGenounSettings);
      }

      if (settings.financeSettings) {
        setFinanceSettings({
          baseCurrency: settings.financeSettings.baseCurrency || "EGP",
          exchangeRates: {
            USD: settings.financeSettings.exchangeRates?.USD || 1,
            SAR: settings.financeSettings.exchangeRates?.SAR || 3.75,
            EGP: settings.financeSettings.exchangeRates?.EGP || 50.0,
            EGPtoSAR: settings.financeSettings.exchangeRates?.EGPtoSAR || 13.33,
          },
          lastRatesUpdate: settings.financeSettings.lastRatesUpdate
            ? new Date(settings.financeSettings.lastRatesUpdate)
            : new Date(),
        });
      }

      if (settings.apiKeys) {
        setApiKeys({
          geminiApiKey: settings.apiKeys.geminiApiKey || "",
          googleCloudCredentials: settings.apiKeys.googleCloudCredentials || "",
        });
      }

      if (settings.teacherProfitSettings) {
        setTeacherProfitSettings({
          enabled: settings.teacherProfitSettings.enabled ?? true,
          courseSalesPercentage: settings.teacherProfitSettings.courseSalesPercentage ?? 40,
          subscriptionPercentage: settings.teacherProfitSettings.subscriptionPercentage ?? 35,
          lastUpdated: settings.teacherProfitSettings.lastUpdated
            ? new Date(settings.teacherProfitSettings.lastUpdated)
            : new Date(),
        });
      }
      if (settings.subscriptionStudentProfitSettings) {
        setSubscriptionStudentProfitSettings({
          enabled: settings.subscriptionStudentProfitSettings.enabled ?? true,
          defaultPercentage: settings.subscriptionStudentProfitSettings.defaultPercentage ?? 35,
          lastUpdated: settings.subscriptionStudentProfitSettings.lastUpdated
            ? new Date(settings.subscriptionStudentProfitSettings.lastUpdated)
            : new Date(),
        });
      }
      if (settings.heroStats) {
        const savedHeroStats = settings.heroStats;
        setHeroStats((prev) => ({
          ...prev,
          ...savedHeroStats,
          projects: {
            ...prev.projects,
            ...savedHeroStats.projects,
            label: {
              ...prev.projects.label,
              ...savedHeroStats.projects?.label,
            },
          },
          growth: {
            ...prev.growth,
            ...savedHeroStats.growth,
            label: {
              ...prev.growth.label,
              ...savedHeroStats.growth?.label,
            },
          },
          countries: {
            ...prev.countries,
            ...savedHeroStats.countries,
            label: {
              ...prev.countries.label,
              ...savedHeroStats.countries?.label,
            },
          },
          satisfiedStudents: {
            ...prev.satisfiedStudents,
            ...savedHeroStats.satisfiedStudents,
            label: {
              ...prev.satisfiedStudents.label,
              ...savedHeroStats.satisfiedStudents?.label,
            },
          },
        }));
      }
    }
  }, [settings]);

  useEffect(() => {
    // Inject theme colors as CSS variables for real-time preview
    const root = document.documentElement;
    root.style.setProperty("--primary", theme.primary);
    root.style.setProperty("--secondary", theme.secondary);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--background", theme.background);
    root.style.setProperty("--text", theme.text);
    root.style.setProperty("--admin-primary", theme.adminPrimary);

    // We can also update specific tailwind-like variables if needed
    // root.style.setProperty("--primary-foreground", theme.background);
  }, [theme]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addSocialLink = () => {
    setSocialLinks([
      ...socialLinks,
      { platform: "", url: "", _id: `temp-${Date.now()}` },
    ]);
  };

  const removeSocialLink = (index: number) => {
    const newLinks = [...socialLinks];
    newLinks.splice(index, 1);
    setSocialLinks(newLinks);
  };

  const updateSocialLink = (index: number, field: string, value: string) => {
    if (field === "platform" && value) {
      const isDuplicate = socialLinks.some(
        (link, i) =>
          i !== index && link.platform.toLowerCase() === value.toLowerCase()
      );
      if (isDuplicate) {
        toast.error(
          `${value} is already added. Each platform can only be used once.`
        );
        return;
      }
    }

    const newLinks = [...socialLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setSocialLinks(newLinks);
  };

  const getSocialUrl = (platform: string) => {
    const match = socialLinks.find(
      (link) => link.platform.toLowerCase() === platform.toLowerCase()
    );
    return match?.url || "";
  };

  const setSocialUrl = (platform: string, url: string) => {
    const normalized = platform.toLowerCase();
    const index = socialLinks.findIndex(
      (link) => link.platform.toLowerCase() === normalized
    );

    if (index >= 0) {
      const newLinks = [...socialLinks];
      newLinks[index] = { ...newLinks[index], url, platform: normalized };
      setSocialLinks(newLinks);
      return;
    }

    if (!url) return;

    setSocialLinks((prev) => [
      ...prev,
      { platform: normalized, url, _id: `temp-${Date.now()}` },
    ]);
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "logo_ar" | "favicon" | "heroBackground"
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === "logo") setLogoPreview(reader.result as string);
        if (type === "logo_ar") setLogoArPreview(reader.result as string);
        if (type === "favicon") setFaviconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      if (type === "logo" || type === "favicon" || type === "logo_ar") {
        setFormData((prev) => ({
          ...prev,
          [type === "logo"
            ? "logoFile"
            : type === "logo_ar"
              ? "logoArFile"
              : "faviconFile"]: file,
          [type]: undefined,
        }));
      } else if (type === "heroBackground") {
        setFormData((prev) => ({
          ...prev,
          heroBackgroundFile: file,
        }));
      }
    } else {
      if (type === "logo") {
        setLogoPreview(null);
        setFormData((prev) => ({
          ...prev,
          logoFile: undefined,
          logo: undefined,
        }));
      } else if (type === "logo_ar") {
        setLogoArPreview(null);
        setFormData((prev) => ({
          ...prev,
          logoArFile: undefined,
          logo_ar: undefined,
        }));
      } else if (type === "favicon") {
        setFaviconPreview(null);
        setFormData((prev) => ({
          ...prev,
          faviconFile: undefined,
          favicon: undefined,
        }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const updateData: Partial<WebsiteSettingsData> & Record<string, any> = {
      ...formData,
      socialLinks,
      headerDisplay,
      theme,
      navbarLinks,
      homepageSections,
      promoModal,
      homepageBanner,
      homepageCourses,
      productsPageHero: formData.productsPageHero,
      articlesPageHero,
      homepageArticlesSection,
      authorityBar,
      reviewsSettings,
      whyGenounSettings,
      emailSettings,
      authSettings,
      financeSettings: {
        baseCurrency: financeSettings.baseCurrency,
        exchangeRates: financeSettings.exchangeRates,
        // lastRatesUpdate will be set by backend automatically
      },
      apiKeys: {
        geminiApiKey: apiKeys.geminiApiKey,
        googleCloudCredentials: apiKeys.googleCloudCredentials,
        // lastUpdated will be set by backend automatically
      },
      teacherProfitSettings: {
        enabled: teacherProfitSettings.enabled,
        courseSalesPercentage: teacherProfitSettings.courseSalesPercentage,
        subscriptionPercentage: teacherProfitSettings.subscriptionPercentage,
        // lastUpdated will be set by backend automatically
      },
      subscriptionStudentProfitSettings: {
        enabled: subscriptionStudentProfitSettings.enabled,
        defaultPercentage: subscriptionStudentProfitSettings.defaultPercentage,
        // lastUpdated will be set by backend automatically
      },
      heroStats,
    };

    const hasFiles =
      !!formData.logoFile ||
      !!formData.logoArFile ||
      !!formData.faviconFile ||
      !!formData.heroBackgroundFile;

    delete updateData.logoFile;
    delete updateData.logoArFile;
    delete updateData.faviconFile;
    delete updateData.heroBackgroundFile;

    if (updateData.socialLinks) {
      updateData.socialLinks = updateData.socialLinks.map((link: any) => {
        const { _id, ...linkWithoutId } = link;
        return linkWithoutId;
      });
    }

    if (!hasFiles) {
      dispatch(updateWebsiteSettingsThunk(updateData as any));
      return;
    }

    const submitFormData = new FormData();

    if (updateData.logo && typeof updateData.logo === "string") {
      submitFormData.append("logo", updateData.logo);
    } else {
      delete updateData.logo;
    }

    if (updateData.logo_ar && typeof updateData.logo_ar === "string") {
      // Ensure we don't send "" to backend if it expects a valid URL or null
      // But based on our logic, we usually want to keep existing values
      submitFormData.append("logo_ar", updateData.logo_ar);
    } else {
      delete updateData.logo_ar;
    }

    if (updateData.favicon && typeof updateData.favicon === "string") {
      submitFormData.append("favicon", updateData.favicon);
    } else {
      delete updateData.favicon;
    }

    Object.entries(updateData).forEach(([key, value]) => {
      if (
        value &&
        typeof value === "object" &&
        Object.keys(value).length === 0
      ) {
        return;
      }

      if (
        typeof value === "object" &&
        value !== null &&
        !(value instanceof File)
      ) {
        submitFormData.append(key, JSON.stringify(value));
      } else if (value !== null && value !== undefined) {
        submitFormData.append(key, String(value));
      }
    });

    if (formData.logoFile) {
      submitFormData.append("logo", formData.logoFile);
    }

    if (formData.logoArFile) {
      submitFormData.append("logo_ar", formData.logoArFile);
    }

    if (formData.faviconFile) {
      submitFormData.append("favicon", formData.faviconFile);
    }

    if (formData.heroBackgroundFile) {
      submitFormData.append("heroBackground", formData.heroBackgroundFile);
    }

    dispatch(updateWebsiteSettingsThunk(submitFormData as any));
  };

  if (isLoading && !settings) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-w-0 p-4 sm:p-6" dir={isRtl ? "rtl" : "ltr"}>
      <h1 className="text-2xl font-bold mb-6">
        {t("admin.settings.websiteSettings")}
      </h1>

      {isError && message && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("admin.settings.error")}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {isSuccess && message && (
        <Alert
          variant="default"
          className="mb-4 border-green-200 bg-green-50 text-green-800"
        >
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <AlertTitle>{t("admin.settings.success")}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="min-w-0 space-y-8">
        <Tabs
          defaultValue="general"
          dir={isRtl ? "rtl" : "ltr"}
          onValueChange={setActiveTab}
        >
          <div className="mb-6 w-full overflow-x-auto pb-2">
            <TabsList className="h-auto w-max min-w-max">
            <TabsTrigger value="general">
              {t("admin.settings.general")}
            </TabsTrigger>
            <TabsTrigger value="contact">
              {t("admin.settings.contact")}
            </TabsTrigger>
            <TabsTrigger value="theme">
              {isRtl ? "المظهر" : "Theme"}
            </TabsTrigger>
            <TabsTrigger value="marketing">
              {t("admin.settings.marketingBanners.title")}
            </TabsTrigger>
            <TabsTrigger value="navbar">
              {isRtl ? "القائمة" : "Navbar"}
            </TabsTrigger>
            <TabsTrigger value="sections">
              {isRtl ? "الأقسام" : "Sections"}
            </TabsTrigger>
            <TabsTrigger value="section-order">
              {isRtl ? "ترتيب الأقسام" : "Section Order"}
            </TabsTrigger>
            <TabsTrigger value="modal">
              {isRtl ? "نافذة العرض" : "Promo Modal"}
            </TabsTrigger>
            <TabsTrigger value="ai-articles">
              {isRtl ? "مقالات AI" : "AI Articles"}
            </TabsTrigger>
            <TabsTrigger value="homepage">
              {isRtl ? "الصفحة الرئيسية" : "Homepage"}
            </TabsTrigger>
            <TabsTrigger value="email">
              {isRtl ? "البريد الإلكتروني" : "Email"}
            </TabsTrigger>
            <TabsTrigger value="whatsapp">
              {isRtl ? "واتساب" : "WhatsApp"}
            </TabsTrigger>
            <TabsTrigger value="currency">
              {isRtl ? "العملة وأسعار الصرف" : "Currency & Exchange"}
            </TabsTrigger>
            <TabsTrigger value="api-keys">
              {isRtl ? "مفاتيح API" : "API Keys"}
            </TabsTrigger>
            <TabsTrigger value="courses-hero">
              {isRtl ? "صفحة الدورات" : "Courses Page"}
            </TabsTrigger>
            <TabsTrigger value="books-hero">
              {isRtl ? "صفحة الكتب" : "Books Page"}
            </TabsTrigger>
            <TabsTrigger value="products-hero">
              {isRtl ? "\u0635\u0641\u062d\u0629 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a" : "Products Page"}
            </TabsTrigger>
            <TabsTrigger value="teacher-profit">
              {isRtl ? "أرباح المعلمين" : "Teacher Profit"}
            </TabsTrigger>
            <TabsTrigger value="hero-stats">
              {isRtl ? "إحصائيات Hero Section" : "Hero Stats"}
            </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="general" className="space-y-6">
            {/* General Settings Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t("admin.settings.generalSettings")}</CardTitle>
                  <CardDescription>
                    {t("admin.settings.basicInfo")}
                  </CardDescription>
                </div>
                <LanguageSwitcher
                  language={formLang}
                  setLanguage={setFormLang}
                />
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="siteName">
                    {t("admin.settings.siteName")} (
                    {formLang === "ar"
                      ? t("admin.settings.arabicContent")
                      : t("admin.settings.englishContent")}
                    )
                  </Label>
                  <Input
                    id={formLang === "en" ? "siteName" : "siteName_ar"}
                    name={formLang === "en" ? "siteName" : "siteName_ar"}
                    value={
                      (formLang === "en"
                        ? formData.siteName
                        : formData.siteName_ar) || ""
                    }
                    onChange={handleInputChange}
                    disabled={isLoading}
                    dir={formLang === "ar" ? "rtl" : "ltr"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteDescription">
                    {t("admin.settings.siteDescription")} (
                    {formLang === "ar"
                      ? t("admin.settings.arabicContent")
                      : t("admin.settings.englishContent")}
                    )
                  </Label>
                  <Textarea
                    id={
                      formLang === "en"
                        ? "siteDescription"
                        : "siteDescription_ar"
                    }
                    name={
                      formLang === "en"
                        ? "siteDescription"
                        : "siteDescription_ar"
                    }
                    value={
                      (formLang === "en"
                        ? formData.siteDescription
                        : formData.siteDescription_ar) || ""
                    }
                    onChange={handleInputChange}
                    disabled={isLoading}
                    dir={formLang === "ar" ? "rtl" : "ltr"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {isRtl ? "اللغة الأساسية للموقع" : "Default Site Language"}
                  </Label>
                  <Select
                    value={(formData.defaultSiteLanguage as "ar" | "en") || "ar"}
                    onValueChange={(value: "ar" | "en") =>
                      setFormData((prev) => ({
                        ...prev,
                        defaultSiteLanguage: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isRtl ? "اختر اللغة الأساسية" : "Choose default language"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">
                        {isRtl ? "العربية" : "Arabic"}
                      </SelectItem>
                      <SelectItem value="en">
                        {isRtl ? "الإنجليزية" : "English"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {isRtl
                      ? "دي اللغة اللي الموقع يفتح بها تلقائيًا للزائر الجديد، مع بقاء زر تغيير اللغة في النافبار شغال عادي."
                      : "New visitors will land on this language by default, while the navbar language switcher remains available."}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo">
                    {t("admin.settings.logo")} (
                    {formLang === "ar"
                      ? t("admin.settings.arabicContent")
                      : t("admin.settings.englishContent")}
                    )
                  </Label>
                  {formLang === "en" ? (
                    // English Logo
                    <>
                      {logoPreview && (
                        <div className="relative">
                          <Image
                            src={logoPreview}
                            alt="Logo Preview"
                            width={100}
                            height={40}
                            className="h-10 w-auto object-contain border rounded p-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border"
                            onClick={() => {
                              setLogoPreview(null);
                              setFormData((prev) => ({
                                ...prev,
                                logoFile: undefined,
                                logo: undefined,
                              }));
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <Input
                        id="logoFile"
                        name="logoFile"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, "logo")}
                        disabled={isLoading}
                      />
                    </>
                  ) : (
                    // Arabic Logo
                    <>
                      {logoArPreview && (
                        <div className="relative">
                          <Image
                            src={logoArPreview}
                            alt="Logo AR Preview"
                            width={100}
                            height={40}
                            className="h-10 w-auto object-contain border rounded p-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border"
                            onClick={() => {
                              setLogoArPreview(null);
                              setFormData((prev) => ({
                                ...prev,
                                logoArFile: undefined,
                                logo_ar: undefined,
                              }));
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <Input
                        id="logoArFile"
                        name="logoArFile"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, "logo_ar")}
                        disabled={isLoading}
                      />
                    </>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t("admin.settings.uploadLogoHint")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="favicon">{t("admin.settings.favicon")}</Label>
                  {faviconPreview && (
                    <div className="relative inline-block">
                      <Image
                        src={faviconPreview}
                        alt="Favicon Preview"
                        width={32}
                        height={32}
                        className="h-8 w-8 object-contain border rounded p-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={`absolute -top-2 h-6 w-6 rounded-full bg-background border ${isRtl ? "-left-2" : "-right-2"
                          }`}
                        onClick={() => {
                          setFaviconPreview(null);
                          setFormData((prev) => ({
                            ...prev,
                            faviconFile: undefined,
                            favicon: undefined,
                          }));
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <Input
                    id="faviconFile"
                    name="faviconFile"
                    type="file"
                    accept="image/x-icon, image/png, image/svg+xml"
                    onChange={(e) => handleFileChange(e, "favicon")}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("admin.settings.uploadFaviconHint")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Social Links Card */}
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center justify-between`}>
                  {t("admin.settings.social")}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSocialLink}
                    disabled={allPlatformsUsed || isLoading}
                  >
                    <Plus className={`h-4 w-4 ${isRtl ? "ml-1" : "mr-1"}`} />
                    {allPlatformsUsed
                      ? t("admin.settings.allPlatformsAdded")
                      : t("admin.settings.addLink")}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {socialLinks.map((link, index) => (
                  <div
                    key={link._id || index}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end border-b pb-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor={`platform-${index}`}>
                        {t("admin.settings.platform")}
                      </Label>
                      <Select
                        value={link.platform}
                        onValueChange={(value) =>
                          updateSocialLink(index, "platform", value)
                        }
                        disabled={isLoading}
                      >
                        <SelectTrigger
                          id={`platform-${index}`}
                          dir={isRtl ? "rtl" : "ltr"}
                        >
                          <SelectValue
                            placeholder={t("admin.settings.selectPlatform")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Show current platform if already selected */}
                          {link.platform && (
                            <SelectItem value={link.platform}>
                              {link.platform.charAt(0).toUpperCase() +
                                link.platform.slice(1)}
                            </SelectItem>
                          )}
                          {/* Only show platforms that aren't already used */}
                          {allPlatforms
                            .filter(
                              (platform) =>
                                platform !== link.platform &&
                                !usedPlatforms.includes(platform)
                            )
                            .map((platform) => (
                              <SelectItem key={platform} value={platform}>
                                {platform === "x"
                                  ? "X (Twitter)"
                                  : platform.charAt(0).toUpperCase() +
                                  platform.slice(1)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={`url-${index}`}>
                        {t("admin.settings.url")}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`url-${index}`}
                          value={link.url}
                          onChange={(e) =>
                            updateSocialLink(index, "url", e.target.value)
                          }
                          placeholder="https://..."
                          className="flex-1"
                          disabled={isLoading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSocialLink(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {socialLinks.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("admin.settings.noSocialLinks")}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Header Display Card */}
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.settings.headerDisplay")}</CardTitle>
                <CardDescription>
                  {t("admin.settings.headerDisplayDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="showLogo">
                        {t("admin.settings.showLogo")}
                      </Label>
                      <div className="text-sm text-muted-foreground">
                        {t("admin.settings.displayLogoInHeader")}
                      </div>
                    </div>
                    <Switch
                      id="showLogo"
                      checked={headerDisplay.showLogo}
                      onCheckedChange={(checked) =>
                        setHeaderDisplay((prev) => ({
                          ...prev,
                          showLogo: checked,
                        }))
                      }
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="showTitle">
                        {t("admin.settings.showSiteName")}
                      </Label>
                      <div className="text-sm text-muted-foreground">
                        {t("admin.settings.displaySiteNameInHeader")}
                      </div>
                    </div>
                    <Switch
                      id="showTitle"
                      checked={headerDisplay.showTitle}
                      onCheckedChange={(checked) =>
                        setHeaderDisplay((prev) => ({
                          ...prev,
                          showTitle: checked,
                        }))
                      }
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logoWidth">
                    {t("admin.settings.logoWidth")}
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="logoWidth"
                      type="number"
                      min={20}
                      max={200}
                      value={headerDisplay.logoWidth}
                      onChange={(e) =>
                        setHeaderDisplay((prev) => ({
                          ...prev,
                          logoWidth: parseInt(e.target.value) || 40,
                        }))
                      }
                      disabled={isLoading}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">
                      {t("admin.settings.logoWidthRange")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cache Management Card */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {isRtl ? "إدارة الكاش" : "Cache Management"}
                </CardTitle>
                <CardDescription>
                  {isRtl
                    ? "مسح كاش الموقع لتحديث المحتوى فوراً"
                    : "Clear website cache to update content instantly"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="font-medium">
                      {isRtl ? "مسح كاش الموقع" : "Clear Website Cache"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {isRtl
                        ? "مسح الكاش سيجعل جميع الصفحات تعيد تحميل أحدث البيانات"
                        : "Clearing cache will force all pages to reload with fresh data"}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      setClearingCache(true);
                      try {
                        const res = await fetch("/api/revalidate", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            secret: "genoun-revalidate-secret",
                            all: true,
                          }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          toast.success(
                            isRtl
                              ? "تم مسح الكاش بنجاح!"
                              : "Cache cleared successfully!"
                          );
                        } else {
                          toast.error(data.message || "Failed to clear cache");
                        }
                      } catch (error) {
                        toast.error(
                          isRtl
                            ? "حدث خطأ أثناء مسح الكاش"
                            : "Error clearing cache"
                        );
                      } finally {
                        setClearingCache(false);
                      }
                    }}
                    disabled={clearingCache}
                  >
                    {clearingCache ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCcw
                          className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`}
                        />
                        {isRtl ? "مسح الكاش" : "Clear Cache"}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="contact" className="space-y-6">
            {/* Contact Information Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t("admin.settings.contactInfo")}</CardTitle>
                  <CardDescription>
                    {t("admin.settings.publicContactDetails")}
                  </CardDescription>
                </div>
                <LanguageSwitcher
                  language={formLang}
                  setLanguage={setFormLang}
                />
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">
                    {t("admin.settings.contactEmail")}
                  </Label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    value={formData.contactEmail || ""}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">
                    {t("admin.settings.contactPhone")}
                  </Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    type="tel"
                    value={formData.contactPhone || ""}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsappNumber">
                    {t("admin.settings.whatsappNumber")}
                  </Label>
                  <Input
                    id="whatsappNumber"
                    name="whatsappNumber"
                    placeholder="+1234567890"
                    type="tel"
                    value={formData.whatsappNumber || ""}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
                <div className="flex items-center justify-between md:col-span-2 p-4 border rounded-lg bg-muted/30">
                  <div>
                    <Label htmlFor="floatingWhatsAppEnabled" className="text-base font-medium">
                      {formLang === "ar" ? "إظهار أيقونة الواتساب العائمة" : "Show Floating WhatsApp Button"}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {formLang === "ar"
                        ? 'إظهار زر "هل تحتاج مساعدة؟" في جميع الصفحات'
                        : 'Show the "Need help?" button on all pages'}
                    </p>
                  </div>
                  <Switch
                    id="floatingWhatsAppEnabled"
                    checked={formData.floatingWhatsAppEnabled !== false}
                    onCheckedChange={(checked) =>
                      setFormData((prev: any) => ({ ...prev, floatingWhatsAppEnabled: checked }))
                    }
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">
                    {t("admin.settings.address")} (
                    {formLang === "ar"
                      ? t("admin.settings.arabicContent")
                      : t("admin.settings.englishContent")}
                    )
                  </Label>
                  <Textarea
                    id={formLang === "en" ? "address" : "address_ar"}
                    name={formLang === "en" ? "address" : "address_ar"}
                    value={
                      (formLang === "en"
                        ? formData.address
                        : formData.address_ar) || ""
                    }
                    onChange={handleInputChange}
                    disabled={isLoading}
                    dir={formLang === "ar" ? "rtl" : "ltr"}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {isRtl ? "عناوين المقالات والمدونة" : "Articles & Blog Titles"}
                </CardTitle>
                <CardDescription>
                  {isRtl
                    ? "تعديل عناوين صفحة المقالات وقسم المدونة في الصفحة الرئيسية"
                    : "Customize titles for the Articles page and homepage blog section"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    {isRtl ? "صفحة المقالات" : "Articles Page"}
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isRtl ? "الشارة (عربي)" : "Badge (Arabic)"}</Label>
                      <Input
                        value={articlesPageHero.badge.ar}
                        onChange={(e) =>
                          setArticlesPageHero((prev) => ({
                            ...prev,
                            badge: { ...prev.badge, ar: e.target.value },
                          }))
                        }
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isRtl ? "الشارة (إنجليزي)" : "Badge (English)"}</Label>
                      <Input
                        value={articlesPageHero.badge.en}
                        onChange={(e) =>
                          setArticlesPageHero((prev) => ({
                            ...prev,
                            badge: { ...prev.badge, en: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isRtl ? "العنوان (عربي)" : "Title (Arabic)"}</Label>
                      <Input
                        value={articlesPageHero.title.ar}
                        onChange={(e) =>
                          setArticlesPageHero((prev) => ({
                            ...prev,
                            title: { ...prev.title, ar: e.target.value },
                          }))
                        }
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isRtl ? "العنوان (إنجليزي)" : "Title (English)"}</Label>
                      <Input
                        value={articlesPageHero.title.en}
                        onChange={(e) =>
                          setArticlesPageHero((prev) => ({
                            ...prev,
                            title: { ...prev.title, en: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isRtl ? "الوصف (عربي)" : "Subtitle (Arabic)"}</Label>
                      <Textarea
                        value={articlesPageHero.subtitle.ar}
                        onChange={(e) =>
                          setArticlesPageHero((prev) => ({
                            ...prev,
                            subtitle: { ...prev.subtitle, ar: e.target.value },
                          }))
                        }
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isRtl ? "الوصف (إنجليزي)" : "Subtitle (English)"}</Label>
                      <Textarea
                        value={articlesPageHero.subtitle.en}
                        onChange={(e) =>
                          setArticlesPageHero((prev) => ({
                            ...prev,
                            subtitle: { ...prev.subtitle, en: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isRtl ? "عنوان قائمة المقالات (عربي)" : "Latest Articles Label (Arabic)"}</Label>
                      <Input
                        value={articlesPageHero.latestArticles.ar}
                        onChange={(e) =>
                          setArticlesPageHero((prev) => ({
                            ...prev,
                            latestArticles: {
                              ...prev.latestArticles,
                              ar: e.target.value,
                            },
                          }))
                        }
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isRtl ? "عنوان قائمة المقالات (إنجليزي)" : "Latest Articles Label (English)"}</Label>
                      <Input
                        value={articlesPageHero.latestArticles.en}
                        onChange={(e) =>
                          setArticlesPageHero((prev) => ({
                            ...prev,
                            latestArticles: {
                              ...prev.latestArticles,
                              en: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-muted-foreground">
                      {isRtl ? "قسم المدونة في الصفحة الرئيسية" : "Homepage Blog Section"}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Label>{isRtl ? "تفعيل القسم" : "Enable Section"}</Label>
                      <Switch
                        checked={homepageArticlesSection.isEnabled}
                        onCheckedChange={(checked) =>
                          setHomepageArticlesSection((prev) => ({
                            ...prev,
                            isEnabled: checked,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isRtl ? "الشارة (عربي)" : "Badge (Arabic)"}</Label>
                      <Input
                        value={homepageArticlesSection.badge.ar}
                        onChange={(e) =>
                          setHomepageArticlesSection((prev) => ({
                            ...prev,
                            badge: { ...prev.badge, ar: e.target.value },
                          }))
                        }
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isRtl ? "الشارة (إنجليزي)" : "Badge (English)"}</Label>
                      <Input
                        value={homepageArticlesSection.badge.en}
                        onChange={(e) =>
                          setHomepageArticlesSection((prev) => ({
                            ...prev,
                            badge: { ...prev.badge, en: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isRtl ? "العنوان (عربي)" : "Title (Arabic)"}</Label>
                      <Input
                        value={homepageArticlesSection.title.ar}
                        onChange={(e) =>
                          setHomepageArticlesSection((prev) => ({
                            ...prev,
                            title: { ...prev.title, ar: e.target.value },
                          }))
                        }
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isRtl ? "العنوان (إنجليزي)" : "Title (English)"}</Label>
                      <Input
                        value={homepageArticlesSection.title.en}
                        onChange={(e) =>
                          setHomepageArticlesSection((prev) => ({
                            ...prev,
                            title: { ...prev.title, en: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isRtl ? "تمييز العنوان (عربي)" : "Title Highlight (Arabic)"}</Label>
                      <Input
                        value={homepageArticlesSection.titleHighlight.ar}
                        onChange={(e) =>
                          setHomepageArticlesSection((prev) => ({
                            ...prev,
                            titleHighlight: {
                              ...prev.titleHighlight,
                              ar: e.target.value,
                            },
                          }))
                        }
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isRtl ? "تمييز العنوان (إنجليزي)" : "Title Highlight (English)"}</Label>
                      <Input
                        value={homepageArticlesSection.titleHighlight.en}
                        onChange={(e) =>
                          setHomepageArticlesSection((prev) => ({
                            ...prev,
                            titleHighlight: {
                              ...prev.titleHighlight,
                              en: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isRtl ? "الوصف (عربي)" : "Subtitle (Arabic)"}</Label>
                      <Textarea
                        value={homepageArticlesSection.subtitle.ar}
                        onChange={(e) =>
                          setHomepageArticlesSection((prev) => ({
                            ...prev,
                            subtitle: { ...prev.subtitle, ar: e.target.value },
                          }))
                        }
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isRtl ? "الوصف (إنجليزي)" : "Subtitle (English)"}</Label>
                      <Textarea
                        value={homepageArticlesSection.subtitle.en}
                        onChange={(e) =>
                          setHomepageArticlesSection((prev) => ({
                            ...prev,
                            subtitle: { ...prev.subtitle, en: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isRtl ? "نص زر عرض الكل (عربي)" : "View All Button Text (Arabic)"}</Label>
                      <Input
                        value={homepageArticlesSection.viewAllText.ar}
                        onChange={(e) =>
                          setHomepageArticlesSection((prev) => ({
                            ...prev,
                            viewAllText: {
                              ...prev.viewAllText,
                              ar: e.target.value,
                            },
                          }))
                        }
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isRtl ? "نص زر عرض الكل (إنجليزي)" : "View All Button Text (English)"}</Label>
                      <Input
                        value={homepageArticlesSection.viewAllText.en}
                        onChange={(e) =>
                          setHomepageArticlesSection((prev) => ({
                            ...prev,
                            viewAllText: {
                              ...prev.viewAllText,
                              en: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="theme" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{isRtl ? "تخصيص الألوان والمظهر" : "Theme & Color Customization"}</CardTitle>
                <CardDescription>
                  {isRtl
                    ? "إدارة ألوان علامتك التجارية والمظهر العام للموقع"
                    : "Manage your brand colors and overall site appearance"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Brand Colors */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{isRtl ? "ألوان العلامة التجارية" : "Brand Colors"}</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <Label htmlFor="primaryColor">{isRtl ? "اللون الأساسي" : "Primary Color"}</Label>
                          <div className="text-xs text-muted-foreground">{theme.primary}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            className="w-24 h-8 px-1"
                            value={theme.primary}
                            onChange={(e) => setTheme(prev => ({ ...prev, primary: e.target.value }))}
                          />
                          <ColorPickerComponent
                            id="primaryColor"
                            value={theme.primary}
                            onChange={(color) => setTheme(prev => ({ ...prev, primary: color }))}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <Label htmlFor="secondaryColor">{isRtl ? "اللون الثانوي" : "Secondary Color"}</Label>
                          <div className="text-xs text-muted-foreground">{theme.secondary}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            className="w-24 h-8 px-1"
                            value={theme.secondary}
                            onChange={(e) => setTheme(prev => ({ ...prev, secondary: e.target.value }))}
                          />
                          <ColorPickerComponent
                            id="secondaryColor"
                            value={theme.secondary}
                            onChange={(color) => setTheme(prev => ({ ...prev, secondary: color }))}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <Label htmlFor="accentColor">{isRtl ? "لون التميز" : "Accent Color"}</Label>
                          <div className="text-xs text-muted-foreground">{theme.accent}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            className="w-24 h-8 px-1"
                            value={theme.accent}
                            onChange={(e) => setTheme(prev => ({ ...prev, accent: e.target.value }))}
                          />
                          <ColorPickerComponent
                            id="accentColor"
                            value={theme.accent}
                            onChange={(color) => setTheme(prev => ({ ...prev, accent: color }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* UI Colors */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{isRtl ? "ألوان الواجهة" : "Interface Colors"}</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <Label htmlFor="backgroundColor">{isRtl ? "لون الخلفية" : "Background Color"}</Label>
                          <div className="text-xs text-muted-foreground">{theme.background}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            className="w-24 h-8 px-1"
                            value={theme.background}
                            onChange={(e) => setTheme(prev => ({ ...prev, background: e.target.value }))}
                          />
                          <ColorPickerComponent
                            id="backgroundColor"
                            value={theme.background}
                            onChange={(color) => setTheme(prev => ({ ...prev, background: color }))}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <Label htmlFor="textColor">{isRtl ? "لون النص" : "Text Color"}</Label>
                          <div className="text-xs text-muted-foreground">{theme.text}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            className="w-24 h-8 px-1"
                            value={theme.text}
                            onChange={(e) => setTheme(prev => ({ ...prev, text: e.target.value }))}
                          />
                          <ColorPickerComponent
                            id="textColor"
                            value={theme.text}
                            onChange={(color) => setTheme(prev => ({ ...prev, text: color }))}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <Label htmlFor="adminPrimaryColor">{isRtl ? "لون لوحة التحكم" : "Admin Dashboard Primary"}</Label>
                          <div className="text-xs text-muted-foreground">{theme.adminPrimary}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            className="w-24 h-8 px-1"
                            value={theme.adminPrimary}
                            onChange={(e) => setTheme(prev => ({ ...prev, adminPrimary: e.target.value }))}
                          />
                          <ColorPickerComponent
                            id="adminPrimaryColor"
                            value={theme.adminPrimary}
                            onChange={(color) => setTheme(prev => ({ ...prev, adminPrimary: color }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview Section */}
                <div className="mt-8 space-y-4">
                  <h3 className="text-lg font-medium">{isRtl ? "معاينة المظهر" : "Theme Preview"}</h3>
                  <div className="rounded-xl border p-8" style={{ backgroundColor: theme.background, color: theme.text }}>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg" style={{ backgroundColor: theme.primary }}></div>
                        <div>
                          <h4 className="text-xl font-bold" style={{ color: theme.primary }}>{isRtl ? "هذا عنوان أساسي" : "This is a Primary Heading"}</h4>
                          <p className="text-sm opacity-80">{isRtl ? "هذا نص تجريبي للمعاينة." : "This is some preview sample text."}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button style={{ backgroundColor: theme.primary, color: "#fff" }}>{isRtl ? "زر أساسي" : "Primary Button"}</Button>
                        <Button style={{ backgroundColor: theme.secondary, color: "#fff" }}>{isRtl ? "زر ثانوي" : "Secondary Button"}</Button>
                        <Button variant="outline" style={{ borderColor: theme.accent, color: theme.accent }}>{isRtl ? "زر تميز" : "Accent Outline"}</Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="h-2 rounded" style={{ backgroundColor: theme.primary }}></div>
                        <div className="h-2 rounded" style={{ backgroundColor: theme.secondary }}></div>
                        <div className="h-2 rounded" style={{ backgroundColor: theme.accent }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marketing">
            <MarketingBannersSettings />
          </TabsContent>

          <TabsContent value="navbar" className="space-y-6">
            <NavbarSettings
              navbarLinks={navbarLinks}
              setNavbarLinks={setNavbarLinks}
              formLang={formLang}
            />
          </TabsContent>

          <TabsContent value="sections" className="space-y-6">
            {/* Existing Homepage Sections Settings */}
            <HomepageSectionsSettings
              sections={homepageSections}
              setSections={setHomepageSections}
              formLang={formLang}
              setFormLang={setFormLang}
              heroBackgroundPreview={heroBackgroundPreview}
              setHeroBackgroundPreview={setHeroBackgroundPreview}
              onHeroBackgroundFileChange={(file) => {
                setFormData((prev) => ({ ...prev, heroBackgroundFile: file || undefined }));
              }}
            />

            {/* NEW: Authority Bar Settings */}
            <AuthorityBarSettingsComponent
              settings={authorityBar}
              onChange={setAuthorityBar}
              lang={formLang}
            />

            {/* NEW: Reviews Section Settings */}
            <ReviewsSectionSettingsComponent
              settings={reviewsSettings}
              onChange={setReviewsSettings}
              lang={formLang}
            />

            {/* NEW: Why Genoun Settings */}
            <WhyGenounSettingsComponent
              settings={whyGenounSettings}
              onChange={setWhyGenounSettings}
              lang={formLang}
            />
          </TabsContent>

          <TabsContent value="section-order" className="space-y-6">
            {/* NEW: Section Order Management */}
            <SectionOrderSettings
              sections={homepageSections}
              setSections={setHomepageSections}
              authorityBar={authorityBar}
              setAuthorityBar={setAuthorityBar}
              reviewsSettings={reviewsSettings}
              setReviewsSettings={setReviewsSettings}
              whyGenounSettings={whyGenounSettings}
              setWhyGenounSettings={setWhyGenounSettings}
              formLang={formLang}
            />
          </TabsContent>

          <TabsContent value="modal" className="space-y-6">
            <PromoModalSettings
              promoModal={promoModal}
              setPromoModal={setPromoModal}
              formLang={formLang}
            />
          </TabsContent>

          {/* AI Articles Tab */}
          <TabsContent value="ai-articles">
            <AiArticlesSettings />
          </TabsContent>

          {/* Homepage Settings Tab */}
          <TabsContent value="homepage" className="space-y-6">
            {/* Homepage Social Links */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {isRtl ? "روابط السوشيال في الصفحة الرئيسية" : "Homepage Social Links"}
                </CardTitle>
                <CardDescription>
                  {isRtl
                    ? "تحديث روابط فيسبوك وإنستجرام الظاهرة في الصفحة الرئيسية"
                    : "Update Facebook and Instagram links shown on the homepage"}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="homepage-facebook">
                    {isRtl ? "رابط فيسبوك" : "Facebook URL"}
                  </Label>
                  <Input
                    id="homepage-facebook"
                    type="url"
                    value={getSocialUrl("facebook")}
                    onChange={(e) => setSocialUrl("facebook", e.target.value)}
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="homepage-instagram">
                    {isRtl ? "رابط إنستجرام" : "Instagram URL"}
                  </Label>
                  <Input
                    id="homepage-instagram"
                    type="url"
                    value={getSocialUrl("instagram")}
                    onChange={(e) => setSocialUrl("instagram", e.target.value)}
                    placeholder="https://instagram.com/..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Banner Settings */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {isRtl ? "بنر الصفحة الرئيسية" : "Homepage Banner"}
                </CardTitle>
                <CardDescription>
                  {isRtl
                    ? "إعدادات البنر المعروض في الصفحة الرئيسية"
                    : "Configure the banner displayed on the homepage"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>
                    {isRtl ? "تفعيل البنر" : "Enable Banner"}
                  </Label>
                  <Switch
                    checked={homepageBanner.isEnabled}
                    onCheckedChange={(checked) =>
                      setHomepageBanner({ ...homepageBanner, isEnabled: checked })
                    }
                  />
                </div>

                {homepageBanner.isEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label>
                        {isRtl ? "رابط الصورة" : "Image URL"}
                      </Label>
                      <Input
                        type="url"
                        value={homepageBanner.imageUrl}
                        onChange={(e) =>
                          setHomepageBanner({
                            ...homepageBanner,
                            imageUrl: e.target.value,
                          })
                        }
                        placeholder="https://..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>
                          {isRtl ? "العنوان (عربي)" : "Title (Arabic)"}
                        </Label>
                        <Input
                          value={homepageBanner.title.ar}
                          onChange={(e) =>
                            setHomepageBanner({
                              ...homepageBanner,
                              title: { ...homepageBanner.title, ar: e.target.value },
                            })
                          }
                          dir="rtl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>
                          {isRtl ? "العنوان (إنجليزي)" : "Title (English)"}
                        </Label>
                        <Input
                          value={homepageBanner.title.en}
                          onChange={(e) =>
                            setHomepageBanner({
                              ...homepageBanner,
                              title: { ...homepageBanner.title, en: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>
                          {isRtl ? "الوصف (عربي)" : "Subtitle (Arabic)"}
                        </Label>
                        <Textarea
                          value={homepageBanner.subtitle.ar}
                          onChange={(e) =>
                            setHomepageBanner({
                              ...homepageBanner,
                              subtitle: { ...homepageBanner.subtitle, ar: e.target.value },
                            })
                          }
                          dir="rtl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>
                          {isRtl ? "الوصف (إنجليزي)" : "Subtitle (English)"}
                        </Label>
                        <Textarea
                          value={homepageBanner.subtitle.en}
                          onChange={(e) =>
                            setHomepageBanner({
                              ...homepageBanner,
                              subtitle: { ...homepageBanner.subtitle, en: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>
                          {isRtl ? "نص الزر (عربي)" : "Button Text (Arabic)"}
                        </Label>
                        <Input
                          value={homepageBanner.buttonText.ar}
                          onChange={(e) =>
                            setHomepageBanner({
                              ...homepageBanner,
                              buttonText: { ...homepageBanner.buttonText, ar: e.target.value },
                            })
                          }
                          dir="rtl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>
                          {isRtl ? "نص الزر (إنجليزي)" : "Button Text (English)"}
                        </Label>
                        <Input
                          value={homepageBanner.buttonText.en}
                          onChange={(e) =>
                            setHomepageBanner({
                              ...homepageBanner,
                              buttonText: { ...homepageBanner.buttonText, en: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        {isRtl ? "رابط الزر" : "Button Link"}
                      </Label>
                      <Input
                        type="url"
                        value={homepageBanner.buttonLink}
                        onChange={(e) =>
                          setHomepageBanner({
                            ...homepageBanner,
                            buttonLink: e.target.value,
                          })
                        }
                        placeholder="/courses"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Courses Settings */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {isRtl ? "إعدادات عرض الدورات" : "Courses Display Settings"}
                </CardTitle>
                <CardDescription>
                  {isRtl
                    ? "إعدادات عرض الدورات في الصفحة الرئيسية"
                    : "Configure how courses are displayed on the homepage"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>
                    {isRtl ? "عرض قسم الدورات" : "Show Courses Section"}
                  </Label>
                  <Switch
                    checked={homepageCourses.isEnabled}
                    onCheckedChange={(checked) =>
                      setHomepageCourses({ ...homepageCourses, isEnabled: checked })
                    }
                  />
                </div>

                {homepageCourses.isEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label>
                        {isRtl ? "عدد الدورات المعروضة" : "Number of Courses to Display"}
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={homepageCourses.displayCount}
                        onChange={(e) =>
                          setHomepageCourses({
                            ...homepageCourses,
                            displayCount: parseInt(e.target.value) || 6,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        {isRtl
                          ? "النطاق: 1-20 دورة"
                          : "Range: 1-20 courses"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>
                          {isRtl ? "العنوان (عربي)" : "Title (Arabic)"}
                        </Label>
                        <Input
                          value={homepageCourses.title.ar}
                          onChange={(e) =>
                            setHomepageCourses({
                              ...homepageCourses,
                              title: { ...homepageCourses.title, ar: e.target.value },
                            })
                          }
                          dir="rtl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>
                          {isRtl ? "العنوان (إنجليزي)" : "Title (English)"}
                        </Label>
                        <Input
                          value={homepageCourses.title.en}
                          onChange={(e) =>
                            setHomepageCourses({
                              ...homepageCourses,
                              title: { ...homepageCourses.title, en: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>
                          {isRtl ? "الوصف (عربي)" : "Subtitle (Arabic)"}
                        </Label>
                        <Input
                          value={homepageCourses.subtitle.ar}
                          onChange={(e) =>
                            setHomepageCourses({
                              ...homepageCourses,
                              subtitle: { ...homepageCourses.subtitle, ar: e.target.value },
                            })
                          }
                          dir="rtl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>
                          {isRtl ? "الوصف (إنجليزي)" : "Subtitle (English)"}
                        </Label>
                        <Input
                          value={homepageCourses.subtitle.en}
                          onChange={(e) =>
                            setHomepageCourses({
                              ...homepageCourses,
                              subtitle: { ...homepageCourses.subtitle, en: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>
                          {isRtl ? "نص الزر (عربي)" : "Button Text (Arabic)"}
                        </Label>
                        <Input
                          value={homepageCourses.buttonText.ar}
                          onChange={(e) =>
                            setHomepageCourses({
                              ...homepageCourses,
                              buttonText: { ...homepageCourses.buttonText, ar: e.target.value },
                            })
                          }
                          dir="rtl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>
                          {isRtl ? "نص الزر (إنجليزي)" : "Button Text (English)"}
                        </Label>
                        <Input
                          value={homepageCourses.buttonText.en}
                          onChange={(e) =>
                            setHomepageCourses({
                              ...homepageCourses,
                              buttonText: { ...homepageCourses.buttonText, en: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-6">
            <EmailSettings
              settings={emailSettings}
              updateSettings={(key, value) => {
                setEmailSettings((prev) => ({
                  ...prev,
                  [key]: value,
                }));
              }}
              formLang={formLang}
            />

            <Card>
              <CardHeader>
                <CardTitle>
                  {isRtl ? "إعدادات تفعيل الحساب" : "Account Activation Settings"}
                </CardTitle>
                <CardDescription>
                  {isRtl
                    ? "عند التفعيل: التسجيل يتطلب تحقق البريد الإلكتروني. عند الإلغاء: المستخدم يدخل مباشرة بعد التسجيل."
                    : "When enabled: registration requires email verification. When disabled: users can access immediately after registration."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <Label htmlFor="requireEmailVerification">
                      {isRtl ? "تفعيل التحقق عبر البريد الإلكتروني" : "Require Email Verification"}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {isRtl
                        ? "إرسال رسالة Verify ومنع الدخول قبل التفعيل."
                        : "Send verification email and block login until verified."}
                    </p>
                  </div>
                  <Switch
                    id="requireEmailVerification"
                    checked={authSettings.requireEmailVerification}
                    onCheckedChange={(checked) =>
                      setAuthSettings((prev) => ({
                        ...prev,
                        requireEmailVerification: checked,
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-6">
            <WhatsAppSettings
              settings={settings}
              isLoading={isLoading}
              isRtl={isRtl}
            />
          </TabsContent>

          <TabsContent value="currency" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {isRtl ? "إعدادات العملة وأسعار الصرف" : "Currency & Exchange Rate Settings"}
                </CardTitle>
                <CardDescription>
                  {isRtl
                    ? "قم بتكوين العملة الأساسية وأسعار الصرف. للعملات كـ EGP، سيتم تحويلها إلى SAR أولاً ثم PayPal يحولها للدولار تلقائياً بسعر أفضل"
                    : "Configure base currency and exchange rates. For currencies like EGP, they will be converted to SAR first, then PayPal converts to USD automatically with better rates"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Base Currency Selection */}
                <div className="space-y-2">
                  <Label htmlFor="baseCurrency">
                    {isRtl ? "العملة الأساسية" : "Base Currency"}
                  </Label>
                  <Select
                    value={financeSettings.baseCurrency}
                    onValueChange={(value: "SAR" | "EGP" | "USD") =>
                      setFinanceSettings((prev) => ({
                        ...prev,
                        baseCurrency: value,
                      }))
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger id="baseCurrency" dir={isRtl ? "rtl" : "ltr"}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAR">
                        {isRtl ? "ريال سعودي (SAR)" : "Saudi Riyal (SAR)"}
                      </SelectItem>
                      <SelectItem value="EGP">
                        {isRtl ? "جنيه مصري (EGP)" : "Egyptian Pound (EGP)"}
                      </SelectItem>
                      <SelectItem value="USD">
                        {isRtl ? "دولار أمريكي (USD)" : "US Dollar (USD)"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {isRtl
                      ? "العملة الأساسية المستخدمة في المنصة"
                      : "The base currency used on the platform"}
                  </p>
                </div>

                {/* Exchange Rates */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">
                      {isRtl ? "أسعار الصرف" : "Exchange Rates"}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {isRtl
                        ? "كم من الوحدات = 1 دولار أمريكي"
                        : "How many units = 1 USD"}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isRtl
                      ? "يتم استخدام أسعار الصرف هذه لتحويل الأسعار عند الدفع عبر PayPal. على سبيل المثال: إذا كان السعر 500 جنيه مصري و سعر الصرف 50، سيتم تحويله إلى 10 دولار."
                      : "These exchange rates are used to convert prices for PayPal payments. For example: If price is 500 EGP and rate is 50, it will be converted to $10."}
                  </p>

                  {/* USD Rate (Always 1) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
                    <div className="space-y-2">
                      <Label htmlFor="rate-usd">
                        {isRtl ? "دولار أمريكي (USD)" : "US Dollar (USD)"}
                      </Label>
                      <Input
                        id="rate-usd"
                        type="number"
                        value="1"
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        {isRtl ? "العملة الأساسية (ثابت = 1)" : "Base currency (fixed = 1)"}
                      </p>
                    </div>
                    <div className="flex items-center justify-center text-sm text-muted-foreground">
                      {isRtl ? "1 دولار = 1 دولار" : "1 USD = 1 USD"}
                    </div>
                  </div>

                  {/* SAR Rate */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="rate-sar">
                        {isRtl ? "ريال سعودي (SAR)" : "Saudi Riyal (SAR)"}
                      </Label>
                      <Input
                        id="rate-sar"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={financeSettings.exchangeRates.SAR}
                        onChange={(e) =>
                          setFinanceSettings((prev) => ({
                            ...prev,
                            exchangeRates: {
                              ...prev.exchangeRates,
                              SAR: parseFloat(e.target.value) || 3.75,
                            },
                          }))
                        }
                        disabled={isLoading}
                      />
                      <p className="text-xs text-muted-foreground">
                        {isRtl
                          ? "كم ريال سعودي = 1 دولار أمريكي"
                          : "How many SAR = 1 USD"}
                      </p>
                    </div>
                    <div className="flex items-center justify-center text-sm text-muted-foreground">
                      {isRtl
                        ? `${financeSettings.exchangeRates.SAR} ريال = 1 دولار`
                        : `${financeSettings.exchangeRates.SAR} SAR = 1 USD`}
                    </div>
                  </div>

                  {/* EGP Rate */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="rate-egp">
                        {isRtl ? "جنيه مصري (EGP)" : "Egyptian Pound (EGP)"}
                      </Label>
                      <Input
                        id="rate-egp"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={financeSettings.exchangeRates.EGP}
                        onChange={(e) =>
                          setFinanceSettings((prev) => ({
                            ...prev,
                            exchangeRates: {
                              ...prev.exchangeRates,
                              EGP: parseFloat(e.target.value) || 50.0,
                            },
                          }))
                        }
                        disabled={isLoading}
                      />
                      <p className="text-xs text-muted-foreground">
                        {isRtl
                          ? "كم جنيه مصري = 1 دولار أمريكي"
                          : "How many EGP = 1 USD"}
                      </p>
                    </div>
                    <div className="flex items-center justify-center text-sm text-muted-foreground">
                      {isRtl
                        ? `${financeSettings.exchangeRates.EGP} جنيه = 1 دولار`
                        : `${financeSettings.exchangeRates.EGP} EGP = 1 USD`}
                    </div>
                  </div>

                  {/* EGP to SAR Rate (Legacy - no longer used) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 opacity-60">
                    <div className="space-y-2">
                      <Label htmlFor="rate-egp-sar">
                        {isRtl ? "جنيه مصري → ريال سعودي (قديم)" : "EGP → SAR (Legacy)"}
                      </Label>
                      <Input
                        id="rate-egp-sar"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={financeSettings.exchangeRates.EGPtoSAR || 13.33}
                        onChange={(e) =>
                          setFinanceSettings((prev) => ({
                            ...prev,
                            exchangeRates: {
                              ...prev.exchangeRates,
                              EGPtoSAR: parseFloat(e.target.value) || 13.33,
                            },
                          }))
                        }
                        disabled={isLoading}
                      />
                      <p className="text-xs text-muted-foreground">
                        {isRtl
                          ? "لم يعد مستخدماً - التحويل يتم مباشرة إلى الدولار"
                          : "No longer used - conversion goes directly to USD"}
                      </p>
                    </div>
                    <div className="flex items-center justify-center text-sm text-muted-foreground">
                      {isRtl
                        ? "⚠️ التحويل الآن: العملة → دولار مباشرة"
                        : "⚠️ Now converts: Currency → USD directly"}
                    </div>
                  </div>

                  {/* Example Calculation */}
                  <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                    <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                      {isRtl ? "مثال على التحويل (PayPal):" : "Conversion Example (PayPal):"}
                    </h4>
                    <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-semibold">
                        {isRtl ? "التحويل المباشر إلى الدولار:" : "Direct USD Conversion:"}
                      </p>
                      <p>
                        {isRtl
                          ? `• كورس سعره 500 جنيه مصري ÷ ${financeSettings.exchangeRates.EGP} = $${(500 / financeSettings.exchangeRates.EGP).toFixed(2)} USD`
                          : `• Course 500 EGP ÷ ${financeSettings.exchangeRates.EGP} = $${(500 / financeSettings.exchangeRates.EGP).toFixed(2)} USD`}
                      </p>
                      <p>
                        {isRtl
                          ? `• كورس سعره 100 ريال ÷ ${financeSettings.exchangeRates.SAR} = $${(100 / financeSettings.exchangeRates.SAR).toFixed(2)} USD`
                          : `• Course 100 SAR ÷ ${financeSettings.exchangeRates.SAR} = $${(100 / financeSettings.exchangeRates.SAR).toFixed(2)} USD`}
                      </p>
                      <p className="pt-2 text-xs text-blue-600 dark:text-blue-300">
                        {isRtl
                          ? "ℹ️ يتم تحويل السعر مباشرة إلى الدولار باستخدام أسعار الصرف أعلاه عند الدفع عبر PayPal"
                          : "ℹ️ Prices are converted directly to USD using the exchange rates above when paying via PayPal"}
                      </p>
                    </div>
                  </div>

                  {/* Last Updated */}
                  {financeSettings.lastRatesUpdate && (
                    <p className="text-xs text-muted-foreground text-center">
                      {isRtl ? "آخر تحديث: " : "Last updated: "}
                      {new Date(financeSettings.lastRatesUpdate).toLocaleString(
                        isRtl ? "ar-EG" : "en-US"
                      )}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-6">
            <ApiKeysSettingsComponent
              settings={apiKeys}
              updateSettings={(key, value) => {
                setApiKeys((prev) => ({
                  ...prev,
                  [key]: value,
                }));
              }}
              formLang={formLang}
            />
          </TabsContent>

          {/* Teacher Profit Settings Tab */}
          <TabsContent value="teacher-profit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {isRtl ? "إعدادات أرباح المعلمين" : "Teacher Profit Settings"}
                </CardTitle>
                <CardDescription>
                  {isRtl
                    ? "اضبط نسب الأرباح الافتراضية للمعلمين من مبيعات الدورات والاشتراكات"
                    : "Configure default profit percentages for teachers from course sales and subscriptions"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable/Disable Teacher Profit System */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">
                      {isRtl ? "تفعيل نظام الأرباح" : "Enable Profit System"}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {isRtl
                        ? "تفعيل أو تعطيل نظام حساب أرباح المعلمين"
                        : "Enable or disable the teacher profit calculation system"}
                    </p>
                  </div>
                  <Switch
                    checked={teacherProfitSettings.enabled}
                    onCheckedChange={(checked) =>
                      setTeacherProfitSettings((prev) => ({ ...prev, enabled: checked }))
                    }
                  />
                </div>

                {/* Course Sales Percentage */}
                <div className="space-y-3">
                  <Label htmlFor="courseSalesPercentage" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    {isRtl ? "نسبة مبيعات الدورات (%)" : "Course Sales Profit Percentage (%)"}
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="courseSalesPercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={teacherProfitSettings.courseSalesPercentage}
                      onChange={(e) =>
                        setTeacherProfitSettings((prev) => ({
                          ...prev,
                          courseSalesPercentage: parseFloat(e.target.value) || 0,
                        }))
                      }
                      disabled={!teacherProfitSettings.enabled}
                      className="max-w-[200px]"
                    />
                    <span className="text-lg font-semibold text-blue-600">
                      {teacherProfitSettings.courseSalesPercentage}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isRtl
                      ? `عند بيع دورة بـ 100 ريال، يحصل المعلم على ${teacherProfitSettings.courseSalesPercentage} ريال`
                      : `For a course sold at 100 SAR, teacher receives ${teacherProfitSettings.courseSalesPercentage} SAR`}
                  </p>
                </div>

                {/* Subscription Percentage */}
                <div className="space-y-3">
                  <Label htmlFor="subscriptionPercentage" className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    {isRtl ? "نسبة الاشتراكات (%)" : "Subscription Profit Percentage (%)"}
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="subscriptionPercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={teacherProfitSettings.subscriptionPercentage}
                      onChange={(e) =>
                        setTeacherProfitSettings((prev) => ({
                          ...prev,
                          subscriptionPercentage: parseFloat(e.target.value) || 0,
                        }))
                      }
                      disabled={!teacherProfitSettings.enabled}
                      className="max-w-[200px]"
                    />
                    <span className="text-lg font-semibold text-purple-600">
                      {teacherProfitSettings.subscriptionPercentage}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isRtl
                      ? `عند اشتراك طالب بـ 100 ريال، يحصل المعلم على ${teacherProfitSettings.subscriptionPercentage} ريال`
                      : `For a subscription of 100 SAR, teacher receives ${teacherProfitSettings.subscriptionPercentage} SAR`}
                  </p>
                </div>

                {/* Configuration Priority Info */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {isRtl ? "أولوية الإعدادات" : "Configuration Priority"}
                  </AlertTitle>
                  <AlertDescription className="text-sm">
                    {isRtl
                      ? "هذه النسب هي الافتراضية. يمكن تخصيص نسب مختلفة لكل معلم أو دورة. الأولوية: دورة محددة > معلم محدد > إعدادات عامة"
                      : "These are the default percentages. You can customize different percentages per teacher or per course. Priority: Specific Course > Specific Teacher > Global Settings"}
                  </AlertDescription>
                </Alert>

                {/* Last Updated */}
                {teacherProfitSettings.lastUpdated && (
                  <p className="text-xs text-muted-foreground text-center">
                    {isRtl ? "آخر تحديث: " : "Last updated: "}
                    {new Date(teacherProfitSettings.lastUpdated).toLocaleString(
                      isRtl ? "ar-SA" : "en-US"
                    )}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Courses Page Hero Settings Tab */}
          <TabsContent value="courses-hero" className="space-y-6">
            <CoursesPageHeroSettingsComponent
              settings={formData.coursesPageHero || {
                isEnabled: true,
                badge: { ar: "", en: "" },
                title: { ar: "", en: "" },
                subtitle: { ar: "", en: "" },
                backgroundImage: "",
              }}
              onUpdate={(settings) =>
                setFormData((prev) => ({
                  ...prev,
                  coursesPageHero: settings,
                }))
              }
              locale={formLang}
            />
          </TabsContent>

          <TabsContent value="books-hero" className="space-y-6">
            <BooksPageHeroSettingsComponent
              settings={(formData.booksPageHero as BooksPageHeroSettingsType) || {
                title: { ar: "الكتب", en: "Books" },
                subtitle: {
                  ar: "مجموعة منتقاة من الكتب الرقمية الجاهزة للشراء",
                  en: "A curated collection of digital books ready for purchase",
                },
              }}
              onUpdate={(settings) =>
                setFormData((prev) => ({
                  ...prev,
                  booksPageHero: settings,
                }))
              }
              locale={formLang}
            />
          </TabsContent>
          <TabsContent value="products-hero" className="space-y-6">
            <ProductsPageHeroSettingsComponent
              settings={
                (formData.productsPageHero as ProductsPageHeroSettingsType) || {
                  isEnabled: true,
                  badge: { ar: "", en: "" },
                  title: { ar: "", en: "" },
                  subtitle: { ar: "", en: "" },
                  backgroundImage: "",
                }
              }
              onUpdate={(settings) =>
                setFormData((prev) => ({
                  ...prev,
                  productsPageHero: settings,
                }))
              }
              locale={formLang}
            />
          </TabsContent>

          {/* Hero Stats Settings Tab */}
          <TabsContent value="hero-stats">
            <HeroStatsSettingsComponent
              heroStats={heroStats}
              setHeroStats={setHeroStats}
              isRtl={isRtl}
            />
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        {activeTab !== "ai-articles" && activeTab !== "whatsapp" && (
          <div className="sticky bottom-0 z-10 mt-6 flex justify-end border-t bg-background p-4 shadow-sm -mx-4 px-4 sm:-mx-6 sm:px-6">
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-secondary-blue hover:bg-secondary-blue/90 text-white min-w-[150px]"
            >
              {isLoading ? (
                <>
                  <Loader2
                    className={`h-4 w-4 animate-spin ${isRtl ? "ml-2" : "mr-2"
                      }`}
                  />
                  {t("common.loading")}
                </>
              ) : (
                t("admin.settings.saveChanges")
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

