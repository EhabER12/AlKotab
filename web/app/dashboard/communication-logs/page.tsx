"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import axiosInstance from "@/lib/axios";
import { useAdminLocale } from "@/hooks/dashboard/useAdminLocale";
import {
  isAdmin,
  isAuthenticated,
  isModerator,
} from "@/store/services/authService";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type CommunicationChannel = "email" | "whatsapp";
type CommunicationStatus = "success" | "failed" | "skipped";

interface CommunicationLog {
  id: string;
  channel: CommunicationChannel;
  status: CommunicationStatus;
  provider?: string;
  recipient?: string;
  recipients?: string[];
  recipientText?: string;
  subject?: string;
  content?: string;
  templateName?: string;
  source?: string;
  relatedModel?: string;
  relatedId?: string;
  messageId?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface CommunicationLogSummary {
  total: number;
  email: number;
  whatsapp: number;
  success: number;
  failed: number;
  skipped: number;
}

interface CommunicationLogPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const initialSummary: CommunicationLogSummary = {
  total: 0,
  email: 0,
  whatsapp: 0,
  success: 0,
  failed: 0,
  skipped: 0,
};

const initialPagination: CommunicationLogPagination = {
  page: 1,
  limit: 20,
  total: 0,
  pages: 1,
};

function stripHtml(value?: string) {
  return String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, maxLength = 140) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

function getErrorMessage(error: any) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    "Failed to load communication logs"
  );
}

