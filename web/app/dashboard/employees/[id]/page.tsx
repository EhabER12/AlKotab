"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import RoleBasedGuard from "@/components/auth/RoleBasedGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Wifi,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  User,
  Briefcase,
  Activity,
  FileText,
  ListTodo,
  LayoutDashboard,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  getEmployeeById,
  updateEmployee,
  addEmployeeNote,
  deleteEmployeeNote,
  getEmployeeTasks,
  createEmployeeTask,
  updateEmployeeTask,
  deleteEmployeeTask,
  getEmployeeRecords,
  EmployeeTask,
} from "@/store/services/employeeService";
import {
  resetEmployeeStatus,
  resetSelectedEmployee,
} from "@/store/slices/employeeSlice";
import { useAdminLocale } from "@/hooks/dashboard/useAdminLocale";
import { formatDistanceToNow, format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  MODERATOR_DASHBOARD_ACCESS_GROUPS,
  MODERATOR_DASHBOARD_ACCESS_OPTIONS,
  getResolvedModeratorDashboardAccess,
} from "@/lib/dashboardAccess";

const dashboardAccessOptionMap = new Map(
  MODERATOR_DASHBOARD_ACCESS_OPTIONS.map((item) => [item.href, item])
);

const buildEmployeeEditData = (employee: any) => ({
  name: employee.name || "",
  phone: employee.phone || "",
  employeeInfo: {
    position: employee.employeeInfo?.position || "",
    department: employee.employeeInfo?.department || "",
    salary: {
      amount: employee.employeeInfo?.salary?.amount || 0,
      currency: employee.employeeInfo?.salary?.currency || "EGP",
      paymentSchedule:
        employee.employeeInfo?.salary?.paymentSchedule || "monthly",
    },
    address: {
      street: employee.employeeInfo?.address?.street || "",
      city: employee.employeeInfo?.address?.city || "",
      country: employee.employeeInfo?.address?.country || "",
    },
    emergencyContact: {
      name: employee.employeeInfo?.emergencyContact?.name || "",
      phone: employee.employeeInfo?.emergencyContact?.phone || "",
      relationship: employee.employeeInfo?.emergencyContact?.relationship || "",
    },
    dashboardAccess: getResolvedModeratorDashboardAccess(
      employee.employeeInfo?.dashboardAccess
    ),
  },
});

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  return (
    <RoleBasedGuard allowedRoles={["admin"]} fallbackUrl="/dashboard">
      <EmployeeDetailContent employeeId={resolvedParams.id} />
    </RoleBasedGuard>
  );
}

