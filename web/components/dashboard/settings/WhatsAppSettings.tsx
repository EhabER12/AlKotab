"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, QrCode, RefreshCcw, Send, Smartphone, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAppDispatch } from "@/store/hooks";
import {
  connectWhatsAppThunk,
  disconnectWhatsAppThunk,
  getWebsiteSettingsThunk,
  sendWhatsAppTestMessageThunk,
  type WebsiteSettingsData,
} from "@/store/services/settingsService";

interface WhatsAppSettingsProps {
  settings: WebsiteSettingsData | null;
  isLoading: boolean;
  isRtl: boolean;
}

const defaultTestMessage = "رسالة اختبار من لوحة تحكم Genoun";

export function WhatsAppSettings({
  settings,
  isLoading,
  isRtl,
}: WhatsAppSettingsProps) {
  const dispatch = useAppDispatch();
  const [testNumber, setTestNumber] = useState("");
  const [testMessage, setTestMessage] = useState(defaultTestMessage);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    "connect" | "disconnect" | "refresh" | "test" | null
  >(null);

  const connectionStatus = settings?.whatsappConnectionStatus || "disconnected";
  const isConnected = !!settings?.whatsappConnected;

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

    if (connectionStatus === "authenticated" || connectionStatus === "initializing") {
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
    action: "connect" | "disconnect" | "refresh" | "test",
    callback: () => Promise<void>
  ) => {
    setActionError(null);
    setBusyAction(action);

    try {
      await callback();
    } catch (error: any) {
      setActionError(error?.message || String(error));
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>
                {isRtl ? "ربط واتساب" : "WhatsApp Connection"}
              </CardTitle>
              <CardDescription>
                {isRtl
                  ? "اربط رقم واتساب الخاص بالإدارة، ثم استخدمه في إرسال التذكيرات ورسائل الاختبار."
                  : "Connect the admin WhatsApp account, then use it for reminders and test messages."}
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
                    <span dir="ltr">
                      {settings?.whatsappPhoneNumber || "-"}
                    </span>
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
                    {isRtl ? "امسح هذا الكود من واتساب" : "Scan this QR code from WhatsApp"}
                  </span>
                </div>
                <ol className="list-decimal space-y-2 ps-5 text-sm text-muted-foreground">
                  <li>{isRtl ? "افتح واتساب على الهاتف." : "Open WhatsApp on the phone."}</li>
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
                <Loader2 className={`h-4 w-4 animate-spin ${isRtl ? "ml-2" : "mr-2"}`} />
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
                <Loader2 className={`h-4 w-4 animate-spin ${isRtl ? "ml-2" : "mr-2"}`} />
              ) : (
                <RefreshCcw className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              )}
              {isRtl ? "تحديث الحالة" : "Refresh status"}
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={isLoading || busyAction !== null || !settings?.whatsappConnectionStatus}
              onClick={() =>
                runAction("disconnect", async () => {
                  await dispatch(disconnectWhatsAppThunk()).unwrap();
                  await dispatch(getWebsiteSettingsThunk()).unwrap();
                })
              }
            >
              {busyAction === "disconnect" ? (
                <Loader2 className={`h-4 w-4 animate-spin ${isRtl ? "ml-2" : "mr-2"}`} />
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
                placeholder={isRtl ? "2010xxxxxxxx" : "2010xxxxxxxx"}
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
            disabled={!testNumber.trim() || !testMessage.trim() || busyAction !== null}
            onClick={() =>
              runAction("test", async () => {
                await dispatch(
                  sendWhatsAppTestMessageThunk({
                    number: testNumber.trim(),
                    message: testMessage.trim(),
                  })
                ).unwrap();
              })
            }
          >
            {busyAction === "test" ? (
              <Loader2 className={`h-4 w-4 animate-spin ${isRtl ? "ml-2" : "mr-2"}`} />
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
