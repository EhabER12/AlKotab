"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  getStudentMembers,
  deleteStudentMember,
  importStudentMembers,
  exportStudentMembers,
  createStudentMember,
  StudentMember,
  StudentMemberType,
} from "@/store/services/studentMemberService";
import { getPackages } from "@/store/services/packageService";
import {
  addStudentToGroup,
  getAllTeachersWithStats,
  getTeacherGroups,
} from "@/store/services/teacherGroupService";
import { getWebsiteSettingsThunk } from "@/store/services/settingsService";
import {
  bulkIssuePackageCertificates,
  issueCertificate,
  downloadCertificate,
  getAllTemplates,
  getCertificates,
} from "@/store/services/certificateService";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Upload,
  UserCircle,
  Calendar,
  Phone,
  FileText,
  AlertCircle,
  Download,
  Award,
  Plus,
  Info,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "react-hot-toast";

interface StudentMembersPageContentProps {
  memberType?: StudentMemberType;
}

export function StudentMembersPageContent({
  memberType = "direct",
}: StudentMembersPageContentProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { t, isRtl } = useAdminLocale();
  const isGroupMode = memberType === "group";
  const pageTitle = isGroupMode
    ? isRtl
      ? "طلاب الاشتراكات"
      : "Subscription Students"
    : isRtl
      ? "الطلاب المسجلين"
      : "Registered Students";
  const pageDescription = isGroupMode
    ? isRtl
      ? "إدارة طلاب الجروبات الخاصة بالاشتراكات"
      : "Manage subscription group students"
    : isRtl
      ? "إدارة الطلاب الفردي المشتركين في الباقات"
      : "Manage direct subscription students";
  const emptyStateTitle = isGroupMode
    ? isRtl
      ? "لا يوجد طلاب اشتراكات"
      : "No subscription students"
    : isRtl
      ? "لا يوجد طلاب مسجلين"
      : "No registered students";
  const effectivePlanType = isGroupMode ? "group" : "package";


  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSheetName, setImportSheetName] = useState("");
  const [importResult, setImportResult] = useState<any>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("all");
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>("all");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("all");
  const [showOverdueOnly, setShowOverdueOnly] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [certificateLoading, setCertificateLoading] = useState<string | null>(null);

  // Add Student Dialog State
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: "",
    phone: "",
    governorate: "",
    planType: effectivePlanType,
    packageId: "",
    groupId: "",
    teacherId: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(new Date().setMonth(new Date().getMonth() + 1)), "yyyy-MM-dd"),
  });

  const { studentMembers, isLoading } = useAppSelector((state) => state.studentMembers);
  const { packages } = useAppSelector((state) => state.packages);
  const { templates, certificates } = useAppSelector((state) => state.certificates);
  const { user } = useAppSelector((state) => state.auth);
  const { teachersWithStats, teacherGroups } = useAppSelector((state) => state.teacherGroups);
  const { settings } = useAppSelector((state) => state.settings);

  // Get subscription teachers from settings
  const subscriptionTeachers = settings?.subscriptionTeachers || [];
  const reloadStudents = () => dispatch(getStudentMembers({ memberType }));

  useEffect(() => {
    if (!isAuthenticated() || !user) {
      router.push("/login");
      return;
    }

    if (!isAdmin() && !isModerator()) {
      router.push("/");
      return;
    }

    reloadStudents();
    dispatch(getAllTeachersWithStats());
    dispatch(getTeacherGroups({ groupType: "group", isActive: true, teacherType: "subscription" }));
    dispatch(getWebsiteSettingsThunk());
    if (!isGroupMode) {
      dispatch(getPackages());
      dispatch(getCertificates());
      // Try to get templates, but don't fail if it errors
      dispatch(getAllTemplates()).catch((err) => {
        console.warn("Failed to load templates:", err);
      });
    }
  }, [dispatch, isGroupMode, memberType, user, router]);

  const handleDelete = async (id: string) => {
    if (
      confirm("هل أنت متأكد من حذف هذا الطالب؟")
    ) {
      setDeleteLoading(id);
      try {
        await dispatch(deleteStudentMember(id)).unwrap();
        toast.success("تم حذف الطالب بنجاح");
        reloadStudents();
      } catch (err) {
        console.error("Failed to delete student:", err);
        toast.error("فشل حذف الطالب");
      } finally {
        setDeleteLoading(null);
      }
    }
  };


  const handleGenerateCertificates = async () => {
    if (selectedPackageId === "all") {
      toast.error("الرجاء اختيار باقة أولاً");
      return;
    }

    if (confirm("هل أنت متأكد من استخراج شهادات لجميع الطلاب النشطين في هذه الباقة؟")) {
      setGenerateLoading(true);
      try {
        // Step 1: Issue certificates
        const result = await dispatch(bulkIssuePackageCertificates(selectedPackageId)).unwrap();

        const successCount = result.data?.success?.length || 0;
        const failedCount = result.data?.failed?.length || 0;

        if (successCount > 0) {
          toast.success(
            `تم إصدار ${successCount} شهادة بنجاح. جاري التحميل...`
          );

          // Step 2: Refresh certificates list
          await dispatch(getCertificates()).unwrap();

          // Step 3: Download each certificate
          const issuedCertificates = result.data?.success || [];
          let downloadedCount = 0;

          for (const cert of issuedCertificates) {
            const certId = cert.certificateId || cert.certificate?.id || cert.certificate?._id;
            if (certId) {
              try {
                // Wait a bit between downloads to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 500));

                const blob = await dispatch(downloadCertificate(certId)).unwrap();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                // Handle name as object or string
                const nameValue = cert.name;
                const studentName = typeof nameValue === 'object'
                  ? (nameValue?.ar || nameValue?.en || `student_${downloadedCount + 1}`)
                  : (nameValue || cert.studentName || `student_${downloadedCount + 1}`);
                link.download = `certificate-${String(studentName).replace(/\s+/g, "_")}.pdf`;
                link.click();
                window.URL.revokeObjectURL(url);
                downloadedCount++;
              } catch (downloadErr) {
                console.error(`Failed to download certificate ${certId}:`, downloadErr);
              }
            }
          }

          if (downloadedCount > 0) {
            toast.success(
              `تم تحميل ${downloadedCount} شهادة بنجاح`
            );
          }
        }

        if (failedCount > 0) {
          const failedNames = result.data.failed.map((f: any) => {
            const name = f.name;
            return typeof name === 'object' ? (name?.ar || name?.en || 'Unknown') : (name || 'Unknown');
          }).join("، ");
          const msg = `فشل إصدار ${failedCount} شهادة. الطلاب: ${failedNames}.`;

          toast.error(msg, { duration: 6000 });
          console.error("Failed certificates:", result.data.failed);
        }
      } catch (err: any) {
        console.error("Bulk certificate generation failed:", err);
        toast.error(err || "Failed to generate certificates");
      } finally {
        setGenerateLoading(false);
      }
    }
  };

  const downloadCertificatesSheet = () => {
    // Get certificates for the selected package
    const packageCerts = certificates.filter((cert: any) => {
      const certPackageId = cert.packageId?.id || cert.packageId?._id || cert.packageId;
      return certPackageId && String(certPackageId) === String(selectedPackageId);
    });

    if (packageCerts.length === 0) {
      toast.error("لا توجد شهادات لهذه الباقة بعد. قم بإنشاء الشهادات أولاً.");
      return;
    }

    // Build CSV with only certificate number and name
    const rows = packageCerts.map((cert: any) => {
      const certNumber = cert.certificateNumber || "";
      const nameObj = cert.studentName;
      const studentName = typeof nameObj === "object"
        ? (nameObj?.ar || nameObj?.en || "")
        : (nameObj || "");
      // Escape commas/quotes in name
      const safeName = `"${String(studentName).replace(/"/g, '""')}"`;
      return `${certNumber},${safeName}`;
    });

    const csvContent = rows.join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `certificates_sheet_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success(`تم تحميل شيت يحتوي على ${packageCerts.length} شهادة`);
  };

  const handleImport = async () => {
    if (!importFile || !importSheetName.trim()) return;

    setImportLoading(true);
    try {
      const sheetName = importSheetName.trim();
      const result = await dispatch(
        importStudentMembers({ file: importFile, sheetName, memberType })
      ).unwrap();
      setImportResult(result.data); // Assuming backend returns { data: { success: n, failed: n, errors: [] } }
      reloadStudents();
      toast.success("تم استيراد الملف");
    } catch (err: any) {
      console.error("Import failed:", err);
      toast.error(typeof err === 'string' ? err : "Import failed");
    } finally {
      setImportLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.phone) {
      toast.error("يجب ملء جميع الحقول المطلوبة");
      return;
    }

    if (!isGroupMode && !newStudent.packageId) {
      toast.error("يجب اختيار باقة");
      return;
    }

    if (!isGroupMode && newStudent.planType === "group" && !newStudent.groupId) {
      toast.error("يجب اختيار جروب");
      return;
    }

    setAddLoading(true);
    try {
      const studentData: any = {
        name: { ar: newStudent.name, en: newStudent.name },
        phone: newStudent.phone,
        governorate: newStudent.governorate,
        startDate: newStudent.startDate,
        nextDueDate: newStudent.endDate,
        memberType,
      };

      if (!isGroupMode) {
        studentData.packageId = newStudent.packageId;
        const selectedPackage = packages.find(
          (pkg) => (pkg.id || pkg._id) === newStudent.packageId
        );
        if (selectedPackage) {
          studentData.packagePrice = selectedPackage.price;
        }
        // Assign subscription teacher if selected (not "none")
        if (newStudent.teacherId && newStudent.teacherId !== "none") {
          const selectedTeacher = subscriptionTeachers.find(
            (t: any) => (t._id || t.id) === newStudent.teacherId
          );
          if (selectedTeacher) {
            const teacherName = selectedTeacher.name?.ar || selectedTeacher.name?.en || '';
            if (teacherName) {
              studentData.assignedTeacherName = teacherName;
            }
          }
        }
      } else if (newStudent.groupId) {
        const selectedGroup = teacherGroups.find(
          (group) => (group.id || group._id) === newStudent.groupId
        );
        if (selectedGroup?.teacherType === "subscription") {
          const subscriptionTeacherName = getTextValue(
            selectedGroup.subscriptionTeacher?.name || ""
          );
          if (subscriptionTeacherName) {
            studentData.assignedTeacherName = subscriptionTeacherName;
          }
        } else if (selectedGroup?.teacherId?.id || selectedGroup?.teacherId?._id) {
          studentData.assignedTeacherId =
            selectedGroup.teacherId.id || selectedGroup.teacherId._id;
        }
      }

      const createdStudent = await dispatch(createStudentMember(studentData)).unwrap();
      const createdStudentId = createdStudent?.id || createdStudent?._id;

      if (isGroupMode && newStudent.groupId && createdStudentId) {
        try {
          await dispatch(
            addStudentToGroup({ groupId: newStudent.groupId, studentId: createdStudentId })
          ).unwrap();
        } catch (groupErr) {
          console.error("Failed to add student to group:", groupErr);
          toast.error("فشل ربط الطالب بالجروب");
        }
      }

      toast.success("تم إضافة الطالب بنجاح");
      setAddDialogOpen(false);
      setNewStudent({
        name: "",
        phone: "",
        governorate: "",
        planType: effectivePlanType,
        packageId: "",
        groupId: "",
        teacherId: "",
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(new Date().setMonth(new Date().getMonth() + 1)), "yyyy-MM-dd"),
      });
      reloadStudents();
    } catch (err: any) {
      console.error("Failed to add student:", err);
      toast.error(typeof err === 'string' ? err : "فشل إضافة الطالب");
    } finally {
      setAddLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ["name", "phone", "governorate", "plan", "group", "group_id", "teacher", "start time (YYYY-MM-DD)", "end_date (YYYY-MM-DD)"];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "students_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const filters: any = {};
      filters.memberType = memberType;
      if (!isGroupMode && selectedPackageId !== "all") filters.packageId = selectedPackageId;
      if (selectedGovernorate !== "all") filters.governorate = selectedGovernorate;
      if (selectedTeacherId !== "all") {
        // Check if filtering by text name
        if (selectedTeacherId.startsWith('name:')) {
          filters.assignedTeacherName = selectedTeacherId.replace('name:', '');
        } else {
          filters.assignedTeacherId = selectedTeacherId;
        }
      }
      if (showOverdueOnly) filters.status = "overdue";

      const blob = await exportStudentMembers(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `student_members_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("تم تصدير البيانات بنجاح");
    } catch (err: any) {
      console.error("Export failed:", err);
      toast.error("فشل التصدير");
    } finally {
      setExportLoading(false);
    }
  };

  // Generate PDF certificate for individual student
  const handleGenerateStudentCertificate = async (student: StudentMember) => {
    const studentId = student.id || student._id;
    if (!studentId) {
      toast.error("معرف الطالب غير صالح");
      return;
    }

    // Check if student has a package
    const packageId = student.packageId?.id || student.packageId?._id;
    if (!packageId) {
      toast.error("الطالب غير مرتبط بباقة");
      return;
    }

    // Check if package has a template
    const packageTemplate = templates.find(
      (t: any) => t.packageId === packageId || String(t.packageId) === String(packageId)
    );
    if (!packageTemplate) {
      toast.error(
        isRtl
          ? "لا يوجد قالب شهادة لهذه الباقة. يرجى إنشاء قالب أولاً من صفحة القوالب."
          : "No certificate template found for this package. Please create a template first from the templates page."
      );
      return;
    }

    setCertificateLoading(studentId);
    try {
      // First, try to find existing certificate from Redux store
      console.log("Checking for existing certificate for student:", studentId);
      const existingCert = certificates.find(
        (cert: any) => {
          const certStudentId = cert.studentMemberId?._id || cert.studentMemberId?.id || cert.studentMemberId;
          return String(certStudentId) === String(studentId);
        }
      );

      if (existingCert) {
        console.log("Found existing certificate in store, downloading:", existingCert.certificateNumber);
        const certId = existingCert.id || existingCert._id;

        if (!certId) {
          toast.error("معرف الشهادة غير صالح");
          setCertificateLoading(null);
          return;
        }

        // Download it directly
        const blob = await dispatch(downloadCertificate(certId)).unwrap();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const studentName = getTextValue(student.studentName || student.name) || "student";
        link.download = `certificate-${studentName.replace(/\s+/g, "_")}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);

        toast.success("تم تحميل الشهادة بنجاح");
        setCertificateLoading(null);
        return;
      }

      // If no existing certificate in store, try to issue a new one
      console.log("No existing certificate found, issuing new one");

      // IMPORTANT: Only send studentMemberId and packageId for package students
      // Do NOT send userId to avoid unique constraint conflicts
      const certificate = await dispatch(
        issueCertificate({
          studentMemberId: studentId,
          packageId: packageId,
          templateId: packageTemplate.id || packageTemplate._id,
          // Explicitly do not send userId for package students
        })
      ).unwrap();

      const certId = certificate.id || certificate._id;
      if (!certId) {
        throw new Error("Certificate ID not found");
      }

      // Refresh certificates list to get the new one
      await dispatch(getCertificates());

      // Wait a moment for PDF generation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Download the PDF
      const blob = await dispatch(downloadCertificate(certId)).unwrap();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const studentName = getTextValue(student.studentName || student.name) || "student";
      link.download = `certificate-${studentName.replace(/\s+/g, "_")}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success("تم تحميل الشهادة بنجاح");
    } catch (err: any) {
      console.error("Certificate generation failed:", err);
      const errorMessage = err?.message || String(err);

      console.log('Error details:', {
        message: errorMessage,
        isConflict: errorMessage.includes("Conflict") || errorMessage.includes("409") || errorMessage.includes("already exists"),
        studentId,
        packageId
      });

      // If conflict error OR "already exists" error, refresh certificates and try to find it
      if (errorMessage.includes("Conflict") || errorMessage.includes("409") || errorMessage.includes("already exists")) {
        console.log("Got conflict, refreshing certificates and trying again");
        try {
          // Refresh certificates list
          await dispatch(getCertificates()).unwrap();

          // Try to find the certificate again
          const existingCert = certificates.find(
            (cert: any) => {
              const certStudentId = cert.studentMemberId?._id || cert.studentMemberId?.id || cert.studentMemberId;
              return String(certStudentId) === String(studentId);
            }
          );

          if (existingCert) {
            const certId = existingCert.id || existingCert._id;

            if (!certId) {
              toast.error("معرف الشهادة غير صالح");
              setCertificateLoading(null);
              return;
            }

            const blob = await dispatch(downloadCertificate(certId)).unwrap();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const studentName = getTextValue(student.studentName || student.name) || "student";
            link.download = `certificate-${studentName.replace(/\s+/g, "_")}.pdf`;
            link.click();
            window.URL.revokeObjectURL(url);

            toast.success("تم تحميل الشهادة الموجودة بنجاح");
            setCertificateLoading(null);
            return;
          }

          toast.error(
            isRtl
              ? "الشهادة موجودة ولكن فشل تحميلها. يرجى تحديث الصفحة والمحاولة مرة أخرى."
              : "Certificate exists but download failed. Please refresh the page and try again."
          );
        } catch (retryErr) {
          console.error("Failed to find certificate on retry:", retryErr);
          toast.error(
            isRtl
              ? "الشهادة موجودة ولكن فشل تحميلها. يرجى تحديث الصفحة والمحاولة مرة أخرى."
              : "Certificate exists but download failed. Please refresh the page and try again."
          );
        }
      } else {
        toast.error(
          isRtl
            ? `فشل إنشاء الشهادة: ${errorMessage}`
            : `Failed to generate certificate: ${errorMessage}`
        );
      }
    } finally {
      setCertificateLoading(null);
    }
  };

  const getTextValue = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return (isRtl ? value.ar : value.en) || value.en || value.ar || "";
  };

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

  const teacherFilterOptions = useMemo(() => {
    const options = new Map<string, { value: string; label: string }>();

    if (!isGroupMode) {
      teachersWithStats.forEach((teacher) => {
        const teacherId = teacher.id || teacher._id || "";
        const teacherName = getTextValue(teacher.fullName);
        if (teacherId && teacherName) {
          options.set(`id:${teacherId}`, { value: teacherId, label: teacherName });
        }
      });
    }

    studentMembers.forEach((student) => {
      const teacherId = student.assignedTeacherId?.id || student.assignedTeacherId?._id || "";
      const linkedTeacherName = teacherId
        ? getTextValue(student.assignedTeacherId?.fullName)
        : "";
      const fallbackTeacherName = student.assignedTeacherName || "";

      if (teacherId && linkedTeacherName) {
        options.set(`id:${teacherId}`, { value: teacherId, label: linkedTeacherName });
      } else if (fallbackTeacherName) {
        options.set(`name:${fallbackTeacherName}`, {
          value: `name:${fallbackTeacherName}`,
          label: fallbackTeacherName,
        });
      }
    });

    return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [getTextValue, isGroupMode, studentMembers, teachersWithStats]);

  const displayedStudents = useMemo(() => {
    return studentMembers
      .filter(
        (student) =>
          isGroupMode ||
          selectedPackageId === "all" ||
          student.packageId?.id === selectedPackageId ||
          student.packageId?._id === selectedPackageId
      )
      .filter(
        (student) =>
          selectedGovernorate === "all" || student.governorate === selectedGovernorate
      )
      .filter((student) => {
        if (selectedTeacherId === "all") return true;
        if (selectedTeacherId.startsWith("name:")) {
          const teacherName = selectedTeacherId.replace("name:", "");
          return student.assignedTeacherName === teacherName;
        }
        return (
          student.assignedTeacherId?.id === selectedTeacherId ||
          student.assignedTeacherId?._id === selectedTeacherId
        );
      })
      .filter((student) => !showOverdueOnly || student.status === "overdue");
  }, [
    isGroupMode,
    selectedGovernorate,
    selectedPackageId,
    selectedTeacherId,
    showOverdueOnly,
    studentMembers,
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">{"نشط"}</Badge>;
      case "due_soon":
        return <Badge className="bg-yellow-100 text-yellow-800">{"تجديد قريباً"}</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">{"متأخر"}</Badge>;
      case "paused":
        return <Badge className="bg-gray-100 text-gray-800">{"موقف"}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{pageTitle}</h2>
          <p className="text-muted-foreground">{pageDescription}</p>
          {false && (
          <>
          <h2 className="text-3xl font-bold tracking-tight">
            {"طلاب الاشتراكات"}
          </h2>
          <p className="text-muted-foreground">
            {isRtl
              ? "إدارة الطلاب المشتركين في الباقات بنظام منفصل"
              : "Manage subscription students"}
          </p>
          </>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="bg-genoun-green hover:bg-genoun-green/90"
          >
            <Plus className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
            {"إضافة طالب"}
          </Button>
          <Button
            onClick={handleExportCSV}
            disabled={exportLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Download className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
            {exportLoading ? "جاري التصدير..." : "تصدير CSV"}
          </Button>
          <Button onClick={() => {
            setImportDialogOpen(true);
            setImportResult(null);
            setImportFile(null);
            setImportSheetName("");
          }} className="bg-blue-600 hover:bg-blue-700">
            <Upload className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
            {"استيراد CSV"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"إجمالي الطلاب"}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentMembers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"طلاب نشطين"}
            </CardTitle>
            <UserCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {studentMembers.filter((s) => s.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"متأخرين بالدفع"}
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {studentMembers.filter((s) => s.status === "overdue").length}
            </div>
          </CardContent>
        </Card>
      </div>



      <div className="space-y-4">
        {!isGroupMode && (
          <>
        <Tabs defaultValue="all" value={selectedPackageId} onValueChange={setSelectedPackageId} dir={isRtl ? "rtl" : "ltr"}>
          <TabsList className="bg-muted/60 p-1 h-auto flex-wrap justify-start">
            <TabsTrigger value="all" className="px-4 py-2">
              {"جميع الباقات"}
            </TabsTrigger>
            {packages.map(pkg => (
              <TabsTrigger key={pkg.id || pkg._id} value={pkg.id || pkg._id || ""} className="px-4 py-2">
                {pkg.name.ar || pkg.name.en}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Bulk Certificate Generation Section - Only shown when a specific package is selected */}
        {selectedPackageId !== "all" && (
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Award className="h-6 w-6 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-purple-900">
                    {"إنشاء شهادات جماعية"}
                  </h3>
                  <p className="text-sm text-purple-700">
                    {isRtl
                      ? `إنشاء شهادات لجميع الطلاب النشطين في هذه الباقة (${studentMembers.filter(s => s.status === "active" && (s.packageId?.id === selectedPackageId || s.packageId?._id === selectedPackageId)).length} طالب)`
                      : `Generate certificates for all active students in this package (${studentMembers.filter(s => s.status === "active" && (s.packageId?.id === selectedPackageId || s.packageId?._id === selectedPackageId)).length} students)`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={downloadCertificatesSheet}
                  variant="outline"
                  className="border-purple-400 text-purple-700 hover:bg-purple-100"
                  size="lg"
                >
                  <Download className={`h-5 w-5 ${isRtl ? "ml-2" : "mr-2"}`} />
                  {"تحميل شيت الشهادات"}
                </Button>
                <Button
                  onClick={handleGenerateCertificates}
                  disabled={generateLoading || studentMembers.filter(s => s.status === "active" && (s.packageId?.id === selectedPackageId || s.packageId?._id === selectedPackageId)).length === 0}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  size="lg"
                >
                  <Award className={`h-5 w-5 ${isRtl ? "ml-2" : "mr-2"}`} />
                  {generateLoading
                    ? "جاري الإصدار..."
                    : "إنشاء جميع الشهادات"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
          </>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{"قائمة الطلاب"}</CardTitle>
              <div className="flex gap-2">
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={"تصفية حسب المعلم"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{"جميع المعلمين"}</SelectItem>
                    {teacherFilterOptions.map((teacher) => (
                      <SelectItem key={teacher.value} value={teacher.value}>
                        {teacher.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedGovernorate} onValueChange={setSelectedGovernorate}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={"تصفية حسب المحافظة"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{"جميع المحافظات"}</SelectItem>
                    {Array.from(new Set(studentMembers.map(s => s.governorate).filter(Boolean))).sort().map((gov) => (
                      <SelectItem key={gov} value={gov!}>{gov}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={showOverdueOnly ? "overdue" : "all"} onValueChange={(val) => setShowOverdueOnly(val === "overdue")}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={"حالة الدفع"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{"جميع الطلاب"}</SelectItem>
                    <SelectItem value="overdue">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                        {"المتأخرين فقط"}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {studentMembers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">
                  {emptyStateTitle}
                </h3>
                {false && (
                <h3 className="mt-2 text-sm font-semibold text-gray-900">
                  {"لا يوجد طلاب اشتراكات"}
                </h3>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  {"قم باستيراد ملف لملء القائمة"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{"الاسم"}</TableHead>
                      <TableHead>{"رقم الهاتف"}</TableHead>
                      <TableHead>{"المحافظة"}</TableHead>
                      <TableHead>{"الباقة / الجروب"}</TableHead>
                      <TableHead>{"المعلم"}</TableHead>
                      <TableHead>{"تاريخ البداية"}</TableHead>
                      <TableHead>{"التجديد القادم"}</TableHead>
                      <TableHead>{"الحالة"}</TableHead>
                      <TableHead className="text-right">
                        {"الإجراءات"}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedStudents.map((student, index) => (
                        <TableRow key={student.id || student._id || index}>
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
                            <span className="text-sm text-muted-foreground">{student.governorate || "-"}</span>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const studentKey = String(student.id || student._id || "");
                              const group = groupByStudentId.get(studentKey);
                              const groupName = group
                                ? getTextValue(group.groupName) || (isRtl ? "جروب" : "Group")
                                : "";
                              const label = isGroupMode
                                ? groupName ||
                                  (student.packageId
                                    ? getTextValue(student.packageId.name)
                                    : isRtl
                                      ? "غير مربوط بجروب"
                                      : "Unassigned")
                                : student.packageId
                                  ? getTextValue(student.packageId.name)
                                  : groupName || (isRtl ? "غير محدد" : "N/A");
                              const badgeClass = isGroupMode
                                ? group
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                                : student.packageId
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : group
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : "bg-gray-50 text-gray-600 border-gray-200";
                              return (
                                <Badge variant="outline" className={badgeClass}>
                                  {label}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserCircle className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {student.assignedTeacherId
                                  ? getTextValue(student.assignedTeacherId.fullName)
                                  : (student.assignedTeacherName || (isRtl ? "غير محدد" : "-"))}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {student.startDate ? format(new Date(student.startDate), "yyyy-MM-dd") : "-"}
                          </TableCell>
                          <TableCell>
                            <div className={`font-medium ${student.status === 'overdue' ? 'text-red-600' :
                              student.status === 'due_soon' ? 'text-orange-600' : ''
                              }`}>
                              {student.nextDueDate ? format(new Date(student.nextDueDate), "yyyy-MM-dd") : "-"}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(student.status)}</TableCell>
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
                                  <Link href={`/dashboard/student-members/${student.id || student._id}`}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    {isRtl ? "التفاصيل / تعديل" : "Details / Edit"}
                                  </Link>
                                </DropdownMenuItem>
                                {!isGroupMode && (
                                  <>
                                <DropdownMenuItem
                                  onClick={() => handleGenerateStudentCertificate(student)}
                                  disabled={certificateLoading === (student.id || student._id)}
                                >
                                  <Award className="h-4 w-4 mr-2" />
                                  {certificateLoading === (student.id || student._id)
                                    ? isRtl
                                      ? "جاري الإنشاء..."
                                      : "Generating..."
                                    : isRtl
                                      ? "شهادة PDF"
                                      : "PDF Certificate"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                  </>
                                )}
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDelete(student.id || student._id || "")}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {isRtl ? "حذف" : "Delete"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    {displayedStudents.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="h-24 text-center">
                            {isRtl ? "لا يوجد طلاب يطابقون الفلاتر المحددة" : "No students match the selected filters"}
                          </TableCell>
                        </TableRow>
                      )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isRtl ? "استيراد طلاب (CSV)" : "Import Students (CSV)"}</DialogTitle>
            <DialogDescription>
              {isRtl
                ? "قم برفع ملف CSV. للباقات اكتب اسم الباقة في plan. للجروبات اكتب اسم الجروب في group واسم المعلم في teacher، أو استخدم group_id مباشرة. تاريخ البداية وتاريخ النهاية اختياريين."
                : "Upload a CSV file. Use plan for packages. For groups, use group + teacher, or provide group_id directly. Start date and end date are optional."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Import Notice */}
            <Alert className="bg-blue-50 border-blue-200">
              <Info className={`h-4 w-4 text-blue-600 ${isRtl ? "ml-2" : "mr-2"}`} />
              <AlertDescription className="text-blue-800 text-sm">
                {isRtl ? (
                  <>
                    <strong>ملاحظة:</strong> لو الطالب جروب، اكتب اسم الجروب واسم المعلم بالضبط كما هو في النظام، أو استخدم group_id لو موجود.
                  </>
                ) : (
                  <>
                    <strong>Note:</strong> For group students, use exact group + teacher names, or provide group_id if you have it.
                  </>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-fit">
                <Download className="h-4 w-4 mr-2" />
                {isRtl ? "تحميل نموذج CSV" : "Download Template"}
              </Button>
            </div>

            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="sheet-name">{isRtl ? "Sheet Name" : "Sheet Name"}</Label>
              <Input
                id="sheet-name"
                value={importSheetName}
                onChange={(e) => setImportSheetName(e.target.value)}
                placeholder={isRtl ? "e.g. Sheet X" : "e.g. Sheet X"}
              />
            </div>

            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="csv-file">{isRtl ? "CSV File" : "CSV File"}</Label>
              <Input id="csv-file" type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
            </div>


            {importResult && (
              <div className={`p-4 rounded-md text-sm ${importResult.failed > 0 ? "bg-red-50" : "bg-green-50"}`}>
                <p className="font-bold">
                  {isRtl ? "نتيجة الاستيراد:" : "Import Result:"}
                </p>
                <p className="text-green-700">
                  {isRtl ? `ناجح: ${importResult.success}` : `Success: ${importResult.success}`}
                </p>
                {importResult.failed > 0 && (
                  <div className="mt-2 text-red-700">
                    <p>{isRtl ? `فشل: ${importResult.failed}` : `Failed: ${importResult.failed}`}</p>
                    <ul className="list-disc list-inside mt-1 max-h-32 overflow-y-auto">
                      {importResult.errors.map((err: any, i: number) => (
                        <li key={i}>
                          {isRtl ? `صف ${err.row}: ${err.error}` : `Row ${err.row}: ${err.error}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              {isRtl ? "إغلاق" : "Close"}
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || !importSheetName.trim() || importLoading}
              className="bg-genoun-green hover:bg-genoun-green/90"
            >
              {importLoading ? (isRtl ? "جاري الرفع..." : "Uploading...") : (isRtl ? "استيراد" : "Import")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Student Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{isRtl ? "إضافة طالب جديد" : "Add New Student"}</DialogTitle>
            <DialogDescription>
              {isRtl ? "أدخل بيانات الطالب الجديد" : "Enter the new student's information"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="student-name">{isRtl ? "الاسم" : "Name"} *</Label>
              <Input
                id="student-name"
                value={newStudent.name}
                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                placeholder={isRtl ? "اسم الطالب" : "Student name"}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="student-phone">{isRtl ? "رقم الهاتف" : "Phone"} *</Label>
              <Input
                id="student-phone"
                value={newStudent.phone}
                onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                placeholder={isRtl ? "رقم الهاتف" : "Phone number"}
                dir="ltr"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="student-governorate">{isRtl ? "المحافظة" : "Governorate"}</Label>
              <Input
                id="student-governorate"
                value={newStudent.governorate}
                onChange={(e) => setNewStudent({ ...newStudent, governorate: e.target.value })}
                placeholder={isRtl ? "المحافظة" : "Governorate"}
              />
            </div>

            <div className="grid gap-2">
              <Label>{isRtl ? "نوع الاشتراك" : "Enrollment Type"} *</Label>
              <Select
                value={effectivePlanType}
                onValueChange={() => undefined}
                disabled
              >
                <SelectTrigger>
                  <SelectValue placeholder={isRtl ? "اختر النوع" : "Select type"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="package">
                    {isRtl ? "باقة فردية" : "Individual Package"}
                  </SelectItem>
                  <SelectItem value="group">
                    {isRtl ? "جروب" : "Group"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!isGroupMode && (
              <>
                <div className="grid gap-2">
                  <Label>{isRtl ? "الباقة" : "Package"} *</Label>
                  <Select
                    value={newStudent.packageId}
                    onValueChange={(value) => setNewStudent({ ...newStudent, packageId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isRtl ? "اختر الباقة" : "Select package"} />
                    </SelectTrigger>
                    <SelectContent>
                      {packages.map((pkg) => {
                        const sessions = pkg.limits?.maxSessions;
                        const sessionsLabel = sessions
                          ? (isRtl ? `${sessions} حصة` : `${sessions} sessions`)
                          : "";
                        const name = isRtl ? pkg.name.ar : pkg.name.en;
                        const priceLabel = `${pkg.price} ${pkg.currency}`;
                        const label = `${name}${sessionsLabel ? ` - ${sessionsLabel}` : ""} - ${priceLabel}`;
                        return (
                          <SelectItem key={pkg.id || pkg._id} value={pkg.id || pkg._id || ""}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{isRtl ? "المعلم" : "Teacher"}</Label>
                  <Select
                    value={newStudent.teacherId}
                    onValueChange={(value) => setNewStudent({ ...newStudent, teacherId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isRtl ? "اختر المعلم (اختياري)" : "Select teacher (optional)"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{isRtl ? "بدون معلم" : "No teacher"}</SelectItem>
                      {subscriptionTeachers && subscriptionTeachers.length > 0 && subscriptionTeachers
                        .filter((teacher: any) => teacher.isActive !== false)
                        .sort((a: any, b: any) => {
                          const nameA = isRtl ? (a.name?.ar || a.name?.en || '') : (a.name?.en || a.name?.ar || '');
                          const nameB = isRtl ? (b.name?.ar || b.name?.en || '') : (b.name?.en || b.name?.ar || '');
                          return nameA.localeCompare(nameB);
                        })
                        .map((teacher: any) => {
                          const teacherName = isRtl ? (teacher.name?.ar || teacher.name?.en) : (teacher.name?.en || teacher.name?.ar);
                          const teacherId = teacher._id || teacher.id || '';
                          return (
                            <SelectItem key={teacherId} value={teacherId}>
                              {teacherName}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {isGroupMode && (
              <div className="grid gap-2">
                <p className="text-xs text-muted-foreground">
                  {isRtl
                    ? "اختيار الجروب هنا اختياري. تقدر تضيف الطالب للجروب الآن أو تسيبه بدون ربط."
                    : "Selecting a group here is optional. You can assign the student now or later."}
                </p>
                <Label>{isRtl ? "جروب" : "Group"} *</Label>
                <Select
                  value={newStudent.groupId}
                  onValueChange={(value) => setNewStudent({ ...newStudent, groupId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isRtl ? "اختر الجروب" : "Select group"} />
                  </SelectTrigger>
                  <SelectContent>
                    {teacherGroups.map((group) => {
                      const groupName = getTextValue(group.groupName) || (isRtl ? "جروب" : "Group");
                      const teacherName =
                        group.teacherType === "subscription"
                          ? getTextValue(group.subscriptionTeacher?.name)
                          : group.teacherId
                            ? getTextValue(group.teacherId.fullName)
                            : "";
                      const count = typeof group.stats?.totalStudents === "number" ? group.stats.totalStudents : null;
                      const countLabel = count !== null
                        ? (isRtl ? `${count} طالب` : `${count} students`)
                        : "";
                      const label = `${groupName}${teacherName ? ` - ${teacherName}` : ""}${countLabel ? ` (${countLabel})` : ""}`;
                      return (
                        <SelectItem key={group.id || group._id} value={group.id || group._id || ""}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="student-start-date">{isRtl ? "تاريخ البداية" : "Start Date"}</Label>
                <Input
                  id="student-start-date"
                  type="date"
                  value={newStudent.startDate}
                  onChange={(e) => setNewStudent({ ...newStudent, startDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="student-end-date">{isRtl ? "تاريخ النهاية" : "End Date"}</Label>
                <Input
                  id="student-end-date"
                  type="date"
                  value={newStudent.endDate}
                  onChange={(e) => setNewStudent({ ...newStudent, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleAddStudent}
              disabled={addLoading}
              className="bg-genoun-green hover:bg-genoun-green/90"
            >
              {addLoading ? (isRtl ? "جاري الإضافة..." : "Adding...") : (isRtl ? "إضافة" : "Add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
