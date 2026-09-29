import { VendorBooking, Vendor } from "../../../api/types";

export interface VendorSummaryMetrics {
  totalBookings: number;
  bookedCount: number;
  inProgressCount: number;
  rejectedCount: number;
  contractedSpend: number;
  pipelineSpend: number;
  bookedPercentage: number;
}

export function calculateVendorSummary(bookings: VendorBooking[]): VendorSummaryMetrics {
  let bookedCount = 0;
  let inProgressCount = 0;
  let rejectedCount = 0;
  let contractedSpend = 0;
  let pipelineSpend = 0;

  for (const b of bookings) {
    const price = b.agreed_price ? parseFloat(b.agreed_price) || 0 : 0;

    if (b.status === "booked") {
      bookedCount += 1;
      contractedSpend += price;
      pipelineSpend += price;
    } else if (b.status === "inquiry" || b.status === "contract_sent") {
      inProgressCount += 1;
      pipelineSpend += price;
    } else if (b.status === "rejected") {
      rejectedCount += 1;
    }
  }

  const totalBookings = bookings.length;
  const bookedPercentage =
    totalBookings > 0 ? Math.round((bookedCount / totalBookings) * 100) : 0;

  return {
    totalBookings,
    bookedCount,
    inProgressCount,
    rejectedCount,
    contractedSpend,
    pipelineSpend,
    bookedPercentage,
  };
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "$0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export const VENDOR_CATEGORY_LABELS: Record<Vendor["category"], string> = {
  venue: "Venue",
  catering: "Catering",
  florist: "Florist",
  photography: "Photography",
  entertainment: "Entertainment",
  other: "Other Service",
};

export const VENDOR_STATUS_CONFIG: Record<
  VendorBooking["status"],
  { label: string; className: string }
> = {
  inquiry: { label: "Inquiry Sent", className: "status-inquiry" },
  contract_sent: { label: "Contract Sent", className: "status-contract" },
  booked: { label: "Confirmed / Booked", className: "status-booked" },
  rejected: { label: "Declined / Rejected", className: "status-rejected" },
};
