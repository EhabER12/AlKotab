"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { register as registerUser } from "@/store/services/authService";
import { reset } from "@/store/slices/authSlice";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

const createSchema = (t: any) =>
  z.object({
    fullNameAr: z.string().min(2, t("validation.arabicNameMin")),
    fullNameEn: z.string().min(2, t("validation.englishNameMin")),
    email: z.string().email(t("validation.emailInvalid")),
    phone: z.string().min(10, t("validation.phoneMin")),
    password: z.string().min(6, t("validation.passwordMin")),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t("validation.passwordMismatch"),
    path: ["confirmPassword"],
  });

export function RegisterForm({ locale = 'ar' }: { locale?: string }) {
  const t = useTranslations("auth.register");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { isLoading, isError, message, isSuccess } = useAppSelector(
    (state) => state.auth
  );
  const redirect = searchParams.get("redirect");
  const safeRedirect =
    redirect && redirect.startsWith("/") && !redirect.startsWith("//")
      ? redirect
      : null;

  const formSchema = createSchema(t);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullNameAr: "",
      fullNameEn: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      try {
        const result = await dispatch(
          registerUser({
            fullName: {
              ar: values.fullNameAr,
              en: values.fullNameEn,
            },
            email: values.email,
            phone: values.phone,
            lang: locale === "en" ? "en" : "ar",
            password: values.password,
            confirmPassword: values.confirmPassword,
          } as any)
        ).unwrap();

        if (result?.requiresVerification) {
          router.push(
            safeRedirect
              ? `/${locale}/login?message=verify_email&redirect=${encodeURIComponent(safeRedirect)}`
              : `/${locale}/login?message=verify_email`
          );
          return;
        }

        // Direct access when email verification is disabled
        router.push(safeRedirect || `/${locale}`);
      } catch (error) {
        console.error(error);
      }
    });
  }

  return (
    <div className="grid gap-6 rounded-lg border p-6 shadow-sm w-full max-w-md bg-white">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {isError && message && (
            <Alert variant="destructive">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          {isSuccess && (
            <Alert>
              <AlertDescription>
                {t("success")}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fullNameAr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.arabicName.label")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("fields.arabicName.placeholder")}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        if (isError) dispatch(reset());
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fullNameEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.englishName.label")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("fields.englishName.placeholder")}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        if (isError) dispatch(reset());
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.email.label")}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={t("fields.email.placeholder")}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      if (isError) dispatch(reset());
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.phone.label")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("fields.phone.placeholder")}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      if (isError) dispatch(reset());
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.password.label")}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={t("fields.password.placeholder")}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      if (isError) dispatch(reset());
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.confirmPassword.label")}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={t("fields.confirmPassword.placeholder")}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      if (isError) dispatch(reset());
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("submit")
            )}
          </Button>
        </form>
      </Form>
      <div className="text-center text-sm">
        {t("alreadyHaveAccount")}{" "}
        <Link
          href={
            safeRedirect
              ? `/${locale}/login?redirect=${encodeURIComponent(safeRedirect)}`
              : `/${locale}/login`
          }
          className="text-genoun-green hover:text-genoun-green/90 font-semibold"
        >
          {t("signIn")}
        </Link>
      </div>
    </div>
  );
}
