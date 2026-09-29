import React from "react";
import { Search, Filter, Store, Plus } from "lucide-react";
import { VendorBooking, Vendor } from "../../../api/types";
import { VendorBookingRow } from "./VendorBookingRow";

interface VendorBookingTableProps {
  bookings: VendorBooking[];
  vendors: Vendor[];
  onAddBooking?: () => void;
  onEditBooking?: (booking: VendorBooking) => void;
  onDeleteBooking?: (booking: VendorBooking) => void;
  onUpdateStatus?: (booking: VendorBooking, newStatus: VendorBooking["status"]) => void;
  updatingBookingId?: string | null;
}

export const VendorBookingTable: React.FC<VendorBookingTableProps> = ({
  bookings,
  vendors,
  onAddBooking,
  onEditBooking,
  onDeleteBooking,
  onUpdateStatus,
  updatingBookingId,
}) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "booked" | "contract_sent" | "inquiry" | "rejected"
  >("all");

  // Client-side join map
  const vendorMap = React.useMemo(() => {
    const map = new Map<string, Vendor>();
    for (const v of vendors) {
      map.set(v.id, v);
    }
    return map;
  }, [vendors]);

  // Counts for filter pills
  const counts = React.useMemo(() => {
    return {
      all: bookings.length,
      booked: bookings.filter((b) => b.status === "booked").length,
      contract_sent: bookings.filter((b) => b.status === "contract_sent").length,
      inquiry: bookings.filter((b) => b.status === "inquiry").length,
      rejected: bookings.filter((b) => b.status === "rejected").length,
    };
  }, [bookings]);

  // Filtered bookings
  const filteredBookings = React.useMemo(() => {
    return bookings.filter((booking) => {
      // Status Filter
      if (statusFilter !== "all" && booking.status !== statusFilter) {
        return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const vendor = vendorMap.get(booking.vendor);
        const vendorName = vendor?.name.toLowerCase() || "";
        const contactName = vendor?.point_of_contact?.toLowerCase() || "";
        const category = vendor?.category?.toLowerCase() || "";
        const notes = booking.contract_notes.toLowerCase();

        return (
          vendorName.includes(query) ||
          contactName.includes(query) ||
          category.includes(query) ||
          notes.includes(query)
        );
      }

      return true;
    });
  }, [bookings, statusFilter, searchQuery, vendorMap]);

  if (bookings.length === 0) {
    return (
      <div className="event-state-box empty-state" data-testid="vendors-empty-state">
        <div className="event-state-icon">
          <Store size={28} color="#9333ea" />
        </div>
        <h3>No Vendors Booked</h3>
        <p>
          No vendors have been booked for this event yet. Contract catering, photography, venues, and more from your vendor directory.
        </p>
        {onAddBooking && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onAddBooking}
            style={{ marginTop: "1rem" }}
          >
            <Plus size={15} style={{ marginRight: 6 }} />
            Book First Vendor
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="vendor-table-section">
      {/* Search & Filter Toolbar */}
      <div className="vendor-toolbar">
        <div className="vendor-toolbar-left">
          {/* Search Input */}
          <div className="vendor-search-wrap">
            <Search size={15} className="vendor-search-icon" />
            <input
              type="text"
              className="vendor-search-input"
              placeholder="Search vendors, contacts, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search vendors"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="vendor-filter-pills" role="tablist" aria-label="Filter bookings by status">
            <button
              type="button"
              className={`vendor-filter-btn ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              className={`vendor-filter-btn ${statusFilter === "booked" ? "active" : ""}`}
              onClick={() => setStatusFilter("booked")}
            >
              Booked ({counts.booked})
            </button>
            <button
              type="button"
              className={`vendor-filter-btn ${statusFilter === "contract_sent" ? "active" : ""}`}
              onClick={() => setStatusFilter("contract_sent")}
            >
              Contract Sent ({counts.contract_sent})
            </button>
            <button
              type="button"
              className={`vendor-filter-btn ${statusFilter === "inquiry" ? "active" : ""}`}
              onClick={() => setStatusFilter("inquiry")}
            >
              Inquiries ({counts.inquiry})
            </button>
            {counts.rejected > 0 && (
              <button
                type="button"
                className={`vendor-filter-btn ${statusFilter === "rejected" ? "active" : ""}`}
                onClick={() => setStatusFilter("rejected")}
              >
                Rejected ({counts.rejected})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Empty State */}
      {filteredBookings.length === 0 ? (
        <div className="event-state-box empty-state" data-testid="vendors-filter-empty">
          <div className="event-state-icon">
            <Filter size={24} color="#6b7280" />
          </div>
          <h3>No Matching Vendors</h3>
          <p>
            No booked vendors match your search term or active status filter. Try clearing the filter.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
            style={{ marginTop: "0.75rem" }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* Table Container */
        <div className="vendor-table-container">
          <div className="vendor-table-wrap">
            <table className="vendor-table" aria-label="Booked vendors for this event">
              <thead>
                <tr>
                  <th scope="col" style={{ width: "30%" }}>Vendor & Contact</th>
                  <th scope="col" style={{ width: "15%" }}>Category</th>
                  <th scope="col" style={{ width: "15%" }}>Agreed Cost</th>
                  <th scope="col" style={{ width: "22%" }}>Status</th>
                  <th scope="col" style={{ width: "13%" }}>Contract Notes</th>
                  <th scope="col" style={{ width: "5%", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <VendorBookingRow
                    key={booking.id}
                    booking={booking}
                    vendor={vendorMap.get(booking.vendor)}
                    onEditBooking={onEditBooking}
                    onDeleteBooking={onDeleteBooking}
                    onUpdateStatus={onUpdateStatus}
                    isUpdatingStatus={updatingBookingId === booking.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
