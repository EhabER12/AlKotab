"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { differenceInCalendarDays, format, startOfDay } from "date-fns";
import {
  AlertCircle,
  Loader2,
  MessageCircle,
  Search,
  Send,
  Smartphone,
  Users,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  getStudentMembers,
  sendBulkStudentMemberWhatsAppReminders,
  sendStudentMemberWhatsAppReminder,
} from "@/store/services/studentMemberService";
import { getTeacherGroups } from "@/store/services/teacherGroupService";
import { getWebsiteSettingsThunk } from "@/store/services/settingsService";
import {
  isAdmin,
  isAuthenticated,
  isModerator,
} from "@/store/services/authService";
import { useAdminLocale } from "@/hooks/dashboard/useAdminLocale";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const defaultReminderTemplate = `السلام عليكم {{name}}،

نذكركم بأن موعد تجديد الاشتراك {{statusLabel}}.
تاريخ الاستحقاق: {{dueDate}}
{{daysSummary}}
{{teacherLine}}
{{packageLine}}

للتجديد أو الاستفسار يمكنكم التواصل معنا على هذا الرقم.
مع خالص التحية`;

const getTextValue = (value: any, isRtl: boolean): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return (isRtl ? value.ar : value.en) || value.en || value.ar || "";
};

const getDaysLeft = (dateStr?: string) => {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  if (Number.isNaN(due.getTime())) return null;
  return differenceInCalendarDays(startOfDay(due), startOfDay(new Date()));
};

const getWhatsAppLink = (phone?: string | null) => {
  const cleaned = (phone || "").replace(/\D/g, "");
  return cleaned ? `https://wa.me/${cleaned}` : "";
};

