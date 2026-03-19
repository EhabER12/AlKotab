"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAdminLocale } from "@/hooks/dashboard/useAdminLocale";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  WhatsAppTemplate,
  getWhatsAppTemplates,
  saveWhatsAppTemplate,
} from "@/store/services/whatsappTemplateService";
import { resetWhatsAppTemplateStatus } from "@/store/slices/whatsappTemplateSlice";
import { Edit, Info, MessageCircle } from "lucide-react";
import { toast } from "sonner";

const emptyLocalizedText = { ar: "", en: "" };

export default function WhatsAppTemplatesPage() {
  const dispatch = useAppDispatch();
  const { t, isRtl } = useAdminLocale();
  const { templates, isLoading, error, success } = useAppSelector(
    (state) => state.whatsappTemplates
  );

  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(
    null
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<WhatsAppTemplate>>({});

  useEffect(() => {
    dispatch(getWhatsAppTemplates());
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      toast.success(t("admin.whatsappTemplates.messages.saveSuccess"));
      setIsEditDialogOpen(false);
      dispatch(resetWhatsAppTemplateStatus());
    }

    if (error) {
      toast.error(error);
      dispatch(resetWhatsAppTemplateStatus());
    }
  }, [dispatch, error, success, t]);

  const handleEdit = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setFormData({ ...template });
    setIsEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) return;
    dispatch(saveWhatsAppTemplate(formData));
  };

  const handleStatusToggle = (template: WhatsAppTemplate) => {
    dispatch(
      saveWhatsAppTemplate({
        name: template.name,
        isActive: !template.isActive,
      })
    );
  };

  const currentLabel = formData.label || emptyLocalizedText;
  const currentContent = formData.content || emptyLocalizedText;

  return (
    <div
      className={`flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6 ${isRtl ? "text-right" : ""}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-green-100 p-2 text-green-700">
            <MessageCircle className="h-5 w-5" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">
            {t("admin.whatsappTemplates.title")}
          </h2>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.whatsappTemplates.listTitle")}</CardTitle>
          <CardDescription>
            {t("admin.whatsappTemplates.listDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.whatsappTemplates.table.template")}</TableHead>
                <TableHead>{t("admin.whatsappTemplates.table.type")}</TableHead>
                <TableHead>{t("admin.whatsappTemplates.table.status")}</TableHead>
                <TableHead className={isRtl ? "text-left" : "text-right"}>
                  {t("admin.whatsappTemplates.table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center">
                    {t("common.loading")}
                  </TableCell>
                </TableRow>
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {t("admin.whatsappTemplates.messages.noTemplates")}
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.name}>
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <div>
                          {isRtl
                            ? template.label?.ar || template.label?.en || template.name
                            : template.label?.en || template.label?.ar || template.name}
                        </div>
                        <p className="text-xs text-muted-foreground">{template.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{template.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={template.isActive ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => handleStatusToggle(template)}
                      >
                        {template.isActive
                          ? t("common.active")
                          : t("common.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className={isRtl ? "text-left" : "text-right"}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("admin.whatsappTemplates.edit.title")}:{" "}
              {selectedTemplate?.name || formData.name}
            </DialogTitle>
            <DialogDescription>
              {t("admin.whatsappTemplates.edit.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("admin.whatsappTemplates.edit.key")}</Label>
              <Input value={formData.name || ""} disabled dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.whatsappTemplates.edit.type")}</Label>
              <Input value={formData.type || ""} disabled dir="ltr" />
            </div>
          </div>

          <Tabs defaultValue="ar" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ar">{t("common.arabic")}</TabsTrigger>
              <TabsTrigger value="en">{t("common.english")}</TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-4">
              <TabsContent value="ar" className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("admin.whatsappTemplates.edit.labelAr")}</Label>
                  <Input
                    value={currentLabel.ar}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        label: {
                          ...currentLabel,
                          ar: event.target.value,
                        },
                      })
                    }
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("admin.whatsappTemplates.edit.contentAr")}</Label>
                  <Textarea
                    value={currentContent.ar}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        content: {
                          ...currentContent,
                          ar: event.target.value,
                        },
                      })
                    }
                    className="min-h-[260px] font-mono"
                    dir="rtl"
                  />
                </div>
              </TabsContent>

              <TabsContent value="en" className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("admin.whatsappTemplates.edit.labelEn")}</Label>
                  <Input
                    value={currentLabel.en}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        label: {
                          ...currentLabel,
                          en: event.target.value,
                        },
                      })
                    }
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("admin.whatsappTemplates.edit.contentEn")}</Label>
                  <Textarea
                    value={currentContent.en}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        content: {
                          ...currentContent,
                          en: event.target.value,
                        },
                      })
                    }
                    className="min-h-[260px] font-mono"
                    dir="ltr"
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <div className="rounded-lg bg-muted p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Info className="h-4 w-4" />
              {t("admin.whatsappTemplates.edit.variables")}
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.variables?.map((variable) => (
                <Badge key={variable.name} variant="secondary" className="font-mono">
                  {`{${variable.name}}`}
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("admin.whatsappTemplates.edit.variablesHint")}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
