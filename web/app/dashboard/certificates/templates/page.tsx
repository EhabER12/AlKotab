"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  getAllTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  CertificateTemplate,
  Placeholder,
  ImagePlaceholder,
} from "@/store/services/certificateService";
import { getPackages } from "@/store/services/packageService";
import { getCourses } from "@/store/services/courseService";
import { getQuizzes } from "@/store/services/quizService";
import { getStudentMembers } from "@/store/services/studentMemberService";
import {
  isAuthenticated,
  isAdmin,
  isModerator,
} from "@/store/services/authService";
import { useAdminLocale } from "@/hooks/dashboard/useAdminLocale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Save,
  Undo,
  Type,
  Image as ImageIcon,
  Move,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "@/lib/axios";
import Link from "next/link";

// Google Fonts URL for all required fonts
const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&family=Amiri:ital,wght@0,400;0,700;1,400&family=Cairo:wght@200..1000&family=Changa:wght@200..800&family=Dancing+Script:wght@400..700&family=El+Messiri:wght@400;500;700&family=Great+Vibes&family=Noto+Kufi+Arabic:wght@100..900&family=Pacifico&family=Reem+Kufi:wght@400..700&family=Tajawal:wght@200;300;400;500;700;800;900&display=swap";

const FONT_OPTIONS = [
  { value: "Cairo", ar: "Cairo - القاهرة", en: "Cairo" },
  { value: "Amiri", ar: "Amiri - الأميري", en: "Amiri" },
  { value: "Tajawal", ar: "Tajawal - تجوال", en: "Tajawal" },
  { value: "Almarai", ar: "Almarai - المرعي", en: "Almarai" },
  { value: "Noto Kufi Arabic", ar: "Noto Kufi Arabic", en: "Noto Kufi Arabic" },
  { value: "Changa", ar: "Changa - شانجا", en: "Changa" },
  { value: "El Messiri", ar: "El Messiri - المسيري", en: "El Messiri" },
  { value: "Reem Kufi", ar: "Reem Kufi - ريم كوفي", en: "Reem Kufi" },
  { value: "Great Vibes", ar: "Great Vibes (توقيع)", en: "Great Vibes (Signature)" },
  { value: "Dancing Script", ar: "Dancing Script (توقيع)", en: "Dancing Script (Signature)" },
  { value: "Pacifico", ar: "Pacifico (توقيع)", en: "Pacifico (Signature)" },
] as const;

const ALIGN_OPTIONS = [
  { value: "left", ar: "يسار", en: "Left" },
  { value: "center", ar: "منتصف", en: "Center" },
  { value: "right", ar: "يمين", en: "Right" },
] as const;

const PDF_COMPATIBLE_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg"]);
const PDF_COMPATIBLE_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg"]);

const getFileExtension = (fileName: string) => {
  const parts = fileName.split(".");
  return parts.length > 1 ? (parts.pop() || "").toLowerCase() : "";
};

const isPdfCompatibleImage = (file: File) => {
  const mime = (file.type || "").toLowerCase();
  if (PDF_COMPATIBLE_IMAGE_MIME_TYPES.has(mime)) return true;
  return PDF_COMPATIBLE_IMAGE_EXTENSIONS.has(getFileExtension(file.name));
};

const convertImageFileToPng = async (file: File): Promise<File> => {
  const imageUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to decode image"));
      image.src = imageUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context is unavailable");

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png", 1);
    });
    if (!blob) throw new Error("Failed to create PNG blob");

    const baseName = file.name.replace(/\.[^/.]+$/, "") || "image";
    return new File([blob], `${baseName}.png`, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
};

const getImageExtensionFromPath = (imagePath: string) => {
  if (!imagePath) return "";

  let cleanPath = imagePath.trim();
  if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
    try {
      cleanPath = new URL(cleanPath).pathname;
    } catch (error) {
      // Keep original path when URL parsing fails
    }
  }

  cleanPath = cleanPath.split("?")[0].split("#")[0];
  const ext = cleanPath.split(".").pop()?.toLowerCase() || "";
  return ext;
};

const isPdfCompatibleImagePath = (imagePath: string) => {
  const ext = getImageExtensionFromPath(imagePath);
  if (!ext) return true;
  return PDF_COMPATIBLE_IMAGE_EXTENSIONS.has(ext);
};