function EmployeeDetailContent({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { t, isRtl, locale } = useAdminLocale();

  const {
    selectedEmployee: employee,
    tasks,
    records,
    taskStats,
    isLoading,
    isTasksLoading,
    isRecordsLoading,
    isError,
    message,
  } = useAppSelector((state) => state.employees);

  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [newNote, setNewNote] = useState("");
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: { en: "", ar: "" },
    description: { en: "", ar: "" },
    priority: "medium",
    dueDate: "",
  });

  useEffect(() => {
    dispatch(getEmployeeById(employeeId));
    dispatch(getEmployeeTasks({ employeeId, limit: 20 }));
    dispatch(getEmployeeRecords({ employeeId, limit: 12 }));

    return () => {
      dispatch(resetSelectedEmployee());
      dispatch(resetEmployeeStatus());
    };
  }, [dispatch, employeeId]);

  useEffect(() => {
    if (employee) {
      setEditData(buildEmployeeEditData(employee));
    }
  }, [employee]);

  const selectedDashboardAccess = getResolvedModeratorDashboardAccess(
    editData.employeeInfo?.dashboardAccess ?? employee?.employeeInfo?.dashboardAccess
  );

  const getDashboardAccessTitle = (href: string) => {
    const option = dashboardAccessOptionMap.get(href);
    if (!option) return href;

    const translated = t(option.titleKey);
    return translated !== option.titleKey ? translated : option.fallbackTitle;
  };

  const handleToggleDashboardAccess = (href: string, enabled: boolean) => {
    setEditData((prev: any) => {
      const currentAccess = getResolvedModeratorDashboardAccess(
        prev.employeeInfo?.dashboardAccess ?? employee?.employeeInfo?.dashboardAccess
      );

      if (!enabled && currentAccess.length === 1 && currentAccess.includes(href)) {
        return prev;
      }

      const nextAccess = enabled
        ? [...new Set([...currentAccess, href])]
        : currentAccess.filter((item) => item !== href);

      return {
        ...prev,
        employeeInfo: {
          ...prev.employeeInfo,
          dashboardAccess: nextAccess,
        },
      };
    });
  };

  const handleSave = async () => {
    await dispatch(updateEmployee({ employeeId, data: editData }));
    setIsEditing(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await dispatch(addEmployeeNote({ employeeId, note: newNote }));
    setNewNote("");
  };

  const handleDeleteNote = async (noteId: string) => {
    if (
      confirm(t("admin.employees.confirmDeleteNote") || "Delete this note?")
    ) {
      await dispatch(deleteEmployeeNote({ employeeId, noteId }));
    }
  };

  const handleCreateTask = async () => {
    await dispatch(
      createEmployeeTask({
        employeeId,
        taskData: {
          ...newTask,
          dueDate: newTask.dueDate || undefined,
        } as any,
      })
    );
    setIsTaskDialogOpen(false);
    setNewTask({
      title: { en: "", ar: "" },
      description: { en: "", ar: "" },
      priority: "medium",
      dueDate: "",
    });
  };

  const handleUpdateTaskStatus = async (
    task: EmployeeTask,
    newStatus: string
  ) => {
    await dispatch(
      updateEmployeeTask({
        employeeId,
        taskId: task.id,
        data: { status: newStatus as any },
      })
    );
  };

  const handleDeleteTask = async (taskId: string) => {
    if (
      confirm(t("admin.employees.confirmDeleteTask") || "Delete this task?")
    ) {
      await dispatch(deleteEmployeeTask({ employeeId, taskId }));
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "PPP", {
        locale: locale === "ar" ? ar : enUS,
      });
    } catch {
      return "-";
    }
  };

  const formatCurrency = (amount?: number, currency?: string) => {
    if (!amount) return "-";
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
      style: "currency",
      currency: currency || "EGP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getMonthName = (month: number) => {
    const date = new Date(2000, month - 1);
    return format(date, "MMMM", { locale: locale === "ar" ? ar : enUS });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (isLoading && !employee) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isError && !employee) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {message ||
            t("admin.employees.employeeNotFound") ||
            "Employee not found"}
        </div>
        <Button className="mt-4" onClick={() => router.back()}>
          {t("admin.common.goBack") || "Go Back"}
        </Button>
      </div>
    );
  }

  if (!employee) return null;

  return (
    <div className="p-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          {isRtl ? (
            <ArrowRight className="h-5 w-5" />
          ) : (
            <ArrowLeft className="h-5 w-5" />
          )}
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{employee.name}</h1>
          <p className="text-muted-foreground">
            {employee.employeeInfo?.position ||
              t("admin.employees.employee") ||
              "Employee"}
          </p>
        </div>
        <Badge variant={employee.status === "active" ? "default" : "secondary"}>
          {employee.status === "active"
            ? t("admin.employees.active")
            : t("admin.employees.inactive")}
        </Badge>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
            {t("admin.common.edit") || "Edit"}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (employee) {
                  setEditData(buildEmployeeEditData(employee));
                }
                setIsEditing(false);
              }}
            >
              <X className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              {t("admin.common.cancel") || "Cancel"}
            </Button>
            <Button onClick={handleSave}>
              <Save className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              {t("admin.common.save") || "Save"}
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <TabsList className="mb-6" dir={isRtl ? "rtl" : "ltr"}>
          <TabsTrigger value="overview" className="gap-2">
            <User className="h-4 w-4" />
            {t("admin.employees.overview") || "Overview"}
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            {isRtl ? "صلاحيات الداشبورد" : "Dashboard Access"}
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <ListTodo className="h-4 w-4" />
            {t("admin.employees.tasks") || "Tasks"}
          </TabsTrigger>
          <TabsTrigger value="records" className="gap-2">
            <FileText className="h-4 w-4" />
            {t("admin.employees.records") || "Records"}
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <FileText className="h-4 w-4" />
            {t("admin.employees.notes") || "Notes"}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Basic Info */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t("admin.employees.basicInfo") || "Basic Information"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t("admin.employees.name") || "Name"}</Label>
                    {isEditing ? (
                      <Input
                        value={editData.name}
                        onChange={(e) =>
                          setEditData({ ...editData, name: e.target.value })
                        }
                      />
                    ) : (
                      <p className="text-lg">{employee.name}</p>
                    )}
                  </div>
                  <div>
                    <Label>{t("admin.employees.email") || "Email"}</Label>
                    <p className="text-lg flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {employee.email}
                    </p>
                  </div>
                  <div>
                    <Label>{t("admin.employees.phone") || "Phone"}</Label>
                    {isEditing ? (
                      <Input
                        value={editData.phone}
                        onChange={(e) =>
                          setEditData({ ...editData, phone: e.target.value })
                        }
                      />
                    ) : (
                      <p className="text-lg flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {employee.phone || "-"}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>{t("admin.employees.position") || "Position"}</Label>
                    {isEditing ? (
                      <Input
                        value={editData.employeeInfo?.position}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            employeeInfo: {
                              ...editData.employeeInfo,
                              position: e.target.value,
                            },
                          })
                        }
                      />
                    ) : (
                      <p className="text-lg flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        {employee.employeeInfo?.position || "-"}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>
                      {t("admin.employees.department") || "Department"}
                    </Label>
                    {isEditing ? (
                      <Input
                        value={editData.employeeInfo?.department}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            employeeInfo: {
                              ...editData.employeeInfo,
                              department: e.target.value,
                            },
                          })
                        }
                      />
                    ) : (
                      <p className="text-lg">
                        {employee.employeeInfo?.department || "-"}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>
                      {t("admin.employees.hireDate") || "Hire Date"}
                    </Label>
                    <p className="text-lg flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(employee.employeeInfo?.hireDate)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  {t("admin.employees.activity") || "Activity"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>
                    {t("admin.employees.lastActivity") || "Last Activity"}
                  </Label>
                  <p className="text-lg flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {employee.activityInfo?.lastActivityAt
                      ? formatDistanceToNow(
                          new Date(employee.activityInfo.lastActivityAt),
                          {
                            addSuffix: true,
                            locale: locale === "ar" ? ar : enUS,
                          }
                        )
                      : "-"}
                  </p>
                </div>
                <div>
                  <Label>
                    {t("admin.employees.lastLogin") || "Last Login"}
                  </Label>
                  <p className="text-lg">
                    {formatDate(employee.activityInfo?.lastLoginAt)}
                  </p>
                </div>
                <div>
                  <Label>
                    {t("admin.employees.ipAddress") || "IP Address"}
                  </Label>
                  <p className="text-lg flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-muted-foreground" />
                    {employee.activityInfo?.lastIpAddress || "-"}
                  </p>
                </div>
                <div>
                  <Label>
                    {t("admin.employees.loginCount") || "Login Count"}
                  </Label>
                  <p className="text-lg">
                    {employee.activityInfo?.loginCount || 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Salary Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {t("admin.employees.salaryInfo") || "Salary Information"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t("admin.employees.salary") || "Salary"}</Label>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={editData.employeeInfo?.salary?.amount}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            employeeInfo: {
                              ...editData.employeeInfo,
                              salary: {
                                ...editData.employeeInfo?.salary,
                                amount: parseFloat(e.target.value),
                              },
                            },
                          })
                        }
                        className="flex-1"
                      />
                      <Select
                        value={editData.employeeInfo?.salary?.currency}
                        onValueChange={(v) =>
                          setEditData({
                            ...editData,
                            employeeInfo: {
                              ...editData.employeeInfo,
                              salary: {
                                ...editData.employeeInfo?.salary,
                                currency: v,
                              },
                            },
                          })
                        }
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EGP">EGP</SelectItem>
                          <SelectItem value="SAR">SAR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(
                        employee.employeeInfo?.salary?.amount,
                        employee.employeeInfo?.salary?.currency
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <Label>
                    {t("admin.employees.paymentSchedule") || "Payment Schedule"}
                  </Label>
                  {isEditing ? (
                    <Select
                      value={editData.employeeInfo?.salary?.paymentSchedule}
                      onValueChange={(v) =>
                        setEditData({
                          ...editData,
                          employeeInfo: {
                            ...editData.employeeInfo,
                            salary: {
                              ...editData.employeeInfo?.salary,
                              paymentSchedule: v,
                            },
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">
                          {t("admin.employees.monthly") || "Monthly"}
                        </SelectItem>
                        <SelectItem value="weekly">
                          {t("admin.employees.weekly") || "Weekly"}
                        </SelectItem>
                        <SelectItem value="biweekly">
                          {t("admin.employees.biweekly") || "Bi-weekly"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-lg capitalize">
                      {employee.employeeInfo?.salary?.paymentSchedule || "-"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t("admin.employees.address") || "Address"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <Label>{t("admin.employees.street") || "Street"}</Label>
                      <Input
                        value={editData.employeeInfo?.address?.street}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            employeeInfo: {
                              ...editData.employeeInfo,
                              address: {
                                ...editData.employeeInfo?.address,
                                street: e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>{t("admin.employees.city") || "City"}</Label>
                        <Input
                          value={editData.employeeInfo?.address?.city}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              employeeInfo: {
                                ...editData.employeeInfo,
                                address: {
                                  ...editData.employeeInfo?.address,
                                  city: e.target.value,
                                },
                              },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>
                          {t("admin.employees.country") || "Country"}
                        </Label>
                        <Input
                          value={editData.employeeInfo?.address?.country}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              employeeInfo: {
                                ...editData.employeeInfo,
                                address: {
                                  ...editData.employeeInfo?.address,
                                  country: e.target.value,
                                },
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <p>{employee.employeeInfo?.address?.street || "-"}</p>
                    <p>
                      {[
                        employee.employeeInfo?.address?.city,
                        employee.employeeInfo?.address?.country,
                      ]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Task Stats */}
            {taskStats && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListTodo className="h-5 w-5" />
                    {t("admin.employees.taskStats") || "Task Statistics"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-3xl font-bold text-green-600">
                        {taskStats.total.completed}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("admin.employees.completed") || "Completed"}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-3xl font-bold text-orange-600">
                        {taskStats.total.pending + taskStats.total.in_progress}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("admin.employees.pending") || "Pending"}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-3xl font-bold">{taskStats.thisWeek}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("admin.employees.thisWeek") || "This Week"}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-3xl font-bold text-red-600">
                        {taskStats.overdue}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("admin.employees.overdue") || "Overdue"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5" />
                {isRtl ? "صفحات الداشبورد للمودريتور" : "Moderator Dashboard Pages"}
              </CardTitle>
              <CardDescription>
                {isRtl
                  ? "حدد الصفحات التي تظهر لهذا المودريتور في السايدبار ويُسمح له بفتحها داخل الداشبورد."
                  : "Choose which dashboard pages appear for this moderator and can be opened from the dashboard."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="text-sm font-medium">
                  {isEditing
                    ? isRtl
                      ? "الصفحات المحددة حاليًا"
                      : "Currently selected pages"
                    : isRtl
                    ? "الصفحات المفعلة حاليًا لهذا المودريتور"
                    : "Currently enabled pages for this moderator"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedDashboardAccess.map((href) => (
                    <Badge key={href} variant="secondary">
                      {getDashboardAccessTitle(href)}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {MODERATOR_DASHBOARD_ACCESS_GROUPS.map((group) => (
                  <Card key={group.id} className="border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {isRtl ? group.label.ar : group.label.en}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {group.items.map((item) => {
                        const isChecked = selectedDashboardAccess.includes(item.href);
                        const isLastSelected =
                          isChecked && selectedDashboardAccess.length === 1;

                        return (
                          <label
                            key={item.href}
                            className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                              isEditing ? "cursor-pointer hover:border-primary/40" : "opacity-80"
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              disabled={!isEditing || isLastSelected}
                              onCheckedChange={(checked) =>
                                handleToggleDashboardAccess(item.href, checked === true)
                              }
                            />
                            <div className="space-y-1">
                              <p className="font-medium leading-none">
                                {getDashboardAccessTitle(item.href)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.href}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {isEditing && (
                <p className="text-xs text-muted-foreground">
                  {isRtl
                    ? "يجب ترك صفحة واحدة على الأقل مفعلة للمودريتور."
                    : "Keep at least one dashboard page enabled for this moderator."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("admin.employees.tasksList") || "Tasks"}</CardTitle>
              <Button onClick={() => setIsTaskDialogOpen(true)}>
                <Plus className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
                {t("admin.employees.addTask") || "Add Task"}
              </Button>
            </CardHeader>
            <CardContent>
              {isTasksLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("admin.employees.noTasks") || "No tasks assigned"}
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">
                            {locale === "ar"
                              ? task.title.ar || task.title.en
                              : task.title.en || task.title.ar}
                          </h4>
                          <Badge
                            variant={getPriorityColor(task.priority) as any}
                          >
                            {t(
                              `admin.employees.priority${
                                task.priority.charAt(0).toUpperCase() +
                                task.priority.slice(1)
                              }`
                            )}
                          </Badge>
                          <Badge variant={getStatusColor(task.status) as any}>
                            {t(
                              `admin.employees.status${task.status
                                .split("_")
                                .map(
                                  (s: string) =>
                                    s.charAt(0).toUpperCase() + s.slice(1)
                                )
                                .join("")}`
                            )}
                          </Badge>
                        </div>
                        {task.dueDate && (
                          <p className="text-sm text-muted-foreground">
                            {t("admin.employees.dueDate") || "Due"}:{" "}
                            {formatDate(task.dueDate)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={task.status}
                          onValueChange={(v) => handleUpdateTaskStatus(task, v)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">
                              {t("admin.employees.statusPending")}
                            </SelectItem>
                            <SelectItem value="in_progress">
                              {t("admin.employees.statusInProgress")}
                            </SelectItem>
                            <SelectItem value="completed">
                              {t("admin.employees.statusCompleted")}
                            </SelectItem>
                            <SelectItem value="cancelled">
                              {t("admin.employees.statusCancelled")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Records Tab */}
        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("admin.employees.monthlyRecords") || "Monthly Records"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isRecordsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("admin.employees.noRecords") || "No monthly records yet"}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {records.map((record) => (
                    <Card key={record.id} className="border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center justify-between">
                          <span>
                            {getMonthName(record.month)} {record.year}
                          </span>
                          <Badge
                            variant={
                              record.status === "approved"
                                ? "default"
                                : record.status === "reviewed"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {record.status === "approved"
                              ? t("admin.employees.statusApproved")
                              : record.status === "reviewed"
                              ? t("admin.employees.statusReviewed")
                              : t("admin.employees.statusPending")}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {t("admin.employees.tasksCompleted") ||
                              "Tasks Completed"}
                          </span>
                          <span className="font-medium">
                            {record.metrics?.tasksCompleted || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {t("admin.employees.tasksAssigned") ||
                              "Tasks Assigned"}
                          </span>
                          <span className="font-medium">
                            {record.metrics?.tasksAssigned || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {t("admin.employees.daysActive") || "Days Active"}
                          </span>
                          <span className="font-medium">
                            {record.daysActive || 0}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("admin.employees.adminNotes") || "Admin Notes"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add Note */}
              <div className="flex gap-2 mb-6">
                <Textarea
                  placeholder={
                    t("admin.employees.addNotePlaceholder") || "Add a note..."
                  }
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Notes List */}
              {!employee.adminNotes || employee.adminNotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("admin.employees.noNotes") || "No notes yet"}
                </div>
              ) : (
                <div className="space-y-4">
                  {employee.adminNotes.map((note) => (
                    <div
                      key={note._id}
                      className="p-4 border rounded-lg bg-muted/50"
                    >
                      <div className="flex items-start justify-between">
                        <p className="flex-1 whitespace-pre-wrap">
                          {note.note}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500"
                          onClick={() => handleDeleteNote(note._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {note.createdBy?.name || "Admin"} •{" "}
                        {formatDate(note.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="text-start">
              {t("admin.employees.createTask") || "Create New Task"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>
                {t("admin.employees.taskTitleEn") || "Title (English)"}
              </Label>
              <Input
                value={newTask.title.en}
                onChange={(e) =>
                  setNewTask({
                    ...newTask,
                    title: { ...newTask.title, en: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <Label>
                {t("admin.employees.taskTitleAr") || "Title (Arabic)"}
              </Label>
              <Input
                value={newTask.title.ar}
                onChange={(e) =>
                  setNewTask({
                    ...newTask,
                    title: { ...newTask.title, ar: e.target.value },
                  })
                }
                dir="rtl"
              />
            </div>
            <div>
              <Label>{t("admin.employees.priority") || "Priority"}</Label>
              <Select
                value={newTask.priority}
                onValueChange={(v) => setNewTask({ ...newTask, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    {t("admin.employees.priorityLow")}
                  </SelectItem>
                  <SelectItem value="medium">
                    {t("admin.employees.priorityMedium")}
                  </SelectItem>
                  <SelectItem value="high">
                    {t("admin.employees.priorityHigh")}
                  </SelectItem>
                  <SelectItem value="urgent">
                    {t("admin.employees.priorityUrgent")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("admin.employees.dueDate") || "Due Date"}</Label>
              <Input
                type="date"
                value={newTask.dueDate}
                onChange={(e) =>
                  setNewTask({ ...newTask, dueDate: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTaskDialogOpen(false)}
            >
              {t("admin.common.cancel") || "Cancel"}
            </Button>
            <Button onClick={handleCreateTask}>
              {t("admin.employees.createTask") || "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
