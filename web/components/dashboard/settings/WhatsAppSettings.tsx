"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  QrCode,
  RefreshCcw,
  Save,
  Send,
  ShieldCheck,
  Smartphone,
  Unplug,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAppDispatch } from "@/store/hooks";
import {
  connectWhatsAppThunk,
  disconnectWhatsAppThunk,
  getWebsiteSettingsThunk,
  sendWhatsAppTestMessageThunk,
  updateWebsiteSettingsThunk,
  type WebsiteSettingsData,
  type WhatsAppDeliverySettings,
} from "@/store/services/settingsService";
import { toast } from "sonner";

interface WhatsAppSettingsProps {
  settings: WebsiteSettingsData | null;
  isLoading: boolean;
  isRtl: boolean;
}

const defaultTestMessage = "رسالة اختبار من لوحة تحكم Genoun";
const defaultAutomationSettings: WhatsAppDeliverySettings = {
  messageDelayMs: 3000,
  messageDelayJitterMs: 1000,
  messageWrapperEnabled: false,
  messageWrapper: {
    ar: "{data}",
    en: "{data}",
  },
};

const createAutomationState = (
  settings?: WhatsAppDeliverySettings | null
): WhatsAppDeliverySettings => ({
  ...defaultAutomationSettings,
  ...settings,
  messageWrapper: {
    ...defaultAutomationSettings.messageWrapper,
    ...(settings?.messageWrapper || {}),
  },
});

