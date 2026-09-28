import React from "react";
import { Users, Plus, Search, ChevronsUpDown, Filter } from "lucide-react";
import { useEventContext } from "../../../context/useEventContext";
import {
  useHouseholds,
  useGuests,
  useUpdateGuest,
  useCreateHousehold,
  useUpdateHousehold,
  useDeleteHousehold,
  useCreateGuest,
  useDeleteGuest,
} from "../../../hooks/useGuests";
import { Guest, GuestHousehold } from "../../../api/types";
import { calculateGuestSummary } from "../guests/guestUtils";
import { GuestSummaryCards } from "../guests/GuestSummaryCards";
import { GuestHouseholdAccordion } from "../guests/GuestHouseholdAccordion";
import { GuestHouseholdModal } from "../guests/GuestHouseholdModal";
import { GuestModal, GuestFormData } from "../guests/GuestModal";
import { DeleteGuestModal, DeleteGuestTarget } from "../guests/DeleteGuestModal";
import "../guests/guests.css";

interface EventGuestsTabProps {
  onAddHousehold?: () => void;
  onEditHousehold?: (household: GuestHousehold) => void;
  onDeleteHousehold?: (household: GuestHousehold) => void;
  onAddGuest?: (household: GuestHousehold) => void;
  onEditGuest?: (guest: Guest) => void;
  onDeleteGuest?: (guest: Guest) => void;
}

