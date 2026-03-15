"use client";

import React, { useEffect, useState } from "react";
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  Search,
  Package,
  Clock,
  Truck,
  RefreshCw,
  Ban,
  FileText,
  MessageSquare,
  Filter,
  ChevronRight,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  History,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  getPaymentHistoryThunk,
  updatePaymentStatusThunk,
  Payment,
} from "@/store/services/paymentService";
import { useAdminLocale } from "@/hooks/dashboard/useAdminLocale";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import toast from "react-hot-toast";
import axiosInstance from "@/lib/axios";
import { useCurrency } from "@/hooks/dashboard/useCurrency";

// Status configuration
const STATUS_CONFIG = {
  pending: {
    label: { ar: "قيد الانتظار", en: "Pending" },
    color: "bg-yellow-500",
    icon: Clock,
  },
  processing: {
    label: { ar: "قيد المعالجة", en: "Processing" },
    color: "bg-blue-500",
    icon: RefreshCw,
  },
  success: {
    label: { ar: "مكتمل", en: "Success" },
    color: "bg-green-500",
    icon: CheckCircle,
  },
  delivered: {
    label: { ar: "تم التسليم", en: "Delivered" },
    color: "bg-emerald-600",
    icon: Truck,
  },
  failed: {
    label: { ar: "فشل", en: "Failed" },
    color: "bg-red-500",
    icon: XCircle,
  },
  refunded: {
    label: { ar: "مسترد", en: "Refunded" },
    color: "bg-purple-500",
    icon: RefreshCw,
  },
  cancelled: {
    label: { ar: "ملغي", en: "Cancelled" },
    color: "bg-gray-500",
    icon: Ban,
  },
};

