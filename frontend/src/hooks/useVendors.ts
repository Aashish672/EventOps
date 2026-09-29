import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchVendors,
  createVendor,
  fetchVendorBookings,
  createVendorBooking,
  updateVendorBooking,
  deleteVendorBooking,
} from "../api/vendors";
import { Vendor, VendorBooking } from "../api/types";

export const vendorKeys = {
  vendors: ["vendors"] as const,
  bookings: (eventId: string) => ["vendor_bookings", eventId] as const,
};

export function useVendors() {
  return useQuery({
    queryKey: vendorKeys.vendors,
    queryFn: fetchVendors,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Vendor>) => createVendor(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.vendors });
    },
  });
}

export function useVendorBookings(eventId: string) {
  return useQuery({
    queryKey: vendorKeys.bookings(eventId),
    queryFn: () => fetchVendorBookings(eventId),
    enabled: !!eventId,
  });
}

export function useCreateVendorBooking(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<VendorBooking>) => createVendorBooking(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.bookings(eventId) });
    },
  });
}

export function useUpdateVendorBooking(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<VendorBooking> }) =>
      updateVendorBooking(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.bookings(eventId) });
    },
  });
}

export function useDeleteVendorBooking(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVendorBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.bookings(eventId) });
    },
  });
}
