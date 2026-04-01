export interface ModeratorDashboardAccessOption {
  href: string;
  titleKey: string;
  fallbackTitle: string;
}

export interface ModeratorDashboardAccessGroup {
  id: string;
  label: {
    ar: string;
    en: string;
  };
  items: ModeratorDashboardAccessOption[];
}

export const MODERATOR_DASHBOARD_ACCESS_GROUPS: ModeratorDashboardAccessGroup[] = [
  {
    id: "general",
    label: {
      ar: "الصفحات العامة",
      en: "General Pages",
    },
    items: [
      {
        href: "/dashboard",
        titleKey: "admin.sidebar.dashboard",
        fallbackTitle: "Dashboard",
      },
      {
        href: "/dashboard/my-profile",
        titleKey: "admin.sidebar.myProfile",
        fallbackTitle: "My Profile",
      },
      {
        href: "/dashboard/my-tasks",
        titleKey: "admin.sidebar.myTasks",
        fallbackTitle: "My Tasks",
      },
    ],
  },
  {
    id: "content",
    label: {
      ar: "المحتوى",
      en: "Content",
    },
    items: [
      {
        href: "/dashboard/articles",
        titleKey: "admin.sidebar.articles",
        fallbackTitle: "Articles",
      },
      {
        href: "/dashboard/analytics",
        titleKey: "admin.sidebar.analytics",
        fallbackTitle: "Analytics",
      },
      {
        href: "/dashboard/reviews",
        titleKey: "admin.sidebar.reviews",
        fallbackTitle: "Reviews",
      },
    ],
  },
  {
    id: "commerce",
    label: {
      ar: "المتجر",
      en: "Commerce",
    },
    items: [
      {
        href: "/dashboard/categories",
        titleKey: "admin.categories.title",
        fallbackTitle: "Categories",
      },
      {
        href: "/dashboard/products",
        titleKey: "admin.products.title",
        fallbackTitle: "Products",
      },
      {
        href: "/dashboard/books",
        titleKey: "admin.sidebar.books",
        fallbackTitle: "Digital Books",
      },
      {
        href: "/dashboard/abandoned-carts",
        titleKey: "admin.abandonedCarts.title",
        fallbackTitle: "Abandoned Carts",
      },
      {
        href: "/dashboard/coupons",
        titleKey: "admin.sidebar.coupons",
        fallbackTitle: "Coupons",
      },
    ],
  },
  {
    id: "operations",
    label: {
      ar: "العمليات",
      en: "Operations",
    },
    items: [
      {
        href: "/dashboard/submissions",
        titleKey: "admin.sidebar.submissions",
        fallbackTitle: "Submissions",
      },
    ],
  },
  {
    id: "learning",
    label: {
      ar: "نظام التعلم",
      en: "Learning System",
    },
    items: [
      {
        href: "/dashboard/courses",
        titleKey: "admin.sidebar.courses",
        fallbackTitle: "Courses",
      },
      {
        href: "/dashboard/quizzes",
        titleKey: "admin.sidebar.quizzes",
        fallbackTitle: "Quizzes",
      },
      {
        href: "/dashboard/certificates",
        titleKey: "admin.sidebar.certificates",
        fallbackTitle: "Certificates",
      },
    ],
  },
  {
    id: "subscriptions",
    label: {
      ar: "الاشتراكات",
      en: "Subscriptions",
    },
    items: [
      {
        href: "/dashboard/student-members",
        titleKey: "admin.sidebar.studentMembers",
        fallbackTitle: "Student Members",
      },
      {
        href: "/dashboard/overdue-subscriptions",
        titleKey: "admin.sidebar.overdueSubscriptions",
        fallbackTitle: "Overdue Subscriptions",
      },
      {
        href: "/dashboard/packages",
        titleKey: "admin.sidebar.packages",
        fallbackTitle: "Packages",
      },
      {
        href: "/dashboard/subscription-teachers",
        titleKey: "admin.sidebar.subscriptionTeachers",
        fallbackTitle: "Subscription Teachers",
      },
      {
        href: "/dashboard/subscription-groups",
        titleKey: "admin.sidebar.subscriptionGroups",
        fallbackTitle: "Subscription Groups",
      },
      {
        href: "/dashboard/subscription-students",
        titleKey: "admin.sidebar.subscriptionStudents",
        fallbackTitle: "Subscription Students",
      },
    ],
  },
];

export const MODERATOR_DASHBOARD_ACCESS_OPTIONS =
  MODERATOR_DASHBOARD_ACCESS_GROUPS.flatMap((group) => group.items);

export const MODERATOR_DASHBOARD_ACCESS_PATHS =
  MODERATOR_DASHBOARD_ACCESS_OPTIONS.map((item) => item.href);

const VALID_MODERATOR_ACCESS_PATHS = new Set(MODERATOR_DASHBOARD_ACCESS_PATHS);

export function getResolvedModeratorDashboardAccess(
  access?: string[]
): string[] {
  if (!Array.isArray(access) || access.length === 0) {
    return [...MODERATOR_DASHBOARD_ACCESS_PATHS];
  }

  const resolved: string[] = [];

  access.forEach((href) => {
    if (VALID_MODERATOR_ACCESS_PATHS.has(href) && !resolved.includes(href)) {
      resolved.push(href);
    }
  });

  return resolved.length > 0
    ? resolved
    : [...MODERATOR_DASHBOARD_ACCESS_PATHS];
}

export function moderatorCanAccessPath(
  pathname: string,
  access?: string[]
): boolean {
  return getResolvedModeratorDashboardAccess(access).some((basePath) =>
    basePath === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === basePath || pathname.startsWith(`${basePath}/`)
  );
}

export function getModeratorFallbackPath(access?: string[]): string {
  return getResolvedModeratorDashboardAccess(access)[0] || "/dashboard";
}
