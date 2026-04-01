"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addStudentToGroup,
  createTeacherGroup,
  deleteTeacherGroup,
  getTeacherGroups,
  removeStudentFromGroup,
  TeacherGroup,
  updateStudentStatus,
  updateTeacherGroup,
} from "@/store/services/teacherGroupService";
import { getWebsiteSettingsThunk } from "@/store/services/settingsService";
import { getStudentMembers } from "@/store/services/studentMemberService";
import { isAuthenticated, isAdmin, isModerator } from "@/store/services/authService";
import { useAdminLocale } from "@/hooks/dashboard/useAdminLocale";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  MoreHorizontal,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "react-hot-toast";

const getTextValue = (value: any, isRtl: boolean): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return (isRtl ? value.ar : value.en) || value.en || value.ar || "";
};

export default function SubscriptionGroupsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { t, isRtl } = useAdminLocale();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<TeacherGroup | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeacherKey, setSelectedTeacherKey] = useState("all");

  const [formData, setFormData] = useState({
    teacherKey: "",
    groupName: "",
    pricing: {
      individualRate: 0,
      groupRate: 0,
      studentsPerIndividual: 12,
      currency: "EGP" as "EGP" | "SAR" | "USD",
    },
    notes: "",
  });

  const { teacherGroups, isLoading } = useAppSelector(
    (state) => state.teacherGroups
  );
  const { settings } = useAppSelector((state) => state.settings);
  const { studentMembers = [] } = useAppSelector((state) => state.studentMembers);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!isAuthenticated() || !user) {
      router.push("/login");
      return;
    }

    if (!isAdmin() && !isModerator()) {
      router.push("/");
      return;
    }

    dispatch(getTeacherGroups({ groupType: "group" }));
    dispatch(getStudentMembers({ memberType: "group" }));
    dispatch(getWebsiteSettingsThunk());
  }, [dispatch, user, router]);

  const subscriptionTeachers = settings?.subscriptionTeachers || [];

  const parseTeacherKey = (key: string) => {
    const [type, id] = key.split(":");
    if (!type || !id) return null;
    return { type, id };
  };

  const getGroupTeacherName = (group: TeacherGroup) => {
    if (group.teacherType === "subscription") {
      const subscriptionTeacher =
        group.subscriptionTeacher ||
        subscriptionTeachers.find(
          (teacher: any) =>
            String(teacher._id || teacher.id) ===
            String(group.subscriptionTeacherId || "")
        );
      return getTextValue(subscriptionTeacher?.name, true);
    }

    return getTextValue(group.teacherId?.fullName, true);
  };

  // Only show subscription teachers (not course teachers)
  const teacherOptions = useMemo(() => {
    return subscriptionTeachers
      .map((teacher: any) => {
        const teacherId = teacher._id || teacher.id || "";
        if (!teacherId) return null;
        return {
          key: `subscription:${teacherId}`,
          label: getTextValue(teacher.name, true),
          type: "subscription",
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.label.localeCompare(b.label)) as { key: string; label: string; type: "subscription" }[];
  }, [subscriptionTeachers]);

  const groups = useMemo(
    () => teacherGroups.filter((group) => group.groupType === "group"),
    [teacherGroups]
  );

  const filteredGroups = useMemo(() => {
    let list = groups;
    if (selectedTeacherKey !== "all") {
      const parsed = parseTeacherKey(selectedTeacherKey);
      if (parsed) {
        list = list.filter((group) => {
          const groupType = group.teacherType || "course";
          if (parsed.type === "subscription") {
            return (
              groupType === "subscription" &&
              String(group.subscriptionTeacherId || "") === parsed.id
            );
          }
          return (
            groupType !== "subscription" &&
            String(group.teacherId?.id || group.teacherId?._id || "") === parsed.id
          );
        });
      }
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter((group) => {
        const groupName = getTextValue(group.groupName, isRtl).toLowerCase();
        const teacherName = getGroupTeacherName(group).toLowerCase();
        return groupName.includes(query) || teacherName.includes(query);
      });
    }
    return list;
  }, [groups, selectedTeacherKey, searchQuery, isRtl, subscriptionTeachers]);

  const resetForm = () => {
    setFormData({
      teacherKey: "",
      groupName: "",
      pricing: {
        individualRate: 0,
        groupRate: 0,
        studentsPerIndividual: 12,
        currency: "EGP",
      },
      notes: "",
    });
  };

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const openEditDialog = (group: TeacherGroup) => {
    setSelectedGroup(group);
    const groupTeacherKey =
      group.teacherType === "subscription"
        ? `subscription:${group.subscriptionTeacherId || ""}`
        : `course:${group.teacherId?.id || group.teacherId?._id || ""}`;
    setFormData({
      teacherKey: groupTeacherKey,
      groupName: group.groupName?.ar || group.groupName?.en || "",
      pricing: {
        individualRate: group.pricing?.individualRate ?? 0,
        groupRate: group.pricing?.groupRate ?? 0,
        studentsPerIndividual: group.pricing?.studentsPerIndividual ?? 12,
        currency: group.pricing?.currency ?? "EGP",
      },
      notes: group.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleCreateGroup = async () => {
    const parsedTeacher = parseTeacherKey(formData.teacherKey);
    if (!parsedTeacher) {
      toast.error("يجب اختيار معلم");
      return;
    }

    if (!formData.groupName) {
      toast.error("يجب إدخال اسم الجروب");
      return;
    }

    try {
        const payload: any = {
          groupName: { ar: formData.groupName, en: formData.groupName },
          groupType: "group",
          pricing: formData.pricing,
          permissions: { canUploadCourses: false, canPublishDirectly: false },
          notes: formData.notes,
        };

        if (parsedTeacher.type === "subscription") {
          payload.teacherType = "subscription";
          payload.subscriptionTeacherId = parsedTeacher.id;
        } else {
          payload.teacherType = "course";
          payload.teacherId = parsedTeacher.id;
        }

        await dispatch(createTeacherGroup(payload)).unwrap();
      toast.success("تم إنشاء الجروب");
      setIsCreateDialogOpen(false);
      resetForm();
      await dispatch(getTeacherGroups({ groupType: "group" }));
    } catch (err) {
      console.error("Failed to create group:", err);
      toast.error("فشل إنشاء الجروب");
    }
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroup) return;

    try {
      await dispatch(
        updateTeacherGroup({
          id: (selectedGroup.id || selectedGroup._id)!,
          data: {
            groupName: { ar: formData.groupName, en: formData.groupName },
            pricing: formData.pricing,
            notes: formData.notes,
          },
        })
      ).unwrap();
      toast.success("تم تعديل الجروب");
      setIsEditDialogOpen(false);
      resetForm();
      await dispatch(getTeacherGroups({ groupType: "group" }));
    } catch (err) {
      console.error("Failed to update group:", err);
      toast.error("فشل تعديل الجروب");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الجروب؟")) return;
    try {
      await dispatch(deleteTeacherGroup(groupId)).unwrap();
      toast.success("تم حذف الجروب");
      await dispatch(getTeacherGroups({ groupType: "group" }));
    } catch (err) {
      console.error("Failed to delete group:", err);
      toast.error("فشل حذف الجروب");
    }
  };

  const handleAddStudent = async () => {
    if (!selectedGroup || !selectedStudentId || selectedStudentId === "no-students") {
      toast.error("يجب اختيار طالب");
      return;
    }
    try {
      await dispatch(
        addStudentToGroup({
          groupId: (selectedGroup.id || selectedGroup._id)!,
          studentId: selectedStudentId,
        })
      ).unwrap();
      toast.success("تم إضافة الطالب");
      setIsAddStudentDialogOpen(false);
      setSelectedStudentId("");
      await dispatch(getTeacherGroups({ groupType: "group" }));
    } catch (err) {
      console.error("Failed to add student:", err);
      toast.error("فشل إضافة الطالب");
    }
  };

  const handleRemoveStudent = async (groupId: string, studentId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطالب؟")) return;
    try {
      await dispatch(removeStudentFromGroup({ groupId, studentId })).unwrap();
      await dispatch(getTeacherGroups({ groupType: "group" }));
    } catch (err) {
      console.error("Failed to remove student:", err);
      toast.error("فشل حذف الطالب");
    }
  };

  const handleStatusChange = async (
    groupId: string,
    studentId: string,
    status: "active" | "inactive" | "completed"
  ) => {
    try {
      await dispatch(updateStudentStatus({ groupId, studentId, status })).unwrap();
      await dispatch(getTeacherGroups({ groupType: "group" }));
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error("فشل تعديل الحالة");
    }
  };

  if (isLoading && groups.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-genoun-green border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className={`flex-1 space-y-4 p-8 pt-6 ${isRtl ? "text-right" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {"جروبات الاشتراكات"}
          </h2>
          <p className="text-muted-foreground">
            {"إدارة الجروبات وإضافة الطلاب"}
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsCreateDialogOpen(true);
          }}
          className="bg-genoun-green hover:bg-genoun-green/90"
        >
          <Plus className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
          {"إنشاء جروب"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{"الفلاتر"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="grid gap-2 flex-1">
              <Label>{"بحث بالاسم"}</Label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={"اسم الجروب أو المعلم"}
              />
            </div>
            <div className="grid gap-2 w-full md:w-[260px]">
              <Label>{"تصفية بالمعلم"}</Label>
              <Select value={selectedTeacherKey} onValueChange={setSelectedTeacherKey}>
                <SelectTrigger>
                  <SelectValue placeholder={"اختر المعلم"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{"جميع المعلمين"}</SelectItem>
                  {teacherOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
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
          <CardTitle>{"الجروبات"}</CardTitle>
          <CardDescription>
            {filteredGroups.length === groups.length
              ? `${groups.length} جروب`
              : `${filteredGroups.length} / ${groups.length} جروب`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold">
                {"لا توجد جروبات"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {"أنشئ جروب جديد للبدء"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-10"></TableHead>
                    <TableHead className="h-10">{"اسم الجروب"}</TableHead>
                    <TableHead className="h-10">{"المعلم"}</TableHead>
                    <TableHead className="h-10">{"الطلاب"}</TableHead>
                    <TableHead className="text-right h-10">{"إجراءات"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.map((group) => {
                    const groupId = (group.id || group._id)!;
                    const isExpanded = expandedGroups.includes(groupId);
                    const groupName =
                      getTextValue(group.groupName, true) ||
                      "جروب";
                    const studentCount = group.stats?.totalStudents ?? group.students?.length ?? 0;
                    const activeCount = group.stats?.activeStudents ?? 0;
                    const teacherName = getGroupTeacherName(group);
                    const teacherTypeLabel =
                      group.teacherType === "subscription"
                        ? "اشتراكات"
                        : "كورسات";

                    return (
                      <Fragment key={groupId}>
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                          <TableCell onClick={() => toggleGroupExpand(groupId)}>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{groupName}</TableCell>
                          <TableCell>
                            {teacherName ? `${teacherName} (${teacherTypeLabel})` : `(${teacherTypeLabel})`}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              {activeCount} / {studentCount}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedGroup(group);
                                  setIsAddStudentDialogOpen(true);
                                }}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>{"إجراءات"}</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedGroup(group);
                                      setIsDetailsDialogOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    {"عرض التفاصيل"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEditDialog(group)}>
                                    {"تعديل"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => handleDeleteGroup(groupId)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {"حذف"}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={5}>
                              <div className="p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-bold">{"الطلاب"}</h4>
                                  <Badge variant="outline">
                                    {(group.students || []).length} {"طالب"}
                                  </Badge>
                                </div>
                                {group.students && group.students.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-4">
                                    {"لا يوجد طلاب"}
                                  </p>
                                ) : (
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="hover:bg-transparent">
                                        <TableHead className="h-9 py-2 text-[11px] font-semibold uppercase">
                                          {"اسم الطالب"}
                                        </TableHead>
                                        <TableHead className="h-9 py-2 text-[11px] font-semibold uppercase">
                                          {"رقم الواتساب"}
                                        </TableHead>
                                        <TableHead className="h-9 py-2 text-[11px] font-semibold uppercase">
                                          {"الحالة"}
                                        </TableHead>
                                        <TableHead className="h-9 py-2 text-right text-[11px] font-semibold uppercase">
                                          {"إجراءات"}
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {(group.students || []).map((student) => {
                                        if (!student || !student.studentId) return null;
                                        const studentId = student.studentId?.id || student.studentId?._id;
                                        if (!studentId) return null;
                                        const mappingId = student.id || student._id || studentId;
                                        return (
                                          <TableRow key={mappingId}>
                                            <TableCell className="py-2">
                                              <div className="flex flex-col">
                                                <span className="font-medium text-sm">
                                                  {getTextValue(
                                                    (student.studentId as any)?.name ||
                                                      student.studentId?.studentName,
                                                    isRtl
                                                  )}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground italic">
                                                  {student.studentId?.whatsappNumber ||
                                                    (student.studentId as any)?.phone ||
                                                    "-"}
                                                </span>
                                              </div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                              {student.studentId?.whatsappNumber ||
                                                (student.studentId as any)?.phone ||
                                                "-"}
                                            </TableCell>
                                            <TableCell className="py-2">
                                              <Select
                                                value={student.status}
                                                onValueChange={(val: any) =>
                                                  handleStatusChange(groupId, studentId, val)
                                                }
                                              >
                                                <SelectTrigger className="h-7 text-xs w-[100px]">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="active">
                                                    {"نشط"}
                                                  </SelectItem>
                                                  <SelectItem value="inactive">
                                                    {"غير نشط"}
                                                  </SelectItem>
                                                  <SelectItem value="completed">
                                                    {"مكتمل"}
                                                  </SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </TableCell>
                                            <TableCell className="py-2 text-right">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleRemoveStudent(groupId, studentId)}
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </Button>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{"إنشاء جروب جديد"}</DialogTitle>
            <DialogDescription>{"أدخل بيانات الجروب"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>{"اسم الجروب"}</Label>
              <Input
                value={formData.groupName}
                onChange={(e) =>
                  setFormData({ ...formData, groupName: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>{"المعلم"}</Label>
              <Select
                value={formData.teacherKey}
                onValueChange={(val) => setFormData({ ...formData, teacherKey: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={"اختر المعلم"} />
                </SelectTrigger>
                <SelectContent>
                  {teacherOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{"سعر الجروب"}</Label>
                <Input
                  type="number"
                  value={formData.pricing.groupRate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pricing: { ...formData.pricing, groupRate: Number(e.target.value) },
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>{"العملة"}</Label>
                <Select
                  value={formData.pricing.currency}
                  onValueChange={(val) =>
                    setFormData({
                      ...formData,
                      pricing: { ...formData.pricing, currency: val as "EGP" | "SAR" | "USD" },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EGP">EGP</SelectItem>
                    <SelectItem value="SAR">SAR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{"ملاحظات"}</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {"إلغاء"}
            </Button>
            <Button className="bg-genoun-green hover:bg-genoun-green/90" onClick={handleCreateGroup}>
              {"حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{"تعديل الجروب"}</DialogTitle>
            <DialogDescription>{"تعديل بيانات الجروب"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>{"اسم الجروب"}</Label>
              <Input
                value={formData.groupName}
                onChange={(e) =>
                  setFormData({ ...formData, groupName: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>{"سعر الجروب"}</Label>
              <Input
                type="number"
                value={formData.pricing.groupRate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pricing: { ...formData.pricing, groupRate: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>{"ملاحظات"}</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {"إلغاء"}
            </Button>
            <Button className="bg-genoun-green hover:bg-genoun-green/90" onClick={handleUpdateGroup}>
              {"حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddStudentDialogOpen} onOpenChange={setIsAddStudentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{"إضافة طالب"}</DialogTitle>
            <DialogDescription>
              {"اختر طالب لإضافته إلى"} {getTextValue(selectedGroup?.groupName, true) || "الجروب"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder={"اختر طالب"} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {studentMembers && studentMembers.length > 0 ? (
                  (() => {
                    const availableStudents = studentMembers.filter((student) => {
                      const studentId = (student.id || student._id)!;
                      const isAlreadyInGroup = selectedGroup?.students?.some((s) => {
                        const sId = s?.studentId?.id || s?.studentId?._id;
                        return sId === studentId;
                      });
                      return !isAlreadyInGroup;
                    });

                    if (availableStudents.length === 0) {
                      return (
                        <SelectItem value="no-students" disabled>
                          {"تم إضافة جميع الطلاب بالفعل"}
                        </SelectItem>
                      );
                    }

                    return availableStudents.map((student) => {
                      const studentId = (student.id || student._id)!;
                      const studentName = getTextValue(student.studentName || student.name, true) || "طالب";
                      const phoneNumber = student.whatsappNumber || student.phone || "N/A";
                      return (
                        <SelectItem key={studentId} value={studentId}>
                          {studentName} ({phoneNumber})
                        </SelectItem>
                      );
                    });
                  })()
                ) : (
                  <SelectItem value="no-students" disabled>
                    {"لا يوجد طلاب"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddStudentDialogOpen(false);
                setSelectedStudentId("");
              }}
            >
              {"إلغاء"}
            </Button>
            <Button
              className="bg-genoun-green hover:bg-genoun-green/90"
              onClick={handleAddStudent}
              disabled={!selectedStudentId || selectedStudentId === "no-students"}
            >
              {"إضافة طالب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="text-xl">
              {"تفاصيل الجروب"}
            </DialogTitle>
            <DialogDescription>
              {getTextValue(selectedGroup?.groupName, true) || "جروب"}
            </DialogDescription>
          </DialogHeader>
          {selectedGroup && (
            <div className="space-y-6 py-4">
              {/* Group Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">{"اسم الجروب"}</Label>
                  <p className="font-medium">{getTextValue(selectedGroup.groupName, true) || "جروب"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{"المعلم"}</Label>
                  <p className="font-medium">{getGroupTeacherName(selectedGroup) || "-"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{"سعر الجروب"}</Label>
                  <p className="font-medium">
                    {selectedGroup.pricing?.groupRate || 0} {selectedGroup.pricing?.currency || "EGP"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{"الحالة"}</Label>
                  <Badge variant={selectedGroup.isActive ? "default" : "secondary"}>
                    {selectedGroup.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-genoun-green">
                    {selectedGroup.stats?.totalStudents ?? selectedGroup.students?.length ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">{"إجمالي الطلاب"}</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedGroup.stats?.activeStudents ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">{"طلاب نشطين"}</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {(selectedGroup.stats?.totalStudents ?? selectedGroup.students?.length ?? 0) - (selectedGroup.stats?.activeStudents ?? 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">{"طلاب غير نشطين"}</div>
                </div>
              </div>

              {/* Notes */}
              {selectedGroup.notes && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Label className="text-xs text-yellow-800">{"ملاحظات"}</Label>
                  <p className="text-sm text-yellow-900 mt-1">{selectedGroup.notes}</p>
                </div>
              )}

              {/* Students List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">{"قائمة الطلاب"}</h4>
                  <Badge variant="outline">
                    {selectedGroup.students?.length || 0} {"طالب"}
                  </Badge>
                </div>
                {selectedGroup.students && selectedGroup.students.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">{"اسم الطالب"}</TableHead>
                          <TableHead className="font-semibold">{"رقم الواتساب"}</TableHead>
                          <TableHead className="font-semibold">{"الحالة"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedGroup.students.map((student, index) => {
                          if (!student || !student.studentId) return null;
                          const studentName = getTextValue(
                            (student.studentId as any)?.name || student.studentId?.studentName,
                            true
                          );
                          const phone = student.studentId?.whatsappNumber || (student.studentId as any)?.phone || "-";
                          const status = student.status || "active";
                          return (
                            <TableRow key={student.studentId?.id || student.studentId?._id || index}>
                              <TableCell className="font-medium">{studentName || "طالب"}</TableCell>
                              <TableCell>{phone}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={status === "active" ? "default" : status === "completed" ? "secondary" : "outline"}
                                  className={
                                    status === "active"
                                      ? "bg-green-100 text-green-800"
                                      : status === "completed"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                                  }
                                >
                                  {status === "active" ? "نشط" : status === "completed" ? "مكتمل" : "غير نشط"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    {"لا يوجد طلاب في هذا الجروب"}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              {"إغلاق"}
            </Button>
            <Button
              className="bg-genoun-green hover:bg-genoun-green/90"
              onClick={() => {
                setIsDetailsDialogOpen(false);
                if (selectedGroup) {
                  setSelectedGroup(selectedGroup);
                  setIsAddStudentDialogOpen(true);
                }
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {"إضافة طالب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