export function WhatsAppSettings({
  settings,
  isLoading,
  isRtl,
}: WhatsAppSettingsProps) {
  const dispatch = useAppDispatch();
  const [testNumber, setTestNumber] = useState("");
  const [testMessage, setTestMessage] = useState(defaultTestMessage);
  const [actionError, setActionError] = useState<string | null>(null);
  const [automationSettings, setAutomationSettings] =
    useState<WhatsAppDeliverySettings>(createAutomationState());
  const [busyAction, setBusyAction] = useState<
    "connect" | "disconnect" | "refresh" | "test" | "settings" | null
  >(null);

  const connectionStatus = settings?.whatsappConnectionStatus || "disconnected";
  const isConnected = !!settings?.whatsappConnected;

  useEffect(() => {
    setAutomationSettings(createAutomationState(settings?.whatsappSettings));
  }, [settings?.whatsappSettings]);

  const statusMeta = useMemo(() => {
    if (connectionStatus === "connected" || isConnected) {
      return {
        label: isRtl ? "متصل" : "Connected",
        className: "bg-green-100 text-green-800",
      };
    }

    if (connectionStatus === "qr") {
      return {
        label: isRtl ? "بانتظار المسح" : "Awaiting scan",
        className: "bg-amber-100 text-amber-800",
      };
    }

    if (
      connectionStatus === "authenticated" ||
      connectionStatus === "initializing"
    ) {
      return {
        label: isRtl ? "جارٍ التهيئة" : "Initializing",
        className: "bg-blue-100 text-blue-800",
      };
    }

    if (connectionStatus === "auth_failure" || connectionStatus === "error") {
      return {
        label: isRtl ? "خطأ" : "Error",
        className: "bg-red-100 text-red-800",
      };
    }

    return {
      label: isRtl ? "غير متصل" : "Disconnected",
      className: "bg-slate-100 text-slate-800",
    };
  }, [connectionStatus, isConnected, isRtl]);

  useEffect(() => {
    const shouldPoll =
      !isConnected &&
      ["initializing", "qr", "authenticated"].includes(connectionStatus);

    if (!shouldPoll) return;

    const interval = window.setInterval(() => {
      dispatch(getWebsiteSettingsThunk());
    }, 5000);

    return () => window.clearInterval(interval);
  }, [dispatch, connectionStatus, isConnected]);

  const runAction = async (
    action: "connect" | "disconnect" | "refresh" | "test" | "settings",
    callback: () => Promise<void>
  ) => {
    setActionError(null);
    setBusyAction(action);

    try {
      await callback();
    } catch (error: any) {
      setActionError(error?.message || String(error));
      throw error;
    } finally {
      setBusyAction(null);
    }
  };

  const handleAutomationSave = async () => {
    await runAction("settings", async () => {
      await dispatch(
        updateWebsiteSettingsThunk({
          whatsappSettings: {
            ...automationSettings,
            messageDelayMs: Math.max(0, Number(automationSettings.messageDelayMs) || 0),
            messageDelayJitterMs: Math.max(
              0,
              Number(automationSettings.messageDelayJitterMs) || 0
            ),
          },
        })
      ).unwrap();
      await dispatch(getWebsiteSettingsThunk()).unwrap();
      toast.success(
        isRtl ? "تم حفظ إعدادات واتساب" : "WhatsApp settings saved"
      );
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>{isRtl ? "ربط واتساب" : "WhatsApp Connection"}</CardTitle>
              <CardDescription>
                {isRtl
                  ? "اربط رقم واتساب الخاص بالإدارة ثم استخدمه لإرسال التذكيرات ورسائل النظام."
                  : "Connect the admin WhatsApp account and use it for reminders and system messages."}
              </CardDescription>
            </div>
            <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {actionError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{isRtl ? "تعذر تنفيذ العملية" : "Action failed"}</AlertTitle>
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          ) : null}

          {isConnected ? (
            <Alert className="border-green-200 bg-green-50 text-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-700" />
              <AlertTitle>
                {isRtl ? "واتساب متصل وجاهز" : "WhatsApp is connected"}
              </AlertTitle>
              <AlertDescription>
                <div className="space-y-1">
                  <p>
                    {isRtl ? "الرقم" : "Number"}:{" "}
                    <span dir="ltr">{settings?.whatsappPhoneNumber || "-"}</span>
                  </p>
                  {settings?.whatsappDisplayName ? (
                    <p>
                      {isRtl ? "الاسم" : "Name"}: {settings.whatsappDisplayName}
                    </p>
                  ) : null}
                  {settings?.whatsappLastConnectedAt ? (
                    <p>
                      {isRtl ? "آخر اتصال" : "Last connected"}:{" "}
                      {new Date(settings.whatsappLastConnectedAt).toLocaleString(
                        isRtl ? "ar-EG" : "en-US"
                      )}
                    </p>
                  ) : null}
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          {!isConnected && settings?.whatsappQrCode ? (
            <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
              <div className="rounded-xl border bg-white p-4">
                <img
                  src={settings.whatsappQrCode}
                  alt="WhatsApp QR Code"
                  className="mx-auto h-60 w-60 rounded-lg object-contain"
                />
              </div>
              <div className="space-y-4 rounded-xl border p-4">
                <div className="flex items-center gap-2 text-base font-medium">
                  <QrCode className="h-5 w-5 text-amber-600" />
                  <span>
                    {isRtl
                      ? "امسح هذا الكود من واتساب"
                      : "Scan this QR code from WhatsApp"}
                  </span>
                </div>
                <ol className="list-decimal space-y-2 ps-5 text-sm text-muted-foreground">
                  <li>
                    {isRtl
                      ? "افتح واتساب على الهاتف."
                      : "Open WhatsApp on the phone."}
                  </li>
                  <li>
                    {isRtl
                      ? "ادخل إلى الأجهزة المرتبطة ثم اختر ربط جهاز."
                      : "Go to Linked Devices, then choose Link a Device."}
                  </li>
                  <li>
                    {isRtl
                      ? "امسح الكود الظاهر هنا وانتظر تأكيد الاتصال."
                      : "Scan the QR code shown here and wait for the connection confirmation."}
                  </li>
                </ol>
              </div>
            </div>
          ) : null}

          {settings?.whatsappLastError && !isConnected ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{isRtl ? "آخر خطأ" : "Latest error"}</AlertTitle>
              <AlertDescription>{settings.whatsappLastError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={isLoading || busyAction !== null}
              onClick={() =>
                runAction("connect", async () => {
                  await dispatch(connectWhatsAppThunk()).unwrap();
                  await dispatch(getWebsiteSettingsThunk()).unwrap();
                })
              }
            >
              {busyAction === "connect" ? (
                <Loader2
                  className={`h-4 w-4 animate-spin ${isRtl ? "ml-2" : "mr-2"}`}
                />
              ) : (
                <Smartphone className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              )}
              {isConnected
                ? isRtl
                  ? "إعادة تهيئة الاتصال"
                  : "Reinitialize connection"
                : isRtl
                  ? "بدء الربط"
                  : "Start connection"}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isLoading || busyAction !== null}
              onClick={() =>
                runAction("refresh", async () => {
                  await dispatch(getWebsiteSettingsThunk()).unwrap();
                })
              }
            >
              {busyAction === "refresh" ? (
                <Loader2
                  className={`h-4 w-4 animate-spin ${isRtl ? "ml-2" : "mr-2"}`}
                />
              ) : (
                <RefreshCcw className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              )}
              {isRtl ? "تحديث الحالة" : "Refresh status"}
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={
                isLoading || busyAction !== null || !settings?.whatsappConnectionStatus
              }
              onClick={() =>
                runAction("disconnect", async () => {
                  await dispatch(disconnectWhatsAppThunk()).unwrap();
                  await dispatch(getWebsiteSettingsThunk()).unwrap();
                })
              }
            >
              {busyAction === "disconnect" ? (
                <Loader2
                  className={`h-4 w-4 animate-spin ${isRtl ? "ml-2" : "mr-2"}`}
                />
              ) : (
                <Unplug className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              )}
              {isRtl ? "فصل واتساب" : "Disconnect WhatsApp"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <CardTitle>
              {isRtl ? "إعدادات تقليل الحظر" : "Anti-ban Settings"}
            </CardTitle>
          </div>
          <CardDescription>
            {isRtl
              ? "حدد الفاصل بين الرسائل، وأضف غلافًا اختياريًا لكل رسالة باستخدام متغيرات مثل {data} و{name}."
              : "Control the delay between messages and optionally wrap every message using variables like {data} and {name}."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Clock3 className="h-4 w-4" />
            <AlertTitle>
              {isRtl ? "متغيرات متاحة" : "Available variables"}
            </AlertTitle>
            <AlertDescription className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="font-mono">
                {"{data}"}
              </Badge>
              <Badge variant="secondary" className="font-mono">
                {"{name}"}
              </Badge>
              <Badge variant="secondary" className="font-mono">
                {"{phone}"}
              </Badge>
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wa-delay-ms">
                {isRtl
                  ? "الفاصل الأساسي بين الرسائل (مللي ثانية)"
                  : "Base delay between messages (ms)"}
              </Label>
              <Input
                id="wa-delay-ms"
                type="number"
                min={0}
                value={automationSettings.messageDelayMs}
                onChange={(event) =>
                  setAutomationSettings((current) => ({
                    ...current,
                    messageDelayMs: Math.max(0, Number(event.target.value) || 0),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wa-delay-jitter">
                {isRtl
                  ? "عشوائية إضافية للفاصل (مللي ثانية)"
                  : "Extra random jitter (ms)"}
              </Label>
              <Input
                id="wa-delay-jitter"
                type="number"
                min={0}
                value={automationSettings.messageDelayJitterMs}
                onChange={(event) =>
                  setAutomationSettings((current) => ({
                    ...current,
                    messageDelayJitterMs: Math.max(
                      0,
                      Number(event.target.value) || 0
                    ),
                  }))
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <p className="font-medium">
                {isRtl
                  ? "تفعيل غلاف الرسالة"
                  : "Enable message wrapper"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isRtl
                  ? "سيتم تمرير نص الرسالة الأصلي داخل {data} قبل الإرسال."
                  : "The original message body will be injected inside {data} before sending."}
              </p>
            </div>
            <Switch
              checked={automationSettings.messageWrapperEnabled}
              onCheckedChange={(checked) =>
                setAutomationSettings((current) => ({
                  ...current,
                  messageWrapperEnabled: checked,
                }))
              }
            />
          </div>

          <Tabs defaultValue="ar" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ar">{isRtl ? "العربية" : "Arabic"}</TabsTrigger>
              <TabsTrigger value="en">{isRtl ? "الإنجليزية" : "English"}</TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-4">
              <TabsContent value="ar" className="space-y-2">
                <Label htmlFor="wa-wrapper-ar">
                  {isRtl
                    ? "قالب الغلاف العربي"
                    : "Arabic wrapper template"}
                </Label>
                <Textarea
                  id="wa-wrapper-ar"
                  rows={6}
                  dir="rtl"
                  className="font-mono"
                  value={automationSettings.messageWrapper.ar}
                  onChange={(event) =>
                    setAutomationSettings((current) => ({
                      ...current,
                      messageWrapper: {
                        ...current.messageWrapper,
                        ar: event.target.value,
                      },
                    }))
                  }
                />
              </TabsContent>

              <TabsContent value="en" className="space-y-2">
                <Label htmlFor="wa-wrapper-en">
                  {isRtl
                    ? "قالب الغلاف الإنجليزي"
                    : "English wrapper template"}
                </Label>
                <Textarea
                  id="wa-wrapper-en"
                  rows={6}
                  dir="ltr"
                  className="font-mono"
                  value={automationSettings.messageWrapper.en}
                  onChange={(event) =>
                    setAutomationSettings((current) => ({
                      ...current,
                      messageWrapper: {
                        ...current.messageWrapper,
                        en: event.target.value,
                      },
                    }))
                  }
                />
              </TabsContent>
            </div>
          </Tabs>

          <Button
            type="button"
            disabled={busyAction !== null}
            onClick={handleAutomationSave}
          >
            {busyAction === "settings" ? (
              <Loader2
                className={`h-4 w-4 animate-spin ${isRtl ? "ml-2" : "mr-2"}`}
              />
            ) : (
              <Save className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
            )}
            {isRtl ? "حفظ إعدادات واتساب" : "Save WhatsApp settings"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isRtl ? "إرسال رسالة اختبار" : "Send Test Message"}</CardTitle>
          <CardDescription>
            {isRtl
              ? "استخدم هذا القسم للتأكد أن الحساب المتصل يرسل الرسائل بشكل صحيح."
              : "Use this section to verify that the connected account can send messages correctly."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wa-test-number">
                {isRtl ? "رقم واتساب" : "WhatsApp number"}
              </Label>
              <Input
                id="wa-test-number"
                dir="ltr"
                value={testNumber}
                onChange={(event) => setTestNumber(event.target.value)}
                placeholder="2010xxxxxxxx"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wa-test-message">
              {isRtl ? "نص الرسالة" : "Message text"}
            </Label>
            <Textarea
              id="wa-test-message"
              value={testMessage}
              onChange={(event) => setTestMessage(event.target.value)}
              rows={5}
            />
          </div>

          <Button
            type="button"
            disabled={
              !testNumber.trim() || !testMessage.trim() || busyAction !== null
            }
            onClick={() =>
              runAction("test", async () => {
                await dispatch(
                  sendWhatsAppTestMessageThunk({
                    number: testNumber.trim(),
                    message: testMessage.trim(),
                  })
                ).unwrap();
                toast.success(
                  isRtl
                    ? "تم إرسال رسالة الاختبار"
                    : "Test message sent successfully"
                );
              })
            }
          >
            {busyAction === "test" ? (
              <Loader2
                className={`h-4 w-4 animate-spin ${isRtl ? "ml-2" : "mr-2"}`}
              />
            ) : (
              <Send className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
            )}
            {isRtl ? "إرسال رسالة اختبار" : "Send test message"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default WhatsAppSettings;
