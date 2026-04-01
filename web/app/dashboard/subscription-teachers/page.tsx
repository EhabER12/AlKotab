"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  getStudentMembers,
  StudentMember,
} from "@/store/services/studentMemberService";
import {
  getWebsiteSettingsThunk,
  updateWebsiteSettingsThunk,
  SubscriptionTeacher,
} from "@/store/services/settingsService";
import {
  getTeacherGroups,
  TeacherGroup,
} from "@/store/services/teacherGroupService";
import {
  isAuthenticated,
  isAdmin,
  isModerator,
} from "@/store/services/authService";
import { useAdminLocale } from "@/hooks/dashboard/useAdminLocale";
import { useCurrency } from "@/hooks/dashboard/useCurrency";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  UserCircle,
  Mail,
  Phone,
  Search,
  Plus,
  Trash2,
  Edit,
  Calendar,
  Package as PackageIcon,
  Layers,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "react-hot-toast";

interface TeacherWithStats {
  teacher: SubscriptionTeacher;
  students: StudentMember[];
  activeStudents: StudentMember[];
  groups: TeacherGroup[];
  profitPercentage: number;
  totalProfit: number;
}

const normalizeText = (value?: string | null) =>
  (value || "").toString().trim().toLowerCase();

const getTextValue = (value: any, isRtl: boolean): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return (isRtl ? value.ar : value.en) || value.en || value.ar || "";
};

const getTeacherKey = (teacher: SubscriptionTeacher, index: number) => {
  if (teacher._id) return teacher._id;
  const nameKey = `${normalizeText(teacher.name?.ar)}|${normalizeText(
    teacher.name?.en
  )}`;
  const emailKey = normalizeText(teacher.email);
  const base = `${nameKey}|${emailKey}`;
  return base === "||" ? `teacher-${index}` : base;
};

const isPayingStudent = (student: StudentMember) =>
  student.status === "active" || student.status === "due_soon";

