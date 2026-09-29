import React from "react";
import { Plus } from "lucide-react";
import { useEventContext } from "../../../context/useEventContext";
import {
  useVendorBookings,
  useVendors,
  useCreateVendorBooking,
  useUpdateVendorBooking,
  useDeleteVendorBooking,
} from "../../../hooks/useVendors";
import { VendorBooking } from "../../../api/types";
import { calculateVendorSummary } from "../vendors/vendorUtils";
import { VendorSummaryCards } from "../vendors/VendorSummaryCards";
import { VendorBookingTable } from "../vendors/VendorBookingTable";
import { BookVendorModal, BookVendorFormData } from "../vendors/BookVendorModal";
import { DeleteVendorBookingModal } from "../vendors/DeleteVendorBookingModal";
import "../vendors/vendors.css";

interface EventVendorsTabProps {
  onBookVendor?: () => void;
  onEditBooking?: (booking: VendorBooking) => void;
  onDeleteBooking?: (booking: VendorBooking) => void;
}

export const EventVendorsTab: React.FC<EventVendorsTabProps> = ({
  onBookVendor: propOnBookVendor,
  onEditBooking: propOnEditBooking,
  onDeleteBooking: propOnDeleteBooking,
}) => {
  const { eventId, event } = useEventContext();
  const bookingsQuery = useVendorBookings(eventId);
  const bookings = bookingsQuery?.data ?? [];
  const isLoadingBookings = bookingsQuery?.isLoading ?? false;

  const vendorsQuery = useVendors();
  const vendors = vendorsQuery?.data ?? [];
  const isLoadingVendors = vendorsQuery?.isLoading ?? false;

  const createBookingMutation = useCreateVendorBooking(eventId);
  const updateBookingMutation = useUpdateVendorBooking(eventId);
  const deleteBookingMutation = useDeleteVendorBooking(eventId);

  const [updatingBookingId, setUpdatingBookingId] = React.useState<string | null>(null);

  // Book/Edit Modal state
  const [isBookModalOpen, setIsBookModalOpen] = React.useState(false);
  const [editingBooking, setEditingBooking] = React.useState<VendorBooking | null>(null);

  // Delete Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [deletingBooking, setDeletingBooking] = React.useState<VendorBooking | null>(null);

  const isLoading = isLoadingBookings || isLoadingVendors;
  const summary = calculateVendorSummary(bookings);

  const handleOpenBookVendor = () => {
    if (propOnBookVendor) {
      propOnBookVendor();
    } else {
      setEditingBooking(null);
      setIsBookModalOpen(true);
    }
  };

  const handleOpenEditBooking = (booking: VendorBooking) => {
    if (propOnEditBooking) {
      propOnEditBooking(booking);
    } else {
      setEditingBooking(booking);
      setIsBookModalOpen(true);
    }
  };

  const handleOpenDeleteBooking = (booking: VendorBooking) => {
    if (propOnDeleteBooking) {
      propOnDeleteBooking(booking);
    } else {
      setDeletingBooking(booking);
      setIsDeleteModalOpen(true);
    }
  };

  const handleBookSubmit = async (data: BookVendorFormData) => {
    if (editingBooking) {
      await updateBookingMutation.mutateAsync({
        id: editingBooking.id,
        payload: { ...data, event: eventId },
      });
    } else {
      await createBookingMutation.mutateAsync({
        ...data,
        event: eventId,
      });
    }
  };

  const handleDeleteConfirm = async (bookingId: string) => {
    await deleteBookingMutation.mutateAsync(bookingId);
  };

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

  const deletingVendor = deletingBooking
    ? vendors.find((v) => v.id === deletingBooking.vendor)
    : undefined;

  return (
    <div className="event-tab-pane">
      {/* Book / Edit Vendor Modal */}
      <BookVendorModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onSubmit={handleBookSubmit}
        vendors={vendors}
        initialBooking={editingBooking}
        existingBookings={bookings}
        isSubmitting={createBookingMutation.isPending || updateBookingMutation.isPending}
      />

      {/* Delete Booking Confirmation Modal */}
      <DeleteVendorBookingModal
        isOpen={isDeleteModalOpen}
        booking={deletingBooking}
        vendor={deletingVendor}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteBookingMutation.isPending}
      />

      {/* Tab Header */}
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
          onClick={handleOpenBookVendor}
          title="Book a vendor"
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
          onAddBooking={handleOpenBookVendor}
          onEditBooking={handleOpenEditBooking}
          onDeleteBooking={handleOpenDeleteBooking}
          onUpdateStatus={handleUpdateStatus}
          updatingBookingId={updatingBookingId}
        />
      )}
    </div>
  );
};
