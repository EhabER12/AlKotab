"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getStudentMembers } from "@/store/services/studentMemberService";
import { getAllTeachersWithStats } from "@/store/services/teacherGroupService";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  UserCircle,
  Phone,
  Mail,
  Search,
  GraduationCap,
  Calendar,
  Package as PackageIcon,
} from "lucide-react";
import { format } from "date-fns";

interface TeacherWithStudents {
  id: string;
  fullName: {
    ar?: string;
    en?: string;
  };
  email: string;
  profilePic?: string;
  students: any[];
}

export default function TeacherDetailsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { t, isRtl } = useAdminLocale();

  const [searchQuery, setSearchQuery] = useState("");
  const [teachersWithStudents, setTeachersWithStudents] = useState<TeacherWithStudents[]>([]);

  const { studentMembers, isLoading: studentsLoading } = useAppSelector((state) => state.studentMembers);
  const { teachersWithStats, isLoading: teachersLoading } = useAppSelector((state) => state.teacherGroups);
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

    dispatch(getStudentMembers({}));
    dispatch(getAllTeachersWithStats());
  }, [dispatch, user, router]);

  useEffect(() => {
    if (teachersWithStats && studentMembers) {
      // Group students by teacher
      const teacherMap = new Map<string, TeacherWithStudents>();

      // Initialize all teachers
      teachersWithStats.forEach((teacher) => {
        const teacherId = teacher.id || teacher._id;
        if (teacherId) {
          teacherMap.set(teacherId, {
            id: teacherId,
            fullName: teacher.fullName,
            email: teacher.email,
            profilePic: teacher.profilePic,
            students: [],
          });
        }
      });

      // Add students to their assigned teachers
      studentMembers.forEach((student) => {
        if (student.assignedTeacherId) {
          const teacherId = student.assignedTeacherId.id || student.assignedTeacherId._id;
          if (teacherId && teacherMap.has(teacherId)) {
            teacherMap.get(teacherId)!.students.push(student);
          }
        }
      });

      setTeachersWithStudents(Array.from(teacherMap.values()));
    }
  }, [teachersWithStats, studentMembers]);

  const getTextValue = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return (isRtl ? value.ar : value.en) || value.en || value.ar || "";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">{isRtl ? "نشط" : "Active"}</Badge>;
      case "due_soon":
        return <Badge className="bg-yellow-100 text-yellow-800">{isRtl ? "تجديد قريباً" : "Due Soon"}</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">{isRtl ? "متأخر" : "Overdue"}</Badge>;
      case "paused":
        return <Badge className="bg-gray-100 text-gray-800">{isRtl ? "موقف" : "Paused"}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredTeachers = teachersWithStudents.filter((teacher) => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    const nameAr = teacher.fullName.ar?.toLowerCase() || "";
    const nameEn = teacher.fullName.en?.toLowerCase() || "";
    const email = teacher.email.toLowerCase();
    
    return nameAr.includes(searchLower) || nameEn.includes(searchLower) || email.includes(searchLower);
  });

  const totalTeachers = teachersWithStudents.length;
  const teachersWithActiveStudents = teachersWithStudents.filter(t => 
    t.students.some(s => s.status === "active")
  ).length;
  const totalStudentsAssigned = teachersWithStudents.reduce((sum, t) => sum + t.students.length, 0);

  if (studentsLoading || teachersLoading) {
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
            {isRtl ? "تفاصيل المدرسين" : "Teacher Details"}
          </h2>
          <p className="text-muted-foreground">
            {isRtl
              ? "عرض جميع المدرسين وطلاب الباقات المسجلين لكل مدرس"
              : "View all teachers and their assigned package students"}
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isRtl ? "إجمالي المدرسين" : "Total Teachers"}
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTeachers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isRtl ? "مدرسين لديهم طلاب نشطين" : "Teachers with Active Students"}
            </CardTitle>
            <UserCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{teachersWithActiveStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isRtl ? "إجمالي الطلاب المسجلين" : "Total Students Assigned"}
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalStudentsAssigned}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>{isRtl ? "البحث" : "Search"}</CardTitle>
          <CardDescription>
            {isRtl ? "ابحث عن مدرس بالاسم أو البريد الإلكتروني" : "Search for a teacher by name or email"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className={`absolute top-2.5 h-4 w-4 text-muted-foreground ${isRtl ? "right-2" : "left-2"}`} />
            <Input
              placeholder={isRtl ? "ابحث عن مدرس..." : "Search for a teacher..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={isRtl ? "pr-8" : "pl-8"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Teachers List */}
      <Card>
        <CardHeader>
          <CardTitle>{isRtl ? "قائمة المدرسين" : "Teachers List"}</CardTitle>
          <CardDescription>
            {isRtl
              ? `عرض ${filteredTeachers.length} من ${totalTeachers} مدرس`
              : `Showing ${filteredTeachers.length} of ${totalTeachers} teachers`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTeachers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                {isRtl ? "لا يوجد مدرسين" : "No teachers found"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isRtl ? "لم يتم العثور على مدرسين يطابقون البحث" : "No teachers match your search"}
              </p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredTeachers.map((teacher, index) => {
                const activeStudents = teacher.students.filter(s => s.status === "active").length;
                const totalStudents = teacher.students.length;
                
                return (
                  <AccordionItem key={teacher.id} value={`teacher-${index}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className={`flex items-center gap-4 w-full ${isRtl ? "flex-row-reverse" : ""}`}>
                        <div className={`flex items-center gap-3 flex-1 ${isRtl ? "flex-row-reverse" : ""}`}>
                          {teacher.profilePic ? (
                            <img
                              src={teacher.profilePic}
                              alt={getTextValue(teacher.fullName)}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-genoun-green/10 flex items-center justify-center">
                              <UserCircle className="h-6 w-6 text-genoun-green" />
                            </div>
                          )}
                          <div className={isRtl ? "text-right" : "text-left"}>
                            <p className="font-medium">{getTextValue(teacher.fullName)}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {teacher.email}
                            </p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-4 ${isRtl ? "flex-row-reverse" : ""}`}>
                          <Badge variant="outline" className="bg-blue-50">
                            {isRtl ? `${totalStudents} طالب` : `${totalStudents} students`}
                          </Badge>
                          {activeStudents > 0 && (
                            <Badge className="bg-green-100 text-green-800">
                              {isRtl ? `${activeStudents} نشط` : `${activeStudents} active`}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {teacher.students.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          {isRtl ? "لا يوجد طلاب مسجلين لهذا المدرس" : "No students assigned to this teacher"}
                        </div>
                      ) : (
                        <div className="overflow-x-auto pt-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{isRtl ? "الاسم" : "Name"}</TableHead>
                                <TableHead>{isRtl ? "رقم الهاتف" : "Phone"}</TableHead>
                                <TableHead>{isRtl ? "الباقة" : "Package"}</TableHead>
                                <TableHead>{isRtl ? "تاريخ البداية" : "Start Date"}</TableHead>
                                <TableHead>{isRtl ? "التجديد القادم" : "Next Due"}</TableHead>
                                <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {teacher.students.map((student) => (
                                <TableRow key={student.id || student._id}>
                                  <TableCell className="font-medium">
                                    {getTextValue(student.studentName || student.name)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-4 w-4 text-muted-foreground" />
                                      <span dir="ltr">{student.phone || student.whatsappNumber}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                      <PackageIcon className="h-3 w-3 mr-1" />
                                      {student.packageId ? getTextValue(student.packageId.name) : (isRtl ? "غير محدد" : "N/A")}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      {student.startDate ? format(new Date(student.startDate), "yyyy-MM-dd") : "-"}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className={`font-medium ${
                                      student.status === 'overdue' ? 'text-red-600' :
                                      student.status === 'due_soon' ? 'text-orange-600' : ''
                                    }`}>
                                      {student.nextDueDate ? format(new Date(student.nextDueDate), "yyyy-MM-dd") : "-"}
                                    </div>
                                  </TableCell>
                                  <TableCell>{getStatusBadge(student.status)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
