"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    getStudentMember,
    updateStudentMember,
    StudentMember,
} from "@/store/services/studentMemberService";
import { getPackages } from "@/store/services/packageService";
import { isAuthenticated, isAdmin, isModerator } from "@/store/services/authService";
import { useAdminLocale } from "@/hooks/dashboard/useAdminLocale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";

export default function EditStudentMemberPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const params = useParams();
    const { t, isRtl } = useAdminLocale();
    const id = params.id as string;

    const { currentStudentMember, isLoading } = useAppSelector((state) => state.studentMembers);
    const { packages } = useAppSelector((state) => state.packages);
    const { user } = useAppSelector((state) => state.auth);

    const [formData, setFormData] = useState({
        nameAr: "",
        nameEn: "",
        phone: "",
        governorate: "",
        status: "",
        packageId: "",
        startDate: "",
        nextDueDate: "",
        notes: ""
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const backPath =
        currentStudentMember?.memberType === "group"
            ? "/dashboard/subscription-students"
            : "/dashboard/student-members";

    useEffect(() => {
        if (!isAuthenticated() || !user) {
            router.push("/login");
            return;
        }

        if (!isAdmin() && !isModerator()) {
            router.push("/");
            return;
        }

        if (id) {
            dispatch(getStudentMember(id));
            dispatch(getPackages());
        }
    }, [dispatch, user, router, id]);

    useEffect(() => {
        if (currentStudentMember) {
            setFormData({
                nameAr: currentStudentMember.name?.ar || "",
                nameEn: currentStudentMember.name?.en || "",
                phone: currentStudentMember.phone || "",
                governorate: currentStudentMember.governorate || "",
                status: currentStudentMember.status || "active",
                packageId: currentStudentMember.packageId?.id || currentStudentMember.packageId?._id || "",
                startDate: currentStudentMember.startDate ? format(new Date(currentStudentMember.startDate), "yyyy-MM-dd") : "",
                nextDueDate: currentStudentMember.nextDueDate ? format(new Date(currentStudentMember.nextDueDate), "yyyy-MM-dd") : "",
                notes: currentStudentMember.notes || ""
            });
        }
    }, [currentStudentMember]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const updateData = {
                name: { ar: formData.nameAr, en: formData.nameAr }, // Use Arabic for English if empty or just duplicate as this model implies bilingual
                // Ideally we should have separate fields or just one name field that maps to both if simple
                // Let's support separate if UI allows, here standard simple edit
                phone: formData.phone,
                governorate: formData.governorate,
                status: formData.status as any,
                packageId: formData.packageId,
                startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
                nextDueDate: formData.nextDueDate ? new Date(formData.nextDueDate).toISOString() : undefined,
                notes: formData.notes
            };

            // Correct English Name if entered
            if (formData.nameEn) {
                updateData.name.en = formData.nameEn;
            }

            await dispatch(updateStudentMember({ id, data: updateData })).unwrap();
            toast.success(isRtl ? "تم تحديث البيانات بنجاح" : "Student updated successfully");
            router.push(backPath);
        } catch (error) {
            console.error("Update failed", error);
            toast.error(isRtl ? "فشل التحديث" : "Update failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading && !currentStudentMember) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-genoun-green border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className={`flex-1 space-y-4 p-8 pt-6 ${isRtl ? "text-right" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        {isRtl ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">
                            {isRtl ? "تعديل بيانات الطالب" : "Edit Student"}
                        </h2>
                        <p className="text-muted-foreground">
                            {isRtl ? "تحديث معلومات الطالب والباقة" : "Update student information and package details"}
                        </p>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{isRtl ? "بيانات الطالب" : "Student Details"}</CardTitle>
                    <CardDescription>{isRtl ? "قم بتعديل البيانات اللازمة ثم اضغط حفظ" : "Modify necessary details then click save"}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>{isRtl ? "الاسم (بالعربي)" : "Name (Arabic)"}</Label>
                                <Input
                                    value={formData.nameAr}
                                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{isRtl ? "الاسم (بالانجليزي)" : "Name (English)"}</Label>
                                <Input
                                    value={formData.nameEn}
                                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{isRtl ? "رقم الهاتف" : "Phone Number"}</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{isRtl ? "المحافظة" : "Governorate"}</Label>
                                <Input
                                    value={formData.governorate}
                                    onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
                                    placeholder={isRtl ? "مثال: القاهرة" : "e.g., Cairo"}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{isRtl ? "الحالة" : "Status"}</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(val) => setFormData({ ...formData, status: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{isRtl ? "نشط" : "Active"}</SelectItem>
                                        <SelectItem value="due_soon">{isRtl ? "تجديد قريباً" : "Due Soon"}</SelectItem>
                                        <SelectItem value="overdue">{isRtl ? "متأخر" : "Overdue"}</SelectItem>
                                        <SelectItem value="paused">{isRtl ? "موقف" : "Paused"}</SelectItem>
                                        <SelectItem value="cancelled">{isRtl ? "ملغي" : "Cancelled"}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-1 md:col-span-2 border-t pt-4 mt-2">
                                <h3 className="font-semibold mb-4">{isRtl ? "بيانات الباقة" : "Package Information"}</h3>
                            </div>

                            <div className="space-y-2">
                                <Label>{isRtl ? "الباقة الحالية" : "Current Package"}</Label>
                                <Select
                                    value={formData.packageId}
                                    onValueChange={(val) => setFormData({ ...formData, packageId: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={isRtl ? "اختر باقة" : "Select Package"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {packages.map((pkg) => (
                                            <SelectItem key={pkg.id || pkg._id} value={pkg.id || pkg._id || ""}>
                                                {isRtl ? pkg.name.ar : pkg.name.en}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{isRtl ? "تاريخ البداية" : "Start Date"}</Label>
                                <Input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{isRtl ? "تاريخ النهاية" : "End Date"}</Label>
                                <Input
                                    type="date"
                                    value={formData.nextDueDate}
                                    onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <Label>{isRtl ? "ملاحظات" : "Notes"}</Label>
                                <Input
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                {isRtl ? "إلغاء" : "Cancel"}
                            </Button>
                            <Button type="submit" className="bg-genoun-green hover:bg-genoun-green/90" disabled={isSubmitting}>
                                <Save className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
                                {isSubmitting ? (isRtl ? "جاري الحفظ..." : "Saving...") : (isRtl ? "حفظ التغييرات" : "Save Changes")}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
