import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useFridayPolicySettings() {
  return useQuery({
    queryKey: [api.fridayPolicy.settings.path],
    queryFn: async () => {
      const res = await fetch(api.fridayPolicy.settings.path);
      if (!res.ok) throw new Error("Failed to fetch Friday policy settings");
      return api.fridayPolicy.settings.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateFridayPolicySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(api.fridayPolicy.update.path, {
        method: api.fridayPolicy.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update Friday policy settings");
      return api.fridayPolicy.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.fridayPolicy.settings.path] }),
  });
}

export function useFridayPolicyReport(month?: string) {
  return useQuery({
    queryKey: [api.fridayPolicy.report.path, month],
    enabled: Boolean(month),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (month) params.set("month", month);
      params.set("timezoneOffsetMinutes", String(new Date().getTimezoneOffset()));
      const res = await fetch(`${api.fridayPolicy.report.path}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch Friday policy report");
      return await res.json();
    },
  });
}