export default function CommunicationLogsPage() {
  const router = useRouter();
  const { isRtl } = useAdminLocale();
  const [authorized, setAuthorized] = useState(false);
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [summary, setSummary] = useState<CommunicationLogSummary>(initialSummary);
  const [pagination, setPagination] =
    useState<CommunicationLogPagination>(initialPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [channel, setChannel] = useState<CommunicationChannel | "all">("all");
  const [status, setStatus] = useState<CommunicationStatus | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedLog, setSelectedLog] = useState<CommunicationLog | null>(null);

  const text = {
    title: isRtl ? "سجل الرسائل" : "Communication Logs",
    description: isRtl
      ? "متابعة الرسائل والإيميلات المرسلة من النظام، مع حالة كل عملية وتفاصيلها."
      : "Review sent WhatsApp and email activity with status and delivery details.",
    total: isRtl ? "إجمالي السجل" : "Total Logs",
    email: isRtl ? "الإيميلات" : "Emails",
    whatsapp: isRtl ? "واتساب" : "WhatsApp",
    success: isRtl ? "ناجح" : "Successful",
    failed: isRtl ? "فشل" : "Failed",
    skipped: isRtl ? "تم التخطي" : "Skipped",
    channel: isRtl ? "النوع" : "Channel",
    status: isRtl ? "الحالة" : "Status",
    recipient: isRtl ? "المستلم" : "Recipient",
    content: isRtl ? "المحتوى" : "Content",
    source: isRtl ? "المصدر" : "Source",
    sentAt: isRtl ? "وقت الإرسال" : "Sent At",
    actions: isRtl ? "الإجراءات" : "Actions",
    allChannels: isRtl ? "كل الأنواع" : "All channels",
    allStatuses: isRtl ? "كل الحالات" : "All statuses",
    emailLabel: isRtl ? "إيميل" : "Email",
    whatsappLabel: isRtl ? "واتساب" : "WhatsApp",
    successLabel: isRtl ? "ناجح" : "Success",
    failedLabel: isRtl ? "فشل" : "Failed",
    skippedLabel: isRtl ? "متخطى" : "Skipped",
    searchPlaceholder: isRtl
      ? "ابحث بالمستلم أو الموضوع أو القالب أو المحتوى"
      : "Search by recipient, subject, template, or content",
    refresh: isRtl ? "تحديث" : "Refresh",
    details: isRtl ? "التفاصيل" : "Details",
    preview: isRtl ? "معاينة" : "Preview",
    noLogs: isRtl ? "لا يوجد سجل رسائل حتى الآن" : "No communication logs yet",
    emptyDescription: isRtl
      ? "جرّب تغيير الفلاتر أو أرسل رسالة/إيميل لتظهر هنا."
      : "Try adjusting the filters or send a message/email to see it here.",
    retry: isRtl ? "إعادة المحاولة" : "Retry",
    subject: isRtl ? "الموضوع" : "Subject",
    template: isRtl ? "القالب" : "Template",
    provider: isRtl ? "المزوّد" : "Provider",
    messageId: isRtl ? "معرف الرسالة" : "Message ID",
    relatedTo: isRtl ? "مرتبط بـ" : "Related To",
    errorMessage: isRtl ? "سبب الفشل" : "Failure Reason",
    metadata: isRtl ? "بيانات إضافية" : "Metadata",
    unknown: isRtl ? "غير محدد" : "Unknown",
    page: isRtl ? "الصفحة" : "Page",
    previous: isRtl ? "السابق" : "Previous",
    next: isRtl ? "التالي" : "Next",
    results: isRtl ? "نتيجة" : "results",
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    if (!isAdmin() && !isModerator()) {
      router.push("/");
      return;
    }

    setAuthorized(true);
  }, [router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [channel, status, search]);

  useEffect(() => {
    if (!authorized) {
      return;
    }

    let cancelled = false;

    const loadLogs = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await axiosInstance.get("/communication-logs", {
          params: {
            page,
            limit: 20,
            sort: "-createdAt",
            ...(channel !== "all" ? { channel } : {}),
            ...(status !== "all" ? { status } : {}),
            ...(search ? { search } : {}),
          },
          headers: {
            "X-No-Loading": "true",
          },
        });

        if (cancelled) {
          return;
        }

        setLogs(response.data?.data || []);
        setSummary(response.data?.summary || initialSummary);
        setPagination(response.data?.pagination || initialPagination);
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setError(getErrorMessage(requestError));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadLogs();

    return () => {
      cancelled = true;
    };
  }, [authorized, channel, page, reloadKey, search, status]);

  const getChannelLabel = (value: CommunicationChannel) =>
    value === "email" ? text.emailLabel : text.whatsappLabel;

  const getStatusLabel = (value: CommunicationStatus) => {
    if (value === "success") return text.successLabel;
    if (value === "failed") return text.failedLabel;
    return text.skippedLabel;
  };

  const getStatusBadgeClassName = (value: CommunicationStatus) => {
    if (value === "success") {
      return "border-green-200 bg-green-50 text-green-700";
    }

    if (value === "failed") {
      return "border-red-200 bg-red-50 text-red-700";
    }

    return "border-amber-200 bg-amber-50 text-amber-700";
  };

  const getChannelBadgeClassName = (value: CommunicationChannel) => {
    if (value === "email") {
      return "border-blue-200 bg-blue-50 text-blue-700";
    }

    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  };

  const getPreviewText = (log: CommunicationLog) => {
    const cleaned = stripHtml(log.content);
    if (cleaned) {
      return truncate(cleaned, 120);
    }

    if (log.subject) {
      return truncate(log.subject, 120);
    }

    return text.unknown;
  };

  const getReadableDate = (value?: string) => {
    if (!value) {
      return text.unknown;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return text.unknown;
    }

    return format(date, "yyyy-MM-dd hh:mm a");
  };

  const summaryCards = [
    {
      title: text.total,
      value: summary.total,
      icon: <Mail className="h-4 w-4 text-slate-600" />,
      className: "border-slate-200 bg-slate-50",
    },
    {
      title: text.email,
      value: summary.email,
      icon: <Mail className="h-4 w-4 text-blue-600" />,
      className: "border-blue-200 bg-blue-50",
    },
    {
      title: text.whatsapp,
      value: summary.whatsapp,
      icon: <MessageCircle className="h-4 w-4 text-emerald-600" />,
      className: "border-emerald-200 bg-emerald-50",
    },
    {
      title: text.success,
      value: summary.success,
      icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
      className: "border-green-200 bg-green-50",
    },
    {
      title: text.failed,
      value: summary.failed,
      icon: <XCircle className="h-4 w-4 text-red-600" />,
      className: "border-red-200 bg-red-50",
    },
    {
      title: text.skipped,
      value: summary.skipped,
      icon: <AlertCircle className="h-4 w-4 text-amber-600" />,
      className: "border-amber-200 bg-amber-50",
    },
  ];

  return (
    <div
      className={`flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6 ${
        isRtl ? "text-right" : ""
      }`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{text.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{text.description}</p>
        </div>
        <Button
          variant="outline"
          className="gap-2 self-start"
          onClick={() => setReloadKey((current) => current + 1)}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {text.refresh}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <Card key={card.title} className={card.className}>
            <CardContent className="flex items-center justify-between p-5">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-semibold">{card.value}</p>
              </div>
              <div className="rounded-full bg-white/80 p-3 shadow-sm">
                {card.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{text.title}</CardTitle>
          <CardDescription>
            {pagination.total} {text.results}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label className="mb-2 block">{text.searchPlaceholder}</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={text.searchPlaceholder}
                  className={isRtl ? "pr-10" : "pl-10"}
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">{text.channel}</Label>
              <Select
                value={channel}
                onValueChange={(value) =>
                  setChannel(value as CommunicationChannel | "all")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{text.allChannels}</SelectItem>
                  <SelectItem value="email">{text.emailLabel}</SelectItem>
                  <SelectItem value="whatsapp">{text.whatsappLabel}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">{text.status}</Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value as CommunicationStatus | "all")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{text.allStatuses}</SelectItem>
                  <SelectItem value="success">{text.successLabel}</SelectItem>
                  <SelectItem value="failed">{text.failedLabel}</SelectItem>
                  <SelectItem value="skipped">{text.skippedLabel}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span>{error}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReloadKey((current) => current + 1)}
                >
                  {text.retry}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{text.channel}</TableHead>
                  <TableHead>{text.recipient}</TableHead>
                  <TableHead>{text.content}</TableHead>
                  <TableHead>{text.source}</TableHead>
                  <TableHead>{text.sentAt}</TableHead>
                  <TableHead className={isRtl ? "text-left" : "text-right"}>
                    {text.actions}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{isRtl ? "جاري تحميل السجل..." : "Loading logs..."}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center">
                      <div className="mx-auto max-w-md space-y-2">
                        <p className="font-medium">{text.noLogs}</p>
                        <p className="text-sm text-muted-foreground">
                          {text.emptyDescription}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <Badge
                            variant="outline"
                            className={getChannelBadgeClassName(log.channel)}
                          >
                            {getChannelLabel(log.channel)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={getStatusBadgeClassName(log.status)}
                          >
                            {getStatusLabel(log.status)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {log.recipientText || log.recipient || text.unknown}
                          </div>
                          {log.metadata?.recipientName ? (
                            <p className="text-xs text-muted-foreground">
                              {String(log.metadata.recipientName)}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[340px] align-top">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {log.subject || getPreviewText(log)}
                          </div>
                          {log.templateName ? (
                            <p className="text-xs text-muted-foreground">
                              {text.template}: {log.templateName}
                            </p>
                          ) : null}
                          <p className="text-xs text-muted-foreground">
                            {getPreviewText(log)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <div>{log.source || text.unknown}</div>
                          {log.provider ? (
                            <p className="text-xs text-muted-foreground">
                              {text.provider}: {log.provider}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{getReadableDate(log.createdAt)}</TableCell>
                      <TableCell className={isRtl ? "text-left" : "text-right"}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {text.page} {pagination.page} / {pagination.pages || 1}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                {text.previous}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages || loading}
                onClick={() =>
                  setPage((current) =>
                    Math.min(pagination.pages || 1, current + 1)
                  )
                }
              >
                {text.next}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedLog}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLog(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{text.details}</DialogTitle>
            <DialogDescription>{text.preview}</DialogDescription>
          </DialogHeader>

          {selectedLog ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{text.channel}</p>
                  <Badge
                    variant="outline"
                    className={getChannelBadgeClassName(selectedLog.channel)}
                  >
                    {getChannelLabel(selectedLog.channel)}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{text.status}</p>
                  <Badge
                    variant="outline"
                    className={getStatusBadgeClassName(selectedLog.status)}
                  >
                    {getStatusLabel(selectedLog.status)}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{text.recipient}</p>
                  <p className="text-sm font-medium">
                    {selectedLog.recipientText ||
                      selectedLog.recipient ||
                      text.unknown}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{text.sentAt}</p>
                  <p className="text-sm font-medium">
                    {getReadableDate(selectedLog.createdAt)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{text.source}</p>
                  <p className="text-sm font-medium">
                    {selectedLog.source || text.unknown}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{text.provider}</p>
                  <p className="text-sm font-medium">
                    {selectedLog.provider || text.unknown}
                  </p>
                </div>
                {selectedLog.subject ? (
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-xs text-muted-foreground">{text.subject}</p>
                    <p className="text-sm font-medium">{selectedLog.subject}</p>
                  </div>
                ) : null}
                {selectedLog.templateName ? (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{text.template}</p>
                    <p className="text-sm font-medium">{selectedLog.templateName}</p>
                  </div>
                ) : null}
                {selectedLog.messageId ? (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{text.messageId}</p>
                    <p className="break-all text-sm font-medium">
                      {selectedLog.messageId}
                    </p>
                  </div>
                ) : null}
                {selectedLog.relatedModel || selectedLog.relatedId ? (
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-xs text-muted-foreground">{text.relatedTo}</p>
                    <p className="text-sm font-medium">
                      {[selectedLog.relatedModel, selectedLog.relatedId]
                        .filter(Boolean)
                        .join(" / ")}
                    </p>
                  </div>
                ) : null}
                {selectedLog.errorMessage ? (
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-xs text-muted-foreground">
                      {text.errorMessage}
                    </p>
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {selectedLog.errorMessage}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>{text.content}</Label>
                <Textarea
                  readOnly
                  value={stripHtml(selectedLog.content) || selectedLog.content || ""}
                  className="min-h-[220px]"
                />
              </div>

              {selectedLog.metadata &&
              Object.keys(selectedLog.metadata).length > 0 ? (
                <div className="space-y-2">
                  <Label>{text.metadata}</Label>
                  <Textarea
                    readOnly
                    value={JSON.stringify(selectedLog.metadata, null, 2)}
                    className="min-h-[180px] font-mono text-xs"
                    dir="ltr"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
