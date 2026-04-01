"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axios";
import {
  Compass,
  FileText,
  Image,
  LayoutDashboard,
  ClipboardList,
  Settings,
  Star,
  Users,
  UserCog,
  User2,
  ListTodo,
  CreditCard,
  LogOut,
  UserCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  BookAIcon,
  Package,
  ShoppingBag,
  FolderTree,
  ShoppingCart,
  Menu,
  X,
  TrendingUp,
  Wallet,
  GraduationCap,
  Award,
  FileQuestion,
  UserCheck,
  AlertCircle,
  Mail,
  MessageCircle,
  Home,
  TicketPercent,
} from "lucide-react";
import { User } from "@/store/slices/authSlice";
import {
  AdminLocaleProvider,
  useAdminLocale,
} from "@/hooks/dashboard/useAdminLocale";
import { AdminLanguageSwitcher } from "@/components/dashboard/AdminLanguageSwitcher";
import {
  getModeratorFallbackPath,
  getResolvedModeratorDashboardAccess,
  moderatorCanAccessPath,
} from "@/lib/dashboardAccess";

interface MenuItem {
  titleKey: string;
  title: string;
  icon: React.ReactNode;
  href?: string;
  roles: string[];
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    titleKey: "admin.sidebar.dashboard",
    title: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
    href: "/dashboard",
    roles: ["admin", "moderator", "teacher"],
  },
  {
    titleKey: "admin.sidebar.myProfile",
    title: "My Profile",
    icon: <User2 className="h-4 w-4" />,
    href: "/dashboard/my-profile",
    roles: ["moderator", "teacher"],
  },
  {
    titleKey: "admin.sidebar.myTasks",
    title: "My Tasks",
    icon: <ListTodo className="h-4 w-4" />,
    href: "/dashboard/my-tasks",
    roles: ["moderator"],
  },
  {
    titleKey: "admin.sidebar.content",
    title: "Content",
    icon: <BookAIcon className="h-4 w-4" />,
    roles: ["admin", "moderator"],
    children: [
      {
        titleKey: "admin.sidebar.articles",
        title: "Articles",
        icon: <BookAIcon className="h-4 w-4" />,
        href: "/dashboard/articles",
        roles: ["admin", "moderator"],
      },
      {
        titleKey: "admin.sidebar.seo",
        title: "SEO & GEO",
        icon: <TrendingUp className="h-4 w-4" />,
        href: "/dashboard/seo",
        roles: ["admin"],
      },
      {
        titleKey: "admin.sidebar.analytics",
        title: "Analytics",
        icon: <TrendingUp className="h-4 w-4" />,
        href: "/dashboard/analytics",
        roles: ["admin", "moderator"],
      },
    ],
  },
  {
    titleKey: "admin.sidebar.services",
    title: "Services",
    icon: <Package className="h-4 w-4" />,
    href: "/dashboard/services",
    roles: ["admin"],
  },
  {
    titleKey: "admin.sidebar.products",
    title: "Products",
    icon: <ShoppingBag className="h-4 w-4" />,
    roles: ["admin", "moderator", "teacher"],
    children: [
      {
        titleKey: "admin.categories.title",
        title: "Categories",
        icon: <FolderTree className="h-4 w-4" />,
        href: "/dashboard/categories",
        roles: ["admin", "moderator"],
      },
      {
        titleKey: "admin.products.title",
        title: "Products",
        icon: <ShoppingBag className="h-4 w-4" />,
        href: "/dashboard/products",
        roles: ["admin", "moderator"],
      },
      {
        titleKey: "admin.sidebar.books",
        title: "Digital Books",
        icon: <BookAIcon className="h-4 w-4" />,
        href: "/dashboard/books",
        roles: ["admin", "moderator", "teacher"],
      },
      {
        titleKey: "admin.productAnalytics.title",
        title: "Product Analytics",
        icon: <TrendingUp className="h-4 w-4" />,
        href: "/dashboard/products/analytics",
        roles: ["admin"],
      },
      {
        titleKey: "admin.abandonedCarts.title",
        title: "Abandoned Carts",
        icon: <ShoppingCart className="h-4 w-4" />,
        href: "/dashboard/abandoned-carts",
        roles: ["admin", "moderator"],
      },
    ],
  },
  {
    titleKey: "admin.sidebar.forms",
    title: "Forms & Submissions",
    icon: <FileText className="h-4 w-4" />,
    roles: ["admin", "moderator"],
    children: [
      {
        titleKey: "admin.forms.title",
        title: "Forms",
        icon: <FileText className="h-4 w-4" />,
        href: "/dashboard/forms",
        roles: ["admin"],
      },
      {
        titleKey: "admin.sidebar.submissions",
        title: "Submissions",
        icon: <ClipboardList className="h-4 w-4" />,
        href: "/dashboard/submissions",
        roles: ["admin", "moderator"],
      },
    ],
  },
  {
    titleKey: "admin.sidebar.reviews",
    title: "Reviews",
    icon: <Star className="h-4 w-4" />,
    href: "/dashboard/reviews",
    roles: ["admin", "moderator"],
  },
  {
    titleKey: "admin.sidebar.lms",
    title: "Learning System",
    icon: <GraduationCap className="h-4 w-4" />,
    roles: ["admin", "moderator", "teacher"],
    children: [
      {
        titleKey: "admin.sidebar.courses",
        title: "Courses",
        icon: <GraduationCap className="h-4 w-4" />,
        href: "/dashboard/courses",
        roles: ["admin", "moderator", "teacher"],
      },
      {
        titleKey: "admin.sidebar.teachers",
        title: "Teachers",
        icon: <Users className="h-4 w-4" />,
        href: "/dashboard/teachers",
        roles: ["admin", "teacher"],
      },
      {
        titleKey: "admin.sidebar.myStudents",
        title: "My Students",
        icon: <Users className="h-4 w-4" />,
        href: "/dashboard/my-students",
        roles: ["teacher"],
      },
      {
        titleKey: "admin.sidebar.profits",
        title: "Profits",
        icon: <Wallet className="h-4 w-4" />,
        href: "/dashboard/profits",
        roles: ["teacher"],
      },
      {
        titleKey: "admin.sidebar.quizzes",
        title: "Quizzes",
        icon: <FileQuestion className="h-4 w-4" />,
        href: "/dashboard/quizzes",
        roles: ["admin", "moderator", "teacher"],
      },
      {
        titleKey: "admin.sidebar.certificates",
        title: "Certificates",
        icon: <Award className="h-4 w-4" />,
        href: "/dashboard/certificates",
        roles: ["admin", "moderator"],
      },
    ],
  },
  {
    titleKey: "admin.sidebar.subscriptions",
    title: "Subscriptions",
    icon: <UserCheck className="h-4 w-4" />,
    roles: ["admin", "moderator"],
    children: [
      {
        titleKey: "admin.sidebar.studentMembers",
        title: "Student Members",
        icon: <UserCheck className="h-4 w-4" />,
        href: "/dashboard/student-members",
        roles: ["admin", "moderator"],
      },
      {
        titleKey: "admin.sidebar.overdueSubscriptions",
        title: "Overdue Subscriptions",
        icon: <AlertCircle className="h-4 w-4" />,
        href: "/dashboard/overdue-subscriptions",
        roles: ["admin", "moderator"],
      },
      {
        titleKey: "admin.sidebar.packages",
        title: "Packages",
        icon: <Package className="h-4 w-4" />,
        href: "/dashboard/packages",
        roles: ["admin", "moderator"],
      },
      {
        titleKey: "admin.sidebar.subscriptionTeachers",
        title: "Subscription Teachers",
        icon: <Users className="h-4 w-4" />,
        href: "/dashboard/subscription-teachers",
        roles: ["admin", "moderator"],
      },
      {
        titleKey: "admin.sidebar.subscriptionGroups",
        title: "Subscription Groups",
        icon: <Users className="h-4 w-4" />,
        href: "/dashboard/subscription-groups",
        roles: ["admin", "moderator"],
      },
      {
        titleKey: "admin.sidebar.subscriptionStudents",
        title: "Subscription Students",
        icon: <Users className="h-4 w-4" />,
        href: "/dashboard/subscription-students",
        roles: ["admin", "moderator"],
      },
    ],
  },
  {
    titleKey: "admin.sidebar.users",
    title: "Users",
    icon: <Users className="h-4 w-4" />,
    href: "/dashboard/users",
    roles: ["admin"],
  },
  {
    titleKey: "admin.sidebar.employees",
    title: "Employees",
    icon: <UserCog className="h-4 w-4" />,
    href: "/dashboard/employees",
    roles: ["admin"],
  },
  {
    titleKey: "admin.sidebar.payments",
    title: "Payments",
    icon: <CreditCard className="h-4 w-4" />,
    href: "/dashboard/payments",
    roles: ["admin"],
  },
  {
    titleKey: "admin.sidebar.paymentMethods",
    title: "Payment Methods",
    icon: <Wallet className="h-4 w-4" />,
    href: "/dashboard/payment-methods",
    roles: ["admin"],
  },
  {
    titleKey: "admin.sidebar.coupons",
    title: "Coupons",
    icon: <TicketPercent className="h-4 w-4" />,
    href: "/dashboard/coupons",
    roles: ["admin", "moderator"],
  },
  {
    titleKey: "admin.sidebar.finance",
    title: "Finance",
    icon: <Wallet className="h-4 w-4" />,
    href: "/dashboard/finance",
    roles: ["admin"],
  },
  {
    titleKey: "admin.sidebar.staticPages",
    title: "Static Pages",
    icon: <FileText className="h-4 w-4" />,
    href: "/dashboard/static-pages",
    roles: ["admin"],
  },
  {
    titleKey: "admin.emailTemplates.title",
    title: "Email Templates",
    icon: <Mail className="h-4 w-4" />,
    href: "/dashboard/email-templates",
    roles: ["admin"],
  },
  {
    titleKey: "admin.whatsappTemplates.title",
    title: "WhatsApp Templates",
    icon: <MessageCircle className="h-4 w-4" />,
    href: "/dashboard/whatsapp-templates",
    roles: ["admin"],
  },
  {
    titleKey: "admin.sidebar.communicationLogs",
    title: "Communication Logs",
    icon: <Mail className="h-4 w-4" />,
    href: "/dashboard/communication-logs",
    roles: ["admin", "moderator"],
  },
  {
    titleKey: "admin.sidebar.settings",
    title: "Settings",
    icon: <Settings className="h-4 w-4" />,
    href: "/dashboard/settings",
    roles: ["admin"],
  },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>(
    {}
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t, isRtl } = useAdminLocale();

  useEffect(() => {
    // Check authentication on the client side
    const checkAuth = async () => {
      try {
        const userString = localStorage.getItem("user");
        if (!userString) {
          router.push("/login?redirect=/dashboard");
          return;
        }

        const userData: User = JSON.parse(userString);

        // Block normal users from accessing dashboard
        if (userData.role === "user") {
          router.push("/account");
          return;
        }

        // Check if teacher is approved
        if (userData.role === "teacher" && !userData.teacherInfo?.isApproved) {
          router.push("/account?message=pending_approval");
          return;
        }

        if (userData.role === "moderator" && userData.token) {
          try {
            const response = await axiosInstance.get("/auth/me", {
              headers: { "X-No-Loading": "true" },
            });
            const profile = response.data?.data;

            if (profile) {
              const refreshedUser = {
                ...userData,
                ...profile,
                token: userData.token,
                refreshToken: (userData as any).refreshToken,
                expiresIn: (userData as any).expiresIn,
              };

              localStorage.setItem("user", JSON.stringify(refreshedUser));
              setUser(refreshedUser);
              return;
            }
          } catch (refreshError) {
            console.error("Failed to refresh moderator profile:", refreshError);
          }
        }

        setUser(userData);
      } catch (error) {
        console.error("Auth check error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Close sidebar when navigating on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!user || user.role !== "moderator") return;

    if (!moderatorCanAccessPath(pathname, user.employeeInfo?.dashboardAccess)) {
      router.replace(
        getModeratorFallbackPath(user.employeeInfo?.dashboardAccess)
      );
    }
  }, [pathname, router, user]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const moderatorDashboardAccess =
    user.role === "moderator"
      ? getResolvedModeratorDashboardAccess(user.employeeInfo?.dashboardAccess)
      : [];

  const canAccessMenuHref = (href?: string) =>
    !href ||
    user.role !== "moderator" ||
    moderatorDashboardAccess.includes(href);

  const filteredMenuItems = menuItems
    .filter((item) => item.roles.includes(user.role || ""))
    .map((item) => {
      if (!item.children) {
        return item;
      }

      return {
        ...item,
        children: item.children.filter(
          (child) =>
            child.roles.includes(user.role || "") && canAccessMenuHref(child.href)
        ),
      };
    })
    .filter((item) => {
      if (item.children) {
        return item.children.length > 0;
      }

      return canAccessMenuHref(item.href);
    });

  const getMenuTitle = (item: MenuItem) => {
    const translated = t(item.titleKey);
    return translated !== item.titleKey ? translated : item.title;
  };

  return (
    <div className={`flex min-h-screen ${isRtl ? "flex-row-reverse" : ""}`}>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-header-bg z-50 flex items-center justify-between px-4 border-b border-white/20">
        <Link href="/dashboard" className="text-white font-semibold">
          Genoun
        </Link>
        <div className="flex items-center gap-2">
          <AdminLanguageSwitcher showLabel={false} />
          <Button
            variant="ghost"
            size="icon"
            className="text-white"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        dir={isRtl ? "rtl" : "ltr"}
        className={`fixed h-screen w-64 ${isRtl ? "border-l" : "border-r"
          } bg-header-bg overflow-y-auto overflow-x-hidden z-[60] transition-transform duration-300 ${isRtl ? "right-0" : "left-0"
          } ${sidebarOpen
            ? "translate-x-0"
            : isRtl
              ? "translate-x-full lg:translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }`}
      >
        <div className="hidden lg:flex h-14 items-center border-b border-white/20 px-4 justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold text-white"
          >
            <span>Genoun</span>
          </Link>
          <AdminLanguageSwitcher showLabel={false} />
        </div>
        {/* Mobile sidebar header spacer */}
        <div className="lg:hidden h-14" />
        <div className="flex flex-col gap-1 p-4 justify-between h-[calc(100vh-3.5rem)]">
          <div className="flex flex-col gap-1">
            {filteredMenuItems.map((item, itemIndex) => {
              const hasChildren = item.children && item.children.length > 0;
              const isDropdownOpen = openDropdowns[item.title] || false;
              const isActive =
                item.href &&
                (pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href)));

              if (hasChildren) {
                const filteredChildren = item.children!.filter((child) =>
                  child.roles.includes(user?.role || "")
                );

                if (filteredChildren.length === 0) return null;

                const isChildActive = filteredChildren.some(
                  (child) =>
                    pathname === child.href ||
                    (child.href !== "/dashboard" &&
                      pathname.startsWith(child.href!))
                );
                const outerKey =
                  item.title ??
                  item.href ??
                  `${item.title ?? "item"}-${itemIndex}`;

                return (
                  <div key={outerKey}>
                    <Button
                      variant={isChildActive ? "default" : "ghost"}
                      className={`w-full justify-between hover:bg-white/10 hover:text-genoun-gold gap-2 ${isChildActive
                        ? "bg-genoun-gold text-genoun-black hover:bg-genoun-gold hover:text-genoun-black"
                        : "text-white"
                        }`}
                      onClick={() =>
                        setOpenDropdowns((prev) => ({
                          ...prev,
                          [item.title]: !prev[item.title],
                        }))
                      }
                    >
                      <div className="flex items-center gap-2">
                        {item.icon}
                        {getMenuTitle(item)}
                      </div>
                      {isDropdownOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : isRtl ? (
                        <ChevronRight className="h-4 w-4 rotate-180" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    {isDropdownOpen && (
                      <div
                        className={`${isRtl ? "mr-4" : "ml-4"
                          } mt-1 flex flex-col gap-1`}
                      >
                        {filteredChildren.map((child) => {
                          const isExactMatch = pathname === child.href;
                          const isPathPrefix =
                            child.href !== "/dashboard" &&
                            pathname.startsWith(child.href + "/");

                          const hasSiblingMatch = filteredChildren.some(
                            (sibling) =>
                              sibling !== child &&
                              sibling.href &&
                              (pathname === sibling.href ||
                                pathname.startsWith(sibling.href + "/"))
                          );

                          const isChildItemActive =
                            isExactMatch || (isPathPrefix && !hasSiblingMatch);

                          return (
                            <Link key={child.href} href={child.href!}>
                              <Button
                                variant={
                                  isChildItemActive ? "default" : "ghost"
                                }
                                size="sm"
                                className={`w-full justify-start hover:bg-white/10 hover:text-genoun-gold gap-2 ${isChildItemActive
                                  ? "bg-genoun-gold text-genoun-black hover:bg-genoun-gold hover:text-genoun-black"
                                  : "text-white/80"
                                  } `}
                              >
                                {child.icon}
                                {getMenuTitle(child)}
                              </Button>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              const linkKey =
                item.title ??
                item.href ??
                `${item.title ?? "item"}-${itemIndex}`;

              return (
                <Link key={linkKey} href={item.href! || "#"}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start hover:bg-white/10 hover:text-genoun-gold gap-2 ${isActive
                      ? "bg-genoun-gold text-genoun-black hover:bg-genoun-gold hover:text-genoun-black"
                      : "text-white"
                      }`}
                  >
                    {item.icon}
                    {getMenuTitle(item)}
                  </Button>
                </Link>
              );
            })}
          </div>

          <div className="pt-4 border-t border-white/20">
            <div className="flex items-center gap-2 px-4 py-2 text-sm text-white">
              <UserCircle className="h-4 w-4" />
              <span>
                {(() => {
                  const name = user.name;
                  if (typeof name === 'object' && name !== null) {
                    return (name as any).en || (name as any).ar || "User";
                  }

                  const email = user.email;
                  if (typeof email === 'object' && email !== null) {
                    return (email as any).en || (email as any).ar || "User";
                  }

                  return name || email;
                })()}
              </span>
              <span className="ml-auto rounded bg-white/20 px-1.5 py-0.5 text-xs capitalize text-white">
                {(() => {
                  const role = user.role;
                  if (typeof role === 'object' && role !== null) {
                    return (role as any).en || (role as any).ar || "user";
                  }
                  return role;
                })()}
              </span>
            </div>

            <Button
              variant="ghost"
              asChild
              className="mt-2 w-full justify-start gap-2 hover:bg-white/10 hover:text-white"
            >
              <Link href="/">
                <Home className="h-4 w-4" />
                Go to Home
              </Link>
            </Button>

            <Button
              variant="ghost"
              className="mt-1 w-full justify-start gap-2 text-red-300 hover:bg-red-500/20 hover:text-red-200"
              onClick={() => {
                localStorage.removeItem("user");
                router.push("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
              {t("admin.sidebar.logout")}
            </Button>
          </div>
        </div>
      </aside >
      <main
        className={`${isRtl ? "lg:mr-64" : "lg:ml-64"
          } min-w-0 flex-1 bg-gray-50 pt-14 lg:pt-0`}
        dir={isRtl ? "rtl" : "ltr"}
      >
        {children}
      </main>
    </div >
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AdminLocaleProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </AdminLocaleProvider>
  );
}
