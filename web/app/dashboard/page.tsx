"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard,
  Banknote,
  Download,
  Plus,
  Star,
  TrendingUp,
  ClipboardList,
  Package,
  ShoppingCart,
  Users,
  Eye,
  Activity,
  Clock,
  FileText,
  Globe,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  GraduationCap,
  FileQuestion,
  User2,
  DollarSign,
  BookOpen,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getReviews } from "@/store/services/reviewService";
import { getForms, BilingualText } from "@/store/services/formService";
import { getRevenueStatisticsThunk } from "@/store/services/paymentService";
import {
  isAuthenticated,
  isAdmin,
  isModerator,
  isTeacher,
} from "@/store/services/authService";
import { useAdminLocale } from "@/hooks/dashboard/useAdminLocale";
import {
  getDashboardStats,
  getTeacherStats,
  DashboardStats,
  TeacherStats,
} from "@/store/services/dashboardService";
import { useCurrency } from "@/hooks/dashboard/useCurrency";
import { getMyProfitStatsThunk } from "@/store/services/teacherProfitService";

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { t, isRtl } = useAdminLocale();
  const { formatMoney, toBaseCurrency, baseCurrency } = useCurrency();

  const getTextValue = (value: string | BilingualText | undefined): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return (isRtl ? value.ar : value.en) || value.en || value.ar || "";
  };

  const { user } = useAppSelector((state) => state.auth);
  const { reviews, isLoading: reviewsLoading } = useAppSelector(
    (state) => state.reviews
  );
  const { forms, isLoading: formsLoading } = useAppSelector(
    (state) => state.forms
  );
  const { revenueStatistics, isLoading: paymentsLoading } = useAppSelector(
    (state) => state.payments
  );
  const { myStats: profitStats, isLoading: profitLoading } = useAppSelector(
    (state) => state.teacherProfit
  );

  const loading = reviewsLoading || formsLoading || paymentsLoading;

  useEffect(() => {
    if (!isAuthenticated() || !user) {
      router.push("/login");
      return;
    }

    if (!isAdmin() && !isModerator() && !isTeacher()) {
      router.push("/");
      return;
    }
  }, [user, router]);

  // Comprehensive dashboard stats
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [teacherStats, setTeacherStats] = useState<TeacherStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated() && user) {
      if (isAdmin() || isModerator()) {
        dispatch(getReviews());
        dispatch(getForms());
        if (isAdmin()) {
          dispatch(getRevenueStatisticsThunk());
        }

        getDashboardStats()
          .then((data) => setStats(data))
          .catch((err) => console.error("Failed to load stats:", err))
          .finally(() => setStatsLoading(false));
      } else if (isTeacher()) {
        getTeacherStats()
          .then((data) => setTeacherStats(data))
          .catch((err) => console.error("Failed to load teacher stats:", err))
          .finally(() => setStatsLoading(false));
        
        // Load profit statistics
        dispatch(getMyProfitStatsThunk({}));
      }
    }
  }, [dispatch, user]);

  const totalRevenue = revenueStatistics?.totalRevenue || 0;
  const pendingReviews =
    !loading && reviews
      ? reviews.filter((review) => review.status === "pending").length
      : 0;

  const formSubmissions =
    !loading && forms
      ? forms.reduce((acc, form) => acc + (form.submissions?.length || 0), 0)
      : 0;

  const publishedForms =
    !loading && forms
      ? forms.filter((form) => (form as any).status === "published").length
      : 0;

  if (loading || (statsLoading && (isAdmin() || isModerator() || isTeacher()))) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-genoun-green border-t-transparent"></div>
      </div>
    );
  }

  if (isTeacher() && teacherStats) {
    return <TeacherDashboard stats={teacherStats} />;
  }

  return (
    <div
      className={`flex-1 space-y-4 p-4 md:p-8 pt-4 md:pt-6 ${isRtl ? "text-right" : ""}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className={`flex items-center justify-between space-y-2 `}>
        <h2 className="text-3xl font-bold tracking-tight">
          {t("admin.dashboard.title")}
        </h2>
      </div>
      <Tabs
        defaultValue="overview"
        className="space-y-4"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <TabsList>
          <TabsTrigger value="overview">
            {t("admin.dashboard.tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="forms">
            {t("admin.dashboard.tabs.forms")}
          </TabsTrigger>
          <TabsTrigger value="reviews">
            {t("admin.dashboard.tabs.reviews")}
          </TabsTrigger>
          {isAdmin() && (
            <TabsTrigger value="payments">
              {t("admin.dashboard.tabs.payments")}
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          {/* Primary Stats Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isAdmin() && (
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("admin.dashboard.stats.totalRevenue")}
                  </CardTitle>
                  <Banknote className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700">
                    {formatMoney(
                      toBaseCurrency(
                        stats?.revenue?.total || totalRevenue,
                        stats?.revenue?.currency || "EGP"
                      )
                    )}
                  </div>
                  <p className="text-xs text-green-600">
                    {isRtl ? "اليوم" : "Today"}:{" "}
                    {formatMoney(
                      toBaseCurrency(
                        stats?.revenue?.today || 0,
                        stats?.revenue?.currency || "EGP"
                      )
                    )}{" "}
                    | {isRtl ? "الأسبوع" : "Week"}:{" "}
                    {formatMoney(
                      toBaseCurrency(
                        stats?.revenue?.week || 0,
                        stats?.revenue?.currency || "EGP"
                      )
                    )}
                  </p>
                </CardContent>
              </Card>
            )}

            {isAdmin() && (
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("admin.dashboard.stats.pendingOrders")}
                  </CardTitle>
                  <Package className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700">
                    {stats?.orders?.pending || 0}
                  </div>
                  <p className="text-xs text-blue-600">
                    {t("admin.dashboard.stats.processing")}:{" "}
                    {stats?.orders?.processing || 0} |{" "}
                    {t("admin.dashboard.stats.delivered")}:{" "}
                    {stats?.orders?.delivered || 0}
                  </p>
                </CardContent>
              </Card>
            )}

            {isAdmin() && (
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("admin.dashboard.stats.abandonedCarts")}
                  </CardTitle>
                  <ShoppingCart className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-700">
                    {stats?.carts?.abandoned || 0}
                  </div>
                  <p className="text-xs text-orange-600">
                    {t("admin.dashboard.stats.lostRevenue")}:{" "}
                    {formatMoney(
                      toBaseCurrency(stats?.carts?.potentialRevenue || 0, "EGP")
                    )}
                    | {t("admin.dashboard.stats.conversionRate")}:{" "}
                    {stats?.carts?.conversionRate || 0}%
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("admin.dashboard.stats.pendingReviews")}
                </CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.reviews?.pending ?? pendingReviews}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isRtl ? "متوسط التقييم" : "Avg Rating"}:{" "}
                  {stats?.reviews?.avgRating || "-"} ⭐
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats Row */}
          {isAdmin() && stats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("admin.dashboard.stats.users")}
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.users?.total || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.dashboard.stats.newThisWeek").replace(
                      "{count}",
                      String(stats.users?.newThisWeek || 0)
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("admin.dashboard.stats.articles")}
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.content?.articles?.published || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <Eye className="h-3 w-3 inline mr-1" />
                    {t("admin.dashboard.stats.views").replace(
                      "{count}",
                      (
                        stats.content?.articles?.totalViews?.toLocaleString() ||
                        "0"
                      ).toString()
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("admin.dashboard.stats.products")}
                  </CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.content?.products || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.dashboard.stats.services").replace(
                      "{count}",
                      String(stats.content?.services || 0)
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("admin.dashboard.stats.seoSuggestions")}
                  </CardTitle>
                  <Sparkles className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.seo?.suggestionsPending || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.dashboard.stats.aiScheduled").replace(
                      "{count}",
                      String(stats.aiArticles?.scheduled || 0)
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* LMS Statistics Row */}
          {isAdmin() && stats?.lms && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {isRtl ? "الدورات" : "Courses"}
                  </CardTitle>
                  <FileText className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-700">
                    {stats.lms.courses?.total || 0}
                  </div>
                  <p className="text-xs text-purple-600">
                    {isRtl ? "منشورة" : "Published"}:{" "}
                    {stats.lms.courses?.published || 0} |{" "}
                    {isRtl ? "مسودة" : "Draft"}:{" "}
                    {stats.lms.courses?.draft || 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {isRtl ? "المسجلين" : "Enrollments"}
                  </CardTitle>
                  <Users className="h-4 w-4 text-teal-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-teal-700">
                    {stats.lms.enrollments?.total || 0}
                  </div>
                  <p className="text-xs text-teal-600">
                    {isRtl ? "مكملين" : "Completed"}:{" "}
                    {stats.lms.enrollments?.completed || 0} |{" "}
                    {isRtl ? "نسبة الإتمام" : "Rate"}:{" "}
                    {stats.lms.enrollments?.completionRate || 0}%
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {isRtl ? "الشهادات" : "Certificates"}
                  </CardTitle>
                  <Star className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-700">
                    {stats.lms.certificates || 0}
                  </div>
                  <p className="text-xs text-amber-600">
                    {isRtl ? "الشهادات المصدرة" : "Issued Certificates"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {isRtl ? "طلاب الباقات" : "Package Students"}
                  </CardTitle>
                  <Users className="h-4 w-4 text-rose-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-rose-700">
                    {stats.lms.studentMembers?.active || 0}
                  </div>
                  <p className="text-xs text-rose-600">
                    {isRtl ? "الأعضاء النشطين" : "Active Members"}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Teacher Statistics Row */}
          {isAdmin() && stats?.lms?.teachers && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {isRtl ? "المدرسين" : "Teachers"}
                  </CardTitle>
                  <Users className="h-4 w-4 text-indigo-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-indigo-700">
                    {stats.lms.teachers.total || 0}
                  </div>
                  <p className="text-xs text-indigo-600">
                    {isRtl ? "مدرسين معتمدين" : "Approved Teachers"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {isRtl ? "المجموعات" : "Groups"}
                  </CardTitle>
                  <ClipboardList className="h-4 w-4 text-cyan-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-cyan-700">
                    {stats.lms.teachers.groups || 0}
                  </div>
                  <p className="text-xs text-cyan-600">
                    {isRtl ? "إجمالي المجموعات" : "Total Groups"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {isRtl ? "طلاب المجموعات" : "Group Students"}
                  </CardTitle>
                  <Users className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-700">
                    {stats.lms.teachers.activeStudents || 0}
                  </div>
                  <p className="text-xs text-emerald-600">
                    {isRtl ? "طلاب نشطين" : "Active Students"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-lime-50 to-lime-100 border-lime-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {isRtl ? "إيرادات المدرسين" : "Teacher Revenue"}
                  </CardTitle>
                  <Banknote className="h-4 w-4 text-lime-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-lime-700">
                    {formatMoney(stats.lms.teachers.expectedRevenue || 0, "EGP")}
                  </div>
                  <p className="text-xs text-lime-600">
                    {isRtl ? "إيرادات متوقعة" : "Expected Revenue"}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Traffic Overview */}
          {stats?.analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="col-span-full md:col-span-2 lg:col-span-1 border-blue-200 bg-blue-50/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("admin.dashboard.stats.realtimeUsers")}
                  </CardTitle>
                  <div className="relative">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700">
                    {stats.analytics.realtimeUsers || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("admin.dashboard.stats.totalUsers")}
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.analytics.users.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("admin.dashboard.stats.pageViews")}
                  </CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.analytics.pageViews.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("admin.dashboard.stats.avgSessionDuration")}
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(stats.analytics.avgSessionDuration)}s
                  </div>
                </CardContent>
              </Card>

              {/* Top Countries & Pages */}
              <Card className="col-span-full md:col-span-2 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {t("admin.dashboard.stats.topCountries")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.analytics.topCountries?.map((country, index) => (
                      <div key={index} className="flex items-center">
                        <div className="w-full flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {country.country}
                          </p>
                          <div className="h-2 w-full rounded-full bg-secondary">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{
                                width: `${(country.users /
                                    (stats.analytics?.users || 1)) *
                                  100
                                  }%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="font-medium text-sm ml-4 min-w-[3rem] text-right">
                          {country.users}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-full md:col-span-2 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t("admin.dashboard.stats.topPages")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.analytics.topPages?.map((page, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div className="space-y-1 overflow-hidden">
                          <p
                            className="text-sm font-medium leading-none truncate max-w-[200px]"
                            title={page.title}
                          >
                            {page.title || page.path}
                          </p>
                          <p
                            className="text-xs text-muted-foreground truncate max-w-[200px]"
                            title={page.path}
                          >
                            {page.path}
                          </p>
                        </div>
                        <div className="font-medium text-sm">
                          {page.views}{" "}
                          <span className="text-xs text-muted-foreground">
                            {t("admin.dashboard.stats.viewsTitle")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Actions */}
          {isAdmin() && (
            <div className="grid gap-4 md:grid-cols-4">
              <Link href="/dashboard/seo">
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <span className="font-medium">
                        {t("admin.dashboard.quickActions.seoDashboard")}
                      </span>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
              <Link href="/dashboard/abandoned-carts">
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-orange-500" />
                      <span className="font-medium">
                        {t("admin.dashboard.quickActions.abandonedCarts")}
                      </span>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
              <Link href="/dashboard/reviews">
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">
                        {t("admin.dashboard.quickActions.manageReviews")}
                      </span>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
              <Link href="/dashboard/payments">
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-green-500" />
                      <span className="font-medium">
                        {t("admin.dashboard.quickActions.viewPayments")}
                      </span>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {isAdmin() && (
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>
                    {t("admin.dashboard.sections.revenueOverview")}
                  </CardTitle>
                </CardHeader>
                <CardContent className={isRtl ? "pr-2" : "pl-2"}>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={stats?.revenue?.history || []}
                        margin={{
                          top: 10,
                          right: 10,
                          left: 0,
                          bottom: 0,
                        }}
                      >
                        <defs>
                          <linearGradient
                            id="colorRevenue"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#10b981"
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor="#10b981"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="_id"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getDate()}/${date.getMonth() + 1}`;
                          }}
                        />
                        <YAxis
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col">
                                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                                        Date
                                      </span>
                                      <span className="font-bold text-muted-foreground">
                                        {payload[0].payload._id}
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                                        Revenue
                                      </span>
                                      <span className="font-bold text-green-600">
                                        {formatMoney(
                                          payload[0].value as number
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="total"
                          stroke="#10b981"
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className={isAdmin() ? "col-span-3" : "col-span-7"}>
              <CardHeader>
                <CardTitle>
                  {t("admin.dashboard.sections.recentSubmissions")}
                </CardTitle>
                <CardDescription>
                  {formSubmissions > 0
                    ? t("admin.dashboard.sections.submissionsCount").replace(
                      "{count}",
                      String(formSubmissions)
                    )
                    : t("admin.dashboard.sections.noSubmissions")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!loading && forms.length > 0 ? (
                    forms
                      .filter(
                        (form) =>
                          form.submissions && form.submissions.length > 0
                      )
                      .slice(0, 3)
                      .map((form) => {
                        const latestSubmission = form.submissions
                          ? form.submissions[form.submissions.length - 1]
                          : null;
                        if (!latestSubmission) return null;

                        return (
                          <div
                            key={form._id}
                            className={`flex items-center ${isRtl ? "flex-row-reverse" : ""
                              }`}
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-genoun-green/10">
                              <ClipboardList className="h-4 w-4 text-genoun-green" />
                            </div>
                            <div
                              className={`space-y-1 ${isRtl ? "mr-4" : "ml-4"}`}
                            >
                              <p className="text-sm font-medium leading-none">
                                {getTextValue(form.title)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {latestSubmission && latestSubmission.summary
                                  ? `${Object.keys(
                                    latestSubmission.data.summary
                                  )[0]
                                  }: ${String(
                                    Object.values(
                                      latestSubmission.data.summary
                                    )[0]
                                  ).substring(0, 30)}...`
                                  : t(
                                    "admin.dashboard.messages.submissionReceived"
                                  )}
                              </p>
                            </div>
                            <div
                              className={`text-xs text-muted-foreground ${isRtl ? "mr-auto" : "ml-auto"
                                }`}
                            >
                              {latestSubmission.submittedAt
                                ? new Date(
                                  latestSubmission.submittedAt
                                ).toLocaleDateString()
                                : t("admin.dashboard.messages.recent")}
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="flex justify-center py-4">
                      <Link href="/dashboard/forms">
                        <Button variant="outline" size="sm">
                          <Plus
                            className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`}
                          />
                          {t("admin.dashboard.actions.createAForm")}
                        </Button>
                      </Link>
                    </div>
                  )}

                  {formSubmissions > 0 && (
                    <div className="pt-2">
                      <Link href="/dashboard/submissions">
                        <Button variant="outline" size="sm" className="w-full">
                          {t("admin.dashboard.actions.viewAllSubmissions")}
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="forms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.dashboard.sections.formBuilder")}</CardTitle>
              <CardDescription>
                {t("admin.dashboard.sections.formBuilderDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`flex items-center justify-between }`}>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Download
                        className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`}
                      />
                      {t("admin.dashboard.actions.export")}
                    </Button>
                  </div>
                  <Link href="/dashboard/forms/create">
                    <Button
                      size="sm"
                      className="bg-genoun-green hover:bg-genoun-green/90 text-white"
                    >
                      <Plus className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
                      {t("admin.dashboard.actions.createForm")}
                    </Button>
                  </Link>
                </div>
                <div className="rounded-md border">
                  <div
                    className={`grid grid-cols-5 gap-4 p-4 font-medium ${isRtl ? "text-right" : ""
                      }`}
                  >
                    <div>{t("admin.dashboard.table.formName")}</div>
                    <div>{t("admin.dashboard.table.fields")}</div>
                    <div>{t("admin.dashboard.table.status")}</div>
                    <div className={isRtl ? "text-left" : "text-right"}>
                      {t("admin.dashboard.table.actions")}
                    </div>
                  </div>
                  <div className="divide-y">
                    {!loading && Array.isArray(forms) && forms.length > 0 ? (
                      forms.map((form) => (
                        <div
                          key={form.id || form._id}
                          className={`grid grid-cols-5 gap-4 p-4 ${isRtl ? "text-right" : ""
                            }`}
                        >
                          <div className="font-medium">
                            {getTextValue(form.title)}
                          </div>
                          <div>
                            {form.fields?.length || 0}{" "}
                            {t("admin.dashboard.table.fields").toLowerCase()}
                          </div>
                          <div>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${form.status === "published"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                                }`}
                            >
                              {form.status || "draft"}
                            </span>
                          </div>
                          <div
                            className={`flex gap-2 ${isRtl ? "justify-start" : "justify-end"
                              }`}
                          >
                            <Link
                              href={`/dashboard/forms/${form.id || form._id
                                }/edit`}
                            >
                              <Button variant="outline" size="sm">
                                {t("admin.dashboard.actions.edit")}
                              </Button>
                            </Link>
                            <Link
                              href={`/dashboard/forms/${form.id || form._id
                                }/responses`}
                            >
                              <Button variant="outline" size="sm">
                                {t("admin.dashboard.actions.responses")}
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {loading
                          ? t("admin.dashboard.messages.loadingForms")
                          : t("admin.dashboard.messages.noFormsFound")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("admin.dashboard.sections.reviewManagement")}
              </CardTitle>
              <CardDescription>
                {t("admin.dashboard.sections.reviewManagementDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md border">
                  <div
                    className={`grid grid-cols-5 gap-4 p-4 font-medium ${isRtl ? "text-right" : ""
                      }`}
                  >
                    <div>{t("admin.dashboard.table.name")}</div>
                    <div>{t("admin.dashboard.table.rating")}</div>
                    <div>{t("admin.dashboard.table.comment")}</div>
                    <div>{t("admin.dashboard.table.status")}</div>
                    <div className={isRtl ? "text-left" : "text-right"}>
                      {t("admin.dashboard.table.actions")}
                    </div>
                  </div>
                  <div className="divide-y">
                    {!loading &&
                      Array.isArray(reviews) &&
                      reviews.length > 0 ? (
                      reviews.map((review) => (
                        <div
                          key={review._id || review.id}
                          className={`grid grid-cols-5 gap-4 p-4 ${isRtl ? "text-right" : ""
                            }`}
                        >
                          <div className="font-medium">{review.name}</div>
                          <div
                            className={`flex text-yellow-400 ${isRtl ? "flex-row-reverse justify-end" : ""
                              }`}
                          >
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < review.rating ? "fill-current" : ""
                                  }`}
                              />
                            ))}
                          </div>
                          <div className="truncate">
                            {review.comment.substring(0, 50)}...
                          </div>
                          <div>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${review.status === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : review.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                            >
                              {review.status}
                            </span>
                          </div>
                          <div
                            className={`flex gap-2 ${isRtl ? "justify-start" : "justify-end"
                              }`}
                          >
                            {review.status === "pending" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600"
                                >
                                  {t("admin.dashboard.actions.approve")}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600"
                                >
                                  {t("admin.dashboard.actions.reject")}
                                </Button>
                              </>
                            )}
                            <Button variant="outline" size="sm">
                              {t("admin.dashboard.actions.view")}
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {loading
                          ? t("admin.dashboard.messages.loadingReviews")
                          : t("admin.dashboard.messages.noReviewsFound")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("admin.dashboard.sections.paymentManagement")}
              </CardTitle>
              <CardDescription>
                {t("admin.dashboard.sections.paymentManagementDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`flex items-center justify-between`}>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      {t("admin.dashboard.sections.paymentDescription")}
                    </p>
                  </div>
                  <Link href="/dashboard/payments">
                    <Button className="bg-genoun-green hover:bg-genoun-green/90 text-white">
                      <CreditCard
                        className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`}
                      />
                      {t("admin.dashboard.actions.managePayments")}
                    </Button>
                  </Link>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border p-4 bg-white/50">
                    <div className={`flex items-center space-x-2 mb-2`}>
                      <h3 className="font-semibold">
                        {t("admin.dashboard.sections.onlinePayments")}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      {t("admin.dashboard.sections.onlinePaymentsDesc")}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4 bg-white/50">
                    <div className={`flex items-center space-x-2 mb-2 `}>
                      <h3 className="font-semibold">
                        {t("admin.dashboard.sections.manualPayments")}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      {t("admin.dashboard.sections.manualPaymentsDesc")}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4 bg-white/50">
                    <div className={`flex items-center space-x-2 mb-2 `}>
                      <h3 className="font-semibold">
                        {t("admin.dashboard.sections.paymentHistory")}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      {t("admin.dashboard.sections.paymentHistoryDesc")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TeacherDashboard({ stats }: { stats: TeacherStats }) {
  const dispatch = useAppDispatch();
  const { t, isRtl } = useAdminLocale();
  const { formatMoney } = useCurrency();
  const { myStats: profitStats, error: profitError } = useAppSelector((state) => state.teacherProfit);

  const getTextValue = (value: string | BilingualText | undefined): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return (isRtl ? value.ar : value.en) || value.en || value.ar || "";
  };

  const courseTransactions = (profitStats?.recentTransactions || []).filter(
    (transaction) => transaction.revenueType === "course_sale"
  );

  return (
    <div
      className={`flex-1 space-y-4 p-4 md:p-8 pt-4 md:pt-6 ${isRtl ? "text-right" : ""}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          {isRtl ? "لوحة تحكم المعلم" : "Teacher Dashboard"}
        </h2>
        <div className="flex items-center space-x-2">
          <Link href="/dashboard/courses/create">
            <Button className="bg-genoun-green hover:bg-genoun-green/90 text-white">
              <Plus className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              {isRtl ? "إضافة دورة" : "Create Course"}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isRtl ? "الدورات" : "My Courses"}
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">
              {stats.courses.total}
            </div>
            <p className="text-xs text-indigo-600">
              {isRtl ? "منشورة" : "Published"}: {stats.courses.published} |{" "}
              {isRtl ? "في انتظار الموافقة" : "Pending"}: {stats.courses.pending} |{" "}
              {isRtl ? "مسودة" : "Draft"}: {stats.courses.draft}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isRtl ? "المسجلين" : "Enrollments"}
            </CardTitle>
            <Users className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-700">
              {stats.enrollments.total}
            </div>
            <p className="text-xs text-teal-600">
              {isRtl ? "مكملين" : "Completed"}: {stats.enrollments.completed} |{" "}
              {isRtl ? "نسبة الإتمام" : "Rate"}: {stats.enrollments.completionRate}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isRtl ? "المجموعات والطلاب" : "Groups & Students"}
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-700">
              {stats.groups.activeStudents}
            </div>
            <p className="text-xs text-cyan-600">
              {isRtl ? "في" : "In"} {stats.groups.total} {isRtl ? "مجموعات" : "Groups"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-lime-50 to-lime-100 border-lime-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isRtl ? "الإيرادات المتوقعة" : "Expected Revenue"}
            </CardTitle>
            <Banknote className="h-4 w-4 text-lime-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-lime-700">
              {formatMoney(stats.revenue.expected, stats.revenue.currency)}
            </div>
            <p className="text-xs text-lime-600">
              {isRtl ? "بناءً على الطلاب النشطين" : "Based on active students"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Profit Statistics Section */}
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">
          {isRtl ? "إحصائيات الأرباح" : "Profit Statistics"}
        </h3>
      </div>

      {profitStats ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {/* Total Profit Card */}
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {isRtl ? "إجمالي الأرباح" : "Total Profit"}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">
                  {formatMoney(profitStats.totalProfit || 0, profitStats.currency)}
                </div>
                <p className="text-xs text-emerald-600 mt-1">
                  {profitStats.totalTransactions || 0} {isRtl ? "معاملة" : "transactions"}
                </p>
              </CardContent>
            </Card>

            {/* Course Sales Profit */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {isRtl ? "أرباح مبيعات الدورات" : "Course Sales Profit"}
                </CardTitle>
                <BookOpen className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">
                  {formatMoney(profitStats.courseSales?.totalProfit || 0, profitStats.currency)}
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {profitStats.courseSales?.avgPercentage?.toFixed(1) || 0}% {isRtl ? "متوسط النسبة" : "avg rate"}
                </p>
              </CardContent>
            </Card>

          </div>

          {/* Recent Profit Transactions Table */}
          {courseTransactions.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>{isRtl ? "المعاملات الأخيرة" : "Recent Transactions"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className={`p-2 ${isRtl ? "text-right" : "text-left"}`}>{isRtl ? "التاريخ" : "Date"}</th>
                        <th className={`p-2 ${isRtl ? "text-right" : "text-left"}`}>{isRtl ? "النوع" : "Type"}</th>
                        <th className="p-2 text-right">{isRtl ? "المبلغ الكلي" : "Total Amount"}</th>
                        <th className="p-2 text-right">{isRtl ? "النسبة" : "Rate"}</th>
                        <th className="p-2 text-right">{isRtl ? "الربح" : "Profit"}</th>
                        <th className="p-2 text-center">{isRtl ? "الحالة" : "Status"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            {new Date(transaction.transactionDate).toLocaleDateString(isRtl ? "ar-SA" : "en-US")}
                          </td>
                          <td className="p-2">
                            {isRtl ? "مبيعات الدورات" : "Course Sale"}
                          </td>
                          <td className="p-2 text-right">{formatMoney(transaction.totalAmount, transaction.currency)}</td>
                          <td className="p-2 text-right">{transaction.profitPercentage}%</td>
                          <td className="p-2 text-right font-semibold text-genoun-green">
                            {formatMoney(transaction.profitAmount, transaction.currency)}
                          </td>
                          <td className="p-2 text-center">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                transaction.status === "paid"
                                  ? "bg-green-100 text-green-800"
                                  : transaction.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {transaction.status === "paid"
                                ? (isRtl ? "مدفوع" : "Paid")
                                : transaction.status === "pending"
                                ? (isRtl ? "قيد الانتظار" : "Pending")
                                : (isRtl ? "ملغي" : "Cancelled")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : profitError ? (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-red-400 mb-4" />
            <p className="text-red-600 text-center font-medium mb-2">
              {isRtl ? "خطأ في تحميل بيانات الأرباح" : "Error loading profit data"}
            </p>
            <p className="text-red-500 text-sm text-center">{profitError}</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {isRtl
                ? "لا توجد بيانات أرباح بعد. ستظهر البيانات عند حدوث مبيعات."
                : "No profit data available yet. Data will appear when sales occur."}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>{isRtl ? "أحدث الدورات" : "Recent Courses"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentCourses.length > 0 ? (
                stats.recentCourses.map((course) => (
                  <div
                    key={course.id}
                    className={`flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors ${isRtl ? "flex-row-reverse" : ""
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      {course.thumbnail && (
                        <img
                          src={course.thumbnail}
                          alt={getTextValue(course.title)}
                          className="h-10 w-10 rounded-md object-cover"
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {getTextValue(course.title)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {course.isPublished
                            ? (isRtl ? "منشور" : "Published")
                            : course.approvalStatus?.status === 'pending'
                              ? (isRtl ? "في انتظار الموافقة" : "Pending Approval")
                              : (isRtl ? "مسودة" : "Draft")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {course.stats?.enrolledCount || 0} {isRtl ? "طالب" : "Students"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {course.stats?.averageRating || 0} ⭐
                        </p>
                      </div>
                      <Link href={`/dashboard/courses/${course.id}/edit`}>
                        <Button variant="ghost" size="icon">
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {isRtl ? "لا توجد دورات بعد" : "No courses created yet"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{isRtl ? "أحدث الطلاب" : "Recent Students"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentStudents && stats.recentStudents.length > 0 ? (
                stats.recentStudents.map((student, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-genoun-green/10 flex items-center justify-center">
                        <User2 className="h-4 w-4 text-genoun-green" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{getTextValue(student.name)}</p>
                        <p className="text-xs text-muted-foreground">{getTextValue(student.groupName)}</p>
                      </div>
                    </div>
                    <Badge variant={student.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                      {student.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {isRtl ? "لا يوجد طلاب بعد" : "No students yet"}
                </div>
              )}
              <Link href="/dashboard/teachers">
                <Button variant="outline" size="sm" className="w-full mt-2">
                  {isRtl ? "عرض جميع الطلاب" : "View All Students"}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mt-4">
        <Link href="/dashboard/courses">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-500" />
                <span className="font-medium">{isRtl ? "إدارة الدورات" : "Manage Courses"}</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/teachers">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-teal-500" />
                <span className="font-medium">{isRtl ? "إدارة المجموعات" : "Manage Groups"}</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/quizzes">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <FileQuestion className="h-5 w-5 text-orange-500" />
                <span className="font-medium">{isRtl ? "إدارة الاختبارات" : "Manage Quizzes"}</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/my-profile">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <User2 className="h-5 w-5 text-blue-500" />
                <span className="font-medium">{isRtl ? "ملفي الشخصي" : "My Profile"}</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
