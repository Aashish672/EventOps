import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchHouseholds,
  createHousehold,
  updateHousehold,
  deleteHousehold,
  fetchGuests,
  createGuest,
  updateGuest,
  deleteGuest,
} from "../api/guests";
import { GuestHousehold, Guest } from "../api/types";

export const guestKeys = {
  households: (eventId: string) => ["households", eventId] as const,
  guests: (eventId: string) => ["guests", eventId] as const,
};

// Households
export function useHouseholds(eventId: string) {
  return useQuery({
    queryKey: guestKeys.households(eventId),
    queryFn: () => fetchHouseholds(eventId),
    enabled: !!eventId,
  });
}

export function useCreateHousehold(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<GuestHousehold>) => createHousehold(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guestKeys.households(eventId) });
    },
  });
}

export function useUpdateHousehold(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<GuestHousehold> }) =>
      updateHousehold(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guestKeys.households(eventId) });
    },
  });
}

export function useDeleteHousehold(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHousehold(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guestKeys.households(eventId) });
    },
  });
}

// Guests
export function useGuests(eventId: string) {
  return useQuery({
    queryKey: guestKeys.guests(eventId),
    queryFn: () => fetchGuests(eventId),
    enabled: !!eventId,
  });
}

export function useCreateGuest(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Guest>) => createGuest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guestKeys.guests(eventId) });
    },
  });
}

export function useUpdateGuest(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Guest> }) =>
      updateGuest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guestKeys.guests(eventId) });
    },
  });
}

export function useDeleteGuest(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGuest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guestKeys.guests(eventId) });
    },
  });
}
