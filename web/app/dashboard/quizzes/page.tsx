"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  getQuizzes,
  deleteQuiz,
  publishQuiz,
} from "@/store/services/quizService";
import { getCourses } from "@/store/services/courseService";
import { isAuthenticated, isAdmin, isModerator, isTeacher } from "@/store/services/authService";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  FileQuestion,
  CheckCircle,
  XCircle,
  BarChart3,
  Clock,
} from "lucide-react";
import Link from "next/link";

export default function QuizzesPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { t, isRtl } = useAdminLocale();
  const canManageQuizzes = isAdmin() || isModerator();
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const { quizzes, isLoading, error } = useAppSelector((state) => state.quizzes);
  const { courses } = useAppSelector((state) => state.courses);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!isAuthenticated() || !user) {
      router.push("/login");
      return;
    }

    if (!isAdmin() && !isModerator() && !isTeacher()) {
      router.push("/");
      return;
    }

    dispatch(getQuizzes());
    dispatch(getCourses({}));
  }, [dispatch, user, router]);

  const handleDelete = async (id: string) => {
    if (
      confirm(
        isRtl
          ? "هل أنت متأكد من حذف هذا الاختبار؟"
          : "Are you sure you want to delete this quiz?"
      )
    ) {
      setDeleteLoading(id);
      try {
        await dispatch(deleteQuiz(id)).unwrap();
      } catch (err) {
        console.error("Failed to delete quiz:", err);
      } finally {
        setDeleteLoading(null);
      }
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await dispatch(publishQuiz(id)).unwrap();
    } catch (err) {
      console.error("Failed to publish quiz:", err);
    }
  };

  const getTextValue = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return (isRtl ? value.ar : value.en) || value.en || value.ar || "";
  };

  const getCourseTitle = (courseId: string) => {
    const course = courses.find((c) => (c.id || c._id) === courseId);
    return course ? getTextValue(course.title) : "-";
  };

  if (isLoading) {
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
            {isRtl ? "إدارة الاختبارات" : "Quizzes Management"}
          </h2>
          <p className="text-muted-foreground">
            {isRtl
              ? "إدارة جميع اختبارات الدورات"
              : "Manage all course quizzes"}
          </p>
        </div>
        <Link href="/dashboard/quizzes/create">
          <Button className="bg-genoun-green hover:bg-genoun-green/90">
            <Plus className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
            {isRtl ? "إنشاء اختبار جديد" : "Create Quiz"}
          </Button>
        </Link>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isRtl ? "إجمالي الاختبارات" : "Total Quizzes"}
            </CardTitle>
            <FileQuestion className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quizzes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isRtl ? "المنشورة" : "Published"}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {quizzes.filter((q) => q.isPublished).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isRtl ? "المسودات" : "Drafts"}
            </CardTitle>
            <XCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {quizzes.filter((q) => !q.isPublished).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isRtl ? "إجمالي المحاولات" : "Total Attempts"}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {quizzes.reduce((acc, q) => acc + (q.stats?.totalAttempts || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isRtl ? "جميع الاختبارات" : "All Quizzes"}</CardTitle>
          <CardDescription>
            {isRtl
              ? `${quizzes.length} اختبار متاح`
              : `${quizzes.length} quizzes available`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quizzes.length === 0 ? (
            <div className="text-center py-12">
              <FileQuestion className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                {isRtl ? "لا توجد اختبارات" : "No quizzes"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isRtl
                  ? "ابدأ بإنشاء اختبار جديد"
                  : "Get started by creating a new quiz"}
              </p>
              <div className="mt-6">
                <Link href="/dashboard/quizzes/create">
                  <Button className="bg-genoun-green hover:bg-genoun-green/90">
                    <Plus className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
                    {isRtl ? "إنشاء اختبار" : "Create Quiz"}
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRtl ? "العنوان" : "Title"}</TableHead>
                  <TableHead>{isRtl ? "الدورة" : "Course"}</TableHead>
                  <TableHead>{isRtl ? "الأسئلة" : "Questions"}</TableHead>
                  <TableHead>{isRtl ? "الوقت" : "Time"}</TableHead>
                  <TableHead>{isRtl ? "درجة النجاح" : "Passing"}</TableHead>
                  <TableHead>{isRtl ? "المحاولات" : "Attempts"}</TableHead>
                  <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="text-right">
                    {isRtl ? "الإجراءات" : "Actions"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quizzes.map((quiz) => (
                  <TableRow key={quiz.id || quiz._id}>
                    <TableCell className="font-medium">
                      {getTextValue(quiz.title)}
                    </TableCell>
                    <TableCell>{getCourseTitle(quiz.courseId)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {quiz.questions?.length || 0} {isRtl ? "سؤال" : "Q"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {quiz.timeLimit ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {quiz.timeLimit} {isRtl ? "د" : "min"}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{quiz.passingScore}%</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary">
                          {quiz.stats?.totalAttempts || 0}
                        </Badge>
                        <span className="text-xs text-green-600">
                          {quiz.stats?.passedAttempts || 0}{" "}
                          {isRtl ? "ناجح" : "passed"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {quiz.isPublished ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {isRtl ? "منشور" : "Published"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          {isRtl ? "مسودة" : "Draft"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>
                            {isRtl ? "الإجراءات" : "Actions"}
                          </DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/quizzes/${quiz.id || quiz._id}/stats`}>
                              <BarChart3 className="h-4 w-4 mr-2" />
                              {isRtl ? "الإحصائيات" : "Statistics"}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/quizzes/${quiz.id || quiz._id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              {isRtl ? "تعديل" : "Edit"}
                            </Link>
                          </DropdownMenuItem>
                          {!quiz.isPublished && (
                            <DropdownMenuItem
                              onClick={() => handlePublish((quiz.id || quiz._id)!)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {isRtl ? "نشر" : "Publish"}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {canManageQuizzes && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete((quiz.id || quiz._id)!)}
                              disabled={deleteLoading === (quiz.id || quiz._id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {deleteLoading === quiz._id
                                ? isRtl
                                  ? "جاري الحذف..."
                                  : "Deleting..."
                                : isRtl
                                ? "حذف"
                                : "Delete"}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
