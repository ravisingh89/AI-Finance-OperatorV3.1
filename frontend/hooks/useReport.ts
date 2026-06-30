"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api, FinancialReport } from "@/lib/api";

export function useReport() {
  const { getToken }  = useAuth();
  const [report, setReport]   = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("Not authenticated");
        const data = await api.report(token);
        setReport(data.report);
      } catch (e: any) {
        setError(e.message || "Failed to load report");
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

  return { report, loading, error };
}
