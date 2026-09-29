import { Guest, GuestHousehold } from "../../../api/types";

export interface GuestSummary {
  totalGuests: number;
  totalHouseholds: number;
  attendingCount: number;
  declinedCount: number;
  pendingCount: number;
  attendingPercent: number;
  responseRatePercent: number;
  dietaryRestrictionsCount: number;
}

/**
 * Calculate comprehensive RSVP and guest statistics from households and guests.
 */
export function calculateGuestSummary(
  guests: Guest[] = [],
  households: GuestHousehold[] = []
): GuestSummary {
  const totalGuests = guests.length;
  const totalHouseholds = households.length;

  let attendingCount = 0;
  let declinedCount = 0;
  let pendingCount = 0;
  let dietaryRestrictionsCount = 0;

  for (const guest of guests) {
    if (guest.rsvp_status === "attending") {
      attendingCount += 1;
    } else if (guest.rsvp_status === "declined") {
      declinedCount += 1;
    } else {
      pendingCount += 1;
    }

    if (guest.dietary_restrictions && guest.dietary_restrictions.trim().length > 0) {
      dietaryRestrictionsCount += 1;
    }
  }

  const respondedCount = attendingCount + declinedCount;
  const responseRatePercent =
    totalGuests > 0 ? Math.round((respondedCount / totalGuests) * 100) : 0;
  const attendingPercent =
    totalGuests > 0 ? Math.round((attendingCount / totalGuests) * 100) : 0;

  return {
    totalGuests,
    totalHouseholds,
    attendingCount,
    declinedCount,
    pendingCount,
    attendingPercent,
    responseRatePercent,
    dietaryRestrictionsCount,
  };
}
