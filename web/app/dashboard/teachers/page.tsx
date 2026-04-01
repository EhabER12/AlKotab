"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  getTeacherGroups,
  createTeacherGroup,
  updateTeacherGroup,
  deleteTeacherGroup,
  getAllTeachersWithStats,
  addStudentToGroup,
  removeStudentFromGroup,
  updateStudentStatus,
  TeacherGroup,
} from "@/store/services/teacherGroupService";
import {
  assignStudentToTeacher,
  removeStudentFromTeacher,
  getTeacherStudents,
} from "@/store/services/userService";
import { getStudentMembers } from "@/store/services/studentMemberService";
import { isAuthenticated, isAdmin, isTeacher } from "@/store/services/authService";
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
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  UserPlus,
  UserMinus,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ChevronDown,
  ChevronUp,
  DollarSign,
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateTeacherProfitPercentagesThunk } from "@/store/services/teacherProfitService";
import Link from "next/link";

export default function TeachersManagementPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { t, isRtl, locale } = useAdminLocale();
  const { formatMoney } = useCurrency();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<TeacherGroup | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [isManageStudentsOpen, setIsManageStudentsOpen] = useState(false);
  const [selectedTeacherForStudents, setSelectedTeacherForStudents] = useState<any>(null);
  const [teacherStudents, setTeacherStudents] = useState<any[]>([]);
  const [isProfitConfigOpen, setIsProfitConfigOpen] = useState(false);
  const [selectedTeacherForProfit, setSelectedTeacherForProfit] = useState<any>(null);
  const [profitPercentages, setProfitPercentages] = useState({
    courseSales: 0,
    subscriptions: 0,
  });

  const [formData, setFormData] = useState({
    teacherId: "",
    groupName: { ar: "", en: "" },
    groupType: "individual" as "individual" | "group",
    pricing: {
      individualRate: 0,
      groupRate: 0,
      studentsPerIndividual: 12,
      currency: "EGP" as "EGP" | "SAR" | "USD",
    },
    permissions: {
      canUploadCourses: false,
      canPublishDirectly: false,
    },
    notes: "",
  });

  const [selectedStudentId, setSelectedStudentId] = useState("");

  const { teachersWithStats, teacherGroups, isLoading, error } = useAppSelector(
    (state) => state.teacherGroups
  );
  const { studentMembers = [] } = useAppSelector((state) => state.studentMembers);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!isAuthenticated() || !user) {
      router.push("/login");
      return;
    }

    if (!isAdmin() && !isTeacher()) {
      router.push("/");
      return;
    }

    dispatch(getTeacherGroups({ teacherType: "course" }));
    if (isAdmin()) {
      dispatch(getAllTeachersWithStats());
    }
    dispatch(getStudentMembers({}));
  }, [dispatch, user, router]);

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleCreateGroup = async () => {
    try {
      const payload = { ...formData };
      if (isTeacher()) {
        payload.teacherId = user?._id || user?.id || "";
      }
      await dispatch(createTeacherGroup(payload)).unwrap();
      setIsCreateDialogOpen(false);
      resetForm();
      // Refresh the groups list
      await dispatch(getTeacherGroups({ teacherType: "course" }));
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroup) return;
    try {
      await dispatch(
        updateTeacherGroup({ id: (selectedGroup.id || selectedGroup._id)!, data: formData })
      ).unwrap();
      setIsEditDialogOpen(false);
      resetForm();
      // Refresh the groups list
      await dispatch(getTeacherGroups({ teacherType: "course" }));
    } catch (err) {
      console.error("Failed to update group:", err);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (confirm(t("admin.teachers.confirmDelete"))) {
      try {
        await dispatch(deleteTeacherGroup(id)).unwrap();
        // Refresh the groups list
        await dispatch(getTeacherGroups({ teacherType: "course" }));
      } catch (err) {
        console.error("Failed to delete group:", err);
      }
    }
  };

  const handleAddStudent = async () => {
    if (!selectedGroup || !selectedStudentId) {
      alert(isRtl ? "الرجاء اختيار مجموعة وطالب" : "Please select a group and student");
      return;
    }
    try {
      console.log("Adding student:", selectedStudentId, "to group:", selectedGroup.id || selectedGroup._id);
      await dispatch(
        addStudentToGroup({
          groupId: (selectedGroup.id || selectedGroup._id)!,
          studentId: selectedStudentId,
        })
      ).unwrap();
      alert(isRtl ? "تم إضافة الطالب بنجاح!" : "Student added successfully!");
      setIsAddStudentDialogOpen(false);
      setSelectedStudentId("");
      // Refresh the groups list to show updated student counts
      await dispatch(getTeacherGroups({ teacherType: "course" }));
    } catch (err: any) {
      console.error("Failed to add student:", err);
      const errorMsg = err?.message || err?.toString() || "Unknown error";
      alert(isRtl ? `فشل إضافة الطالب: ${errorMsg}` : `Failed to add student: ${errorMsg}`);
    }
  };

  const handleRemoveStudent = async (groupId: string, studentId: string) => {
    if (confirm(t("admin.teachers.confirmRemoveStudent"))) {
      try {
        await dispatch(removeStudentFromGroup({ groupId, studentId })).unwrap();
        // Refresh the groups list to show updated student counts
        await dispatch(getTeacherGroups({ teacherType: "course" }));
      } catch (err) {
        console.error("Failed to remove student:", err);
      }
    }
  };

  const handleStatusChange = async (
    groupId: string,
    studentId: string,
    status: "active" | "inactive" | "completed"
  ) => {
    try {
      await dispatch(updateStudentStatus({ groupId, studentId, status })).unwrap();
      // Refresh the groups list to show updated student counts
      await dispatch(getTeacherGroups({ teacherType: "course" }));
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const fetchTeacherStudents = async (teacherId: string) => {
    try {
      const response = await dispatch(getTeacherStudents({ teacherId })).unwrap();
      if (response && response.data && response.data.results) {
        setTeacherStudents(response.data.results);
      }
    } catch (err) {
      console.error("Failed to fetch teacher students:", err);
    }
  };

  const handleAssignStudentToTeacher = async () => {
    if (!selectedTeacherForStudents || !selectedStudentId) return;
    try {
      const teacherId = selectedTeacherForStudents.id || selectedTeacherForStudents._id;
      await dispatch(assignStudentToTeacher({
        teacherId,
        studentId: selectedStudentId
      })).unwrap();
      // Refresh teacher students list
      await fetchTeacherStudents(teacherId);
      setSelectedStudentId("");
    } catch (err) {
      console.error("Failed to assign student:", err);
    }
  };

  const handleRemoveStudentFromTeacher = async (studentId: string) => {
    if (!selectedTeacherForStudents) return;
    if (confirm(t("admin.teachers.confirmRemoveStudent"))) {
      try {
        const teacherId = selectedTeacherForStudents.id || selectedTeacherForStudents._id;
        await dispatch(removeStudentFromTeacher({
          teacherId,
          studentId
        })).unwrap();
        // Refresh teacher students list
        await fetchTeacherStudents(teacherId);
      } catch (err) {
        console.error("Failed to remove student:", err);
      }
    }
  };

  const handleOpenManageStudents = (teacher: any) => {
    setSelectedTeacherForStudents(teacher);
    fetchTeacherStudents((teacher.id || teacher._id)!);
    setIsManageStudentsOpen(true);
  };

  const handleOpenProfitConfig = (teacher: any) => {
    setSelectedTeacherForProfit(teacher);
    setProfitPercentages({
      courseSales: teacher.teacherInfo?.customProfitPercentages?.courseSales || 0,
      subscriptions: teacher.teacherInfo?.customProfitPercentages?.subscriptions || 0,
    });
    setIsProfitConfigOpen(true);
  };

  const handleSaveProfitConfig = async () => {
    if (!selectedTeacherForProfit) return;

    try {
      await dispatch(
        updateTeacherProfitPercentagesThunk({
          teacherId: (selectedTeacherForProfit.id || selectedTeacherForProfit._id)!,
          courseSales: profitPercentages.courseSales || undefined,
          subscriptions: profitPercentages.subscriptions || undefined,
        })
      ).unwrap();

      // Refresh teachers list
      await dispatch(getAllTeachersWithStats());
      setIsProfitConfigOpen(false);
    } catch (error: any) {
      console.error("Failed to update profit percentages:", error);
    }
  };

  useEffect(() => {
    if (isTeacher() && user) {
      setSelectedTeacherForStudents(user);
      fetchTeacherStudents((user._id || user.id)!);
    }
  }, [user]);

  const resetForm = () => {
    setFormData({
      teacherId: "",
      groupName: { ar: "", en: "" },
      groupType: "individual",
      pricing: {
        individualRate: 0,
        groupRate: 0,
        studentsPerIndividual: 12,
        currency: "EGP",
      },
      permissions: {
        canUploadCourses: false,
        canPublishDirectly: false,
      },
      notes: "",
    });
    setSelectedGroup(null);
  };

  const openEditDialog = (group: TeacherGroup) => {
    setSelectedGroup(group);
    const teacherId = group.teacherId?.id || group.teacherId?._id || '';
    setFormData({
      teacherId: teacherId,
      groupName: {
        ar: group.groupName?.ar || "",
        en: group.groupName?.en || "",
      },
      groupType: group.groupType,
      pricing: {
        individualRate: group.pricing?.individualRate || 0,
        groupRate: group.pricing?.groupRate || 0,
        studentsPerIndividual: group.pricing?.studentsPerIndividual || 12,
        currency: group.pricing?.currency || "EGP",
      },
      permissions: {
        canUploadCourses: group.permissions?.canUploadCourses || false,
        canPublishDirectly: group.permissions?.canPublishDirectly || false,
      },
      notes: group.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const getTextValue = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return (isRtl ? value.ar : value.en) || value.en || value.ar || "";
  };

  if (isLoading && teacherGroups.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-16 w-16 animate-spin text-genoun-green" />
      </div>
    );
  }

  return (
    <div
      className={`flex-1 space-y-4 p-4 md:p-6 lg:p-8 pt-4 md:pt-6 ${isRtl ? "text-right" : ""}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            {t("admin.teachers.title")}
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">{t("admin.teachers.description")}</p>
        </div>
      </div>

      <Tabs defaultValue="teachers" className="space-y-4">
        <TabsList>
          {isAdmin() && <TabsTrigger value="teachers">{t("admin.teachers.allTeachers")}</TabsTrigger>}
        </TabsList>

        {/* Groups Tab - Hidden */}
        {false && <TabsContent value="groups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.teachers.teacherGroups")}</CardTitle>
              <CardDescription>
                {teacherGroups.length} {t("admin.teachers.totalGroups")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teacherGroups.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold">
                    {t("admin.teachers.noGroups")}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {t("admin.teachers.createFirst")}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-10"></TableHead>
                        <TableHead className="h-10">{t("admin.teachers.groupName")}</TableHead>
                        <TableHead className="h-10">{t("admin.teachers.teacher")}</TableHead>
                        <TableHead className="h-10">{t("admin.teachers.groupType")}</TableHead>
                        <TableHead className="h-10">{t("admin.teachers.students")}</TableHead>
                        <TableHead className="h-10">{t("admin.teachers.expectedRevenue")}</TableHead>
                        <TableHead className="text-right h-10">{t("admin.teachers.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teacherGroups.map((group) => {
                        const groupId = (group.id || group._id)!;
                        return (
                          <>
                            <TableRow key={groupId} className="cursor-pointer hover:bg-muted/50">
                              <TableCell onClick={() => toggleGroupExpand(groupId)}>
                                {expandedGroups.includes(groupId) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {getTextValue(group.groupName) || (group.groupType === "individual" ? t("admin.teachers.types.individual") : t("admin.teachers.types.group"))}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {group.teacherId?.fullName && getTextValue(group.teacherId.fullName)}
                                  {group.teacherId?.email && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {group.teacherId.email}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={group.groupType === "group" ? "default" : "secondary"}>
                                  {t(`admin.teachers.types.${group.groupType}`)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3 text-muted-foreground" />
                                  {group.stats.activeStudents} / {group.stats.totalStudents}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-bold text-genoun-green">
                                  {formatMoney(group.expectedRevenue || 0, group.pricing.currency)}
                                </span>
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
                                      <DropdownMenuLabel>{t("admin.teachers.actions")}</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => openEditDialog(group)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        {t("admin.common.edit")}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-red-600"
                                        onClick={() => handleDeleteGroup(groupId)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {t("admin.common.delete")}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                            {/* Expanded Students List */}
                            {expandedGroups.includes(groupId) && (
                              <TableRow className="bg-muted/30">
                                <TableCell colSpan={7}>
                                  <div className="p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-sm font-bold">{t("admin.teachers.students")}</h4>
                                      <Badge variant="outline">{(group.students || []).length} {t("admin.teachers.totalStudents")}</Badge>
                                    </div>
                                    {group.students && group.students.length === 0 ? (
                                      <p className="text-xs text-muted-foreground text-center py-4">{t("admin.teachers.noStudents")}</p>
                                    ) : (
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="hover:bg-transparent">
                                            <TableHead className="h-9 py-2 text-[11px] font-semibold uppercase">{t("admin.teachers.selectStudent")}</TableHead>
                                            <TableHead className="h-9 py-2 text-[11px] font-semibold uppercase">{t("admin.teachers.studentStatus")}</TableHead>
                                            <TableHead className="h-9 py-2 text-[11px] font-semibold uppercase">{t("admin.teachers.assignedDate")}</TableHead>
                                            <TableHead className="h-9 py-2 text-right text-[11px] font-semibold uppercase">{t("admin.teachers.actions")}</TableHead>
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
                                                      {getTextValue((student.studentId as any)?.name || student.studentId?.studentName)}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground italic">
                                                      {student.studentId?.whatsappNumber || (student.studentId as any)?.phone || '-'}
                                                    </span>
                                                  </div>
                                                </TableCell>
                                                <TableCell className="py-2">
                                                  <Select
                                                    value={student.status}
                                                    onValueChange={(val: any) => handleStatusChange(groupId, studentId, val)}
                                                  >
                                                    <SelectTrigger className="h-7 text-xs w-[100px]">
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="active">{t("admin.teachers.statuses.active")}</SelectItem>
                                                      <SelectItem value="inactive">{t("admin.teachers.statuses.inactive")}</SelectItem>
                                                      <SelectItem value="completed">{t("admin.teachers.statuses.completed")}</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </TableCell>
                                                <TableCell className="py-2 text-xs text-muted-foreground">
                                                  {student.assignedDate ? new Date(student.assignedDate).toLocaleDateString() : '-'}
                                                </TableCell>
                                                <TableCell className="py-2 text-right">
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleRemoveStudent(groupId, studentId)}
                                                  >
                                                    <UserMinus className="h-3.5 w-3.5" />
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
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>}

        {/* My Students Tab - Hidden */}
        {false && isTeacher() && (
          <TabsContent value="my-students">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>{t("admin.teachers.myStudents")}</CardTitle>
                    <CardDescription>{teacherStudents.length} {t("admin.teachers.totalStudents")}</CardDescription>
                  </div>
                  <Button onClick={() => setIsManageStudentsOpen(true)} className="w-full sm:w-auto">
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t("admin.teachers.addStudent")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-10">{t("admin.teachers.studentName")}</TableHead>
                        <TableHead className="h-10">{t("admin.teachers.whatsapp")}</TableHead>
                        <TableHead className="h-10">{t("admin.teachers.email")}</TableHead>
                        <TableHead className="text-right h-10">{t("admin.teachers.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teacherStudents.map((student) => {
                        const studentId = student.id || student._id;
                        return (
                          <TableRow key={studentId}>
                            <TableCell className="font-medium">{getTextValue(student.fullName)}</TableCell>
                            <TableCell>{student.whatsappNumber || "-"}</TableCell>
                            <TableCell>{student.email}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleRemoveStudentFromTeacher(studentId)}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {teacherStudents.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            {t("admin.teachers.noStudents")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Teachers List Tab */}
        <TabsContent value="teachers">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.teachers.allTeachers")}</CardTitle>
              <CardDescription>
                {teachersWithStats.length} {teachersWithStats.length === 1 ? t("admin.teachers.teacher") : t("admin.teachers.teachers")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teachersWithStats.map((teacher) => {
                  const teacherId = (teacher.id || teacher._id)!;
                  return (
                    <Card key={teacherId} className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardHeader className="bg-muted/30 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-genoun-green/10 flex items-center justify-center text-genoun-green font-bold text-base sm:text-lg flex-shrink-0">
                            {getTextValue(teacher.fullName).charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm sm:text-base truncate">{getTextValue(teacher.fullName)}</CardTitle>
                            <CardDescription className="text-xs truncate">{teacher.email}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4 grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase">{t("admin.teachers.totalStudents")}</p>
                          <p className="font-bold">{teacher.statistics.totalStudents}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase">{t("admin.teachers.activeStudents")}</p>
                          <p className="font-bold text-green-600">{teacher.statistics.activeStudents}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase">{t("admin.teachers.totalGroups")}</p>
                          <p className="font-bold">{teacher.statistics.totalGroups}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase">{t("admin.teachers.expectedRevenue")}</p>
                          <p className="font-bold text-genoun-green">{formatMoney(teacher.statistics.expectedRevenue, "EGP")}</p>
                        </div>
                        <div className="col-span-2 pt-2 border-t flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {teacher.teacherInfo?.isApproved ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                {t("admin.teachers.approved")}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <ShieldAlert className="h-3 w-3 mr-1" />
                                {t("admin.teachers.notApproved")}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleOpenProfitConfig(teacher)}>
                              <DollarSign className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">{isRtl ? "الأرباح" : "Profit"}</span>
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleOpenManageStudents(teacher)}>
                              <Users className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">{t("admin.teachers.students")}</span>
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                              <Link href={`/dashboard/users?search=${teacher.email}`}>
                                <Settings className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">{t("admin.teachers.actions")}</span>
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen ? t("admin.teachers.editGroup") : t("admin.teachers.createGroup")}
            </DialogTitle>
            <DialogDescription>
              {t("admin.teachers.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Teacher Selection */}
            {isAdmin() && (
              <div className="grid gap-2">
                <Label>{t("admin.teachers.teacher")}</Label>
                <Select
                  value={formData.teacherId}
                  onValueChange={(val) => setFormData({ ...formData, teacherId: val })}
                  disabled={isEditDialogOpen}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.teachers.selectTeacher")} />
                  </SelectTrigger>
                  <SelectContent>
                    {teachersWithStats.map((teacher) => {
                      const teacherId = (teacher.id || teacher._id)!;
                      return (
                        <SelectItem key={teacherId} value={teacherId}>
                          {getTextValue(teacher.fullName)} ({teacher.email})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Group Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("admin.teachers.groupName")} (AR)</Label>
                <Input
                  value={formData.groupName.ar}
                  onChange={(e) => setFormData({ ...formData, groupName: { ...formData.groupName, ar: e.target.value } })}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("admin.teachers.groupName")} (EN)</Label>
                <Input
                  value={formData.groupName.en}
                  onChange={(e) => setFormData({ ...formData, groupName: { ...formData.groupName, en: e.target.value } })}
                />
              </div>
            </div>

            {/* Group Type & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("admin.teachers.groupType")}</Label>
                <Select
                  value={formData.groupType}
                  onValueChange={(val: any) => setFormData({ ...formData, groupType: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">{t("admin.teachers.types.individual")}</SelectItem>
                    <SelectItem value="group">{t("admin.teachers.types.group")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("admin.teachers.currency")}</Label>
                <Select
                  value={formData.pricing.currency}
                  onValueChange={(val: any) => setFormData({ ...formData, pricing: { ...formData.pricing, currency: val } })}
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

            {/* Pricing Section */}
            <div className="border p-4 rounded-lg space-y-4">
              <h4 className="font-bold text-sm border-b pb-2">{t("admin.teachers.pricing")}</h4>

              {formData.groupType === "individual" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>{t("admin.teachers.individualRate")}</Label>
                    <Input
                      type="number"
                      value={formData.pricing.individualRate}
                      onChange={(e) => setFormData({ ...formData, pricing: { ...formData.pricing, individualRate: Number(e.target.value) } })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("admin.teachers.studentsPerRate")}</Label>
                    <Input
                      type="number"
                      value={formData.pricing.studentsPerIndividual}
                      onChange={(e) => setFormData({ ...formData, pricing: { ...formData.pricing, studentsPerIndividual: Number(e.target.value) } })}
                    />
                    <p className="text-[10px] text-muted-foreground">{t("admin.teachers.studentsPerRateDesc")}</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>{t("admin.teachers.groupRate")}</Label>
                  <Input
                    type="number"
                    value={formData.pricing.groupRate}
                    onChange={(e) => setFormData({ ...formData, pricing: { ...formData.pricing, groupRate: Number(e.target.value) } })}
                  />
                </div>
              )}
            </div>

            {/* Permissions */}
            <div className="border p-4 rounded-lg space-y-4">
              <h4 className="font-bold text-sm border-b pb-2">{t("admin.teachers.permissions")}</h4>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="can-upload">{t("admin.teachers.canUploadCourses")}</Label>
                  <input
                    id="can-upload"
                    type="checkbox"
                    checked={formData.permissions.canUploadCourses}
                    onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canUploadCourses: e.target.checked } })}
                    className="h-4 w-4 rounded border-gray-300 text-genoun-green focus:ring-genoun-green"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="can-publish">{t("admin.teachers.canPublishDirectly")}</Label>
                  <input
                    id="can-publish"
                    type="checkbox"
                    checked={formData.permissions.canPublishDirectly}
                    onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canPublishDirectly: e.target.checked } })}
                    className="h-4 w-4 rounded border-gray-300 text-genoun-green focus:ring-genoun-green"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label>{t("admin.teachers.notes")}</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); setIsEditDialogOpen(false); resetForm(); }}>
              {t("admin.common.cancel")}
            </Button>
            <Button
              className="bg-genoun-green hover:bg-genoun-green/90"
              onClick={isEditDialogOpen ? handleUpdateGroup : handleCreateGroup}
              disabled={!formData.teacherId && isAdmin()}
            >
              {isEditDialogOpen ? t("admin.common.save") : t("admin.common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Student Dialog */}
      <Dialog open={isAddStudentDialogOpen} onOpenChange={setIsAddStudentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.teachers.addStudent")}</DialogTitle>
            <DialogDescription>
              {t("admin.teachers.selectStudent")} {t("admin.teachers.to")} {getTextValue(selectedGroup?.groupName) || t("admin.teachers.group")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={selectedStudentId}
              onValueChange={(val) => {
                console.log("Student selected:", val);
                setSelectedStudentId(val);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("admin.teachers.selectStudent")} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {studentMembers && studentMembers.length > 0 ? (
                  (() => {
                    const availableStudents = studentMembers.filter((student) => {
                      const studentId = (student.id || student._id)!;
                      const isAlreadyInGroup = selectedGroup?.students?.some(s => {
                        const sId = s?.studentId?.id || s?.studentId?._id;
                        return sId === studentId;
                      });
                      return !isAlreadyInGroup;
                    });

                    if (availableStudents.length === 0) {
                      return (
                        <SelectItem value="no-students" disabled>
                          {isRtl ? "جميع الطلاب مضافين بالفعل" : "All students already added"}
                        </SelectItem>
                      );
                    }

                    return availableStudents.map((student) => {
                      const studentId = (student.id || student._id)!;
                      const studentName = getTextValue(student.studentName || student.name || { ar: "طالب", en: "Student" });
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
                    {t("admin.teachers.noStudents")}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {selectedStudentId && (
              <p className="text-sm text-green-600 mt-2">
                {isRtl ? "تم اختيار طالب" : "Student selected"}: {selectedStudentId}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddStudentDialogOpen(false);
              setSelectedStudentId("");
            }}>
              {t("admin.common.cancel")}
            </Button>
            <Button
              className="bg-genoun-green hover:bg-genoun-green/90"
              onClick={handleAddStudent}
              disabled={!selectedStudentId || selectedStudentId === "no-students"}
            >
              {t("admin.teachers.addStudent")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isManageStudentsOpen} onOpenChange={setIsManageStudentsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isTeacher() ? t("admin.teachers.myStudents") : `${t("admin.teachers.manageStudents")} - ${getTextValue(selectedTeacherForStudents?.fullName || "")}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-end gap-4 p-4 border rounded-lg bg-muted/20">
              <div className="flex-1 w-full space-y-2">
                <Label>{t("admin.teachers.addStudent")}</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.teachers.selectStudent")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {studentMembers && studentMembers.length > 0 ? (
                      studentMembers.map((student) => {
                        const studentId = student.id || student._id;
                        const isAssigned = teacherStudents.some(s => (s.id || s._id) === studentId);
                        if (isAssigned) return null;

                        const studentName = getTextValue(student.studentName || student.name || { ar: "طالب", en: "Student" });
                        const phoneNumber = student.whatsappNumber || student.phone || "N/A";

                        return (
                          <SelectItem key={studentId} value={studentId!}>
                            {studentName} ({phoneNumber})
                          </SelectItem>
                        );
                      })
                    ) : (
                      <SelectItem value="no-students" disabled>
                        {t("admin.teachers.noStudents")}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAssignStudentToTeacher} disabled={!selectedStudentId} className="w-full sm:w-auto">
                <UserPlus className="h-4 w-4 mr-2" />
                {t("admin.teachers.addStudent")}
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-10">{t("admin.teachers.studentName")}</TableHead>
                    <TableHead className="h-10">{t("admin.teachers.whatsapp")}</TableHead>
                    <TableHead className="text-right h-10">{t("admin.teachers.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacherStudents.map((student) => {
                    const studentId = student.id || student._id;
                    return (
                      <TableRow key={studentId}>
                        <TableCell className="font-medium">{getTextValue(student.fullName)}</TableCell>
                        <TableCell>{student.whatsappNumber || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveStudentFromTeacher(studentId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {teacherStudents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                        {t("admin.teachers.noStudents")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profit Configuration Dialog */}
      <Dialog open={isProfitConfigOpen} onOpenChange={setIsProfitConfigOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isRtl ? "إعدادات أرباح المعلم" : "Teacher Profit Configuration"}
            </DialogTitle>
            <DialogDescription>
              {isRtl
                ? `ضبط نسب الأرباح الخاصة بـ ${selectedTeacherForProfit ? getTextValue(selectedTeacherForProfit.fullName) : ""}`
                : `Configure custom profit percentages for ${selectedTeacherForProfit ? getTextValue(selectedTeacherForProfit.fullName) : ""}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Course Sales Percentage */}
            <div className="space-y-2">
              <Label htmlFor="courseSalesProfit" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                {isRtl ? "نسبة مبيعات الدورات (%)" : "Course Sales Percentage (%)"}
              </Label>
              <Input
                id="courseSalesProfit"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={profitPercentages.courseSales}
                onChange={(e) =>
                  setProfitPercentages((prev) => ({
                    ...prev,
                    courseSales: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder={isRtl ? "اترك فارغاً للافتراضي" : "Leave empty for default"}
              />
              <p className="text-sm text-muted-foreground">
                {isRtl
                  ? "إذا تركت 0 أو فارغاً، سيتم استخدام النسبة العامة من الإعدادات"
                  : "If left at 0 or empty, the global percentage from settings will be used"}
              </p>
            </div>

            {/* Subscription Percentage */}
            <div className="space-y-2">
              <Label htmlFor="subscriptionProfit" className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                {isRtl ? "نسبة الاشتراكات (%)" : "Subscription Percentage (%)"}
              </Label>
              <Input
                id="subscriptionProfit"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={profitPercentages.subscriptions}
                onChange={(e) =>
                  setProfitPercentages((prev) => ({
                    ...prev,
                    subscriptions: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder={isRtl ? "اترك فارغاً للافتراضي" : "Leave empty for default"}
              />
              <p className="text-sm text-muted-foreground">
                {isRtl
                  ? "إذا تركت 0 أو فارغاً، سيتم استخدام النسبة العامة من الإعدادات"
                  : "If left at 0 or empty, the global percentage from settings will be used"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfitConfigOpen(false)}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSaveProfitConfig} className="bg-genoun-green hover:bg-genoun-green/90">
              {isRtl ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