export default function PaymentHistory() {
  const dispatch = useAppDispatch();
  const { t, isRtl, locale } = useAdminLocale();
  const { payments, isLoading } = useAppSelector((state) => state.payments);
  const { formatMoney, toBaseCurrency, baseCurrency } = useCurrency();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isProofDialogOpen, setIsProofDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [isUpdatingNotes, setIsUpdatingNotes] = useState(false);

  useEffect(() => {
    dispatch(getPaymentHistoryThunk());
  }, [dispatch]);

  const handleUpdateStatus = async (
    id: string,
    status: string,
    note?: string
  ) => {
    try {
      await dispatch(
        updatePaymentStatusThunk({
          id,
          status,
          failureReason: status === "failed" ? "Rejected by admin" : undefined,
          note,
        })
      ).unwrap();
      toast.success(
        isRtl ? "تم تحديث الحالة بنجاح" : "Status updated successfully"
      );
      dispatch(getPaymentHistoryThunk()); // Refresh data
    } catch (error) {
      toast.error(isRtl ? "فشل في تحديث الحالة" : "Failed to update status");
    }
  };

  const handleUpdateNotes = async () => {
    if (!selectedPayment) return;
    setIsUpdatingNotes(true);
    try {
      await axiosInstance.put(`/payments/${selectedPayment.id}/notes`, {
        adminNotes,
      });
      toast.success(isRtl ? "تم حفظ الملاحظات" : "Notes saved");
      dispatch(getPaymentHistoryThunk());
    } catch (error) {
      toast.error(isRtl ? "فشل في حفظ الملاحظات" : "Failed to save notes");
    }
    setIsUpdatingNotes(false);
  };

  const filteredPayments = payments.filter((payment) => {
    const searchString = searchTerm.toLowerCase();
    const customerName = payment.billingInfo?.name?.toLowerCase() || "";
    const customerEmail = payment.billingInfo?.email?.toLowerCase() || "";
    const paymentId = payment.id?.toLowerCase() || "";
    const orderId = payment.merchantOrderId?.toLowerCase() || "";

    const matchesSearch =
      customerName.includes(searchString) ||
      customerEmail.includes(searchString) ||
      paymentId.includes(searchString) ||
      orderId.includes(searchString);

    const matchesStatus =
      statusFilter === "all" || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
    if (!config) return <Badge>{status}</Badge>;

    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white gap-1`}>
        <Icon className="w-3 h-3" />
        {isRtl ? config.label.ar : config.label.en}
      </Badge>
    );
  };

  const openDetailsDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setAdminNotes((payment as any).adminNotes || "");
    setIsDetailsDialogOpen(true);
  };

  const getNextStatuses = (currentStatus: string) => {
    const flow: Record<string, string[]> = {
      pending: ["processing", "success", "failed", "cancelled"],
      processing: ["success", "delivered", "failed", "refunded"],
      success: ["delivered", "refunded"],
      delivered: ["refunded"],
      failed: ["pending"],
      refunded: [],
      cancelled: ["pending"],
    };
    return flow[currentStatus] || [];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">
          {isRtl ? "سجل المدفوعات" : "Payment History"}
        </h2>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row gap-4 py-4">
        <div className="relative flex-1 max-w-sm">
          <Search
            className={`absolute ${
              isRtl ? "right-2" : "left-2"
            } top-2.5 h-4 w-4 text-muted-foreground`}
          />
          <Input
            placeholder={
              isRtl
                ? "بحث بالاسم، البريد، أو رقم الطلب..."
                : "Search by name, email, or order ID..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={isRtl ? "pr-8" : "pl-8"}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue
              placeholder={isRtl ? "فلتر الحالة" : "Filter Status"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {isRtl ? "جميع الحالات" : "All Statuses"}
            </SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {isRtl ? config.label.ar : config.label.en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px] text-start">
                {isRtl ? "رقم الطلب" : "Order ID"}
              </TableHead>
              <TableHead className="text-start">
                {isRtl ? "التاريخ" : "Date"}
              </TableHead>
              <TableHead className="text-start">
                {isRtl ? "العميل" : "Customer"}
              </TableHead>
              <TableHead className="text-start">
                {isRtl ? "المبلغ" : "Amount"}
              </TableHead>
              <TableHead className="text-start">
                {isRtl ? "الحالة" : "Status"}
              </TableHead>
              <TableHead className="text-right">
                {isRtl ? "الإجراءات" : "Actions"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {isRtl ? "جاري التحميل..." : "Loading..."}
                </TableCell>
              </TableRow>
            ) : filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {isRtl ? "لا توجد مدفوعات" : "No payments found"}
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow
                  key={payment.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => openDetailsDialog(payment)}
                >
                  <TableCell className="font-mono text-xs">
                    {payment.merchantOrderId?.substring(0, 15) ||
                      payment.id?.substring(0, 8)}
                    ...
                  </TableCell>
                  <TableCell>
                    {payment.createdAt
                      ? format(new Date(payment.createdAt), "MMM d, yyyy", {
                          locale: isRtl ? ar : enUS,
                        })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {payment.billingInfo?.name ||
                          (isRtl ? "زائر" : "Guest")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {payment.billingInfo?.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    <div className="flex flex-col">
                      <span>
                        {formatMoney(
                          toBaseCurrency(
                            payment.amount,
                            payment.currency || "EGP"
                          )
                        )}
                      </span>
                      {payment.currency !== baseCurrency && (
                        <span className="text-xs text-muted-foreground font-normal">
                          {payment.amount.toLocaleString()} {payment.currency}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
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
                          onClick={() => openDetailsDialog(payment)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {isRtl ? "عرض التفاصيل" : "View Details"}
                        </DropdownMenuItem>

                        {payment.paymentProofUrl && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedPayment(payment);
                              setIsProofDialogOpen(true);
                            }}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            {isRtl ? "عرض الإثبات" : "View Proof"}
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        {/* Status Change Submenu */}
                        {getNextStatuses(payment.status).length > 0 && (
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              {isRtl ? "تغيير الحالة" : "Change Status"}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent>
                                {getNextStatuses(payment.status).map(
                                  (status) => {
                                    const config =
                                      STATUS_CONFIG[
                                        status as keyof typeof STATUS_CONFIG
                                      ];
                                    const Icon = config?.icon || CheckCircle;
                                    return (
                                      <DropdownMenuItem
                                        key={status}
                                        onClick={() =>
                                          handleUpdateStatus(
                                            payment.id || (payment as any)._id,
                                            status
                                          )
                                        }
                                      >
                                        <Icon className={`mr-2 h-4 w-4`} />
                                        {isRtl
                                          ? config?.label.ar
                                          : config?.label.en}
                                      </DropdownMenuItem>
                                    );
                                  }
                                )}
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          dir={isRtl ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-start">
              <Package className="w-5 h-5" />
              {isRtl ? "تفاصيل الطلب" : "Order Details"}
              <span className="text-sm font-mono text-muted-foreground">
                #
                {selectedPayment?.merchantOrderId?.substring(0, 20) ||
                  selectedPayment?.id?.substring(0, 12)}
              </span>
            </DialogTitle>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-6 mt-4">
              {/* Status & Quick Actions Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {isRtl ? "الحالة:" : "Status:"}
                  </span>
                  {getStatusBadge(selectedPayment.status)}
                </div>
                <div className="flex gap-2">
                  {getNextStatuses(selectedPayment.status)
                    .slice(0, 3)
                    .map((status) => {
                      const config =
                        STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                      return (
                        <Button
                          key={status}
                          size="sm"
                          variant={
                            status === "delivered" || status === "success"
                              ? "default"
                              : "outline"
                          }
                          onClick={() =>
                            handleUpdateStatus(
                              selectedPayment.id ||
                                (selectedPayment as any)._id,
                              status
                            )
                          }
                          className="gap-1"
                        >
                          {React.createElement(config?.icon || CheckCircle, {
                            className: "w-4 h-4",
                          })}
                          {isRtl ? config?.label.ar : config?.label.en}
                        </Button>
                      );
                    })}
                </div>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {isRtl ? "معلومات العميل" : "Customer Info"}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedPayment.billingInfo?.name || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a
                        href={`mailto:${selectedPayment.billingInfo?.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {selectedPayment.billingInfo?.email || "-"}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <a
                        href={`tel:${selectedPayment.billingInfo?.phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {selectedPayment.billingInfo?.phone || "-"}
                      </a>
                    </div>
                    {selectedPayment.billingInfo?.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {selectedPayment.billingInfo?.city},{" "}
                          {selectedPayment.billingInfo?.country}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    {isRtl ? "معلومات الدفع" : "Payment Info"}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {isRtl ? "المبلغ" : "Amount"}
                      </span>
                      <span className="font-bold text-lg">
                        {formatMoney(
                          toBaseCurrency(
                            selectedPayment.amount,
                            selectedPayment.currency || "EGP"
                          )
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {isRtl ? "طريقة الدفع" : "Method"}
                      </span>
                      <Badge variant="outline">
                        {selectedPayment.paymentMethod}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {isRtl ? "التاريخ" : "Date"}
                      </span>
                      <span>
                        {selectedPayment.createdAt
                          ? format(new Date(selectedPayment.createdAt), "PPp", {
                              locale: isRtl ? ar : enUS,
                            })
                          : "-"}
                      </span>
                    </div>
                    {selectedPayment.paymentProofUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => setIsProofDialogOpen(true)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {isRtl ? "عرض إثبات الدفع" : "View Payment Proof"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items - from Cart Session or paymentDetails */}
              {(() => {
                // First try to get items from populated cart session
                const cartSession = (selectedPayment as any).cartSessionId;
                const cartItems = cartSession?.cartItems;
                const paymentItems = (selectedPayment as any).paymentDetails
                  ?.items;

                // Use cart items if available, otherwise fall back to payment details items
                const hasCartItems =
                  Array.isArray(cartItems) && cartItems.length > 0;
                const hasPaymentItems =
                  Array.isArray(paymentItems) && paymentItems.length > 0;

                if (!hasCartItems && !hasPaymentItems) return null;

                const items = hasCartItems ? cartItems : paymentItems;
                const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "";

                // Use cart session currency for cart items, payment currency for payment items
                const itemsCurrency = hasCartItems
                  ? cartSession?.currency || "EGP"
                  : selectedPayment.currency || "EGP";

                return (
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      {isRtl ? "عناصر الطلب" : "Order Items"}
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-start">
                            {isRtl ? "المنتج" : "Item"}
                          </TableHead>
                          <TableHead className="text-start">
                            {isRtl ? "الكمية" : "Qty"}
                          </TableHead>
                          <TableHead className="text-start">
                            {isRtl ? "السعر" : "Price"}
                          </TableHead>
                          <TableHead className="text-start">
                            {isRtl ? "المجموع" : "Total"}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item: any, index: number) => {
                          // Handle both cart session items and payment details items
                          const product = item.productId; // populated product from cart session
                          const productImage =
                            product?.coverImage || item.productImage;
                          const productName = hasCartItems
                            ? product?.name?.[isRtl ? "ar" : "en"] ||
                              item.productName?.[isRtl ? "ar" : "en"] ||
                              item.productName?.en ||
                              item.productName?.ar
                            : item.name;
                          const unitPrice = item.unitPrice || item.price || 0;
                          const quantity = item.quantity || 1;
                          const total = item.totalPrice || unitPrice * quantity;

                          // Variant info if available
                          const variantName =
                            item.variantName?.[isRtl ? "ar" : "en"] ||
                            item.variantName?.en ||
                            item.variantName?.ar;

                          return (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  {productImage && (
                                    <img
                                      src={
                                        productImage.startsWith("http")
                                          ? productImage
                                          : `${apiBaseUrl}/${productImage}`
                                      }
                                      alt={productName || "Product"}
                                      className="w-10 h-10 object-cover rounded-md border"
                                      onError={(e) => {
                                        (
                                          e.target as HTMLImageElement
                                        ).style.display = "none";
                                      }}
                                    />
                                  )}
                                  <div>
                                    <span className="font-medium block">
                                      {productName ||
                                        (isRtl ? "منتج" : "Product")}
                                    </span>
                                    {variantName && (
                                      <span className="text-xs text-muted-foreground">
                                        {variantName}
                                      </span>
                                    )}
                                    {/* Show addons if any */}
                                    {Array.isArray(item.addons) &&
                                      item.addons.length > 0 && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {item.addons.map(
                                            (addon: any, i: number) => (
                                              <span key={i}>
                                                +{" "}
                                                {addon.name?.[
                                                  isRtl ? "ar" : "en"
                                                ] ||
                                                  addon.name?.en ||
                                                  addon.name}
                                                {i < item.addons.length - 1
                                                  ? ", "
                                                  : ""}
                                              </span>
                                            )
                                          )}
                                        </div>
                                      )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{quantity}</TableCell>
                              <TableCell>
                                {unitPrice.toLocaleString()} {itemsCurrency}
                              </TableCell>
                              <TableCell className="font-semibold">
                                {total.toLocaleString()} {itemsCurrency}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()}

              {/* Admin Notes */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  {isRtl ? "ملاحظات المسؤول" : "Admin Notes"}
                </h3>
                <div className="flex gap-2">
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder={
                      isRtl
                        ? "أضف ملاحظات خاصة بهذا الطلب..."
                        : "Add notes about this order..."
                    }
                    className="flex-1"
                    rows={3}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleUpdateNotes}
                  disabled={isUpdatingNotes}
                >
                  {isUpdatingNotes
                    ? isRtl
                      ? "جاري الحفظ..."
                      : "Saving..."
                    : isRtl
                    ? "حفظ الملاحظات"
                    : "Save Notes"}
                </Button>
              </div>

              {/* Status History */}
              {Array.isArray((selectedPayment as any).statusHistory) &&
                (selectedPayment as any).statusHistory.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <History className="w-4 h-4" />
                      {isRtl ? "سجل التغييرات" : "Status History"}
                    </h3>
                    <div className="space-y-2">
                      {(selectedPayment as any).statusHistory.map(
                        (entry: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 text-sm"
                          >
                            <div className="w-2 h-2 mt-2 rounded-full bg-gray-400" />
                            <div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(entry.status)}
                                <span className="text-muted-foreground">
                                  {entry.changedAt
                                    ? format(new Date(entry.changedAt), "PPp", {
                                        locale: isRtl ? ar : enUS,
                                      })
                                    : ""}
                                </span>
                              </div>
                              {entry.note && (
                                <p className="text-muted-foreground mt-1">
                                  {entry.note}
                                </p>
                              )}
                              {entry.changedBy?.name && (
                                <p className="text-xs text-muted-foreground">
                                  {isRtl ? "بواسطة:" : "By:"}{" "}
                                  {entry.changedBy.name}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Proof Dialog */}
      <Dialog open={isProofDialogOpen} onOpenChange={setIsProofDialogOpen}>
        <DialogContent className="max-w-3xl" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="text-start">
              {isRtl ? "إثبات الدفع" : "Payment Proof"}
            </DialogTitle>
            <DialogDescription className="text-start">
              {isRtl ? "إثبات الدفع لـ" : "Payment proof for"}{" "}
              {selectedPayment?.billingInfo?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-center">
            {selectedPayment?.paymentProofUrl ? (
              <img
                src={selectedPayment.paymentProofUrl}
                alt="Payment Proof"
                className="max-h-[60vh] object-contain rounded-lg border"
              />
            ) : (
              <p>{isRtl ? "لا يوجد إثبات متاح" : "No proof available"}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