export const EventGuestsTab: React.FC<EventGuestsTabProps> = ({
  onAddHousehold: propOnAddHousehold,
  onEditHousehold: propOnEditHousehold,
  onDeleteHousehold: propOnDeleteHousehold,
  onAddGuest: propOnAddGuest,
  onEditGuest: propOnEditGuest,
  onDeleteGuest: propOnDeleteGuest,
}) => {
  const { eventId, event } = useEventContext();
  const { data: households = [], isLoading: isLoadingHouseholds } = useHouseholds(eventId);
  const { data: guests = [], isLoading: isLoadingGuests } = useGuests(eventId);
  const updateGuestMutation = useUpdateGuest(eventId);
  const createGuestMutation = useCreateGuest(eventId);
  const deleteGuestMutation = useDeleteGuest(eventId);
  const createHouseholdMutation = useCreateHousehold(eventId);
  const updateHouseholdMutation = useUpdateHousehold(eventId);
  const deleteHouseholdMutation = useDeleteHousehold(eventId);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [rsvpFilter, setRsvpFilter] = React.useState<"all" | "attending" | "pending" | "declined">("all");
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [updatingGuestId, setUpdatingGuestId] = React.useState<string | null>(null);

  // Household Modal state
  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = React.useState(false);
  const [editingHousehold, setEditingHousehold] = React.useState<GuestHousehold | null>(null);

  // Guest Modal state
  const [isGuestModalOpen, setIsGuestModalOpen] = React.useState(false);
  const [editingGuest, setEditingGuest] = React.useState<Guest | null>(null);
  const [guestModalHouseholdId, setGuestModalHouseholdId] = React.useState<string | undefined>(undefined);

  // Delete Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<DeleteGuestTarget | null>(null);

  // Initialize all households as expanded when data first loads
  React.useEffect(() => {
    if (households.length > 0) {
      setExpandedIds((prev) => {
        if (prev.size === 0) {
          return new Set(households.map((h) => h.id));
        }
        return prev;
      });
    }
  }, [households]);

  const isLoading = isLoadingHouseholds || isLoadingGuests;
  const summary = calculateGuestSummary(guests, households);

  const handleToggleExpand = (householdId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(householdId)) {
        next.delete(householdId);
      } else {
        next.add(householdId);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (expandedIds.size === households.length) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(households.map((h) => h.id)));
    }
  };

  const handleUpdateGuestStatus = async (
    guest: Guest,
    newStatus: "pending" | "attending" | "declined"
  ) => {
    if (guest.rsvp_status === newStatus) return;
    setUpdatingGuestId(guest.id);
    try {
      await updateGuestMutation.mutateAsync({
        id: guest.id,
        payload: { rsvp_status: newStatus },
      });
    } catch (err) {
      console.error(`Failed to update RSVP status for guest ${guest.id}:`, err);
    } finally {
      setUpdatingGuestId(null);
    }
  };

  // Group guests by household ID
  const guestsByHousehold = React.useMemo(() => {
    const map = new Map<string, Guest[]>();
    for (const h of households) {
      map.set(h.id, []);
    }
    for (const g of guests) {
      const list = map.get(g.household);
      if (list) {
        list.push(g);
      }
    }
    return map;
  }, [households, guests]);

  // Filter households and guests based on search and RSVP status filter
  const filteredHouseholds = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return households.filter((household) => {
      const householdGuests = guestsByHousehold.get(household.id) || [];

      // Check RSVP filter for guests
      const matchingGuests = householdGuests.filter((guest) => {
        if (rsvpFilter !== "all" && guest.rsvp_status !== rsvpFilter) {
          return false;
        }
        if (query) {
          const guestName = `${guest.first_name} ${guest.last_name}`.toLowerCase();
          const dietary = (guest.dietary_restrictions || "").toLowerCase();
          return guestName.includes(query) || dietary.includes(query);
        }
        return true;
      });

      // Check if household itself matches query
      const householdMatchesQuery =
        !query ||
        household.name.toLowerCase().includes(query) ||
        (household.email || "").toLowerCase().includes(query) ||
        (household.address || "").toLowerCase().includes(query);

      // When RSVP filter is not "all", only include households with matching guests
      if (rsvpFilter !== "all") {
        return matchingGuests.length > 0;
      }

      // If no RSVP filter, include if household matches OR any member guest matches
      return householdMatchesQuery || matchingGuests.length > 0;
    });
  }, [households, guestsByHousehold, searchQuery, rsvpFilter]);

  const getHouseholdDisplayedGuests = (householdId: string) => {
    const allHouseholdGuests = guestsByHousehold.get(householdId) || [];
    if (rsvpFilter === "all" && !searchQuery.trim()) {
      return allHouseholdGuests;
    }
    const query = searchQuery.trim().toLowerCase();
    return allHouseholdGuests.filter((guest) => {
      if (rsvpFilter !== "all" && guest.rsvp_status !== rsvpFilter) {
        return false;
      }
      if (query) {
        const guestName = `${guest.first_name} ${guest.last_name}`.toLowerCase();
        const dietary = (guest.dietary_restrictions || "").toLowerCase();
        const household = households.find((h) => h.id === householdId);
        const householdMatches = household?.name.toLowerCase().includes(query);
        return householdMatches || guestName.includes(query) || dietary.includes(query);
      }
      return true;
    });
  };

  const isAllExpanded = households.length > 0 && expandedIds.size === households.length;

  const handleOpenAddHousehold = () => {
    if (propOnAddHousehold) {
      propOnAddHousehold();
    } else {
      setEditingHousehold(null);
      setIsHouseholdModalOpen(true);
    }
  };

  const handleOpenEditHousehold = (household: GuestHousehold) => {
    if (propOnEditHousehold) {
      propOnEditHousehold(household);
    } else {
      setEditingHousehold(household);
      setIsHouseholdModalOpen(true);
    }
  };

  const handleHouseholdSubmit = async (data: { name: string; address?: string; email?: string }) => {
    if (editingHousehold) {
      await updateHouseholdMutation.mutateAsync({
        id: editingHousehold.id,
        payload: { ...data, event: eventId },
      });
    } else {
      await createHouseholdMutation.mutateAsync({
        ...data,
        event: eventId,
      });
    }
  };

  const handleOpenAddGuest = (household?: GuestHousehold) => {
    if (propOnAddGuest && household) {
      propOnAddGuest(household);
    } else {
      setEditingGuest(null);
      setGuestModalHouseholdId(household?.id);
      setIsGuestModalOpen(true);
    }
  };

  const handleOpenEditGuest = (guest: Guest) => {
    if (propOnEditGuest) {
      propOnEditGuest(guest);
    } else {
      setEditingGuest(guest);
      setGuestModalHouseholdId(guest.household);
      setIsGuestModalOpen(true);
    }
  };

  const handleGuestSubmit = async (data: GuestFormData) => {
    if (editingGuest) {
      await updateGuestMutation.mutateAsync({
        id: editingGuest.id,
        payload: { ...data, event: eventId },
      });
    } else {
      await createGuestMutation.mutateAsync({
        ...data,
        event: eventId,
      });
    }
  };

  const handleOpenDeleteHousehold = (household: GuestHousehold) => {
    if (propOnDeleteHousehold) {
      propOnDeleteHousehold(household);
    } else {
      const memberGuestCount = guests.filter((g) => g.household === household.id).length;
      setDeleteTarget({ type: "household", household, memberGuestCount });
      setIsDeleteModalOpen(true);
    }
  };

  const handleOpenDeleteGuest = (guest: Guest) => {
    if (propOnDeleteGuest) {
      propOnDeleteGuest(guest);
    } else {
      setDeleteTarget({ type: "guest", guest });
      setIsDeleteModalOpen(true);
    }
  };

  const handleConfirmDelete = async ({ type, id }: { type: "household" | "guest"; id: string }) => {
    if (type === "household") {
      await deleteHouseholdMutation.mutateAsync(id);
    } else {
      await deleteGuestMutation.mutateAsync(id);
    }
  };

  return (
    <div className="event-tab-pane">
      {/* Create / Edit Household Modal */}
      <GuestHouseholdModal
        isOpen={isHouseholdModalOpen}
        onClose={() => setIsHouseholdModalOpen(false)}
        onSubmit={handleHouseholdSubmit}
        initialHousehold={editingHousehold}
        isSubmitting={createHouseholdMutation.isPending || updateHouseholdMutation.isPending}
      />

      {/* Create / Edit Guest Modal */}
      <GuestModal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        onSubmit={handleGuestSubmit}
        households={households}
        initialGuest={editingGuest}
        defaultHouseholdId={guestModalHouseholdId}
        isSubmitting={createGuestMutation.isPending || updateGuestMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <DeleteGuestModal
        isOpen={isDeleteModalOpen}
        target={deleteTarget}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteHouseholdMutation.isPending || deleteGuestMutation.isPending}
      />

      {/* Tab Header */}
      <div className="tab-pane-header">
        <div>
          <h2 className="tab-pane-title">Guest Households & RSVPs</h2>
          <p className="tab-pane-description">
            Organize guest invitations, group invitations by household, and monitor RSVP responses for {event?.name}.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenAddHousehold}
          title="Add a new guest household"
        >
          <Plus size={15} style={{ marginRight: 6 }} />
          Add Household
        </button>
      </div>

      {isLoading ? (
        <div className="placeholder-pulse" style={{ height: 160, borderRadius: 8, background: "var(--bg-subtle)" }} />
      ) : (
        <>
          {/* Top KPI RSVP Overview */}
          <GuestSummaryCards summary={summary} />

          {/* Controls Toolbar */}
          <div className="guest-toolbar">
            <div className="guest-toolbar-left">
              {/* Search Box */}
              <div className="guest-search-wrap">
                <Search size={14} className="guest-search-icon" />
                <input
                  type="text"
                  placeholder="Search households or guests..."
                  className="guest-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search households or guests"
                />
              </div>

              {/* RSVP Status Filter Pills */}
              <div className="guest-filter-pills" role="radiogroup" aria-label="Filter by RSVP status">
                <button
                  type="button"
                  className={`guest-filter-btn ${rsvpFilter === "all" ? "active" : ""}`}
                  onClick={() => setRsvpFilter("all")}
                >
                  All ({summary.totalGuests})
                </button>
                <button
                  type="button"
                  className={`guest-filter-btn ${rsvpFilter === "attending" ? "active" : ""}`}
                  onClick={() => setRsvpFilter("attending")}
                >
                  Attending ({summary.attendingCount})
                </button>
                <button
                  type="button"
                  className={`guest-filter-btn ${rsvpFilter === "pending" ? "active" : ""}`}
                  onClick={() => setRsvpFilter("pending")}
                >
                  Pending ({summary.pendingCount})
                </button>
                <button
                  type="button"
                  className={`guest-filter-btn ${rsvpFilter === "declined" ? "active" : ""}`}
                  onClick={() => setRsvpFilter("declined")}
                >
                  Declined ({summary.declinedCount})
                </button>
              </div>
            </div>

            {/* Toolbar Right */}
            {households.length > 0 && (
              <div className="guest-toolbar-right">
                <button
                  type="button"
                  className="btn-toggle-all"
                  onClick={handleToggleAll}
                  aria-label={isAllExpanded ? "Collapse all households" : "Expand all households"}
                >
                  <ChevronsUpDown size={14} />
                  <span>{isAllExpanded ? "Collapse All" : "Expand All"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Households List or Empty States */}
          {households.length === 0 ? (
            <div className="event-state-box empty-state">
              <div className="event-state-icon">
                <Users size={28} color="#d97706" />
              </div>
              <h3>No Guest Households Added</h3>
              <p>
                Get started by creating your first guest household to group invitations and track RSVPs.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenAddHousehold}
                style={{ marginTop: "1rem" }}
              >
                <Plus size={15} style={{ marginRight: 6 }} />
                Add First Household
              </button>
            </div>
          ) : filteredHouseholds.length === 0 ? (
            <div className="event-state-box empty-state">
              <div className="event-state-icon">
                <Filter size={24} color="var(--text-muted)" />
              </div>
              <h3>No Matching Guests or Households</h3>
              <p>
                No households match your current search or RSVP status filter. Try clearing the filter.
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearchQuery("");
                  setRsvpFilter("all");
                }}
                style={{ marginTop: "0.75rem" }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="guest-households-list">
              {filteredHouseholds.map((household) => (
                <GuestHouseholdAccordion
                  key={household.id}
                  household={household}
                  guests={getHouseholdDisplayedGuests(household.id)}
                  isExpanded={expandedIds.has(household.id)}
                  onToggleExpand={handleToggleExpand}
                  onAddGuest={handleOpenAddGuest}
                  onEditHousehold={handleOpenEditHousehold}
                  onDeleteHousehold={handleOpenDeleteHousehold}
                  onEditGuest={handleOpenEditGuest}
                  onDeleteGuest={handleOpenDeleteGuest}
                  onUpdateGuestStatus={handleUpdateGuestStatus}
                  updatingGuestId={updatingGuestId}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