export default function OverdueSubscriptionsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { t, isRtl } = useAdminLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [messageTemplate, setMessageTemplate] = useState(defaultReminderTemplate);
  const [rowSendingId, setRowSendingId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);

  const { studentMembers, isLoading } = useAppSelector(
    (state) => state.studentMembers
  );
  const { teacherGroups } = useAppSelector((state) => state.teacherGroups);
  const { user } = useAppSelector((state) => state.auth);
  const { settings } = useAppSelector((state) => state.settings);

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
    dispatch(
      getTeacherGroups({
        groupType: "group",
        isActive: true,
        teacherType: "subscription",
      })
    );
    dispatch(getWebsiteSettingsThunk());
  }, [dispatch, user, router]);

  const groupByStudentId = useMemo(() => {
    const map = new Map<string, any>();

    teacherGroups.forEach((group) => {
      (group.students || []).forEach((student) => {
        const studentId =
          student.studentId?.id || student.studentId?._id || student.studentId;
        if (studentId) {
          map.set(String(studentId), group);
        }
      });
    });

    return map;
  }, [teacherGroups]);

  const dueStudents = useMemo(() => {
    return studentMembers
      .filter((student) => student.status !== "cancelled")
      .map((student) => {
        const daysLeft = getDaysLeft(student.nextDueDate);
        return { student, daysLeft };
      })
      .filter((entry) => entry.daysLeft !== null && entry.daysLeft <= 5);
  }, [studentMembers]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return dueStudents;

    const query = searchQuery.trim().toLowerCase();

    return dueStudents.filter(({ student }) => {
      const name = getTextValue(
        student.studentName || student.name,
        isRtl
      ).toLowerCase();
      const phone = (student.phone || student.whatsappNumber || "").toLowerCase();
      const packageName = student.packageId
        ? getTextValue(student.packageId.name, isRtl).toLowerCase()
        : "";
      const teacherName = student.assignedTeacherId
        ? getTextValue(student.assignedTeacherId.fullName, isRtl).toLowerCase()
        : (student.assignedTeacherName || "").toLowerCase();
      const group = groupByStudentId.get(String(student.id || student._id || ""));
      const groupName = group
        ? getTextValue(group.groupName, isRtl).toLowerCase()
        : "";

      return (
        name.includes(query) ||
        phone.includes(query) ||
        packageName.includes(query) ||
        teacherName.includes(query) ||
        groupName.includes(query)
      );
    });
  }, [dueStudents, groupByStudentId, isRtl, searchQuery]);

  const overdueStudents = useMemo(
    () =>
      filteredStudents.filter(
        ({ student, daysLeft }) =>
          (daysLeft ?? 0) < 0 || student.status === "overdue"
      ),
    [filteredStudents]
  );

  const overdueCount = dueStudents.filter(
    ({ student, daysLeft }) => (daysLeft ?? 0) < 0 || student.status === "overdue"
  ).length;
  const dueSoonCount = dueStudents.length - overdueCount;
  const sendableOverdueCount = overdueStudents.filter(
    ({ student }) => !!(student.phone || student.whatsappNumber)
  ).length;

  const handleSendSingle = async (memberId: string) => {
    setRowSendingId(memberId);

    try {
      await sendStudentMemberWhatsAppReminder({
        id: memberId,
        messageTemplate,
      });
      toast.success(
        isRtl ? "تم إرسال التذكير عبر واتساب" : "WhatsApp reminder sent"
      );
    } catch (error: any) {
      toast.error(error?.message || (isRtl ? "تعذر إرسال الرسالة" : "Failed to send message"));
    } finally {
      setRowSendingId(null);
    }
  };

  const handleSendBulk = async () => {
    const memberIds = overdueStudents
      .filter(({ student }) => !!(student.phone || student.whatsappNumber))
      .map(({ student }) => String(student.id || student._id || ""))
      .filter(Boolean);

    if (memberIds.length === 0) {
      toast.error(
        isRtl
          ? "لا يوجد طلاب متأخرون مطابقون للفلاتر الحالية"
          : "No overdue students match the current filters"
      );
      return;
    }

    setBulkSending(true);

    try {
      const result = await sendBulkStudentMemberWhatsAppReminders({
        memberIds,
        messageTemplate,
        scope: "overdue",
        remindBeforeDays: 5,
      });

      toast.success(
        isRtl
          ? `تم إرسال ${result.summary?.successful || 0} رسالة`
          : `Sent ${result.summary?.successful || 0} messages`
      );
    } catch (error: any) {
      toast.error(
        error?.message || (isRtl ? "تعذر إرسال الرسائل" : "Failed to send messages")
      );
    } finally {
      setBulkSending(false);
    }
  };

  if (isLoading && studentMembers.length === 0) {
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
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {t("admin.overdueSubscriptions.title")}
          </h2>
          <p className="text-muted-foreground">
            {t("admin.overdueSubscriptions.description")}
          </p>
        </div>
        <Badge
          className={
            settings?.whatsappConnected
              ? "bg-green-100 text-green-800"
              : "bg-amber-100 text-amber-800"
          }
        >
          {settings?.whatsappConnected
            ? isRtl
              ? "واتساب متصل"
              : "WhatsApp connected"
            : isRtl
              ? "واتساب غير متصل"
              : "WhatsApp not connected"}
        </Badge>
      </div>

      {!settings?.whatsappConnected ? (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertCircle className="h-4 w-4 text-amber-700" />
          <AlertTitle>
            {isRtl ? "يجب ربط واتساب أولًا" : "Connect WhatsApp first"}
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span>
              {isRtl
                ? "لن تتمكن من إرسال التذكيرات من هذه الصفحة حتى يتم ربط حساب واتساب من الإعدادات."
                : "You cannot send reminders from this page until a WhatsApp account is connected from settings."}
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/settings")}
            >
              <Smartphone className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              {isRtl ? "فتح إعدادات واتساب" : "Open WhatsApp settings"}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("admin.overdueSubscriptions.totalDueSoon")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dueSoonCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("admin.overdueSubscriptions.totalOverdue")}
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("admin.overdueSubscriptions.totalStudents")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dueStudents.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isRtl ? "رسالة التذكير" : "Reminder message"}
          </CardTitle>
          <CardDescription>
            {isRtl
              ? "يمكنك تعديل الرسالة قبل الإرسال. الحقول المتاحة: {{name}} {{dueDate}} {{daysSummary}} {{teacherLine}} {{packageLine}}"
              : "You can edit the message before sending. Available placeholders: {{name}} {{dueDate}} {{daysSummary}} {{teacherLine}} {{packageLine}}"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={messageTemplate}
            onChange={(event) => setMessageTemplate(event.target.value)}
            rows={10}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={
                !settings?.whatsappConnected ||
                bulkSending ||
                sendableOverdueCount === 0
              }
              onClick={handleSendBulk}
            >
              {bulkSending ? (
                <Loader2 className={`h-4 w-4 animate-spin ${isRtl ? "ml-2" : "mr-2"}`} />
              ) : (
                <Send className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              )}
              {isRtl
                ? `إرسال للمتأخرين الظاهرين (${sendableOverdueCount})`
                : `Send to visible overdue students (${sendableOverdueCount})`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.overdueSubscriptions.searchTitle")}</CardTitle>
          <CardDescription>
            {t("admin.overdueSubscriptions.searchDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search
              className={`absolute top-2.5 h-4 w-4 text-muted-foreground ${
                isRtl ? "right-2" : "left-2"
              }`}
            />
            <Input
              placeholder={t("admin.overdueSubscriptions.searchPlaceholder")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className={isRtl ? "pr-8" : "pl-8"}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.overdueSubscriptions.listTitle")}</CardTitle>
          <CardDescription>
            {filteredStudents.length === 0
              ? t("admin.overdueSubscriptions.noStudents")
              : `${filteredStudents.length} / ${dueStudents.length}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                {t("admin.overdueSubscriptions.noStudents")}
              </h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.overdueSubscriptions.studentName")}</TableHead>
                    <TableHead>{t("admin.overdueSubscriptions.phone")}</TableHead>
                    <TableHead>{t("admin.overdueSubscriptions.packageGroup")}</TableHead>
                    <TableHead>{t("admin.overdueSubscriptions.teacher")}</TableHead>
                    <TableHead>{t("admin.overdueSubscriptions.nextDue")}</TableHead>
                    <TableHead>{t("admin.overdueSubscriptions.daysLeft")}</TableHead>
                    <TableHead>{t("admin.overdueSubscriptions.status")}</TableHead>
                    <TableHead>{isRtl ? "إجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map(({ student, daysLeft }, index) => {
                    const studentId = String(student.id || student._id || index);
                    const studentName = getTextValue(
                      student.studentName || student.name,
                      isRtl
                    );
                    const group = groupByStudentId.get(studentId);
                    const groupName = group
                      ? getTextValue(group.groupName, isRtl)
                      : "";
                    const packageName = student.packageId
                      ? getTextValue(student.packageId.name, isRtl)
                      : "";
                    const label = packageName || groupName || "-";
                    const phone = student.phone || student.whatsappNumber || "";
                    const whatsappLink = getWhatsAppLink(phone);
                    const isOverdue =
                      (daysLeft ?? 0) < 0 || student.status === "overdue";
                    const badgeClass = packageName
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : groupName
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : "bg-gray-50 text-gray-600 border-gray-200";

                    return (
                      <TableRow
                        key={studentId}
                        className={isOverdue ? "bg-red-50" : "bg-yellow-50"}
                      >
                        <TableCell className="font-medium">{studentName}</TableCell>
                        <TableCell dir="ltr">{phone || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={badgeClass}>
                            {label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {student.assignedTeacherId
                            ? getTextValue(student.assignedTeacherId.fullName, isRtl)
                            : student.assignedTeacherName || "-"}
                        </TableCell>
                        <TableCell>
                          {student.nextDueDate
                            ? format(new Date(student.nextDueDate), "yyyy-MM-dd")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {daysLeft === null
                            ? "-"
                            : daysLeft < 0
                              ? t("admin.overdueSubscriptions.daysOverdue", {
                                  days: Math.abs(daysLeft),
                                })
                              : t("admin.overdueSubscriptions.daysLeftValue", {
                                  days: daysLeft,
                                })}
                        </TableCell>
                        <TableCell>
                          {isOverdue ? (
                            <Badge className="bg-red-100 text-red-800">
                              {t("admin.overdueSubscriptions.overdue")}
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              {t("admin.overdueSubscriptions.dueSoon")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={
                                !settings?.whatsappConnected ||
                                !phone ||
                                rowSendingId === studentId
                              }
                              onClick={() => handleSendSingle(studentId)}
                            >
                              {rowSendingId === studentId ? (
                                <Loader2
                                  className={`h-4 w-4 animate-spin ${isRtl ? "ml-2" : "mr-2"}`}
                                />
                              ) : (
                                <Send
                                  className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`}
                                />
                              )}
                              {isRtl ? "إرسال" : "Send"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-green-200 text-green-700 hover:bg-green-50"
                              disabled={!whatsappLink}
                              onClick={() => {
                                if (whatsappLink) {
                                  window.open(whatsappLink, "_blank");
                                }
                              }}
                            >
                              <MessageCircle
                                className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`}
                              />
                              {isRtl ? "فتح" : "Open"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
