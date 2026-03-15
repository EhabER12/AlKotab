"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/store/hooks";
import {
    getPaymentMethodsThunk,
    updatePaymentMethodThunk,
    createPaymentMethodThunk,
    PaymentMethod,
} from "@/store/services/paymentMethodService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CreditCard, CheckCircle2, XCircle, Info, Eye, EyeOff, Save, Plus, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isAdmin, isAuthenticated } from "@/store/services/authService";

const getErrorMessage = (error: any, fallback: string) => {
    if (!error) return fallback;
    if (typeof error === "string") return error;
    if (error?.message) return error.message;
    if (error?.error?.message) return error.error.message;
    return fallback;
};

export default function PaymentMethodsPage() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const hasAdminAccess = isAuthenticated() && isAdmin();

    // PayPal state
    const [paypal, setPaypal] = useState<PaymentMethod | null>(null);
    const [paypalForm, setPaypalForm] = useState({
        clientId: "",
        clientSecret: "",
        mode: "sandbox" as "sandbox" | "live",
        returnUrl: "",
        cancelUrl: "",
        isActive: false,
    });

    // Cashier state
    const [cashier, setCashier] = useState<PaymentMethod | null>(null);
    const [cashierForm, setCashierForm] = useState({
        mid: "",
        paymentApiKey: "",
        secretKey: "",
        mode: "sandbox" as "sandbox" | "live",
        redirectUrl: "",
        isActive: false,
    });

    // Password visibility state
    const [showPayPalSecret, setShowPayPalSecret] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [showSecretKey, setShowSecretKey] = useState(false);

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push("/login");
            return;
        }

        if (!isAdmin()) {
            router.push("/dashboard");
            return;
        }

        let isMounted = true;
        loadPaymentMethods(() => isMounted);
        return () => {
            isMounted = false;
        };
    }, [router]);

    const loadPaymentMethods = async (getIsMounted?: () => boolean) => {
        try {
            setLoading(true);
            const result = await dispatch(
                getPaymentMethodsThunk({ includeInactive: true })
            ).unwrap();

            if (getIsMounted && !getIsMounted()) return;

            console.log("📦 All payment methods loaded:", result.length);
            console.log("   Providers:", result.map(m => m.provider).join(", "));

            // Find PayPal and Cashier
            const paypalMethod = result.find((m) => m.provider === "paypal");
            const cashierMethod = result.find((m) => m.provider === "cashier");

            console.log("🔍 Looking for cashier... Found:", !!cashierMethod);
            if (!cashierMethod) {
                console.log("⚠️  Kashier NOT found in database! Available providers:", result.map(m => m.provider));
            }

            if (paypalMethod) {
                setPaypal(paypalMethod);
                setPaypalForm({
                    clientId: paypalMethod.credentials?.clientId || "",
                    clientSecret: paypalMethod.credentials?.clientSecret || "",
                    mode: paypalMethod.mode as "sandbox" | "live",
                    returnUrl: paypalMethod.config?.returnUrl || "",
                    cancelUrl: paypalMethod.config?.cancelUrl || "",
                    isActive: paypalMethod.isActive,
                });
            }

            if (cashierMethod) {
                console.log("✅ Found existing Kashier payment method:", {
                    id: cashierMethod._id,
                    isActive: cashierMethod.isActive,
                    mode: cashierMethod.mode,
                    credentials: cashierMethod.credentials,
                    config: cashierMethod.config,
                    fullObject: cashierMethod,
                });
                setCashier(cashierMethod);
                setCashierForm({
                    mid: cashierMethod.credentials?.mid || "",
                    paymentApiKey: cashierMethod.credentials?.paymentApiKey || "",
                    secretKey: cashierMethod.credentials?.secretKey || "",
                    mode: cashierMethod.mode as "sandbox" | "live",
                    redirectUrl: cashierMethod.config?.redirectUrl || "",
                    isActive: cashierMethod.isActive,
                });
            } else {
                console.log("ℹ️  No existing Kashier found - you can create a new one");
            }
        } catch (error: any) {
            console.error("❌ Error loading payment methods:", error);
            toast.error(error?.message || "Failed to load payment methods");
        } finally {
            if (!getIsMounted || getIsMounted()) {
                setLoading(false);
            }
        }
    };

    const handlePayPalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setSaving(true);

            const clientId = paypalForm.clientId.trim();
            const clientSecret = paypalForm.clientSecret.trim();
            const returnUrl = paypalForm.returnUrl.trim();
            const cancelUrl = paypalForm.cancelUrl.trim();

            if (!clientId || !clientSecret) {
                toast.error("Client ID and Client Secret are required");
                setSaving(false);
                return;
            }

            const paymentData: Partial<PaymentMethod> = {
                credentials: {
                    clientId,
                    clientSecret,
                },
                mode: paypalForm.mode,
                config: {
                    returnUrl,
                    cancelUrl,
                },
                isActive: paypalForm.isActive,
            };

            if (paypal) {
                // Update existing PayPal method
                await dispatch(
                    updatePaymentMethodThunk({ id: paypal._id, data: paymentData })
                ).unwrap();
                toast.success("PayPal configuration updated successfully");
            } else {
                // Create new PayPal method
                const createData = {
                    ...paymentData,
                    provider: "paypal" as const,
                    displayName: {
                        ar: "باي بال",
                        en: "PayPal",
                    },
                    description: {
                        ar: "الدفع عبر باي بال",
                        en: "Pay with PayPal",
                    },
                    order: 1,
                };
                await dispatch(createPaymentMethodThunk(createData)).unwrap();
                toast.success("PayPal configuration created successfully");
            }

            await loadPaymentMethods();
        } catch (error: any) {
            toast.error(getErrorMessage(error, "Failed to save PayPal configuration"));
        } finally {
            setSaving(false);
        }
    };

    const handleCashierSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setSaving(true);

            const mid = cashierForm.mid.trim();
            const paymentApiKey = cashierForm.paymentApiKey.trim();
            const secretKey = cashierForm.secretKey.trim();
            const redirectUrl = cashierForm.redirectUrl.trim();

            if (!mid || !paymentApiKey || !secretKey) {
                toast.error("Merchant ID, API Key, and Secret Key are required");
                setSaving(false);
                return;
            }

            const paymentData: Partial<PaymentMethod> = {
                credentials: {
                    mid,
                    paymentApiKey,
                    secretKey,
                },
                mode: cashierForm.mode,
                config: {
                    redirectUrl,
                },
                isActive: cashierForm.isActive,
            };

            if (cashier) {
                // Update existing Kashier method
                console.log("🔄 Updating Kashier payment method:", cashier._id, paymentData);
                await dispatch(
                    updatePaymentMethodThunk({ id: cashier._id, data: paymentData })
                ).unwrap();
                toast.success("Kashier configuration updated successfully");
            } else {
                // Create new Kashier method
                const createData = {
                    ...paymentData,
                    provider: "cashier" as const,
                    displayName: {
                        ar: "كاشير",
                        en: "Kashier",
                    },
                    description: {
                        ar: "الدفع عبر كاشير",
                        en: "Pay with Kashier",
                    },
                    order: 2,
                };
                console.log("➕ Creating new Kashier payment method:", JSON.stringify(createData, null, 2));
                await dispatch(createPaymentMethodThunk(createData)).unwrap();
                toast.success("Cashier configuration created successfully");
            }

            await loadPaymentMethods();
        } catch (error: any) {
            console.error("❌ Cashier submit error:", {
                message: error?.message,
                response: error?.response,
                data: error?.response?.data,
                full: error,
            });
            toast.error(getErrorMessage(error, "Failed to save Cashier configuration"));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!hasAdminAccess) {
        return null;
    }

    return (
        <div className="container mx-auto p-6 max-w-5xl">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Payment Gateways</h1>
                <p className="text-muted-foreground">
                    Configure PayPal and Cashier payment methods
                </p>
            </div>

            <Tabs defaultValue="paypal" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="paypal" className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        PayPal
                        {paypal?.isActive ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                            <XCircle className="w-4 h-4 text-gray-400" />
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="cashier" className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Cashier
                        {cashier?.isActive ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                            <XCircle className="w-4 h-4 text-gray-400" />
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* PayPal Tab */}
                <TabsContent value="paypal">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                PayPal Configuration {paypal && <span className="text-sm font-normal text-muted-foreground">(Editing)</span>}
                            </CardTitle>
                            <CardDescription>
                                {paypal
                                    ? "Update your existing PayPal payment gateway settings"
                                    : "Configure your PayPal payment gateway settings"
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Status Banner */}
                            {paypal ? (
                                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm font-medium text-green-800">
                                        ✅ Existing configuration found
                                        {paypal.updatedAt && (
                                            <span className="text-green-600 font-normal">
                                                {" • Last updated: "}
                                                {new Date(paypal.updatedAt).toLocaleString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            ) : (
                                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm font-medium text-blue-800">
                                        ℹ️ No configuration found. Fill the form below to create one.
                                    </p>
                                </div>
                            )}

                            <form onSubmit={handlePayPalSubmit} className="space-y-6">
                                {/* Active Toggle */}
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <Label className="text-base font-semibold">Enable PayPal</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Allow customers to pay with PayPal
                                        </p>
                                    </div>
                                    <Switch
                                        checked={paypalForm.isActive}
                                        onCheckedChange={(checked) =>
                                            setPaypalForm({ ...paypalForm, isActive: checked })
                                        }
                                    />
                                </div>

                                {/* Mode */}
                                <div className="space-y-2">
                                    <Label>Mode</Label>
                                    <Select
                                        value={paypalForm.mode}
                                        onValueChange={(value) =>
                                            setPaypalForm({ ...paypalForm, mode: value as "sandbox" | "live" })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sandbox">Sandbox (Test)</SelectItem>
                                            <SelectItem value="live">Live (Production)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Client ID */}
                                <div className="space-y-2">
                                    <Label htmlFor="paypal-client-id">Client ID</Label>
                                    <Input
                                        id="paypal-client-id"
                                        value={paypalForm.clientId}
                                        onChange={(e) =>
                                            setPaypalForm({ ...paypalForm, clientId: e.target.value })
                                        }
                                        placeholder="Enter PayPal Client ID"
                                    />
                                </div>

                                {/* Client Secret */}
                                <div className="space-y-2">
                                    <Label htmlFor="paypal-client-secret">Client Secret</Label>
                                    <div className="relative">
                                        <Input
                                            id="paypal-client-secret"
                                            type={showPayPalSecret ? "text" : "password"}
                                            value={paypalForm.clientSecret}
                                            onChange={(e) =>
                                                setPaypalForm({ ...paypalForm, clientSecret: e.target.value })
                                            }
                                            placeholder="Enter PayPal Client Secret"
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPayPalSecret(!showPayPalSecret)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showPayPalSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Return URL */}
                                <div className="space-y-2">
                                    <Label htmlFor="paypal-return-url">Return URL</Label>
                                    <Input
                                        id="paypal-return-url"
                                        value={paypalForm.returnUrl}
                                        onChange={(e) =>
                                            setPaypalForm({ ...paypalForm, returnUrl: e.target.value })
                                        }
                                        placeholder="https://yoursite.com/payment/success"
                                    />
                                </div>

                                {/* Cancel URL */}
                                <div className="space-y-2">
                                    <Label htmlFor="paypal-cancel-url">Cancel URL</Label>
                                    <Input
                                        id="paypal-cancel-url"
                                        value={paypalForm.cancelUrl}
                                        onChange={(e) =>
                                            setPaypalForm({ ...paypalForm, cancelUrl: e.target.value })
                                        }
                                        placeholder="https://yoursite.com/payment/cancel"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <Button type="submit" disabled={saving} className="flex-1">
                                        {saving ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : paypal ? (
                                            <Save className="w-4 h-4 mr-2" />
                                        ) : (
                                            <Plus className="w-4 h-4 mr-2" />
                                        )}
                                        {paypal ? "Update PayPal Configuration" : "Create PayPal Configuration"}
                                    </Button>

                                    {paypal && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => loadPaymentMethods()}
                                            disabled={saving}
                                            title="Reset to saved values"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Cashier Tab */}
                <TabsContent value="cashier">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Kashier Configuration (Payment Sessions API v3) {cashier && <span className="text-sm font-normal text-muted-foreground">(Editing)</span>}
                            </CardTitle>
                            <CardDescription>
                                {cashier
                                    ? "Update your existing Kashier payment gateway. Get your credentials from"
                                    : "Configure your Kashier payment gateway. Get your credentials from"
                                }{" "}
                                <a
                                    href="https://merchant.kashier.io"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    Kashier Merchant Dashboard
                                </a>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Status Banner */}
                            {cashier ? (
                                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm font-medium text-green-800">
                                        ✅ Existing configuration found
                                        {cashier.updatedAt && (
                                            <span className="text-green-600 font-normal">
                                                {" • Last updated: "}
                                                {new Date(cashier.updatedAt).toLocaleString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            ) : (
                                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm font-medium text-blue-800">
                                        ℹ️ No configuration found. Fill the form below to create one.
                                    </p>
                                </div>
                            )}

                            <form onSubmit={handleCashierSubmit} className="space-y-6">
                                {/* Active Toggle */}
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <Label className="text-base font-semibold">Enable Kashier</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Allow customers to pay with Kashier (Cards, Wallets, etc.)
                                        </p>
                                    </div>
                                    <Switch
                                        checked={cashierForm.isActive}
                                        onCheckedChange={(checked) =>
                                            setCashierForm({ ...cashierForm, isActive: checked })
                                        }
                                    />
                                </div>

                                {/* Mode */}
                                <div className="space-y-2">
                                    <Label>Mode</Label>
                                    <Select
                                        value={cashierForm.mode}
                                        onValueChange={(value) =>
                                            setCashierForm({ ...cashierForm, mode: value as "sandbox" | "live" })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sandbox">Test Mode (Sandbox)</SelectItem>
                                            <SelectItem value="live">Live Mode (Production)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Use Test Mode for testing. Switch to Live Mode when ready for production.
                                    </p>
                                </div>

                                {/* Merchant ID */}
                                <div className="space-y-2">
                                    <Label htmlFor="cashier-mid">Merchant ID *</Label>
                                    <Input
                                        id="cashier-mid"
                                        value={cashierForm.mid}
                                        onChange={(e) =>
                                            setCashierForm({ ...cashierForm, mid: e.target.value })
                                        }
                                        placeholder="MID-XXXX-XXXX"
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Your Merchant ID from Kashier Dashboard
                                    </p>
                                </div>

                                {/* API Key */}
                                <div className="space-y-2">
                                    <Label htmlFor="cashier-api-key">API Key *</Label>
                                    <div className="relative">
                                        <Input
                                            id="cashier-api-key"
                                            type={showApiKey ? "text" : "password"}
                                            value={cashierForm.paymentApiKey}
                                            onChange={(e) =>
                                                setCashierForm({ ...cashierForm, paymentApiKey: e.target.value })
                                            }
                                            placeholder="Enter your API Key"
                                            required
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowApiKey(!showApiKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        API Key for authenticating payment requests
                                    </p>
                                </div>

                                {/* Secret Key */}
                                <div className="space-y-2">
                                    <Label htmlFor="cashier-secret">Secret Key *</Label>
                                    <div className="relative">
                                        <Input
                                            id="cashier-secret"
                                            type={showSecretKey ? "text" : "password"}
                                            value={cashierForm.secretKey}
                                            onChange={(e) =>
                                                setCashierForm({ ...cashierForm, secretKey: e.target.value })
                                            }
                                            placeholder="Enter your Secret Key"
                                            required
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowSecretKey(!showSecretKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Secret Key for webhook signature verification
                                    </p>
                                </div>

                                {/* Webhook URL (Read-only) */}
                                <div className="space-y-2">
                                    <Label htmlFor="cashier-webhook-url">Webhook URL (Configure in Kashier Dashboard)</Label>
                                    <Input
                                        id="cashier-webhook-url"
                                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/payments/kashier/webhook`}
                                        readOnly
                                        className="bg-muted"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Copy this URL and add it to your Kashier Merchant Dashboard → Settings → Webhooks
                                    </p>
                                </div>

                                {/* Success Redirect URL (Optional) */}
                                <div className="space-y-2">
                                    <Label htmlFor="cashier-redirect-url">Success Redirect URL (Optional)</Label>
                                    <Input
                                        id="cashier-redirect-url"
                                        value={cashierForm.redirectUrl}
                                        onChange={(e) =>
                                            setCashierForm({ ...cashierForm, redirectUrl: e.target.value })
                                        }
                                        placeholder="https://yoursite.com/payment/success"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Where to redirect customers after successful payment (default: /payment/result)
                                    </p>
                                </div>

                                {/* Instructions */}
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        <Info className="w-4 h-4" />
                                        Setup Instructions
                                    </h4>
                                    <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                                        <li>Sign up or log in to <a href="https://merchant.kashier.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Kashier Merchant Dashboard</a></li>
                                        <li>Go to Settings → API Keys to get your Merchant ID, API Key, and Secret Key</li>
                                        <li>Copy the Webhook URL above and add it in Settings → Webhooks</li>
                                        <li>Test with Sandbox mode first, then switch to Live mode when ready</li>
                                    </ol>
                                </div>

                                <div className="flex gap-3">
                                    <Button type="submit" disabled={saving} className="flex-1">
                                        {saving ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : cashier ? (
                                            <Save className="w-4 h-4 mr-2" />
                                        ) : (
                                            <Plus className="w-4 h-4 mr-2" />
                                        )}
                                        {cashier ? "Update Kashier Configuration" : "Create Kashier Configuration"}
                                    </Button>

                                    {cashier && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => loadPaymentMethods()}
                                            disabled={saving}
                                            title="Reset to saved values"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
