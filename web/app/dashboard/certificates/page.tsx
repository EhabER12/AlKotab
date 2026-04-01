"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  getCertificates,
  revokeCertificate,
  reissueCertificate,
  regenerateCertificatePDF,
  verifyCertificate,
  downloadCertificate,
  issueCertificate,
  getAllTemplates,
  deleteCertificate,
} from "@/store/services/certificateService";
import { getCourses } from "@/store/services/courseService";
import { getAllUsers } from "@/store/services/userService";
import {
  getStudentMembers,
  importStudentMembers,
  importSimpleStudentMembers,
  deleteStudentMember,
} from "@/store/services/studentMemberService";
import { resetStatus } from "@/store/slices/certificateSlice";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MoreHorizontal,
  Download,
  XCircle,
  Award,
  Upload,
  Search,
  CheckCircle,
  Calendar,
  User,
  Plus,
  RefreshCw,
  FileText,
  Trash2,
  Info,
  FileSpreadsheet,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "react-hot-toast";

export default function CertificatesPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { t, isRtl } = useAdminLocale();
  const [revokeLoading, setRevokeLoading] = useState<string | null>(null);
  const [reissueLoading, setReissueLoading] = useState<string | null>(null);
  const [regenerateLoading, setRegenerateLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [issueLoading, setIssueLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSheetName, setImportSheetName] = useState("");
  const [importResult, setImportResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("certificates");
  const [bulkGovernorate, setBulkGovernorate] = useState<string>("all");
  const [bulkTeacher, setBulkTeacher] = useState<string>("all");
  const [bulkSheet, setBulkSheet] = useState<string>("all");
  const [sheetDeleteLoading, setSheetDeleteLoading] = useState<string | null>(null);
  // ─── Simple Sheet State ───
  const [simpleSheet, setSimpleSheet] = useState<string>("all");
  const [simpleImportDialogOpen, setSimpleImportDialogOpen] = useState(false);
  const [simpleImportFile, setSimpleImportFile] = useState<File | null>(null);
  const [simpleImportSheetName, setSimpleImportSheetName] = useState("");
  const [simpleImportResult, setSimpleImportResult] = useState<any>(null);
  const [simpleImportLoading, setSimpleImportLoading] = useState(false);
  const [simpleGenerateLoading, setSimpleGenerateLoading] = useState(false);
  const [simpleSheetDeleteLoading, setSimpleSheetDeleteLoading] = useState<string | null>(null);
  const [simpleBulkActionDialog, setSimpleBulkActionDialog] = useState<{
    open: boolean;
    mode: "download" | "export" | null;
  }>({ open: false, mode: null });
  const [issueDialog, setIssueDialog] = useState({
    open: false,
    userId: "",
    studentMemberId: "",
    courseId: "",
    templateId: "",
  });
  const [verifyDialog, setVerifyDialog] = useState({
    open: false,
    certificateNumber: "",
  });
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>("all");
  const [bulkActionDialog, setBulkActionDialog] = useState<{
    open: boolean;
    mode: "download" | "export" | null;
  }>({ open: false, mode: null });

  const { certificates, templates, isLoading, error, isSuccess } = useAppSelector(
    (state) => state.certificates
  );

  const { courses } = useAppSelector((state) => state.courses);
  const { users } = useAppSelector((state) => state.userManagement);
  const { studentMembers } = useAppSelector((state) => state.studentMembers);
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

    dispatch(getCertificates());
    dispatch(getCourses({}));
    dispatch(getAllUsers());
    dispatch(getAllTemplates());
    dispatch(getStudentMembers({}));
  }, [dispatch, user, router]);

  useEffect(() => {
    if (isSuccess && issueDialog.open) {
      toast.success(isRtl ? "تم إصدار الشهادة بنجاح" : "Certificate issued successfully");
      setIssueDialog({ open: false, userId: "", studentMemberId: "", courseId: "", templateId: "" });
      dispatch(resetStatus());
    }
  }, [isSuccess, issueDialog.open, dispatch, isRtl]);

  const handleRevoke = async (id: string) => {
    if (
      confirm(
        isRtl
          ? "هل أنت متأكد من إلغاء هذه الشهادة؟"
          : "Are you sure you want to revoke this certificate?"
      )
    ) {
      setRevokeLoading(id);
      try {
        await dispatch(revokeCertificate(id)).unwrap();
        toast.success(isRtl ? "تم إلغاء الشهادة" : "Certificate revoked");
        dispatch(getCertificates());
      } catch (err) {
        console.warn("Failed to revoke certificate:", err);
        toast.error(typeof err === 'string' ? err : "Failed to revoke certificate");
      } finally {
        setRevokeLoading(null);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (
      confirm(
        isRtl
          ? "هل أنت متأكد من حذف هذه الشهادة نهائياً؟ هذا الإجراء لا يمكن التراجع عنه."
          : "Are you sure you want to permanently delete this certificate? This action cannot be undone."
      )
    ) {
      setDeleteLoading(id);
      try {
        await dispatch(deleteCertificate(id)).unwrap();
        toast.success(isRtl ? "تم حذف الشهادة" : "Certificate deleted");
      } catch (err) {
        console.warn("Failed to delete certificate:", err);
        toast.error(typeof err === 'string' ? err : "Failed to delete certificate");
      } finally {
        setDeleteLoading(null);
      }
    }
  };

  const handleReissue = async (id: string) => {
    const cert = certificates.find(c => (c.id || c._id) === id);
    const isRevoked = cert?.status === "revoked";

    if (
      confirm(
        isRtl
          ? isRevoked
            ? "هل أنت متأكد من استعادة هذه الشهادة إلى حالة مصدرة؟"
            : "هل أنت متأكد من إلغاء هذه الشهادة؟"
          : isRevoked
            ? "Are you sure you want to restore this certificate to issued status?"
            : "Are you sure you want to revoke this certificate?"
      )
    ) {
      setReissueLoading(id);
      try {
        await dispatch(reissueCertificate(id)).unwrap();
        toast.success(
          isRtl
            ? isRevoked
              ? "تم استعادة الشهادة بنجاح"
              : "تم إلغاء الشهادة بنجاح"
            : isRevoked
              ? "Certificate restored successfully"
              : "Certificate revoked successfully"
        );
        dispatch(getCertificates());
      } catch (err) {
        console.warn("Failed to toggle certificate status:", err);
        toast.error(typeof err === 'string' ? err : "Failed to toggle certificate status");
      } finally {
        setReissueLoading(null);
      }
    }
  };

  const handleRegeneratePDF = async (id: string) => {
    setRegenerateLoading(id);
    try {
      await dispatch(regenerateCertificatePDF(id)).unwrap();
      toast.success(isRtl ? "تم تجديد PDF بنجاح" : "PDF regenerated successfully");
    } catch (err) {
      console.warn("Failed to regenerate PDF:", err);
      toast.error(typeof err === 'string' ? err : "Failed to regenerate PDF");
    } finally {
      setRegenerateLoading(null);
    }
  };

  const handleIssue = async () => {
    if ((!issueDialog.userId && !issueDialog.studentMemberId) || !issueDialog.courseId) {
      toast.error(isRtl ? "يرجى اختيار الطالب والدورة" : "Please select a student and a course");
      return;
    }

    setIssueLoading(true);
    try {
      await dispatch(issueCertificate({
        userId: issueDialog.userId || undefined,
        studentMemberId: issueDialog.studentMemberId || undefined,
        courseId: issueDialog.courseId,
        templateId: (issueDialog.templateId && issueDialog.templateId !== "none") ? issueDialog.templateId : undefined
      })).unwrap();
    } catch (err) {
      console.warn("Failed to issue certificate:", err);
      toast.error(typeof err === 'string' ? err : "Failed to issue certificate");
    } finally {
      setIssueLoading(false);
    }
  };

  // Export certificates to CSV
  const exportCertificatesToCSV = (certificatesData: Array<{
    studentName: string;
    certificateNumber: string;
    courseName: string;
    issuedAt: string;
    sheetName?: string;
  }>) => {
    // CSV Header
    const headers = [
      isRtl ? "اسم الطالب" : "Student Name",
      isRtl ? "رقم الشهادة" : "Certificate Number",
      isRtl ? "اسم الدورة/الباقة" : "Course/Package Name",
      isRtl ? "تاريخ الإصدار" : "Issued Date",
      isRtl ? "الشيت" : "Sheet Name",
    ];

    // CSV Rows
    const rows = certificatesData.map(cert => [
      cert.studentName,
      cert.certificateNumber,
      cert.courseName,
      cert.issuedAt,
      cert.sheetName || "-",
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    // Add BOM for Arabic support
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `certificates-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Open bulk action dialog
  const openBulkActionDialog = () => {
    const filteredStudents = studentMembers
      .filter((s) => bulkSheet === "all" || s.sheetName === bulkSheet)
      .filter((s) => s.status === "active")
      .filter((s) => bulkGovernorate === "all" || s.governorate === bulkGovernorate)
      .filter((s) => bulkTeacher === "all" || getTeacherLabel(s) === bulkTeacher);

    if (filteredStudents.length === 0) {
      toast.error(isRtl ? "لا يوجد طلاب مطابقين للفلاتر" : "No students match the selected filters");
      return;
    }

    setBulkActionDialog({ open: true, mode: null });
  };

  const handleGenerateCertificates = async (mode: "download" | "export") => {
    setBulkActionDialog({ open: false, mode: null });

    const filteredStudents = studentMembers
      .filter((s) => bulkSheet === "all" || s.sheetName === bulkSheet)
      .filter((s) => s.status === "active")
      .filter((s) => bulkGovernorate === "all" || s.governorate === bulkGovernorate)
      .filter((s) => bulkTeacher === "all" || getTeacherLabel(s) === bulkTeacher);

    if (filteredStudents.length === 0) {
      toast.error(isRtl ? "لا يوجد طلاب مطابقين للفلاتر" : "No students match the selected filters");
      return;
    }

    const confirmMsg = mode === "download"
      ? (isRtl ? "هل أنت متأكد من استخراج وتحميل شهادات لجميع الطلاب حسب الفلاتر؟" : "Are you sure you want to generate and download certificates for all students in these filters?")
      : (isRtl ? "هل أنت متأكد من إصدار أرقام شهادات لجميع الطلاب حسب الفلاتر؟" : "Are you sure you want to issue certificate numbers for all students in these filters?");

    if (confirm(confirmMsg)) {
      setGenerateLoading(true);
      try {
        let successCount = 0;
        let failedCount = 0;
        const failedNames: string[] = [];
        const missingTemplateNames: string[] = [];
        const issuedCertificates: Array<{
          studentName: string;
          certificateNumber: string;
          courseName: string;
          issuedAt: string;
          sheetName?: string;
        }> = [];

        for (const student of filteredStudents) {
          const studentId = student.id || student._id;
          const packageId = student.packageId?.id || student.packageId?._id;
          if (!studentId) {
            failedCount += 1;
            failedNames.push(getTextValue(student.studentName || student.name) || "Unknown");
            continue;
          }

          const sheetTemplate = student.sheetName
            ? templates.find((t: any) => t.sheetName === student.sheetName)
            : null;
          const packageTemplate = packageId
            ? templates.find((t: any) => t.packageId === packageId || String(t.packageId) === String(packageId))
            : null;
          const selectedTemplate = sheetTemplate || packageTemplate;

          if (!selectedTemplate) {
            failedCount += 1;
            missingTemplateNames.push(getTextValue(student.studentName || student.name) || "Unknown");
            continue;
          }

          try {
            const nameValue = getTextValue(student.studentName || student.name);
            const certificate = await dispatch(
              issueCertificate({
                studentMemberId: studentId,
                packageId: packageId,
                templateId: selectedTemplate.id || selectedTemplate._id,
                studentName: nameValue ? { ar: nameValue, en: nameValue } : undefined,
              })
            ).unwrap();

            const certId = certificate?.id || certificate?._id;

            // Store certificate data for export
            issuedCertificates.push({
              studentName: nameValue || "Unknown",
              certificateNumber: certificate?.certificateNumber || "-",
              courseName: getTextValue(student.packageId?.name) || "-",
              issuedAt: certificate?.issuedAt ? format(new Date(certificate.issuedAt), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
              sheetName: student.sheetName,
            });

            // Only download PDF if mode is "download"
            if (mode === "download" && certId) {
              const blob = await dispatch(downloadCertificate(certId)).unwrap();
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              const studentName = nameValue || "student";
              link.download = `certificate-${studentName.replace(/\s+/g, "_")}.pdf`;
              link.click();
              window.URL.revokeObjectURL(url);
            }
            successCount += 1;
          } catch (err) {
            failedCount += 1;
            failedNames.push(getTextValue(student.studentName || student.name) || "Unknown");
            console.error("Failed to issue certificate for student:", studentId, err);
          }
        }

        if (successCount > 0) {
          toast.success(
            isRtl
              ? `تم إصدار ${successCount} شهادة بنجاح` : `Successfully issued ${successCount} certificates`
          );
          await dispatch(getCertificates()).unwrap();

          // Export to CSV if mode is "export"
          if (mode === "export" && issuedCertificates.length > 0) {
            exportCertificatesToCSV(issuedCertificates);
            toast.success(
              isRtl
                ? "تم تصدير بيانات الشهادات إلى ملف CSV"
                : "Certificate data exported to CSV file"
            );
          }
        }

        if (missingTemplateNames.length > 0) {
          const msg = isRtl
            ? `يجب إنشاء قالب شهادة وربطه بالشيت أو الباقة. الطلاب المتأثرون: ${missingTemplateNames.join("، ")}.`
            : `You must create and link a certificate template to the sheet or package. Affected students: ${missingTemplateNames.join(", ")}.`;
          toast.error(msg, { duration: 6000 });
        }

        if (failedCount > 0) {
          const msg = isRtl
            ? `فشل إصدار ${failedCount} شهادة. الطلاب: ${failedNames.join("، ")}.`
            : `Failed to issue ${failedCount} certificates. Students: ${failedNames.join(", ")}.`;
          toast.error(msg, { duration: 6000 });
        }
      } catch (err: any) {
        console.error("Bulk certificate generation failed:", err);
        toast.error(err || "Failed to generate certificates");
      } finally {
        setGenerateLoading(false);
      }
    }
  };

  const handleImport = async () => {
    if (!importFile || !importSheetName.trim()) return;

    setImportLoading(true);
    try {
      const sheetName = importSheetName.trim();
      const result = await dispatch(importStudentMembers({ file: importFile, sheetName })).unwrap();
      setImportResult(result.data);
      dispatch(getStudentMembers({}));
      setBulkSheet(sheetName);
      toast.success(isRtl ? "تم استيراد الملف" : "File imported");
    } catch (err: any) {
      console.error("Import failed:", err);
      toast.error(typeof err === "string" ? err : "Import failed");
    } finally {
      setImportLoading(false);
    }
  };

  const handleDeleteSheet = async (sheetName: string) => {
    const normalizedSheet = (sheetName || "").trim();
    if (!normalizedSheet || normalizedSheet === "all") {
      toast.error(isRtl ? "اختر شيت أولاً" : "Select a sheet first");
      return;
    }

    const studentsInSheet = studentMembers.filter(
      (s) => (s.sheetName || "").trim() === normalizedSheet
    );
    const certificatesInSheet = certificates.filter(
      (c) => (c.sheetName || "").trim() === normalizedSheet
    );

    if (studentsInSheet.length === 0 && certificatesInSheet.length === 0) {
      toast.error(
        isRtl
          ? "لا توجد بيانات مرتبطة بهذا الشيت"
          : "No data found for this sheet"
      );
      return;
    }

    const confirmed = confirm(
      isRtl
        ? `سيتم حذف الشيت "${normalizedSheet}" بالكامل، بما في ذلك ${studentsInSheet.length} طالب و${certificatesInSheet.length} شهادة. لا يمكن التراجع. هل تريد المتابعة؟`
        : `This will permanently delete sheet "${normalizedSheet}" with ${studentsInSheet.length} students and ${certificatesInSheet.length} certificates. This cannot be undone. Continue?`
    );

    if (!confirmed) return;

    setSheetDeleteLoading(normalizedSheet);
    let deletedStudents = 0;
    let deletedCertificates = 0;
    let failedOps = 0;

    try {
      for (const cert of certificatesInSheet) {
        const certId = cert.id || cert._id;
        if (!certId) continue;
        try {
          await dispatch(deleteCertificate(certId)).unwrap();
          deletedCertificates += 1;
        } catch (err) {
          failedOps += 1;
          console.error("Failed to delete certificate from sheet", certId, err);
        }
      }

      for (const student of studentsInSheet) {
        const studentId = student.id || student._id;
        if (!studentId) continue;
        try {
          await dispatch(deleteStudentMember(studentId)).unwrap();
          deletedStudents += 1;
        } catch (err) {
          failedOps += 1;
          console.error("Failed to delete student from sheet", studentId, err);
        }
      }

      await Promise.all([
        dispatch(getStudentMembers({})).unwrap(),
        dispatch(getCertificates()).unwrap(),
      ]);

      setBulkSheet("all");

      toast.success(
        isRtl
          ? `تم حذف الشيت: ${deletedStudents} طالب و${deletedCertificates} شهادة`
          : `Sheet deleted: ${deletedStudents} students and ${deletedCertificates} certificates`
      );

      if (failedOps > 0) {
        toast.error(
          isRtl
            ? `حدثت ${failedOps} عملية فاشلة أثناء الحذف`
            : `${failedOps} delete operations failed`
        );
      }
    } finally {
      setSheetDeleteLoading(null);
    }
  };

  const downloadTemplate = () => {
    const headers = ["name", "phone", "governorate", "plan", "group", "group_id", "teacher", "start time (YYYY-MM-DD)", "billingDay"];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "students_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSimpleTemplate = () => {
    const headers = ["name", "date"];
    const exampleRow = ["اسم الطالب", new Date().toISOString().split("T")[0]];
    const BOM = "\uFEFF";
    const csvContent = BOM + headers.join(",") + "\n" + exampleRow.join(",");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "simple_sheet_template.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImportSimple = async () => {
    if (!simpleImportFile || !simpleImportSheetName.trim()) return;
    setSimpleImportLoading(true);
    try {
      const sheetName = simpleImportSheetName.trim();
      const result = await dispatch(importSimpleStudentMembers({ file: simpleImportFile, sheetName })).unwrap();
      setSimpleImportResult(result.data);
      dispatch(getStudentMembers({}));
      setSimpleSheet(sheetName);
      toast.success(isRtl ? "تم استيراد الشيت المبسط" : "Simple sheet imported");
    } catch (err: any) {
      console.error("Simple import failed:", err);
      toast.error(typeof err === "string" ? err : "Import failed");
    } finally {
      setSimpleImportLoading(false);
    }
  };

  const handleGenerateSimpleCertificates = async (mode: "download" | "export") => {
    setSimpleBulkActionDialog({ open: false, mode: null });

    // Simple sheet students: sheetName matches AND notes starts with "simple_sheet:"
    const simpleStudents = studentMembers
      .filter((s) => s.sheetName && (s.notes || "").startsWith("simple_sheet:"))
      .filter((s) => simpleSheet === "all" || s.sheetName === simpleSheet);

    if (simpleStudents.length === 0) {
      toast.error(isRtl ? "لا يوجد طلاب في الشيت المبسط" : "No students in simple sheet");
      return;
    }

    const confirmMsg = mode === "download"
      ? (isRtl ? "هل أنت متأكد من استخراج وتحميل شهادات الشيت المبسط؟" : "Generate and download certificates for simple sheet?")
      : (isRtl ? "هل أنت متأكد من إصدار أرقام شهادات الشيت المبسط؟" : "Issue certificate numbers for simple sheet?");

    if (!confirm(confirmMsg)) return;

    setSimpleGenerateLoading(true);
    try {
      let successCount = 0;
      let failedCount = 0;
      const failedNames: string[] = [];
      const missingTemplateNames: string[] = [];
      const issuedCertificates: Array<{
        studentName: string;
        certificateNumber: string;
        courseName: string;
        issuedAt: string;
        sheetName?: string;
      }> = [];

      for (const student of simpleStudents) {
        const studentId = student.id || student._id;
        if (!studentId) {
          failedCount += 1;
          failedNames.push(getTextValue(student.studentName || student.name) || "Unknown");
          continue;
        }

        const sheetTemplate = student.sheetName
          ? templates.find((t: any) => t.sheetName === student.sheetName)
          : null;

        if (!sheetTemplate) {
          failedCount += 1;
          missingTemplateNames.push(getTextValue(student.studentName || student.name) || "Unknown");
          continue;
        }

        try {
          const nameValue = getTextValue(student.studentName || student.name);
          // Use issuedDate from the student's startDate
          const issuedDate = student.startDate ? new Date(student.startDate) : new Date();

          const certificate = await dispatch(
            issueCertificate({
              studentMemberId: studentId,
              templateId: sheetTemplate.id || sheetTemplate._id,
              studentName: nameValue ? { ar: nameValue, en: nameValue } : undefined,
            })
          ).unwrap();

          const certId = certificate?.id || certificate?._id;

          issuedCertificates.push({
            studentName: nameValue || "Unknown",
            certificateNumber: certificate?.certificateNumber || "-",
            courseName: student.sheetName || "-",
            issuedAt: certificate?.issuedAt
              ? format(new Date(certificate.issuedAt), "yyyy-MM-dd")
              : format(issuedDate, "yyyy-MM-dd"),
            sheetName: student.sheetName,
          });

          if (mode === "download" && certId) {
            const blob = await dispatch(downloadCertificate(certId)).unwrap();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const studentName = nameValue || "student";
            link.download = `certificate-${studentName.replace(/\s+/g, "_")}.pdf`;
            link.click();
            window.URL.revokeObjectURL(url);
          }
          successCount += 1;
        } catch (err) {
          failedCount += 1;
          failedNames.push(getTextValue(student.studentName || student.name) || "Unknown");
          console.error("Failed to issue simple certificate for student:", studentId, err);
        }
      }

      if (successCount > 0) {
        toast.success(
          isRtl
            ? `تم إصدار ${successCount} شهادة بنجاح`
            : `Successfully issued ${successCount} certificates`
        );
        await dispatch(getCertificates()).unwrap();

        if (mode === "export" && issuedCertificates.length > 0) {
          exportCertificatesToCSV(issuedCertificates);
          toast.success(
            isRtl ? "تم تصدير بيانات الشهادات إلى CSV" : "Exported to CSV"
          );
        }
      }

      if (missingTemplateNames.length > 0) {
        const msg = isRtl
          ? `يجب إنشاء قالب شهادة مرتبط بالشيت: ${missingTemplateNames.join("، ")}.`
          : `Missing template for sheet. Affected: ${missingTemplateNames.join(", ")}.`;
        toast.error(msg, { duration: 6000 });
      }

      if (failedCount > 0) {
        const msg = isRtl
          ? `فشل إصدار ${failedCount} شهادة. الطلاب: ${failedNames.join("، ")}.`
          : `Failed: ${failedCount} certificates. Students: ${failedNames.join(", ")}.`;
        toast.error(msg, { duration: 6000 });
      }
    } catch (err: any) {
      console.error("Simple bulk generation failed:", err);
      toast.error(err || "Failed to generate certificates");
    } finally {
      setSimpleGenerateLoading(false);
    }
  };

  const handleDeleteSimpleSheet = async (sheetName: string) => {
    const normalizedSheet = (sheetName || "").trim();
    if (!normalizedSheet || normalizedSheet === "all") {
      toast.error(isRtl ? "اختر شيت أولاً" : "Select a sheet first");
      return;
    }

    const simpleStudentsInSheet = studentMembers.filter(
      (s) => (s.sheetName || "").trim() === normalizedSheet &&
        (s.notes || "").startsWith("simple_sheet:")
    );
    const certificatesInSheet = certificates.filter(
      (c) => (c.sheetName || "").trim() === normalizedSheet
    );

    if (simpleStudentsInSheet.length === 0 && certificatesInSheet.length === 0) {
      toast.error(isRtl ? "لا توجد بيانات مرتبطة بهذا الشيت" : "No data found for this sheet");
      return;
    }

    const confirmed = confirm(
      isRtl
        ? `سيتم حذف الشيت المبسط "${normalizedSheet}" بالكامل، بما في ذلك ${simpleStudentsInSheet.length} طالب و${certificatesInSheet.length} شهادة. لا يمكن التراجع. هل تريد المتابعة؟`
        : `Delete simple sheet "${normalizedSheet}" with ${simpleStudentsInSheet.length} students and ${certificatesInSheet.length} certificates? Cannot be undone.`
    );
    if (!confirmed) return;

    setSimpleSheetDeleteLoading(normalizedSheet);
    let deletedStudents = 0;
    let deletedCertificates = 0;
    let failedOps = 0;

    try {
      for (const cert of certificatesInSheet) {
        const certId = cert.id || cert._id;
        if (!certId) continue;
        try {
          await dispatch(deleteCertificate(certId)).unwrap();
          deletedCertificates += 1;
        } catch (err) {
          failedOps += 1;
        }
      }

      for (const student of simpleStudentsInSheet) {
        const studentId = student.id || student._id;
        if (!studentId) continue;
        try {
          await dispatch(deleteStudentMember(studentId)).unwrap();
          deletedStudents += 1;
        } catch (err) {
          failedOps += 1;
        }
      }

      await Promise.all([
        dispatch(getStudentMembers({})).unwrap(),
        dispatch(getCertificates()).unwrap(),
      ]);

      setSimpleSheet("all");

      toast.success(
        isRtl
          ? `تم حذف الشيت: ${deletedStudents} طالب و${deletedCertificates} شهادة`
          : `Sheet deleted: ${deletedStudents} students and ${deletedCertificates} certificates`
      );

      if (failedOps > 0) {
        toast.error(
          isRtl ? `حدثت ${failedOps} عملية فاشلة` : `${failedOps} delete operations failed`
        );
      }
    } finally {
      setSimpleSheetDeleteLoading(null);
    }
  };

  const handleVerify = async () => {
    if (!verifyDialog.certificateNumber) return;

    try {
      const result = await dispatch(
        verifyCertificate(verifyDialog.certificateNumber)
      ).unwrap();
      setVerifyResult(result);
    } catch (err) {
      console.warn("Failed to verify certificate:", err);
      setVerifyResult({ error: true });
    }
  };

  const handleDownload = async (id: string) => {
    if (!id || id === 'undefined') {
      toast.error(isRtl ? "معرف الشهادة غير صالح" : "Invalid certificate ID");
      return;
    }
    try {
      const blob = await dispatch(downloadCertificate(id)).unwrap();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `certificate-${id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.warn("Failed to download certificate:", err);
    }
  };

  const getTextValue = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return (isRtl ? value.ar : value.en) || value.en || value.ar || "";
  };

  const getTeacherLabel = (student: any): string => {
    if (student?.assignedTeacherId?.fullName) {
      return getTextValue(student.assignedTeacherId.fullName);
    }
    return student?.assignedTeacherName || "";
  };

  const sheetStats = Array.from(
    studentMembers.reduce((acc, student) => {
      const name = student.sheetName?.trim();
      if (!name) return acc;
      acc.set(name, (acc.get(name) || 0) + 1);
      return acc;
    }, new Map<string, number>())
  ).sort((a, b) => a[0].localeCompare(b[0]));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "issued":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            {isRtl ? "مصدر" : "Issued"}
          </Badge>
        );
      case "revoked":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            {isRtl ? "ملغي" : "Revoked"}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
            {isRtl ? "إدارة الشهادات" : "Certificates Management"}
          </h2>
          <p className="text-muted-foreground">
            {isRtl
              ? "عرض وإدارة شهادات الطلاب"
              : "View and manage student certificates"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/certificates/templates">
            <Button variant="outline">
              <Award className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              {isRtl ? "تصميم القوالب" : "Design Templates"}
            </Button>
          </Link>
          <Button
            onClick={() => setIssueDialog({ open: true, userId: "", studentMemberId: "", courseId: "", templateId: "" })}
            className="bg-genoun-green hover:bg-genoun-green/90"
          >
            <Plus className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
            {isRtl ? "إصدار شهادة يدوياً" : "Issue Manually"}
          </Button>
          <Button
            onClick={() => setVerifyDialog({ open: true, certificateNumber: "" })}
            variant="outline"
          >
            <Search className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
            {isRtl ? "التحقق من شهادة" : "Verify Certificate"}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/60 p-1 h-auto flex-wrap justify-start">
          <TabsTrigger value="certificates" className="px-4 py-2">
            {isRtl ? "الشهادات" : "Certificates"}
          </TabsTrigger>
          <TabsTrigger value="bulk" className="px-4 py-2">
            {isRtl ? "شهادات الشيت" : "Sheet Certificates"}
          </TabsTrigger>
          <TabsTrigger value="simple" className="px-4 py-2">
            {isRtl ? "شيت مبسط" : "Simple Sheet"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="certificates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {isRtl ? "إجمالي الشهادات" : "Total Certificates"}
                </CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{certificates.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {isRtl ? "الشهادات المصدرة" : "Issued"}
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {certificates.filter((c) => c.status === "issued").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {isRtl ? "الشهادات الملغاة" : "Revoked"}
                </CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {certificates.filter((c) => c.status === "revoked").length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{isRtl ? "جميع الشهادات" : "All Certificates"}</CardTitle>
                  <CardDescription>
                    {isRtl
                      ? `${certificates.length} شهادة مصدرة`
                      : `${certificates.length} certificates issued`}
                  </CardDescription>
                </div>
                <Select value={selectedGovernorate} onValueChange={setSelectedGovernorate}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={isRtl ? "تصفية حسب المحافظة" : "Filter by Governorate"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRtl ? "جميع المحافظات" : "All Governorates"}</SelectItem>
                    {Array.from(new Set(certificates.map(c => c.governorate).filter(Boolean))).sort().map((gov) => (
                      <SelectItem key={gov} value={gov!}>{gov}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {certificates.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">
                    {isRtl ? "لا توجد شهادات" : "No certificates"}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {isRtl
                      ? "سيتم إصدار الشهادات تلقائياً عند إتمام الطلاب للدورات"
                      : "Certificates will be issued automatically when students complete courses"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="h-10">
                      <TableHead className="py-2 align-middle text-start whitespace-nowrap">
                        {isRtl ? "رقم الشهادة" : "Certificate #"}
                      </TableHead>
                      <TableHead className="py-2 align-middle text-start whitespace-nowrap">
                        <div
                          className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}
                        >
                          <span className="inline-block h-4 w-4" aria-hidden="true" />
                          <span>{isRtl ? "الطالب" : "Student"}</span>
                        </div>
                      </TableHead>
                      <TableHead className="py-2 align-middle text-start whitespace-nowrap">
                        {isRtl ? "المحافظة" : "Governorate"}
                      </TableHead>
                      <TableHead className="py-2 align-middle text-start whitespace-nowrap">
                        {isRtl ? "الدورة / الباقة" : "Course / Package"}
                      </TableHead>
                      <TableHead className="py-2 align-middle text-start whitespace-nowrap">
                        <div
                          className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}
                        >
                          <span className="inline-block h-4 w-4" aria-hidden="true" />
                          <span>{isRtl ? "تاريخ الإصدار" : "Issue Date"}</span>
                        </div>
                      </TableHead>
                      <TableHead className="py-2 align-middle text-start whitespace-nowrap">
                        {isRtl ? "الحالة" : "Status"}
                      </TableHead>
                      <TableHead className="py-2 align-middle text-right whitespace-nowrap">
                        {isRtl ? "الإجراءات" : "Actions"}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certificates
                      .filter(c => selectedGovernorate === "all" || c.governorate === selectedGovernorate)
                      .map((certificate, index) => (
                        <TableRow key={certificate.id || certificate._id || `cert-${index}`}>
                          <TableCell className="py-2 align-middle text-start font-mono font-medium">
                            {certificate.certificateNumber}
                          </TableCell>
                          <TableCell className="py-2 align-middle text-start">
                            <div className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                              <User className="h-4 w-4 text-muted-foreground" />
                              {certificate.userId
                                ? getTextValue(certificate.userId.fullName)
                                : (certificate.studentName ? getTextValue(certificate.studentName) : "-")}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 align-middle text-start">
                            <span className="text-sm text-muted-foreground">{certificate.governorate || "-"}</span>
                          </TableCell>
                          <TableCell className="py-2 align-middle text-start">
                            {certificate.courseId
                              ? getTextValue(certificate.courseId.title)
                              : (certificate.packageId ? (isRtl ? `باقة: ${getTextValue(certificate.packageId.name)}` : `Package: ${getTextValue(certificate.packageId.name)}`) : "-")}
                          </TableCell>
                          <TableCell className="py-2 align-middle text-start">
                            <div className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {certificate.issuedAt ? format(new Date(certificate.issuedAt), "yyyy-MM-dd") : "-"}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 align-middle text-start">{getStatusBadge(certificate.status)}</TableCell>
                          <TableCell className="py-2 align-middle text-right">
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
                                <DropdownMenuItem
                                  onClick={() => handleDownload((certificate.id || certificate._id)!)}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  {isRtl ? "تحميل PDF" : "Download PDF"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleRegeneratePDF((certificate.id || certificate._id)!)}
                                  disabled={regenerateLoading === (certificate.id || certificate._id)}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  {regenerateLoading === (certificate.id || certificate._id)
                                    ? isRtl ? "جاري التجديد..." : "Regenerating..."
                                    : isRtl ? "تجديد PDF" : "Regenerate PDF"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleReissue((certificate.id || certificate._id)!)}
                                  disabled={reissueLoading === (certificate.id || certificate._id)}
                                  className={certificate.status === "revoked" ? "" : "text-orange-600"}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  {reissueLoading === (certificate.id || certificate._id)
                                    ? isRtl ? "جاري التغيير..." : "Toggling..."
                                    : certificate.status === "revoked"
                                      ? isRtl ? "استعادة الشهادة" : "Restore Certificate"
                                      : isRtl ? "إلغاء الشهادة" : "Revoke Certificate"}
                                </DropdownMenuItem>
                                {certificate.status === "issued" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => handleRevoke((certificate.id || certificate._id)!)}
                                      disabled={revokeLoading === (certificate.id || certificate._id)}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      {revokeLoading === (certificate.id || certificate._id)
                                        ? isRtl
                                          ? "جاري الإلغاء..."
                                          : "Revoking..."
                                        : isRtl
                                          ? "إلغاء الشهادة"
                                          : "Revoke"}
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDelete((certificate.id || certificate._id)!)}
                                  disabled={deleteLoading === (certificate.id || certificate._id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {deleteLoading === (certificate.id || certificate._id)
                                    ? isRtl
                                      ? "جاري الحذف..."
                                      : "Deleting..."
                                    : isRtl
                                      ? "حذف نهائي"
                                      : "Delete Permanently"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    {certificates.filter(c => selectedGovernorate === "all" || c.governorate === selectedGovernorate).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          {isRtl ? "لا توجد شهادات تطابق الفلتر المحدد" : "No certificates match the selected filter"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          {sheetStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{isRtl ? "الشيتات" : "Sheets"}</CardTitle>
                <CardDescription>
                  {isRtl
                    ? "اختار شيت علشان تشتغل عليه لوحده"
                    : "Pick a sheet to work with separately"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  variant={bulkSheet === "all" ? "default" : "outline"}
                  onClick={() => setBulkSheet("all")}
                >
                  {isRtl ? "كل الشيتات" : "All Sheets"}
                </Button>
                {sheetStats.map(([name, count]) => (
                  <Button
                    key={name}
                    variant={bulkSheet === name ? "default" : "outline"}
                    onClick={() => setBulkSheet(name)}
                  >
                    {name} ({count})
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{isRtl ? "طلاب الباقات" : "Package Students"}</CardTitle>
                  <CardDescription>
                    {isRtl
                      ? `${studentMembers.length} طالب`
                      : `${studentMembers.length} students`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {studentMembers.length === 0 ? (
                <div className="text-center py-10">
                  <User className="mx-auto h-10 w-10 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">
                    {isRtl ? "لا توجد بيانات طلاب" : "No students data"}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {isRtl ? "قم باستيراد ملف CSV أولاً" : "Import a CSV file first"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-10">
                        <TableHead className="py-2 align-middle text-start whitespace-nowrap">
                          {isRtl ? "الاسم" : "Name"}
                        </TableHead>
                        <TableHead className="py-2 align-middle text-start whitespace-nowrap">
                          {isRtl ? "رقم الهاتف" : "Phone"}
                        </TableHead>
                        <TableHead className="py-2 align-middle text-start whitespace-nowrap">
                          {isRtl ? "المحافظة" : "Governorate"}
                        </TableHead>
                        <TableHead className="py-2 align-middle text-start whitespace-nowrap">
                          {isRtl ? "الباقة" : "Plan"}
                        </TableHead>
                        <TableHead className="py-2 align-middle text-start whitespace-nowrap">
                          {isRtl ? "المعلم" : "Teacher"}
                        </TableHead>
                        <TableHead className="py-2 align-middle text-start whitespace-nowrap">
                          {isRtl ? "تاريخ البدء" : "Start Date"}
                        </TableHead>
                        <TableHead className="py-2 align-middle text-start whitespace-nowrap">
                          {isRtl ? "يوم التجديد" : "Billing Day"}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentMembers
                        .filter((s) => bulkSheet === "all" || s.sheetName === bulkSheet)
                        .filter((s) => bulkGovernorate === "all" || s.governorate === bulkGovernorate)
                        .filter((s) => bulkTeacher === "all" || getTeacherLabel(s) === bulkTeacher)
                        .map((student, index) => (
                          <TableRow key={student.id || student._id || `student-${index}`}>
                            <TableCell className="py-2 align-middle text-start font-medium">
                              {getTextValue(student.studentName || student.name) || "-"}
                            </TableCell>
                            <TableCell className="py-2 align-middle text-start" dir="ltr">
                              {student.phone || student.whatsappNumber || "-"}
                            </TableCell>
                            <TableCell className="py-2 align-middle text-start">
                              {student.governorate || "-"}
                            </TableCell>
                            <TableCell className="py-2 align-middle text-start">
                              {student.packageId ? getTextValue(student.packageId.name) : "-"}
                            </TableCell>
                            <TableCell className="py-2 align-middle text-start">
                              {getTeacherLabel(student) || "-"}
                            </TableCell>
                            <TableCell className="py-2 align-middle text-start">
                              {student.startDate ? format(new Date(student.startDate), "yyyy-MM-dd") : "-"}
                            </TableCell>
                            <TableCell className="py-2 align-middle text-start">
                              {student.billingDay || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      {studentMembers
                        .filter((s) => bulkSheet === "all" || s.sheetName === bulkSheet)
                        .filter((s) => bulkGovernorate === "all" || s.governorate === bulkGovernorate)
                        .filter((s) => bulkTeacher === "all" || getTeacherLabel(s) === bulkTeacher).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              {isRtl ? "لا توجد بيانات تطابق الفلتر" : "No rows match the filters"}
                            </TableCell>
                          </TableRow>
                        )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="text-purple-900">
                {isRtl ? "إدارة الشهادات من الشيت" : "Bulk Certificates From Sheet"}
              </CardTitle>
              <CardDescription className="text-purple-700">
                {isRtl ? "ارفع الشيت ثم استورد الطلاب، وبعدها فلتر بالشيت أو المعلم أو المحافظة لإصدار الشهادات" : "Upload the sheet, import students, then filter by sheet, teacher, or governorate to issue certificates"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="flex flex-wrap gap-2">
                  <div className="grid gap-2">
                    <Label>{isRtl ? "الشيت" : "Sheet"}</Label>
                    <Select value={bulkSheet} onValueChange={setBulkSheet}>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder={isRtl ? "اختر الشيت" : "Select Sheet"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{isRtl ? "كل الشيتات" : "All Sheets"}</SelectItem>
                        {Array.from(new Set(studentMembers.map((s) => s.sheetName).filter(Boolean)))
                          .sort()
                          .map((sheet) => (
                            <SelectItem key={sheet} value={sheet!}>{sheet}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{isRtl ? "المعلم" : "Teacher"}</Label>
                    <Select value={bulkTeacher} onValueChange={setBulkTeacher}>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder={isRtl ? "تصفية حسب المعلم" : "Filter by Teacher"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{isRtl ? "جميع المعلمين" : "All Teachers"}</SelectItem>
                        {Array.from(new Set(studentMembers.map((s) => getTeacherLabel(s)).filter(Boolean))).sort().map((teacher) => (
                          <SelectItem key={teacher} value={teacher!}>{teacher}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{isRtl ? "المحافظة" : "Governorate"}</Label>
                    <Select value={bulkGovernorate} onValueChange={setBulkGovernorate}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder={isRtl ? "تصفية حسب المحافظة" : "Filter by Governorate"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{isRtl ? "جميع المحافظات" : "All Governorates"}</SelectItem>
                        {Array.from(new Set(studentMembers.map(s => s.governorate).filter(Boolean))).sort().map((gov) => (
                          <SelectItem key={gov} value={gov!}>{gov}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {bulkSheet !== "all" && (
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteSheet(bulkSheet)}
                      disabled={sheetDeleteLoading === bulkSheet}
                    >
                      <Trash2 className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
                      {sheetDeleteLoading === bulkSheet
                        ? (isRtl ? "جاري الحذف..." : "Deleting...")
                        : (isRtl ? "حذف الشيت بالكامل" : "Delete Full Sheet")}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImportDialogOpen(true);
                      setImportResult(null);
                      setImportFile(null);
                      setImportSheetName("");
                    }}
                  >
                    <Upload className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
                    {isRtl ? "رفع شيت الطلاب (CSV)" : "Upload Students CSV"}
                  </Button>
                  <Button
                    onClick={openBulkActionDialog}
                    disabled={generateLoading || studentMembers.length === 0}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Award className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
                    {generateLoading
                      ? (isRtl ? "جاري الإصدار..." : "Generating...")
                      : (isRtl ? "إصدار شهادات بالجملة" : "Issue Bulk Certificates")}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-purple-700">
                {isRtl
                  ? `عدد الطلاب بعد الفلتر: ${studentMembers
                    .filter((s) => bulkSheet === "all" || s.sheetName === bulkSheet)
                    .filter((s) => bulkGovernorate === "all" || s.governorate === bulkGovernorate)
                    .filter((s) => bulkTeacher === "all" || getTeacherLabel(s) === bulkTeacher).length}`
                  : `Students after filters: ${studentMembers
                    .filter((s) => bulkSheet === "all" || s.sheetName === bulkSheet)
                    .filter((s) => bulkGovernorate === "all" || s.governorate === bulkGovernorate)
                    .filter((s) => bulkTeacher === "all" || getTeacherLabel(s) === bulkTeacher).length}`}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Simple Sheet Tab ─── */}
        <TabsContent value="simple" className="space-y-4">
          {(() => {
            const simpleSheetStats = Array.from(
              studentMembers
                .filter((s) => (s.notes || "").startsWith("simple_sheet:"))
                .reduce((acc, student) => {
                  const name = student.sheetName?.trim();
                  if (!name) return acc;
                  acc.set(name, (acc.get(name) || 0) + 1);
                  return acc;
                }, new Map<string, number>())
            ).sort((a, b) => a[0].localeCompare(b[0]));

            const simpleStudents = studentMembers
              .filter((s) => (s.notes || "").startsWith("simple_sheet:"))
              .filter((s) => simpleSheet === "all" || s.sheetName === simpleSheet);

            return (
              <>
                {simpleSheetStats.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{isRtl ? "الشيتات المبسطة" : "Simple Sheets"}</CardTitle>
                      <CardDescription>
                        {isRtl ? "اختر شيت مبسط للعمل عليه" : "Pick a simple sheet to work with"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      <Button
                        variant={simpleSheet === "all" ? "default" : "outline"}
                        onClick={() => setSimpleSheet("all")}
                      >
                        {isRtl ? "كل الشيتات" : "All Sheets"}
                      </Button>
                      {simpleSheetStats.map(([name, count]) => (
                        <Button
                          key={name}
                          variant={simpleSheet === name ? "default" : "outline"}
                          onClick={() => setSimpleSheet(name)}
                        >
                          {name} ({count})
                        </Button>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Students table */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{isRtl ? "طلاب الشيت المبسط" : "Simple Sheet Students"}</CardTitle>
                        <CardDescription>
                          {isRtl ? `${simpleStudents.length} طالب` : `${simpleStudents.length} students`}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {simpleStudents.length === 0 ? (
                      <div className="text-center py-10">
                        <User className="mx-auto h-10 w-10 text-gray-400" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">
                          {isRtl ? "لا توجد بيانات" : "No data"}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {isRtl ? "قم برفع شيت مبسط أولاً" : "Upload a simple sheet first"}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="h-10">
                              <TableHead className="py-2 align-middle text-start whitespace-nowrap">
                                {isRtl ? "الاسم" : "Name"}
                              </TableHead>
                              <TableHead className="py-2 align-middle text-start whitespace-nowrap">
                                {isRtl ? "التاريخ" : "Date"}
                              </TableHead>
                              <TableHead className="py-2 align-middle text-start whitespace-nowrap">
                                {isRtl ? "الشيت" : "Sheet"}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {simpleStudents.map((student, index) => (
                              <TableRow key={student.id || student._id || `simple-${index}`}>
                                <TableCell className="py-2 align-middle text-start font-medium">
                                  {getTextValue(student.studentName || student.name) || "-"}
                                </TableCell>
                                <TableCell className="py-2 align-middle text-start">
                                  {student.startDate ? format(new Date(student.startDate), "yyyy-MM-dd") : "-"}
                                </TableCell>
                                <TableCell className="py-2 align-middle text-start">
                                  {student.sheetName || "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Actions card */}
                <Card className="border-teal-200 bg-teal-50">
                  <CardHeader>
                    <CardTitle className="text-teal-900">
                      {isRtl ? "إدارة الشيت المبسط" : "Simple Sheet Management"}
                    </CardTitle>
                    <CardDescription className="text-teal-700">
                      {isRtl
                        ? "ارفع شيت يحتوي على الاسم والتاريخ فقط، ثم أصدر الشهادات"
                        : "Upload a sheet with name and date only, then issue certificates"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2 items-end">
                      {/* Sheet filter */}
                      <div className="grid gap-2">
                        <Label>{isRtl ? "الشيت" : "Sheet"}</Label>
                        <Select value={simpleSheet} onValueChange={setSimpleSheet}>
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder={isRtl ? "اختر الشيت" : "Select Sheet"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{isRtl ? "كل الشيتات" : "All Sheets"}</SelectItem>
                            {Array.from(new Set(
                              studentMembers
                                .filter((s) => (s.notes || "").startsWith("simple_sheet:"))
                                .map((s) => s.sheetName)
                                .filter(Boolean)
                            ))
                              .sort()
                              .map((sheet) => (
                                <SelectItem key={sheet} value={sheet!}>{sheet}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {simpleSheet !== "all" && (
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteSimpleSheet(simpleSheet)}
                          disabled={simpleSheetDeleteLoading === simpleSheet}
                        >
                          <Trash2 className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
                          {simpleSheetDeleteLoading === simpleSheet
                            ? (isRtl ? "جاري الحذف..." : "Deleting...")
                            : (isRtl ? "حذف الشيت" : "Delete Sheet")}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSimpleImportDialogOpen(true);
                          setSimpleImportResult(null);
                          setSimpleImportFile(null);
                          setSimpleImportSheetName("");
                        }}
                      >
                        <Upload className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
                        {isRtl ? "رفع شيت مبسط" : "Upload Simple Sheet"}
                      </Button>
                      <Button
                        onClick={() => setSimpleBulkActionDialog({ open: true, mode: null })}
                        disabled={simpleGenerateLoading || simpleStudents.length === 0}
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        <Award className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
                        {simpleGenerateLoading
                          ? (isRtl ? "جاري الإصدار..." : "Generating...")
                          : (isRtl ? "إصدار شهادات" : "Issue Certificates")}
                      </Button>
                    </div>
                    <p className="text-xs text-teal-700">
                      {isRtl
                        ? `عدد الطلاب: ${simpleStudents.length}`
                        : `Students: ${simpleStudents.length}`}
                    </p>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* ─── Simple Sheet Import Dialog ─── */}
      <Dialog open={simpleImportDialogOpen} onOpenChange={setSimpleImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isRtl ? "رفع شيت مبسط" : "Upload Simple Sheet"}</DialogTitle>
            <DialogDescription>
              {isRtl
                ? "الملف يجب أن يحتوي على عمودين فقط: name (الاسم) و date (التاريخ)"
                : "The file must contain two columns: name and date"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>{isRtl ? "اسم الشيت" : "Sheet Name"}</Label>
              <Input
                placeholder={isRtl ? "مثال: شيت يناير 2025" : "e.g. January 2025 Sheet"}
                value={simpleImportSheetName}
                onChange={(e) => setSimpleImportSheetName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>{isRtl ? "ملف CSV" : "CSV File"}</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setSimpleImportFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={downloadSimpleTemplate}
            >
              <Download className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              {isRtl ? "تحميل نموذج CSV" : "Download CSV Template"}
            </Button>
            {simpleImportResult && (
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <p className="font-medium">{isRtl ? "نتيجة الاستيراد:" : "Import result:"}</p>
                <p>{isRtl ? `إجمالي: ${simpleImportResult.total}` : `Total: ${simpleImportResult.total}`}</p>
                <p className="text-green-700">{isRtl ? `نجح: ${simpleImportResult.success}` : `Success: ${simpleImportResult.success}`}</p>
                {simpleImportResult.failed > 0 && (
                  <p className="text-red-700">{isRtl ? `فشل: ${simpleImportResult.failed}` : `Failed: ${simpleImportResult.failed}`}</p>
                )}
                {simpleImportResult.errors?.length > 0 && (
                  <div className="max-h-28 overflow-y-auto">
                    {simpleImportResult.errors.map((e: any, i: number) => (
                      <p key={i} className="text-xs text-red-600">Row {e.row}: {e.error}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSimpleImportDialogOpen(false)}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleImportSimple}
              disabled={simpleImportLoading || !simpleImportFile || !simpleImportSheetName.trim()}
            >
              {simpleImportLoading ? (isRtl ? "جاري الرفع..." : "Uploading...") : (isRtl ? "رفع واستيراد" : "Upload & Import")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Simple Bulk Action Dialog ─── */}
      <Dialog
        open={simpleBulkActionDialog.open}
        onOpenChange={(open) => !open && setSimpleBulkActionDialog({ open: false, mode: null })}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isRtl ? "اختر طريقة الإصدار" : "Choose Issue Method"}</DialogTitle>
            <DialogDescription>
              {isRtl
                ? "هل تريد تحميل ملفات PDF مباشرة أم تصدير بيانات الشهادات فقط؟"
                : "Download PDFs directly or just export certificate data?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 flex-col sm:flex-row">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleGenerateSimpleCertificates("export")}
            >
              {isRtl ? "تصدير CSV فقط" : "Export CSV Only"}
            </Button>
            <Button
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => handleGenerateSimpleCertificates("download")}
            >
              <Download className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              {isRtl ? "تحميل PDF" : "Download PDFs"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={verifyDialog.open}
        onOpenChange={(open) =>
          setVerifyDialog({ open, certificateNumber: "" })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isRtl ? "التحقق من شهادة" : "Verify Certificate"}
            </DialogTitle>
            <DialogDescription>
              {isRtl
                ? "أدخل رقم الشهادة للتحقق من صحتها"
                : "Enter the certificate number to verify its authenticity"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="certificateNumber">
                {isRtl ? "رقم الشهادة" : "Certificate Number"}
              </Label>
              <Input
                id="certificateNumber"
                placeholder="CERT-XXXX-XXXX"
                value={verifyDialog.certificateNumber}
                onChange={(e) =>
                  setVerifyDialog({
                    ...verifyDialog,
                    certificateNumber: e.target.value,
                  })
                }
              />
            </div>
            {verifyResult && (
              <Card
                className={
                  verifyResult.error
                    ? "border-red-200 bg-red-50"
                    : "border-green-200 bg-green-50"
                }
              >
                <CardContent className="pt-6">
                  {verifyResult.error ? (
                    <p className="text-red-800">
                      {isRtl
                        ? "الشهادة غير موجودة أو ملغاة"
                        : "Certificate not found or revoked"}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-semibold text-green-800">
                        {isRtl ? "شهادة صحيحة ✓" : "Valid Certificate âœ“"}
                      </p>
                      <p className="text-sm">
                        <strong>{isRtl ? "الطالب:" : "Student:"}</strong>{" "}
                        {getTextValue(verifyResult.userId?.fullName)}
                      </p>
                      <p className="text-sm">
                        <strong>{isRtl ? "الدورة:" : "Course:"}</strong>{" "}
                        {getTextValue(verifyResult.courseId?.title)}
                      </p>
                      <p className="text-sm">
                        <strong>{isRtl ? "تاريخ الإصدار:" : "Issue Date:"}</strong>{" "}
                        {verifyResult.issuedAt ? format(new Date(verifyResult.issuedAt), "yyyy-MM-dd") : "-"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVerifyDialog({ open: false, certificateNumber: "" });
                setVerifyResult(null);
              }}
            >
              {isRtl ? "إغلاق" : "Close"}
            </Button>
            <Button
              className="bg-genoun-green hover:bg-genoun-green/90"
              onClick={handleVerify}
              disabled={!verifyDialog.certificateNumber}
            >
              {isRtl ? "التحقق" : "Verify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={issueDialog.open}
        onOpenChange={(open) =>
          setIssueDialog({ open, userId: "", studentMemberId: "", courseId: "", templateId: "" })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isRtl ? "إصدار شهادة يدوياً" : "Issue Certificate Manually"}
            </DialogTitle>
            <DialogDescription>
              {isRtl
                ? "اختر الطالب والدورة لإصدار الشهادة له مباشرة"
                : "Select a student and a course to issue a certificate immediately"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{isRtl ? "الطالب (من المستخدمين)" : "Student (From Users)"}</Label>
              <Select
                value={issueDialog.userId}
                onValueChange={(val) => setIssueDialog({ ...issueDialog, userId: val, studentMemberId: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isRtl ? "اختر الطالب" : "Select Student"} />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u && (u.id || u._id) && String(u.id || u._id) !== "").map((u, index) => (
                    <SelectItem key={u.id || u._id || `user-${index}`} value={String(u.id || u._id)}>
                      {u.fullName ? getTextValue(u.fullName) : u.name || u.email} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{isRtl ? "أو طالب من باقة" : "Or Package Student"}</Label>
              <Select
                value={issueDialog.studentMemberId}
                onValueChange={(val) => setIssueDialog({ ...issueDialog, studentMemberId: val, userId: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isRtl ? "اختر طالب باقة" : "Select Package Student"} />
                </SelectTrigger>
                <SelectContent>
                  {studentMembers.filter(s => s && (s.id || s._id) && String(s.id || s._id) !== "").map((s, index) => (
                    <SelectItem key={s.id || s._id || `student-${index}`} value={String(s.id || s._id)}>
                      {getTextValue(s.name || s.studentName)} - {s.phone} {s.packageId ? `(${getTextValue(s.packageId.name)})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{isRtl ? "الدورة" : "Course"}</Label>
              <Select
                value={issueDialog.courseId}
                onValueChange={(val) => setIssueDialog({ ...issueDialog, courseId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isRtl ? "اختر الدورة" : "Select Course"} />
                </SelectTrigger>
                <SelectContent>
                  {courses.filter(c => c && (c.id || c._id) && String(c.id || c._id) !== "" && c.certificateSettings?.enabled).map((c, index) => (
                    <SelectItem key={c.id || c._id || `course-${index}`} value={String(c.id || c._id)}>
                      {getTextValue(c.title)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{isRtl ? "القالب (اختياري)" : "Template (Optional)"}</Label>
              <Select
                value={issueDialog.templateId}
                onValueChange={(val) => setIssueDialog({ ...issueDialog, templateId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isRtl ? "استخدم قالب الدورة الافتراضي" : "Use Course Default Template"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {isRtl ? "الافتراضي (حسب إعدادات الدورة)" : "Default (Based on Course Settings)"}
                  </SelectItem>
                  {templates.filter(t => t && (t.id || t._id) && String(t.id || t._id) !== "").map((t, index) => (
                    <SelectItem key={t.id || t._id || `tpl-${index}`} value={String(t.id || t._id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIssueDialog({ open: false, userId: "", studentMemberId: "", courseId: "", templateId: "" });
              }}
            >
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              className="bg-genoun-green hover:bg-genoun-green/90"
              onClick={handleIssue}
              disabled={issueLoading || ((!issueDialog.userId && !issueDialog.studentMemberId) || !issueDialog.courseId)}
            >
              {issueLoading ? (isRtl ? "جاري الإصدار..." : "Issuing...") : (isRtl ? "إصدار الشهادة" : "Issue Certificate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isRtl ? "استيراد طلاب (CSV)" : "Import Students (CSV)"}</DialogTitle>
            <DialogDescription>
              {isRtl
                ? "قم برفع ملف CSV. الاسم فقط مطلوب والباقي اختياري. اسم الشيت مطلوب. للباقات اكتب اسم الباقة في plan، وللجروبات اكتب اسم الجروب في group واسم المعلم في teacher، أو استخدم group_id."
                : "Upload a CSV file. Only the name is required; the rest are optional. Sheet name is required. Use plan for packages, or group + teacher, or group_id for groups."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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
              <Label htmlFor="sheet-name">{isRtl ? "اسم الشيت" : "Sheet Name"}</Label>
              <Input
                id="sheet-name"
                value={importSheetName}
                onChange={(e) => setImportSheetName(e.target.value)}
                placeholder={isRtl ? "مثال: شيت x" : "e.g. Sheet X"}
              />
            </div>

            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="csv-file">{isRtl ? "ملف CSV" : "CSV File"}</Label>
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

      {/* Bulk Action Dialog */}
      <Dialog
        open={bulkActionDialog.open}
        onOpenChange={(open) => setBulkActionDialog({ open, mode: null })}
      >
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">
              {isRtl ? "اختر طريقة الإصدار" : "Choose Issue Method"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {isRtl
                ? "اختر كيف تريد إصدار الشهادات للطلاب المحددين"
                : "Choose how you want to issue certificates"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {/* Download PDFs Option */}
            <Button
              variant="outline"
              className="h-auto p-4 flex items-center gap-3 hover:bg-purple-50 hover:border-purple-300 w-full"
              onClick={() => handleGenerateCertificates("download")}
            >
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <Download className="h-5 w-5 text-purple-600" />
              </div>
              <div className={`flex-1 ${isRtl ? "text-right" : "text-left"}`}>
                <div className="font-semibold text-sm">
                  {isRtl ? "تحميل الشهادات (PDF)" : "Download Certificates (PDF)"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isRtl
                    ? "إصدار وتحميل ملفات PDF"
                    : "Issue and download PDF files"}
                </div>
              </div>
            </Button>

            {/* Export Sheet Option */}
            <Button
              variant="outline"
              className="h-auto p-4 flex items-center gap-3 hover:bg-green-50 hover:border-green-300 w-full"
              onClick={() => handleGenerateCertificates("export")}
            >
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
              </div>
              <div className={`flex-1 ${isRtl ? "text-right" : "text-left"}`}>
                <div className="font-semibold text-sm">
                  {isRtl ? "تصدير أرقام الشهادات (CSV)" : "Export Certificate Numbers (CSV)"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isRtl
                    ? "تصدير شيت بأرقام الشهادات"
                    : "Export sheet with certificate numbers"}
                </div>
              </div>
            </Button>

            <div className="text-xs text-muted-foreground text-center p-2 bg-muted/50 rounded-lg">
              <Info className="h-3 w-3 inline-block mx-1" />
              {isRtl
                ? "يمكن للطالب استخدام رقم الشهادة للحصول عليها"
                : "Students can use the certificate number to get their certificate"}
            </div>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              variant="outline"
              onClick={() => setBulkActionDialog({ open: false, mode: null })}
            >
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



