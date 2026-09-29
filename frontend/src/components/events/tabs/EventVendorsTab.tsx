import React from "react";
import { Plus } from "lucide-react";
import { useEventContext } from "../../../context/useEventContext";
import {
  useVendorBookings,
  useVendors,
  useUpdateVendorBooking,
} from "../../../hooks/useVendors";
import { VendorBooking } from "../../../api/types";
import { calculateVendorSummary } from "../vendors/vendorUtils";
import { VendorSummaryCards } from "../vendors/VendorSummaryCards";
import { VendorBookingTable } from "../vendors/VendorBookingTable";
import "../vendors/vendors.css";

interface EventVendorsTabProps {
  onBookVendor?: () => void;
  onEditBooking?: (booking: VendorBooking) => void;
  onDeleteBooking?: (booking: VendorBooking) => void;
}

export const EventVendorsTab: React.FC<EventVendorsTabProps> = ({
  onBookVendor,
  onEditBooking,
  onDeleteBooking,
}) => {
  const { eventId, event } = useEventContext();
  const bookingsQuery = useVendorBookings(eventId);
  const bookings = bookingsQuery?.data ?? [];
  const isLoadingBookings = bookingsQuery?.isLoading ?? false;

  const vendorsQuery = useVendors();
  const vendors = vendorsQuery?.data ?? [];
  const isLoadingVendors = vendorsQuery?.isLoading ?? false;

  const updateBookingMutation = useUpdateVendorBooking(eventId);

  const [updatingBookingId, setUpdatingBookingId] = React.useState<string | null>(null);

  const isLoading = isLoadingBookings || isLoadingVendors;
  const summary = calculateVendorSummary(bookings);

  const handleUpdateStatus = async (
    booking: VendorBooking,
    newStatus: VendorBooking["status"]
  ) => {
    setUpdatingBookingId(booking.id);
    try {
      await updateBookingMutation.mutateAsync({
        id: booking.id,
        payload: { status: newStatus },
      });
    } catch (err) {
      console.error("Failed to update booking status", err);
    } finally {
      setUpdatingBookingId(null);
    }
  };

  return (
    <div className="event-tab-pane">
      <div className="tab-pane-header">
        <div>
          <h2 className="tab-pane-title">Vendor Bookings</h2>
          <p className="tab-pane-description">
            Book external vendors, track contractual milestones, and oversee service agreements for {event?.name}.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onBookVendor}
          disabled={!onBookVendor}
          title={onBookVendor ? "Book a vendor" : "Booking modal available in Sub-task 3.6.3"}
        >
          <Plus size={15} style={{ marginRight: 6 }} />
          Book Vendor
        </button>
      </div>

      {/* Vendor Summary KPI Cards */}
      {!isLoading && <VendorSummaryCards summary={summary} />}

      {/* Bookings Table / States */}
      {isLoading ? (
        <div
          className="placeholder-pulse"
          style={{ height: 200, borderRadius: 8, background: "var(--bg-subtle)" }}
        />
      ) : (
        <VendorBookingTable
          bookings={bookings}
          vendors={vendors}
          onAddBooking={onBookVendor}
          onEditBooking={onEditBooking}
          onDeleteBooking={onDeleteBooking}
          onUpdateStatus={handleUpdateStatus}
          updatingBookingId={updatingBookingId}
        />
      )}
    </div>
  );
};
