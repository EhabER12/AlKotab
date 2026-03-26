"use client";

import { Provider } from "react-redux";
import { store } from "../store";
import { AuthProvider } from "../components/auth/auth-provider";
import { CurrencyProvider } from "../contexts/CurrencyContext";
import { Toaster } from "react-hot-toast";
import type { CurrencyCode } from "@/lib/currency";

export function Providers({
  children,
  initialCurrency,
}: {
  children: React.ReactNode;
  initialCurrency: CurrencyCode;
}) {
  return (
    <Provider store={store}>
      <AuthProvider>
        <CurrencyProvider initialCurrency={initialCurrency}>
          {children}
          <Toaster
            position="top-center"
            reverseOrder={false}
            toastOptions={{
              duration: 4000,
              style: {
                background: "#fff",
                color: "#363636",
                boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                borderRadius: "12px",
                padding: "16px",
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#fff",
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fff",
                },
              },
            }}
          />
        </CurrencyProvider>
      </AuthProvider>
    </Provider>
  );
}
