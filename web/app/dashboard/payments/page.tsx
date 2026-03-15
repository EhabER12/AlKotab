"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminLocale } from "@/hooks/dashboard/useAdminLocale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManualPaymentMethods } from "@/components/dashboard/ManualPaymentMethods";
import PaymentHistory from "@/components/dashboard/PaymentHistory";
import { isAdmin, isAuthenticated } from "@/store/services/authService";

export default function PaymentsPage() {
  const router = useRouter();
  const { t, isRtl } = useAdminLocale();
  const hasAdminAccess = isAuthenticated() && isAdmin();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    if (!isAdmin()) {
      router.push("/dashboard");
    }
  }, [router]);

  if (!hasAdminAccess) {
    return null;
  }

  return (
    <div className="space-y-6 p-6" dir={isRtl ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("admin.payments.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("admin.payments.description")}
        </p>
      </div>

      <Tabs
        defaultValue="history"
        className="space-y-4"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <TabsList>
          <TabsTrigger value="history">
            {t("admin.payments.transactionHistory")}
          </TabsTrigger>
          <TabsTrigger value="methods">
            {t("admin.payments.paymentMethods")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="history">
          <PaymentHistory />
        </TabsContent>
        <TabsContent value="methods">
          <ManualPaymentMethods />
        </TabsContent>
      </Tabs>
    </div>
  );
}
