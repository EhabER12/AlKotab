"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  getStudentMembers,
  StudentMember,
} from "@/store/services/studentMemberService";
import {
  getWebsiteSettingsThunk,
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
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCircle,
  Mail,
  Phone,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Package as PackageIcon,
  Layers,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";

const normalizeText = (value?: string | null) =>
  (value || "").toString().trim().toLowerCase();

const getTextValue = (value: any, isRtl: boolean): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return (isRtl ? value.ar : value.en) || value.en || value.ar || "";
};

const isPayingStudent = (student: StudentMember) =>
  student.status === "active" || student.status === "due_soon";

export default function SubscriptionTeacherDetailsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams();
  const { t, isRtl } = useAdminLocale();
  const { formatMoney, baseCurrency } = useCurrency();

  const teacherKey = decodeURIComponent(params.id as string);

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

  const subscriptionTeachers = settings?.subscriptionTeachers || [];

  // Find the teacher by key
  const teacher = useMemo<SubscriptionTeacher | null>(() => {
    // First check in subscriptionTeachers
    for (const t of subscriptionTeachers) {
      const tKey = t._id 
        ? t._id 
        : `${normalizeText(t.name?.ar)}|${normalizeText(t.name?.en)}|${normalizeText(t.email)}`;
      if (tKey === teacherKey || t._id === teacherKey) {
        return t;
      }
    }

    // Check if it's a derived teacher from student assignments
    const names = new Map<string, string>();
    studentMembers.forEach((student) => {
      const rawName = student.assignedTeacherName?.trim();
      const normalized = normalizeText(rawName);
      if (!normalized) return;
      if (!names.has(normalized)) {
        names.set(normalized, rawName || "");
      }
    });

    // Check if teacherKey matches a derived teacher pattern
    const keyParts = teacherKey.split("|");
    if (keyParts.length >= 2) {
      const nameAr = keyParts[0];
      const nameEn = keyParts[1];
      if (names.has(nameAr) || names.has(nameEn)) {
        return {
          name: { ar: names.get(nameAr) || nameAr, en: names.get(nameEn) || nameEn },
          isActive: true,
        };
      }
    }

    return null;
  }, [subscriptionTeachers, studentMembers, teacherKey]);

  // Get teacher's students and groups
  const { students, activeStudents, groups, profitPercentage, totalProfit } = useMemo(() => {
    if (!teacher) {
      return { students: [], activeStudents: [], groups: [], profitPercentage: 0, totalProfit: 0 };
    }

    const teacherTokens = new Set(
      [teacher.name?.ar, teacher.name?.en, teacher.email, teacher.phone]
        .filter(Boolean)
        .map((value) => normalizeText(value))
    );

    const matchedStudents = studentMembers.filter((student) => {
      const assignedName = normalizeText(student.assignedTeacherName);
      return assignedName && teacherTokens.has(assignedName);
    });

    const matchedActiveStudents = matchedStudents.filter(isPayingStudent);

    const matchedGroups = teacherGroups.filter((group) => {
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

    const profitPct = subscriptionProfitEnabled
      ? teacher.profitPercentage ?? defaultProfitPercentage
      : 0;
    
    const profit = subscriptionProfitEnabled
      ? matchedActiveStudents.reduce((sum, student) => {
          const price = Number(student.packagePrice || 0);
          return sum + price * (profitPct / 100);
        }, 0)
      : 0;

    return {
      students: matchedStudents,
      activeStudents: matchedActiveStudents,
      groups: matchedGroups,
      profitPercentage: profitPct,
      totalProfit: profit,
    };
  }, [teacher, studentMembers, teacherGroups, subscriptionProfitEnabled, defaultProfitPercentage]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">{isRtl ? "نشط" : "Active"}</Badge>;
      case "due_soon":
        return <Badge className="bg-yellow-100 text-yellow-800">{isRtl ? "قريب الاستحقاق" : "Due Soon"}</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">{isRtl ? "متأخر" : "Overdue"}</Badge>;
      case "paused":
        return <Badge className="bg-gray-100 text-gray-800">{isRtl ? "موقوف" : "Paused"}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getGroupStatusBadge = (status?: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">{isRtl ? "نشط" : "Active"}</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800">{isRtl ? "غير نشط" : "Inactive"}</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800">{isRtl ? "مكتمل" : "Completed"}</Badge>;
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

  if (!teacher) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6" dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            {isRtl ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {isRtl ? "المعلم غير موجود" : "Teacher Not Found"}
            </h2>
            <p className="text-muted-foreground">
              {isRtl ? "لم يتم العثور على المعلم المطلوب" : "The requested teacher could not be found"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const teacherName = getTextValue(teacher.name, isRtl) || teacher.email || (isRtl ? "معلم" : "Teacher");

  return (
    <div
      className={`flex-1 space-y-4 p-8 pt-6 ${isRtl ? "text-right" : ""}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className={`flex items-center gap-4 ${isRtl ? "flex-row-reverse" : ""}`}>
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          {isRtl ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </Button>
        <div className={`flex items-center gap-4 flex-1 ${isRtl ? "flex-row-reverse" : ""}`}>
          <div className="h-16 w-16 rounded-full bg-genoun-green/10 flex items-center justify-center">
            <UserCircle className="h-10 w-10 text-genoun-green" />
          </div>
          <div className={isRtl ? "text-right" : "text-left"}>
            <h2 className="text-3xl font-bold tracking-tight">{teacherName}</h2>
            <div className={`flex items-center gap-4 text-muted-foreground flex-wrap ${isRtl ? "justify-end" : "justify-start"}`}>
              {teacher.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {teacher.email}
                </span>
              )}
              {teacher.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {teacher.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isRtl ? "إجمالي الطلاب" : "Total Students"}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isRtl ? "الطلاب النشطين" : "Active Students"}
            </CardTitle>
            <UserCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeStudents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isRtl ? "الجروبات" : "Groups"}
            </CardTitle>
            <Layers className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{groups.length}</div>
          </CardContent>
        </Card>
        {subscriptionProfitEnabled && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {isRtl ? "إجمالي الربح" : "Total Profit"}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatMoney(totalProfit, baseCurrency)}
              </div>
              <p className="text-xs text-muted-foreground">
                {isRtl ? `نسبة الربح: ${profitPercentage}%` : `Profit Rate: ${profitPercentage}%`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Teacher Info Card */}
      {(teacher.salaryAmount || teacher.salaryDueDate || teacher.notes) && (
        <Card>
          <CardHeader>
            <CardTitle>{isRtl ? "معلومات إضافية" : "Additional Information"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-4 md:grid-cols-3 ${isRtl ? "text-right" : "text-left"}`}>
              {teacher.salaryAmount !== undefined && teacher.salaryAmount !== null && (
                <div>
                  <p className="text-sm text-muted-foreground">{isRtl ? "الراتب" : "Salary"}</p>
                  <p className="font-medium">{formatMoney(teacher.salaryAmount, baseCurrency)}</p>
                </div>
              )}
              {teacher.salaryDueDate && (
                <div>
                  <p className="text-sm text-muted-foreground">{isRtl ? "تاريخ الاستحقاق" : "Due Date"}</p>
                  <p className="font-medium">{format(new Date(teacher.salaryDueDate), "yyyy-MM-dd")}</p>
                </div>
              )}
              {teacher.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">{isRtl ? "ملاحظات" : "Notes"}</p>
                  <p className="font-medium">{teacher.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>{isRtl ? "الطلاب" : "Students"}</CardTitle>
          <CardDescription>
            {students.length === 0
              ? (isRtl ? "لا يوجد طلاب مسجلين لهذا المعلم" : "No students assigned to this teacher")
              : (isRtl ? `${students.length} طالب مسجل` : `${students.length} students assigned`)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                {isRtl ? "لا يوجد طلاب" : "No Students"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isRtl ? "لم يتم تسجيل طلاب لهذا المعلم بعد" : "No students have been assigned to this teacher yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRtl ? "اسم الطالب" : "Student Name"}</TableHead>
                    <TableHead>{isRtl ? "رقم الهاتف" : "Phone"}</TableHead>
                    <TableHead>{isRtl ? "الباقة" : "Package"}</TableHead>
                    <TableHead>{isRtl ? "تاريخ البداية" : "Start Date"}</TableHead>
                    <TableHead>{isRtl ? "تاريخ النهاية" : "End Date"}</TableHead>
                    <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student, index) => {
                    const studentName = getTextValue(student.studentName || student.name, isRtl);
                    const rowClass =
                      student.status === "overdue"
                        ? "bg-red-50"
                        : student.status === "due_soon"
                        ? "bg-yellow-50"
                        : student.status === "paused"
                        ? "bg-gray-50"
                        : "";

                    return (
                      <TableRow key={student.id || student._id || index} className={rowClass}>
                        <TableCell className="font-medium">{studentName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span dir="ltr">{student.phone || student.whatsappNumber || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-purple-50 text-purple-700 border-purple-200"
                          >
                            <PackageIcon className="h-3 w-3 mr-1" />
                            {student.packageId ? getTextValue(student.packageId.name, isRtl) : "-"}
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
        </CardContent>
      </Card>

      {/* Groups Section */}
      <Card>
        <CardHeader>
          <CardTitle>{isRtl ? "الجروبات" : "Groups"}</CardTitle>
          <CardDescription>
            {groups.length === 0
              ? (isRtl ? "لا توجد جروبات لهذا المعلم" : "No groups for this teacher")
              : (isRtl ? `${groups.length} جروب` : `${groups.length} groups`)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                {isRtl ? "لا توجد جروبات" : "No Groups"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isRtl ? "لم يتم إنشاء جروبات لهذا المعلم بعد" : "No groups have been created for this teacher yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => {
                const groupId = group.id || group._id;
                const groupName = getTextValue(group.groupName, true) || (isRtl ? "جروب" : "Group");
                const members = group.students || [];
                const membersCount = group.stats?.totalStudents ?? members.length;

                return (
                  <div key={groupId} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium text-lg">{groupName}</div>
                      <Badge variant="outline">
                        {membersCount} {isRtl ? "طالب" : "students"}
                      </Badge>
                    </div>
                    {members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {isRtl ? "لا يوجد طلاب في هذا الجروب" : "No students in this group"}
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{isRtl ? "الاسم" : "Name"}</TableHead>
                              <TableHead>{isRtl ? "رقم الهاتف" : "Phone"}</TableHead>
                              <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {members.map((member, memberIndex) => {
                              const memberName = getTextValue(
                                (member.studentId as any)?.name || member.studentId?.studentName,
                                isRtl
                              );
                              const memberPhone =
                                member.studentId?.whatsappNumber ||
                                (member.studentId as any)?.phone ||
                                "-";

                              return (
                                <TableRow key={member.id || member._id || memberIndex}>
                                  <TableCell className="font-medium">{memberName || "-"}</TableCell>
                                  <TableCell>
                                    <span dir="ltr">{memberPhone}</span>
                                  </TableCell>
                                  <TableCell>{getGroupStatusBadge(member.status)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