export default function CertificateDesignerPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { t, isRtl } = useAdminLocale();
  const hasCertificateAccess =
    isAuthenticated() && (isAdmin() || isModerator());

  const { templates, isLoading } = useAppSelector((state) => state.certificates);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showNewDialog, setShowShowNewDialog] = useState(false);

  // Designer State
  const [design, setDesign] = useState<{
    name: string;
    packageId?: string;
    courseId?: string;
    quizId?: string;
    sheetName?: string;
    backgroundImage: string;
    width: number;
    height: number;
    orientation: "portrait" | "landscape";
    placeholders: {
      studentName: Placeholder;
      courseName: Placeholder;
      issuedDate: Placeholder;
      certificateNumber: Placeholder;
      customText: Placeholder[];
      images: ImagePlaceholder[];
    };
    isDefault: boolean;
  }>({
    name: "",
    packageId: "",
    courseId: "",
    quizId: "",
    sheetName: "",
    backgroundImage: "",
    width: 1200,
    height: 900,
    orientation: "landscape",
    placeholders: {
      studentName: { x: 600, y: 400, fontSize: 40, fontFamily: "Cairo", color: "#000000", align: "center", fontWeight: "bold" },
      courseName: { x: 600, y: 500, fontSize: 30, fontFamily: "Cairo", color: "#000000", align: "center", fontWeight: "normal" },
      issuedDate: { x: 600, y: 600, fontSize: 20, fontFamily: "Cairo", color: "#000000", align: "center", fontWeight: "normal" },
      certificateNumber: { x: 600, y: 700, fontSize: 16, fontFamily: "Cairo", color: "#000000", align: "center", fontWeight: "normal" },
      customText: [],
      images: [],
    },
    isDefault: false,
  });

  const [activePlaceholder, setActivePlaceholder] = useState<string>("studentName");
  const [activeType, setActiveType] = useState<"standard" | "custom" | "image">("standard");
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [previewScale, setPreviewScale] = useState(0.5);
  const containerRef = useRef<HTMLDivElement>(null);
  // Dragging State
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const { packages } = useAppSelector((state) => state.packages);
  const { courses } = useAppSelector((state) => state.courses);
  const { quizzes } = useAppSelector((state) => state.quizzes);
  const { studentMembers } = useAppSelector((state) => state.studentMembers);

  // Extract unique sheet names from student members
  const availableSheets = Array.from(
    new Set(
      studentMembers
        .map((s) => (s.sheetName || "").trim())
        .filter((name) => name !== "")
    )
  ).sort();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    if (!isAdmin() && !isModerator()) {
      router.push("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    if (!hasCertificateAccess) {
      return;
    }

    dispatch(getAllTemplates());
    dispatch(getPackages());
    dispatch(getCourses({}));
    dispatch(getQuizzes());
    dispatch(getStudentMembers({}));
  }, [dispatch, hasCertificateAccess]);

  if (!hasCertificateAccess) {
    return null;
  }

  // Default placeholder values for fallback
  const defaultPlaceholder: Placeholder = {
    x: 600,
    y: 400,
    fontSize: 24,
    fontFamily: "Cairo",
    color: "#000000",
    align: "center",
    fontWeight: "normal"
  };

  // Helper to merge placeholder with defaults
  const mergePlaceholder = (placeholder: Partial<Placeholder> | undefined, defaults: Partial<Placeholder> = {}): Placeholder => {
    return {
      ...defaultPlaceholder,
      ...defaults,
      ...placeholder,
      // Ensure numeric values
      x: Number(placeholder?.x ?? defaults?.x ?? defaultPlaceholder.x),
      y: Number(placeholder?.y ?? defaults?.y ?? defaultPlaceholder.y),
      fontSize: Number(placeholder?.fontSize ?? defaults?.fontSize ?? defaultPlaceholder.fontSize),
    };
  };

  const handleSelectTemplate = (template: CertificateTemplate) => {
    setSelectedTemplate(template);
    setDesign({
      name: template.name,
      packageId: template.packageId || "",
      courseId: typeof template.courseId === "string" ? template.courseId : "",
      quizId:
        typeof template.quizId === "string"
          ? template.quizId
          : (template.quizId as any)?.id || (template.quizId as any)?._id || "",
      sheetName: (template as any).sheetName || "",
      backgroundImage: template.backgroundImage,
      width: template.width,
      height: template.height,
      orientation: (template as any).orientation || "landscape",
      placeholders: {
        studentName: mergePlaceholder(template.placeholders?.studentName, { y: 400, fontSize: 40, fontWeight: "bold" }),
        courseName: mergePlaceholder(template.placeholders?.courseName, { y: 500, fontSize: 30 }),
        issuedDate: mergePlaceholder(template.placeholders?.issuedDate, { y: 600, fontSize: 20 }),
        certificateNumber: mergePlaceholder(template.placeholders?.certificateNumber, { y: 700, fontSize: 16 }),
        customText: (template.placeholders?.customText || []).map(ct => mergePlaceholder(ct)),
        images: template.placeholders?.images || [],
      },
      isDefault: template.isDefault,
    });
    setIsEditing(true);
  };

  const handleCreateNew = () => {
    setDesign({
      name: design.name || "",
      packageId: "",
      courseId: "",
      quizId: "",
      sheetName: "",
      backgroundImage: "",
      width: 1200,
      height: 900,
      orientation: "landscape",
      placeholders: {
        studentName: { x: 600, y: 400, fontSize: 40, fontFamily: "Cairo", color: "#000000", align: "center", fontWeight: "bold" },
        courseName: { x: 600, y: 500, fontSize: 30, fontFamily: "Cairo", color: "#000000", align: "center", fontWeight: "normal" },
        issuedDate: { x: 600, y: 600, fontSize: 20, fontFamily: "Cairo", color: "#000000", align: "center", fontWeight: "normal" },
        certificateNumber: { x: 600, y: 700, fontSize: 16, fontFamily: "Cairo", color: "#000000", align: "center", fontWeight: "normal" },
        customText: [],
        images: [],
      },
      isDefault: false,
    });
    setSelectedTemplate(null);
    setIsEditing(true);
    setShowShowNewDialog(false);
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, target: "background" | "extra") => {
    const file = e.target.files?.[0];
    if (!file) return;

    let uploadFile = file;
    if (!isPdfCompatibleImage(file)) {
      try {
        uploadFile = await convertImageFileToPng(file);
        toast.success("Image was auto-converted to PNG for PDF compatibility");
      } catch (error) {
        toast.error("Unsupported image format. Please use PNG or JPG/JPEG.");
        e.target.value = "";
        return;
      }
    }

    const formData = new FormData();
    formData.append("image", uploadFile, uploadFile.name);

    try {
      const response = await axios.post("/upload/image", formData);
      const url = response.data.data.url;

      if (target === "background") {
        const img = new Image();
        img.onload = () => {
          setDesign((prev) => ({ ...prev, backgroundImage: url, width: img.width, height: img.height }));
        };
        img.onerror = () => {
          setDesign((prev) => ({ ...prev, backgroundImage: url }));
          toast.error("Background uploaded but preview failed");
        };
        img.src = url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_API_URL || ""}${url}`;
        toast.success(isRtl ? "تم رفع الخلفية بنجاح" : "Background uploaded successfully");
      } else {
        const newImage: ImagePlaceholder = {
          url,
          x: 100,
          y: 100,
          width: 150,
          height: 150
        };
        const nextIndex = design.placeholders.images.length;
        setDesign((prev) => ({
          ...prev,
          placeholders: {
            ...prev.placeholders,
            images: [...prev.placeholders.images, newImage]
          }
        }));
        setActiveType("image");
        setActiveIndex(nextIndex);
        toast.success(isRtl ? "تمت إضافة الصورة" : "Image added");
      }
    } catch (error) {
      toast.error(isRtl ? "فشل رفع الصورة" : "Failed to upload image");
    } finally {
      e.target.value = "";
    }
  };

  const addCustomText = () => {
    const newText: Placeholder = {
      text: isRtl ? "نص إضافي" : "Custom Text",
      x: 600,
      y: 800,
      fontSize: 24,
      fontFamily: "Cairo",
      color: "#000000",
      align: "center",
      fontWeight: "normal"
    };
    setDesign({
      ...design,
      placeholders: {
        ...design.placeholders,
        customText: [...design.placeholders.customText, newText]
      }
    });
    setActiveType("custom");
    setActiveIndex(design.placeholders.customText.length);
  };

  const removeElement = (type: "custom" | "image" | "standard", indexOrKey: number | string) => {
    let confirmMessage = "";

    if (type === "custom") {
      confirmMessage = "Are you sure you want to remove this text?";
    } else if (type === "image") {
      confirmMessage = "Are you sure you want to remove this image?";
    } else if (type === "standard") {
      const labels: any = {
        studentName: "Student Name",
        courseName: "Course Name",
        issuedDate: "Issue Date",
        certificateNumber: "Certificate Number"
      };
      confirmMessage = `Are you sure you want to remove \"${labels[indexOrKey]}\"? It will be hidden from the certificate.`;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    if (type === "custom") {
      const newCustom = [...design.placeholders.customText];
      newCustom.splice(indexOrKey as number, 1);
      setDesign({
        ...design,
        placeholders: { ...design.placeholders, customText: newCustom }
      });
      setActiveType("standard");
      setActivePlaceholder("studentName");
      setActiveIndex(-1);
      toast.success("Text removed successfully");
    } else if (type === "image") {
      const newImages = [...design.placeholders.images];
      newImages.splice(indexOrKey as number, 1);
      setDesign({
        ...design,
        placeholders: { ...design.placeholders, images: newImages }
      });
      setActiveType("standard");
      setActivePlaceholder("studentName");
      setActiveIndex(-1);
      toast.success("Image removed successfully");
    } else if (type === "standard") {
      const key = indexOrKey as keyof typeof design.placeholders;
      setDesign({
        ...design,
        placeholders: { ...design.placeholders, [key]: null as any }
      });
      toast.success("Element removed successfully");
    }
  };

  const handleSave = async () => {
    const normalizedName = design.name.trim();
    if (!normalizedName) {
      toast.error("Please enter template name");
      return;
    }
    if (!design.backgroundImage) {
      toast.error("Please upload background image");
      return;
    }

    const selectedTemplateId = selectedTemplate?.id || (selectedTemplate as any)?._id;
    const hasDuplicateName = templates.some((template) => {
      const currentTemplateId = template.id || (template as any)._id;
      return (
        currentTemplateId !== selectedTemplateId &&
        (template.name || "").trim().toLowerCase() === normalizedName.toLowerCase()
      );
    });
    if (hasDuplicateName) {
      toast.error("Template name already exists. Choose a different name.");
      return;
    }

    if (!isPdfCompatibleImagePath(design.backgroundImage)) {
      toast.error("Background image must be PNG or JPG/JPEG");
      return;
    }

    const invalidExtraImage = (design.placeholders.images || []).find(
      (img) => !isPdfCompatibleImagePath(img.url)
    );
    if (invalidExtraImage) {
      toast.error("Some added images are not PDF-compatible. Use PNG or JPG/JPEG.");
      return;
    }

    // Clean up empty values before sending
    const cleanedData = { ...design, name: normalizedName };
    if (cleanedData.sheetName) {
      cleanedData.sheetName = cleanedData.sheetName.trim();
    }
    if (!cleanedData.packageId || cleanedData.packageId === "none") {
      delete cleanedData.packageId;
    }
    if (!cleanedData.courseId || cleanedData.courseId === "none") {
      delete cleanedData.courseId;
    }
    if (!cleanedData.quizId || cleanedData.quizId === "none") {
      delete cleanedData.quizId;
    }
    if (!cleanedData.sheetName || cleanedData.sheetName === "none") {
      delete cleanedData.sheetName;
    }

    try {
      if (selectedTemplate) {
        const templateId = selectedTemplate.id || (selectedTemplate as any)._id;
        await dispatch(updateTemplate({ id: templateId, data: cleanedData })).unwrap();
        toast.success(isRtl ? "تم تحديث القالب" : "Template updated");
      } else {
        await dispatch(createTemplate(cleanedData)).unwrap();
        toast.success(isRtl ? "تم إنشاء القالب بنجاح" : "Template created successfully");
      }
      setIsEditing(false);
      dispatch(getAllTemplates());
    } catch (error: any) {
      const errorMessage =
        (typeof error === "string" ? error : null) ||
        error?.message ||
        "Failed to save template";
      toast.error(errorMessage);
    }
  };
  const handleDelete = async (id: string) => {
    if (confirm(isRtl ? "هل أنت متأكد من حذف هذا القالب؟" : "Are you sure you want to delete this template?")) {
      try {
        await dispatch(deleteTemplate(id)).unwrap();
        toast.success(isRtl ? "تم الحذف" : "Template deleted");
        if ((selectedTemplate?.id || (selectedTemplate as any)?._id) === id) setIsEditing(false);
      } catch (error: any) {
        toast.error(error || "Failed to delete template");
      }
    }
  };

  const updatePlaceholder = (key: string, updates: Partial<Placeholder>, type: "standard" | "custom" = "standard", index: number = -1) => {
    if (type === "standard") {
      const current = design.placeholders[key as keyof typeof design.placeholders] as Placeholder | null;
      if (!current) return;
      setDesign({
        ...design,
        placeholders: {
          ...design.placeholders,
          [key]: { ...current, ...updates },
        },
      });
    } else {
      if (!design.placeholders.customText[index]) return;
      const newCustom = [...design.placeholders.customText];
      newCustom[index] = { ...newCustom[index], ...updates };
      setDesign({
        ...design,
        placeholders: { ...design.placeholders, customText: newCustom },
      });
    }
  };

  const updateImage = (index: number, updates: Partial<ImagePlaceholder>) => {
    const newImages = [...design.placeholders.images];
    newImages[index] = { ...newImages[index], ...updates };
    setDesign({
      ...design,
      placeholders: { ...design.placeholders, images: newImages },
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, type: "standard" | "custom" | "image", indexOrKey: string | number) => {
    e.stopPropagation();
    if (!containerRef.current) return;

    // Get the container and element positions
    const containerRect = containerRef.current.getBoundingClientRect();

    // Calculate mouse position in unscaled coordinates (relative to the canvas)
    const mouseXInCanvas = (e.clientX - containerRect.left) / previewScale;
    const mouseYInCanvas = (e.clientY - containerRect.top) / previewScale;

    // Get the current element's position for calculating drag offset
    let elementX = 0;
    let elementY = 0;

    if (type === "standard") {
      const k = indexOrKey as keyof typeof design.placeholders;
      const p = design.placeholders[k] as Placeholder | null;
      if (!p) return;
      elementX = p.x;
      elementY = p.y;
    } else if (type === "custom") {
      const p = design.placeholders.customText[indexOrKey as number];
      if (!p) return;
      elementX = p.x;
      elementY = p.y;
    } else if (type === "image") {
      const img = design.placeholders.images[indexOrKey as number];
      if (!img) return;
      elementX = img.x;
      elementY = img.y;
    }

    // The offset is the difference between where the mouse clicked and the element's stored position
    // This allows dragging from anywhere on the element
    setDragOffset({
      x: mouseXInCanvas - elementX,
      y: mouseYInCanvas - elementY
    });
    setIsDragging(true);

    if (type === "standard") {
      setActiveType("standard");
      setActivePlaceholder(indexOrKey as string);
    } else if (type === "custom") {
      setActiveType("custom");
      setActiveIndex(indexOrKey as number);
    } else if (type === "image") {
      setActiveType("image");
      setActiveIndex(indexOrKey as number);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();

    // Calculate mouse position in unscaled coordinates (relative to canvas)
    const mouseXInCanvas = (e.clientX - containerRect.left) / previewScale;
    const mouseYInCanvas = (e.clientY - containerRect.top) / previewScale;

    // Calculate new element position by subtracting the drag offset
    const newX = Math.round(mouseXInCanvas - dragOffset.x);
    const newY = Math.round(mouseYInCanvas - dragOffset.y);

    // Clamp values to stay within canvas bounds
    const clampedX = Math.max(0, Math.min(newX, design.width));
    const clampedY = Math.max(0, Math.min(newY, design.height));

    if (activeType === "standard") {
      updatePlaceholder(activePlaceholder, { x: clampedX, y: clampedY });
    } else if (activeType === "custom") {
      updatePlaceholder("", { x: clampedX, y: clampedY }, "custom", activeIndex);
    } else if (activeType === "image") {
      updateImage(activeIndex, { x: clampedX, y: clampedY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Disable simple click-to-move for cleaner UX, or keep it for background click?
  // Let's keep background click for deselecting or moving if needed, but dragging is primary.
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only move if we weren't just dragging
    // Implementation of drag usually prevents click.
    // We can just rely on drag.
  };

  const getTextTransform = (align?: string) => {
    if (align === "right") return "translateX(-100%)";
    if (align === "center") return "translateX(-50%)";
    return "none";
  };

  const getRenderableFontFamily = (fontFamily?: string) => {
    if (!fontFamily) return "Cairo";
    if (fontFamily === "Changa") return "Tajawal";
    if (fontFamily === "El Messiri") return "Cairo";
    if (fontFamily === "Reem Kufi") return "Noto Kufi Arabic";
    return fontFamily;
  };

  if (isLoading && !isEditing) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-genoun-green border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className={`flex-1 space-y-4 p-8 pt-6 ${isRtl ? "text-right" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
      <link href={GOOGLE_FONTS_URL} rel="stylesheet" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {isRtl ? "مصمم الشهادات" : "Certificate Designer"}
          </h2>
          <p className="text-muted-foreground">
            {isRtl ? "تخصيص شكل ومحتوى شهادات التقدير" : "Customize the look and content of certificates"}
          </p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={() => setShowShowNewDialog(true)} className="bg-genoun-green hover:bg-genoun-green/90">
              <Plus className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              {isRtl ? "قالب جديد" : "New Template"}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <Undo className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
                {isRtl ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={handleSave} className="bg-genoun-green hover:bg-genoun-green/90">
                <Save className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
                {isRtl ? "حفظ القالب" : "Save Template"}
              </Button>
            </>
          )}
          <Link href="/dashboard/certificates">
            <Button variant="ghost">
              <ArrowLeft className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              {isRtl ? "الرجوع للشهادات" : "Back to Certificates"}
            </Button>
          </Link>
        </div>
      </div>

      {!isEditing ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template, idx) => (
            <Card key={template.id || template._id || `template-${idx}`} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video relative bg-gray-100 border-b">
                <img
                  src={template.backgroundImage.startsWith("http") ? template.backgroundImage : `${process.env.NEXT_PUBLIC_API_URL || ""}${template.backgroundImage}`}
                  alt={template.name}
                  className="w-full h-full object-contain"
                />
                {template.isDefault && (
                  <Badge className="absolute top-2 right-2 bg-genoun-green">
                    {isRtl ? "افتراضي" : "Default"}
                  </Badge>
                )}
              </div>
              <CardHeader className="p-4">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription>
                  {template.width}x{template.height} px
                  {template.quizId ? ` • ${isRtl ? "اختبار مرتبط" : "Linked Quiz"}` : ""}
                  {template.sheetName ? ` • ${isRtl ? "الشيت" : "Sheet"}: ${template.sheetName}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 flex justify-between">
                <Button variant="outline" size="sm" onClick={() => handleSelectTemplate(template)}>
                  {isRtl ? "تعديل" : "Edit"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id || (template as any)._id)} className="text-red-600">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {templates.length === 0 && (
            <Card className="col-span-full py-12 flex flex-col items-center justify-center border-dashed">
              <ImageIcon className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-muted-foreground">{isRtl ? "لا توجد قوالب حالياً" : "No templates found"}</p>
              <Button variant="link" onClick={() => setShowShowNewDialog(true)} className="text-genoun-green">
                {isRtl ? "أنشئ أول قالب الآن" : "Create your first template"}
              </Button>
            </Card>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Sidebar */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="text-base">{isRtl ? "إعدادات القالب" : "Template Settings"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>{isRtl ? "اسم القالب" : "Template Name"}</Label>
                <Input value={design.name} onChange={(e) => setDesign({ ...design, name: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>{isRtl ? "ربط بباقة (اختياري)" : "Link to Package (Optional)"}</Label>
                <Select
                  value={design.packageId || "none"}
                  onValueChange={(val) => setDesign({ ...design, packageId: val === "none" ? "" : val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isRtl ? "اختر باقة..." : "Select package..."} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{isRtl ? "بدون ربط" : "No Link"}</SelectItem>
                    {packages.filter(pkg => pkg && (pkg.id || pkg._id) && String(pkg.id || pkg._id) !== "").map((pkg) => (
                      <SelectItem key={pkg.id || pkg._id} value={String(pkg.id || pkg._id)}>
                        {isRtl ? pkg.name.ar : pkg.name.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{isRtl ? "ربط بكورس (اختياري)" : "Link to Course (Optional)"}</Label>
                <Select
                  value={design.courseId || "none"}
                  onValueChange={(val) => setDesign({ ...design, courseId: val === "none" ? "" : val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isRtl ? "اختر كورس..." : "Select course..."} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{isRtl ? "بدون ربط" : "No Link"}</SelectItem>
                    {courses && courses.filter((course: any) => course && (course.id || course._id) && String(course.id || course._id) !== "").map((course: any) => (
                      <SelectItem key={course.id || course._id} value={String(course.id || course._id)}>
                        {isRtl ? course.title?.ar : course.title?.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{isRtl ? "ربط باختبار (اختياري)" : "Link to Quiz (Optional)"}</Label>
                <Select
                  value={design.quizId || "none"}
                  onValueChange={(val) => setDesign({ ...design, quizId: val === "none" ? "" : val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isRtl ? "اختر اختبار..." : "Select quiz..."} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{isRtl ? "بدون ربط" : "No Link"}</SelectItem>
                    {quizzes &&
                      quizzes
                        .filter((quiz: any) => quiz && (quiz.id || quiz._id) && String(quiz.id || quiz._id) !== "")
                        .map((quiz: any) => (
                          <SelectItem key={quiz.id || quiz._id} value={String(quiz.id || quiz._id)}>
                            {isRtl ? quiz.title?.ar || quiz.title?.en : quiz.title?.en || quiz.title?.ar}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{isRtl ? "ربط باسم الشيت (اختياري)" : "Link to Sheet Name (Optional)"}</Label>
                <Select
                  value={design.sheetName || "none"}
                  onValueChange={(val) => setDesign({ ...design, sheetName: val === "none" ? "" : val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isRtl ? "اختر شيت..." : "Select sheet..."} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{isRtl ? "بدون ربط" : "No Link"}</SelectItem>
                    {availableSheets.map((sheet) => (
                      <SelectItem key={sheet} value={sheet}>
                        {sheet}
                      </SelectItem>
                    ))}
                    {availableSheets.length === 0 && (
                      <SelectItem value="__empty__" disabled>
                        {isRtl ? "لا توجد شيتات متاحة" : "No sheets available"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{isRtl ? "صورة الخلفية" : "Background Image"}</Label>
                <div className="flex flex-col gap-2">
                  {design.backgroundImage && (
                    <div className="aspect-video rounded border overflow-hidden bg-gray-50">
                      <img src={design.backgroundImage.startsWith("http") ? design.backgroundImage : `${process.env.NEXT_PUBLIC_API_URL || ""}${design.backgroundImage}`} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <Input type="file" accept="image/*" onChange={(e) => handleUploadImage(e, "background")} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>{isRtl ? "قالب افتراضي" : "Set as Default"}</Label>
                <Switch checked={design.isDefault} onCheckedChange={(val) => setDesign({ ...design, isDefault: val })} />
              </div>

              {/* Orientation Switcher */}
              <div className="space-y-2">
                <Label>{isRtl ? "اتجاه الصفحة" : "Page Orientation"}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={design.orientation === "landscape" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const newOrientation = "landscape";
                      // Swap width/height if changing from portrait to landscape
                      const newWidth = design.orientation === "portrait" && design.width < design.height ? design.height : design.width;
                      const newHeight = design.orientation === "portrait" && design.width < design.height ? design.width : design.height;
                      setDesign({ ...design, orientation: newOrientation, width: newWidth, height: newHeight });
                    }}
                    className={design.orientation === "landscape" ? "bg-genoun-green hover:bg-genoun-green/90" : ""}
                  >
                    📄 {isRtl ? "أفقي" : "Landscape"}
                  </Button>
                  <Button
                    type="button"
                    variant={design.orientation === "portrait" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const newOrientation = "portrait";
                      // Swap width/height if changing from landscape to portrait
                      const newWidth = design.orientation === "landscape" && design.width > design.height ? design.height : design.width;
                      const newHeight = design.orientation === "landscape" && design.width > design.height ? design.width : design.height;
                      setDesign({ ...design, orientation: newOrientation, width: newWidth, height: newHeight });
                    }}
                    className={design.orientation === "portrait" ? "bg-genoun-green hover:bg-genoun-green/90" : ""}
                  >
                    📃 {isRtl ? "رأسي" : "Portrait"}
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4 flex flex-col gap-2">
                <Button variant="outline" size="sm" onClick={addCustomText} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {isRtl ? "إضافة جملة مخصصة" : "Add Custom Text"}
                </Button>
                <div className="relative">
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <label className="cursor-pointer">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      {isRtl ? "إضافة صورة / شعار" : "Add Image / Logo"}
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUploadImage(e, "extra")} />
                    </label>
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="mb-4 block font-bold">{isRtl ? "تعديل العناصر" : "Edit Elements"}</Label>
                <Tabs value={activeType} onValueChange={(val: any) => setActiveType(val)}>
                  <TabsList className="grid grid-cols-3 w-full mb-4">
                    <TabsTrigger value="standard">{isRtl ? "أساسي" : "Standard"}</TabsTrigger>
                    <TabsTrigger value="custom">{isRtl ? "نصوص" : "Texts"}</TabsTrigger>
                    <TabsTrigger value="image">{isRtl ? "صور" : "Images"}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="standard" className="space-y-4">
                    <Select value={activePlaceholder} onValueChange={setActivePlaceholder}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="studentName">
                          {isRtl ? "اسم الطالب" : "Student Name"}
                          {!design.placeholders.studentName && " ❌"}
                        </SelectItem>
                        <SelectItem value="courseName">
                          {isRtl ? "اسم الدورة" : "Course Name"}
                          {!design.placeholders.courseName && " ❌"}
                        </SelectItem>
                        <SelectItem value="issuedDate">
                          {isRtl ? "تاريخ الإصدار" : "Issue Date"}
                          {!design.placeholders.issuedDate && " ❌"}
                        </SelectItem>
                        <SelectItem value="certificateNumber">
                          {isRtl ? "رقم الشهادة" : "Certificate ID"}
                          {!design.placeholders.certificateNumber && " ❌"}
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {(() => {
                      const k = activePlaceholder as keyof typeof design.placeholders;
                      const p = design.placeholders[k] as Placeholder;

                      // If element is deleted (null), show restore option
                      if (!p) {
                        return (
                          <div className="space-y-4 text-center py-8">
                            <div className="text-muted-foreground">
                              {isRtl ? "هذا العنصر محذوف حالياً" : "This element is currently deleted"}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const defaultValues: any = {
                                  studentName: { x: 600, y: 400, fontSize: 40, fontFamily: "Cairo", color: "#000000", align: "center", fontWeight: "bold" },
                                  courseName: { x: 600, y: 500, fontSize: 30, fontFamily: "Cairo", color: "#000000", align: "center", fontWeight: "normal" },
                                  issuedDate: { x: 600, y: 600, fontSize: 20, fontFamily: "Cairo", color: "#000000", align: "center", fontWeight: "normal" },
                                  certificateNumber: { x: 600, y: 700, fontSize: 16, fontFamily: "Cairo", color: "#000000", align: "center", fontWeight: "normal" },
                                };
                                setDesign({
                                  ...design,
                                  placeholders: { ...design.placeholders, [k]: defaultValues[k] }
                                });
                                toast.success(isRtl ? "تم استعادة العنصر بنجاح" : "Element restored successfully");
                              }}
                              className="w-full"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {isRtl ? "استعادة العنصر" : "Restore Element"}
                            </Button>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">{isRtl ? "الموقع X" : "Position X"}</Label>
                              <Input
                                type="number"
                                value={p.x}
                                onChange={(e) => updatePlaceholder(k, { x: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{isRtl ? "الموقع Y" : "Position Y"}</Label>
                              <Input
                                type="number"
                                value={p.y}
                                onChange={(e) => updatePlaceholder(k, { y: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <Label>{isRtl ? "حجم الخط" : "Font Size"}</Label>
                              <span>{p.fontSize}px</span>
                            </div>
                            <Slider value={[p.fontSize]} min={10} max={100} onValueChange={([val]) => updatePlaceholder(k, { fontSize: val })} />
                          </div>
                          <div className="space-y-2">
                            <Label>{isRtl ? "اللون" : "Color"}</Label>
                            <div className="flex gap-2">
                              <Input type="color" className="w-12 h-10 p-1" value={p.color} onChange={(e) => updatePlaceholder(k, { color: e.target.value })} />
                              <Input value={p.color} onChange={(e) => updatePlaceholder(k, { color: e.target.value })} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>{isRtl ? "نوع الخط" : "Font Family"}</Label>
                            <Select
                              value={p.fontFamily}
                              onValueChange={(val) => updatePlaceholder(k, { fontFamily: val })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FONT_OPTIONS.map((font) => (
                                  <SelectItem key={font.value} value={font.value}>
                                    {isRtl ? font.ar : font.en}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>{isRtl ? "المحاذاة" : "Alignment"}</Label>
                            <Select
                              value={p.align || "center"}
                              onValueChange={(val) => updatePlaceholder(k, { align: val })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ALIGN_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {isRtl ? option.ar : option.en}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>{isRtl ? "سُمك الخط" : "Font Weight"}</Label>
                            <Select
                              value={p.fontWeight || "normal"}
                              onValueChange={(val) => updatePlaceholder(k, { fontWeight: val })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">{isRtl ? "عادي" : "Normal"}</SelectItem>
                                <SelectItem value="bold">{isRtl ? "عريض" : "Bold"}</SelectItem>
                                <SelectItem value="500">Medium</SelectItem>
                                <SelectItem value="600">Semi Bold</SelectItem>
                                <SelectItem value="700">Bold 700</SelectItem>
                                <SelectItem value="800">Extra Bold</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="border-t pt-4">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeElement("standard", k)}
                              className="w-full"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {isRtl ? "حذف هذا العنصر" : "Remove This Element"}
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                              {isRtl ? "سيتم إخفاء هذا العنصر من الشهادة. يمكنك إعادته لاحقاً بالضغط على زر 'إعادة العنصر'." : "This element will be hidden from the certificate. You can restore it later by clicking 'Restore Element'."}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </TabsContent>

                  <TabsContent value="custom" className="space-y-4">
                    {design.placeholders.customText.length > 0 ? (
                      <>
                        <Select value={activeIndex.toString()} onValueChange={(v) => setActiveIndex(parseInt(v))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {design.placeholders.customText.map((item, idx) => (
                              <SelectItem key={`sel-custom-${idx}`} value={idx.toString()}>{item.text || `Text ${idx + 1}`}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {activeIndex !== -1 && design.placeholders.customText[activeIndex] && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>{isRtl ? "النص" : "Text Content"}</Label>
                              <Input
                                value={design.placeholders.customText[activeIndex].text}
                                onChange={(e) => updatePlaceholder("", { text: e.target.value }, "custom", activeIndex)}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">{isRtl ? "الموقع X" : "Position X"}</Label>
                                <Input
                                  type="number"
                                  value={design.placeholders.customText[activeIndex].x}
                                  onChange={(e) => updatePlaceholder("", { x: parseInt(e.target.value) || 0 }, "custom", activeIndex)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{isRtl ? "الموقع Y" : "Position Y"}</Label>
                                <Input
                                  type="number"
                                  value={design.placeholders.customText[activeIndex].y}
                                  onChange={(e) => updatePlaceholder("", { y: parseInt(e.target.value) || 0 }, "custom", activeIndex)}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <Label>{isRtl ? "حجم الخط" : "Font Size"}</Label>
                                <span>{design.placeholders.customText[activeIndex].fontSize}px</span>
                              </div>
                              <Slider
                                value={[design.placeholders.customText[activeIndex].fontSize]}
                                min={10} max={100}
                                onValueChange={([val]) => updatePlaceholder("", { fontSize: val }, "custom", activeIndex)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{isRtl ? "نوع الخط" : "Font Family"}</Label>
                              <Select
                                value={design.placeholders.customText[activeIndex].fontFamily}
                                onValueChange={(val) => updatePlaceholder("", { fontFamily: val }, "custom", activeIndex)}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {FONT_OPTIONS.map((font) => (
                                    <SelectItem key={font.value} value={font.value}>
                                      {isRtl ? font.ar : font.en}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>{isRtl ? "المحاذاة" : "Alignment"}</Label>
                              <Select
                                value={design.placeholders.customText[activeIndex].align || "center"}
                                onValueChange={(val) => updatePlaceholder("", { align: val }, "custom", activeIndex)}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {ALIGN_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {isRtl ? option.ar : option.en}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>{isRtl ? "سُمك الخط" : "Font Weight"}</Label>
                              <Select
                                value={design.placeholders.customText[activeIndex].fontWeight || "normal"}
                                onValueChange={(val) => updatePlaceholder("", { fontWeight: val }, "custom", activeIndex)}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="normal">{isRtl ? "عادي" : "Normal"}</SelectItem>
                                  <SelectItem value="bold">{isRtl ? "عريض" : "Bold"}</SelectItem>
                                  <SelectItem value="500">Medium</SelectItem>
                                  <SelectItem value="600">Semi Bold</SelectItem>
                                  <SelectItem value="700">Bold 700</SelectItem>
                                  <SelectItem value="800">Extra Bold</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>{isRtl ? "اللون" : "Color"}</Label>
                              <div className="flex gap-2">
                                <Input type="color" className="w-12 h-10 p-1" value={design.placeholders.customText[activeIndex].color} onChange={(e) => updatePlaceholder("", { color: e.target.value }, "custom", activeIndex)} />
                                <Input value={design.placeholders.customText[activeIndex].color} onChange={(e) => updatePlaceholder("", { color: e.target.value }, "custom", activeIndex)} />
                              </div>
                            </div>
                            <Button variant="destructive" size="sm" onClick={() => removeElement("custom", activeIndex)} className="w-full">
                              <Trash2 className="h-4 w-4 mr-2" /> {isRtl ? "حذف النص" : "Remove Text"}
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">{isRtl ? "لا توجد نصوص مخصصة" : "No custom texts added"}</p>
                    )}
                  </TabsContent>

                  <TabsContent value="image" className="space-y-4">
                    {design.placeholders.images.length > 0 ? (
                      <>
                        <Select value={activeIndex.toString()} onValueChange={(v) => setActiveIndex(parseInt(v))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {design.placeholders.images.map((img, idx) => (
                              <SelectItem key={`sel-img-${idx}`} value={idx.toString()}>Image {idx + 1}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {activeIndex !== -1 && design.placeholders.images[activeIndex] && (
                          <div className="space-y-4">
                            {/* Position Controls */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">{isRtl ? "الموقع X" : "Position X"}</Label>
                                <Input
                                  type="number"
                                  value={design.placeholders.images[activeIndex].x}
                                  onChange={(e) => updateImage(activeIndex, { x: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{isRtl ? "الموقع Y" : "Position Y"}</Label>
                                <Input
                                  type="number"
                                  value={design.placeholders.images[activeIndex].y}
                                  onChange={(e) => updateImage(activeIndex, { y: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">{isRtl ? "العرض" : "Width"}</Label>
                                <Input type="number" value={design.placeholders.images[activeIndex].width} onChange={(e) => updateImage(activeIndex, { width: parseInt(e.target.value) })} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{isRtl ? "الطول" : "Height"}</Label>
                                <Input type="number" value={design.placeholders.images[activeIndex].height} onChange={(e) => updateImage(activeIndex, { height: parseInt(e.target.value) })} />
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const img = design.placeholders.images[activeIndex];
                                updateImage(activeIndex, {
                                  x: Math.round((design.width - img.width) / 2),
                                  y: Math.round((design.height - img.height) / 2)
                                });
                              }}
                              className="w-full"
                            >
                              {isRtl ? "توسيط في الصفحة" : "Center on Page"}
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => removeElement("image", activeIndex)} className="w-full">
                              <Trash2 className="h-4 w-4 mr-2" /> {isRtl ? "حذف الصورة" : "Remove Image"}
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">{isRtl ? "لا توجد صور مضافة" : "No images added"}</p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Preview Area */}
          <Card className="lg:col-span-3 overflow-hidden bg-gray-100 flex flex-col min-h-[600px]">
            <CardHeader className="bg-white border-b py-3 px-6 flex flex-row items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <CardTitle className="text-base">{isRtl ? "المعاينة" : "Preview"}</CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">{isRtl ? "تكبير" : "Zoom"}</Label>
                  <Slider
                    className="w-32"
                    value={[previewScale * 100]}
                    min={10} max={150}
                    onValueChange={([val]) => setPreviewScale(val / 100)}
                  />
                  <span className="text-xs w-10">{Math.round(previewScale * 100)}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Move className="h-3 w-3" />
                {isRtl ? "اسحب النصوص والصور بحرية داخل القالب" : "Drag text and images freely inside the template"}
              </p>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-8 flex items-start justify-center">
              <div
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="relative bg-white shadow-2xl transition-all cursor-default shrink-0"
                style={{
                  width: design.width,
                  height: design.height,
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                }}
              >
                {design.backgroundImage && (
                  <img
                    src={design.backgroundImage.startsWith("http") ? design.backgroundImage : `${process.env.NEXT_PUBLIC_API_URL || ""}${design.backgroundImage}`}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    alt="Certificate Background"
                  />
                )}

                {/* Standard Text Placeholders */}
                {Object.keys(design.placeholders).filter(k => !['customText', 'images', 'signature'].includes(k)).map((key) => {
                  const k = key as keyof typeof design.placeholders;
                  const p = design.placeholders[k] as Placeholder;

                  // Skip rendering if element is deleted (null)
                  if (!p) return null;

                  const isActive = activeType === "standard" && activePlaceholder === k;

                  // Get sample text for this placeholder
                  const sampleText = k === "studentName" ? (isRtl ? "اسم الطالب هنا" : "Student Name Here") :
                    k === "courseName" ? (isRtl ? "اسم الدورة القرآنية" : "Quran Course Name") :
                      k === "issuedDate" ? "2026-01-25" :
                        "CERT-2026-XXXX";

                  return (
                    <div
                      key={k}
                      onMouseDown={(e) => handleMouseDown(e, "standard", k)}
                      className={`absolute pointer-events-auto select-none border-2 transition-colors whitespace-nowrap cursor-move ${isActive ? 'border-genoun-green bg-genoun-green/10 z-10' : 'border-dashed border-gray-400/50 hover:border-genoun-green/50'}`}
                      style={{
                        top: p.y,
                        left: p.x,
                        transform: getTextTransform(p.align),
                        color: p.color,
                        fontSize: p.fontSize,
                        fontFamily: getRenderableFontFamily(p.fontFamily),
                        fontWeight: p.fontWeight as any,
                        textAlign: (p.align as any) || "center",
                        lineHeight: 1,
                        direction: isRtl || /[\u0600-\u06FF]/.test(sampleText) ? "rtl" : "ltr",
                      }}
                    >
                      {sampleText}
                    </div>
                  );
                })}

                {/* Custom Text Placeholders */}
                {design.placeholders.customText.map((p, idx) => {
                  const isActive = activeType === "custom" && activeIndex === idx;
                  const text = p.text || "Custom Text";

                  return (
                    <div
                      key={`custom-${idx}`}
                      onMouseDown={(e) => handleMouseDown(e, "custom", idx)}
                      className={`absolute pointer-events-auto select-none border-2 transition-colors whitespace-nowrap cursor-move ${isActive ? 'border-genoun-green bg-genoun-green/10 z-10' : 'border-dashed border-gray-400/50 hover:border-genoun-green/50'}`}
                      style={{
                        top: p.y,
                        left: p.x,
                        transform: getTextTransform(p.align),
                        color: p.color,
                        fontSize: p.fontSize,
                        fontFamily: getRenderableFontFamily(p.fontFamily),
                        fontWeight: p.fontWeight as any,
                        textAlign: (p.align as any) || "center",
                        lineHeight: 1,
                        direction: /[\u0600-\u06FF]/.test(text) ? "rtl" : "ltr",
                      }}
                    >
                      {text}
                    </div>
                  );
                })}

                {/* Additional Images */}
                {design.placeholders.images.map((img, idx) => {
                  const isActive = activeType === "image" && activeIndex === idx;
                  return (
                    <div
                      key={`img-${idx}`}
                      onClick={() => {
                        setActiveType("image");
                        setActiveIndex(idx);
                      }}
                      onMouseDown={(e) => handleMouseDown(e, "image", idx)}
                      className={`absolute pointer-events-auto select-none border-2 transition-colors cursor-move ${isActive ? 'border-genoun-green bg-genoun-green/10 z-10' : 'border-dashed border-gray-400/50 hover:border-genoun-green/50'}`}
                      style={{
                        top: img.y,
                        left: img.x,
                        width: img.width,
                        height: img.height,
                      }}
                    >
                      <img
                        src={img.url.startsWith("http") ? img.url : `${process.env.NEXT_PUBLIC_API_URL || ""}${img.url}`}
                        className="w-full h-full object-contain pointer-events-none"
                        alt={`Extra Image ${idx + 1}`}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Template Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRtl ? "قالب شهادة جديد" : "New Certificate Template"}</DialogTitle>
            <DialogDescription>
              {isRtl ? "ابدأ بإنشاء قالب جديد وتخصيص مظهره" : "Start by creating a new template and customizing its look"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>{isRtl ? "اسم القالب" : "Template Name"}</Label>
              <Input
                placeholder={isRtl ? "مثلاً: شهادة إتمام جزء عم" : "e.g., Juz Amma Completion"}
                value={design.name}
                onChange={(e) => setDesign({ ...design, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShowNewDialog(false)}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleCreateNew} className="bg-genoun-green hover:bg-genoun-green/90">
              {isRtl ? "ابدأ التصميم" : "Start Designing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