export default function SubscriptionTeachersPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { t, isRtl } = useAdminLocale();
  const { formatMoney, baseCurrency } = useCurrency();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeacherKey, setSelectedTeacherKey] = useState("all");
  const [selectedGroupId, setSelectedGroupId] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] =
    useState<SubscriptionTeacher | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nameAr: "",
    phone: "",
    salaryAmount: "",
    salaryDueDate: "",
    notes: "",
  });

  const { studentMembers, isLoading: studentsLoading } = useAppSelector(
    (state) => state.studentMembers
  );
  const { teacherGroups } = useAppSelector((state) => state.teacherGroups);
  const { settings, isLoading: settingsLoading } = useAppSelector(
    (state) => state.settings
  );
  const { user } = useAppSelector((state) => state.auth);

  const subscriptionProfitSettings = settings?.subscriptionStudentProfitSettings;
  const subscriptionProfitEnabled = subscriptionProfitSettings?.enabled ?? true;
  const defaultProfitPercentage =
    subscriptionProfitSettings?.defaultPercentage ?? 35;

  useEffect(() => {
    if (!isAuthenticated() || !user) {
      router.push("/login");
      return;
    }

    if (!isAdmin() && !isModerator()) {
      router.push("/");
      return;
    }

    dispatch(getStudentMembers({}));
    dispatch(getTeacherGroups({ groupType: "group", teacherType: "subscription" }));
    dispatch(getWebsiteSettingsThunk());
  }, [dispatch, user, router]);

  useEffect(() => {
    if (dialogOpen && !editingTeacher) {
      setFormData({
        nameAr: "",
        phone: "",
        salaryAmount: "",
        salaryDueDate: "",
        notes: "",
      });
    }
  }, [dialogOpen, editingTeacher]);

  const subscriptionTeachers = settings?.subscriptionTeachers || [];

  const derivedTeachers = useMemo<SubscriptionTeacher[]>(() => {
    const existingTokens = new Set<string>();
    subscriptionTeachers.forEach((teacher) => {
      [teacher.name?.ar, teacher.name?.en, teacher.email]
        .filter(Boolean)
        .forEach((value) => existingTokens.add(normalizeText(value)));
    });

    const names = new Map<string, string>();
    studentMembers.forEach((student) => {
      const rawName = student.assignedTeacherName?.trim();
      const normalized = normalizeText(rawName);
      if (!normalized) return;
      if (!names.has(normalized)) {
        names.set(normalized, rawName || "");
      }
    });

    const derivedList: SubscriptionTeacher[] = [];
    names.forEach((displayName, normalized) => {
      if (existingTokens.has(normalized)) return;
      derivedList.push({
        name: { ar: displayName, en: displayName },
        isActive: true,
      });
    });

    return derivedList;
  }, [studentMembers, subscriptionTeachers]);

  const allTeachers = useMemo(
    () => [...subscriptionTeachers, ...derivedTeachers],
    [subscriptionTeachers, derivedTeachers]
  );

  const groupOptions = useMemo(() => {
    return teacherGroups
      .filter((group) => group.groupType === "group")
      .map((group) => ({
        id: group.id || group._id || "",
        name: getTextValue(group.groupName, true) || "جروب",
      }))
      .filter((group) => group.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teacherGroups, isRtl]);

  const teachersWithStats = useMemo<TeacherWithStats[]>(() => {
    return allTeachers.map((teacher) => {
      const teacherTokens = new Set(
        [teacher.name?.ar, teacher.name?.en, teacher.email, teacher.phone]
          .filter(Boolean)
          .map((value) => normalizeText(value))
      );

      const students = studentMembers.filter((student) => {
        const assignedName = normalizeText(student.assignedTeacherName);
        return assignedName && teacherTokens.has(assignedName);
      });

      const activeStudents = students.filter(isPayingStudent);
      const groups = teacherGroups.filter((group) => {
        if (group.teacherType === "subscription") {
          const subTeacher = group.subscriptionTeacher;
          const groupTeacherTokens = [
            subTeacher?.name?.ar,
            subTeacher?.name?.en,
            subTeacher?.email,
            subTeacher?.phone,
          ]
            .filter(Boolean)
            .map((value) => normalizeText(value));
          return groupTeacherTokens.some((token) => teacherTokens.has(token));
        }

        const groupTeacherTokens = [
          group.teacherId?.fullName?.ar,
          group.teacherId?.fullName?.en,
          group.teacherId?.email,
        ]
          .filter(Boolean)
          .map((value) => normalizeText(value));
        return groupTeacherTokens.some((token) => teacherTokens.has(token));
      });
      const profitPercentage = subscriptionProfitEnabled
        ? teacher.profitPercentage ?? defaultProfitPercentage
        : 0;
      const totalProfit = subscriptionProfitEnabled
        ? activeStudents.reduce((sum, student) => {
          const price = Number(student.packagePrice || 0);
          return sum + price * (profitPercentage / 100);
        }, 0)
        : 0;

      return {
        teacher,
        students,
        activeStudents,
        groups,
        profitPercentage,
        totalProfit,
      };
    });
  }, [
    allTeachers,
    studentMembers,
    teacherGroups,
    defaultProfitPercentage,
    subscriptionProfitEnabled,
  ]);

  const filteredTeachers = teachersWithStats.filter((entry, index) => {
    const teacherKey = getTeacherKey(entry.teacher, index);
    if (selectedTeacherKey !== "all" && teacherKey !== selectedTeacherKey) {
      return false;
    }

    if (selectedGroupId !== "all") {
      const hasGroup = entry.groups.some(
        (group) => (group.id || group._id) === selectedGroupId
      );
      if (!hasGroup) return false;
    }

    if (!searchQuery.trim()) return true;

    const query = normalizeText(searchQuery);
    const nameAr = normalizeText(entry.teacher.name?.ar);
    const nameEn = normalizeText(entry.teacher.name?.en);
    const email = normalizeText(entry.teacher.email);
    const phone = normalizeText(entry.teacher.phone);
    const groupNames = entry.groups.map((group) =>
      normalizeText(getTextValue(group.groupName, isRtl))
    );

    return (
      nameAr.includes(query) ||
      nameEn.includes(query) ||
      email.includes(query) ||
      phone.includes(query) ||
      groupNames.some((name) => name.includes(query))
    );
  });

  const totalTeachers = allTeachers.length;
  const totalStudents = teachersWithStats.reduce(
    (sum, entry) => sum + entry.students.length,
    0
  );
  const totalActiveStudents = teachersWithStats.reduce(
    (sum, entry) => sum + entry.activeStudents.length,
    0
  );
  const totalGroups = teachersWithStats.reduce(
    (sum, entry) => sum + entry.groups.length,
    0
  );
  const totalProfit = teachersWithStats.reduce(
    (sum, entry) => sum + entry.totalProfit,
    0
  );

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (teacher: SubscriptionTeacher) => {
    setEditingTeacher(teacher);
    setFormData({
      nameAr: teacher.name?.ar || "",
      phone: teacher.phone || "",
      salaryAmount:
        teacher.salaryAmount !== undefined && teacher.salaryAmount !== null
          ? String(teacher.salaryAmount)
          : "",
      salaryDueDate: teacher.salaryDueDate
        ? format(new Date(teacher.salaryDueDate), "yyyy-MM-dd")
        : "",
      notes: teacher.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSaveTeacher = async () => {
    const nameAr = formData.nameAr.trim();

    if (!nameAr) {
      toast.error("يجب إدخال اسم المعلم");
      return;
    }

    const salaryAmountValue = Number(formData.salaryAmount);
    const salaryAmount = Number.isFinite(salaryAmountValue)
      ? Math.max(salaryAmountValue, 0)
      : 0;
    const salaryDueDate = formData.salaryDueDate
      ? new Date(formData.salaryDueDate)
      : undefined;

    const updatedTeacher: SubscriptionTeacher = {
      ...(editingTeacher?._id ? { _id: editingTeacher._id } : {}),
      name: { ar: nameAr, en: nameAr },
      phone: formData.phone.trim(),
      salaryAmount,
      salaryDueDate: salaryDueDate ? salaryDueDate.toISOString() : undefined,
      notes: formData.notes.trim(),
      isActive: editingTeacher?.isActive ?? true,
    };

    const canUpdateExisting = Boolean(editingTeacher?._id);
    const updatedList = canUpdateExisting
      ? subscriptionTeachers.map((teacher) =>
        teacher._id === editingTeacher?._id ? updatedTeacher : teacher
      )
      : [...subscriptionTeachers, updatedTeacher];

    setSaving(true);
    try {
      await dispatch(
        updateWebsiteSettingsThunk({ subscriptionTeachers: updatedList })
      ).unwrap();
      toast.success(t("admin.subscriptionTeachers.save"));
      setDialogOpen(false);
      setEditingTeacher(null);
    } catch (error: any) {
      console.error("Failed to save subscription teacher:", error);
      toast.error(
        typeof error === "string" ? error : t("admin.subscriptionTeachers.save")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleViewTeacherDetails = (teacherKey: string) => {
    router.push(`/dashboard/subscription-teachers/${encodeURIComponent(teacherKey)}`);
  };

  const handleDeleteTeacher = async (
    teacher: SubscriptionTeacher,
    index: number
  ) => {
    if (!confirm(t("admin.subscriptionTeachers.confirmDelete"))) return;

    if (!teacher._id) {
      toast.error(t("admin.subscriptionTeachers.delete"));
      return;
    }

    const updatedList = subscriptionTeachers.filter((item, itemIndex) => {
      if (teacher._id) return item._id !== teacher._id;
      return itemIndex !== index;
    });

    setSaving(true);
    try {
      await dispatch(
        updateWebsiteSettingsThunk({ subscriptionTeachers: updatedList })
      ).unwrap();
      toast.success(t("admin.subscriptionTeachers.delete"));
    } catch (error: any) {
      console.error("Failed to delete subscription teacher:", error);
      toast.error(
        typeof error === "string" ? error : t("admin.subscriptionTeachers.delete")
      );
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">{"نشط"}</Badge>;
      case "due_soon":
        return <Badge className="bg-yellow-100 text-yellow-800">{"قريب الاستحقاق"}</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">{"متأخر"}</Badge>;
      case "paused":
        return <Badge className="bg-gray-100 text-gray-800">{"موقوف"}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getGroupStatusBadge = (status?: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">{"نشط"}</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800">{"غير نشط"}</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800">{"مكتمل"}</Badge>;
      default:
        return <Badge variant="outline">{status || "-"}</Badge>;
    }
  };

  if (studentsLoading || settingsLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-genoun-green border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 space-y-4 p-8 pt-6 ${isRtl ? "text-right" : ""}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {"مدرسين الاشتراكات"}
          </h2>
          <p className="text-muted-foreground">
            {"إدارة مدرسين الاشتراكات وطلابهم"}
          </p>
        </div>
        <Button
          className="bg-genoun-green hover:bg-genoun-green/90"
          onClick={handleOpenAdd}
        >
          <Plus className="h-4 w-4 mr-2" />
          {"إضافة معلم"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"إجمالي المعلمين"}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTeachers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"إجمالي الطلاب"}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"الطلاب النشطين"}
            </CardTitle>
            <UserCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalActiveStudents}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"إجمالي الجروبات"}
            </CardTitle>
            <Layers className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalGroups}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{"فلترة المعلمين"}</CardTitle>
          <CardDescription>
            {"ابحث عن معلم بالاسم أو رقم الهاتف"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search
                className={`absolute top-2.5 h-4 w-4 text-muted-foreground ${isRtl ? "right-2" : "left-2"
                  }`}
              />
              <Input
                placeholder={"ابحث عن معلم..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isRtl ? "pr-8" : "pl-8"}
              />
            </div>
            <div className="w-full md:w-64">
              <Select
                value={selectedTeacherKey}
                onValueChange={setSelectedTeacherKey}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={"اختر معلم"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {"جميع المعلمين"}
                  </SelectItem>
                  {allTeachers.map((teacher, index) => (
                    <SelectItem
                      key={getTeacherKey(teacher, index)}
                      value={getTeacherKey(teacher, index)}
                    >
                      {getTextValue(teacher.name, isRtl) ||
                        teacher.email ||
                        `Teacher ${index + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-64">
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={"اختر جروب"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {"جميع الجروبات"}
                  </SelectItem>
                  {groupOptions.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{"قائمة المعلمين"}</CardTitle>
          <CardDescription>
            {filteredTeachers.length === 0
              ? "لا يوجد معلمين"
              : `${filteredTeachers.length} / ${totalTeachers}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTeachers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                {"لا يوجد معلمين"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {"أضف معلم جديد للبدء"}
              </p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredTeachers.map((entry, index) => {
                const teacherName =
                  getTextValue(entry.teacher.name, isRtl) ||
                  entry.teacher.email ||
                  `Teacher ${index + 1}`;
                const teacherKey = getTeacherKey(entry.teacher, index);
                const individualStudents = entry.students;
                const groups = entry.groups;

                return (
                  <AccordionItem key={teacherKey} value={teacherKey}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full">
                        {/* Teacher Info - appears on right for RTL */}
                        <div
                          className={`flex items-center gap-3 cursor-pointer ${isRtl ? "flex-row" : "flex-row"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewTeacherDetails(teacherKey);
                          }}
                        >
                          <div className="h-10 w-10 rounded-full bg-genoun-green/10 flex items-center justify-center shrink-0">
                            <UserCircle className="h-6 w-6 text-genoun-green" />
                          </div>
                          <div className={isRtl ? "text-right" : "text-left"}>
                            <p className="font-medium text-genoun-green hover:underline">{teacherName}</p>
                            <div className={`text-sm text-muted-foreground flex items-center gap-2 flex-wrap ${isRtl ? "flex-row-reverse" : ""}`}>
                              {entry.teacher.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {entry.teacher.email}
                                </span>
                              )}
                              {entry.teacher.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {entry.teacher.phone}
                                </span>
                              )}
                            </div>
                            {(entry.teacher.salaryAmount || entry.teacher.salaryDueDate) && (
                              <div className={`mt-1 text-xs text-muted-foreground flex items-center gap-2 flex-wrap ${isRtl ? "flex-row-reverse" : ""}`}>
                                {entry.teacher.salaryAmount ? (
                                  <span className="flex items-center gap-1">
                                    {isRtl ? "الراتب" : "Salary"}:
                                    <span className="font-medium">
                                      {formatMoney(
                                        entry.teacher.salaryAmount,
                                        baseCurrency
                                      )}
                                    </span>
                                  </span>
                                ) : null}
                                {entry.teacher.salaryDueDate ? (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {isRtl ? "تاريخ الاستحقاق" : "Due Date"}:{" "}
                                    {format(
                                      new Date(entry.teacher.salaryDueDate),
                                      "yyyy-MM-dd"
                                    )}
                                  </span>
                                ) : null}
                              </div>
                            )}
                            {subscriptionProfitEnabled && entry.totalProfit > 0 && (
                              <div className={`mt-1 text-xs flex items-center gap-1 ${isRtl ? "flex-row-reverse" : ""}`}>
                                <span className="text-green-600 font-medium">
                                  {isRtl ? "الربح" : "Profit"}: {formatMoney(entry.totalProfit, baseCurrency)}
                                </span>
                                <span className="text-muted-foreground">({entry.profitPercentage}%)</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Actions/Procedures - appears on left for RTL */}
                        <div className={`flex items-center gap-2 shrink-0 ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
                          <Badge variant="outline" className="bg-blue-50">
                            {entry.students.length}{" "}
                            {"طالب"}
                          </Badge>
                          {entry.activeStudents.length > 0 && (
                            <Badge className="bg-green-100 text-green-800">
                              {entry.activeStudents.length}{" "}
                              {"نشط"}
                            </Badge>
                          )}
                          <Badge variant="outline" className="bg-purple-50">
                            {entry.groups.length}{" "}
                            {"جروب"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-genoun-green hover:text-genoun-green/80"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewTeacherDetails(teacherKey);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            <span className={`${isRtl ? "mr-1" : "ml-1"} text-xs`}>
                              {isRtl ? "عرض" : "View"}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(entry.teacher);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 text-red-500 ${entry.teacher._id ? "" : "opacity-50 cursor-not-allowed"}`}
                            disabled={!entry.teacher._id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTeacher(entry.teacher, index);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-8 pt-4">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold">
                              {"الطلاب الفردي"}
                            </h4>
                            <Badge variant="outline">
                              {individualStudents.length}{" "}
                              {"طالب"}
                            </Badge>
                          </div>
                          {individualStudents.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                              {"لا يوجد طلاب"}
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>
                                      {"اسم الطالب"}
                                    </TableHead>
                                    <TableHead>
                                      {"رقم الهاتف"}
                                    </TableHead>
                                    <TableHead>
                                      {"الباقة"}
                                    </TableHead>
                                    <TableHead>
                                      {"تاريخ البداية"}
                                    </TableHead>
                                    <TableHead>
                                      {"تاريخ النهاية"}
                                    </TableHead>
                                    <TableHead>
                                      {"الحالة"}
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {individualStudents.map((student, studentIndex) => {
                                    const studentName = getTextValue(
                                      student.studentName || student.name,
                                      isRtl
                                    );
                                    const rowClass =
                                      student.status === "overdue"
                                        ? "bg-red-50"
                                        : student.status === "due_soon"
                                          ? "bg-yellow-50"
                                          : student.status === "paused"
                                            ? "bg-gray-50"
                                            : "";

                                    return (
                                      <TableRow
                                        key={student.id || student._id || studentIndex}
                                        className={rowClass}
                                      >
                                        <TableCell className="font-medium">
                                          {studentName}
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <span dir="ltr">
                                              {student.phone || student.whatsappNumber || "-"}
                                            </span>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <Badge
                                            variant="outline"
                                            className="bg-purple-50 text-purple-700 border-purple-200"
                                          >
                                            <PackageIcon className="h-3 w-3 mr-1" />
                                            {student.packageId
                                              ? getTextValue(student.packageId.name, isRtl)
                                              : "-"}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            {student.startDate
                                              ? format(new Date(student.startDate), "yyyy-MM-dd")
                                              : "-"}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          {student.nextDueDate
                                            ? format(new Date(student.nextDueDate), "yyyy-MM-dd")
                                            : "-"}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(student.status)}</TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold">
                              {"الجروبات"}
                            </h4>
                            <Badge variant="outline">{groups.length}</Badge>
                          </div>
                          {groups.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                              {"لا توجد جروبات"}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {groups.map((group) => {
                                const groupId = group.id || group._id;
                                const groupName =
                                  getTextValue(group.groupName, true) ||
                                  "جروب";
                                const members = group.students || [];
                                const membersCount =
                                  group.stats?.totalStudents ?? members.length;

                                return (
                                  <div key={groupId} className="rounded-lg border p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="font-medium">{groupName}</div>
                                      <Badge variant="outline">
                                        {membersCount} {"طالب"}
                                      </Badge>
                                    </div>
                                    <div className="mt-3 space-y-2">
                                      {members.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                          {"لا يوجد طلاب"}
                                        </p>
                                      ) : (
                                        members.map((member, memberIndex) => {
                                          const memberName = getTextValue(
                                            (member.studentId as any)?.name ||
                                            member.studentId?.studentName,
                                            isRtl
                                          );
                                          const memberPhone =
                                            member.studentId?.whatsappNumber ||
                                            (member.studentId as any)?.phone ||
                                            "-";

                                          return (
                                            <div
                                              key={member.id || member._id || memberIndex}
                                              className="flex items-center justify-between text-sm"
                                            >
                                              <div className="flex flex-col">
                                                <span>{memberName || "-"}</span>
                                                <span className="text-muted-foreground" dir="ltr">
                                                  {memberPhone}
                                                </span>
                                              </div>
                                              {getGroupStatusBadge(member.status)}
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[550px]" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>
              {editingTeacher
                ? "تعديل المعلم"
                : "إضافة معلم جديد"}
            </DialogTitle>
            <DialogDescription>
              {"أدخل بيانات المعلم"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="teacher-name-ar">
                {"اسم المعلم"}
              </Label>
              <Input
                id="teacher-name-ar"
                value={formData.nameAr}
                onChange={(e) =>
                  setFormData({ ...formData, nameAr: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="teacher-phone">
                {"رقم الهاتف"}
              </Label>
              <Input
                id="teacher-phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="teacher-salary">
                {"الراتب"}
              </Label>
              <Input
                id="teacher-salary"
                type="number"
                min="0"
                value={formData.salaryAmount}
                onChange={(e) =>
                  setFormData({ ...formData, salaryAmount: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="teacher-salary-due">
                {"تاريخ استحقاق الراتب"}
              </Label>
              <Input
                id="teacher-salary-due"
                type="date"
                value={formData.salaryDueDate}
                onChange={(e) =>
                  setFormData({ ...formData, salaryDueDate: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="teacher-notes">
                {"ملاحظات"}
              </Label>
              <Input
                id="teacher-notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {"إلغاء"}
            </Button>
            <Button
              onClick={handleSaveTeacher}
              disabled={saving}
              className="bg-genoun-green hover:bg-genoun-green/90"
            >
              {"حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
