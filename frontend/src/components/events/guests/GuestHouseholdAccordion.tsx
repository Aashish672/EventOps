import React from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Mail,
  MapPin,
  Users,
} from "lucide-react";
import { GuestHousehold, Guest } from "../../../api/types";
import { GuestRow } from "./GuestRow";

interface GuestHouseholdAccordionProps {
  household: GuestHousehold;
  guests: Guest[];
  isExpanded: boolean;
  onToggleExpand: (householdId: string) => void;
  onAddGuest?: (household: GuestHousehold) => void;
  onEditHousehold?: (household: GuestHousehold) => void;
  onDeleteHousehold?: (household: GuestHousehold) => void;
  onEditGuest?: (guest: Guest) => void;
  onDeleteGuest?: (guest: Guest) => void;
  onUpdateGuestStatus?: (guest: Guest, newStatus: "pending" | "attending" | "declined") => void;
  updatingGuestId?: string | null;
}

export const GuestHouseholdAccordion: React.FC<GuestHouseholdAccordionProps> = ({
  household,
  guests,
  isExpanded,
  onToggleExpand,
  onAddGuest,
  onEditHousehold,
  onDeleteHousehold,
  onEditGuest,
  onDeleteGuest,
  onUpdateGuestStatus,
  updatingGuestId,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [menuOpen]);

  const attendingCount = guests.filter((g) => g.rsvp_status === "attending").length;
  const declinedCount = guests.filter((g) => g.rsvp_status === "declined").length;
  const pendingCount = guests.filter((g) => g.rsvp_status === "pending").length;

  return (
    <div
      className={`guest-household-card ${isExpanded ? "expanded" : ""}`}
      data-testid={`household-card-${household.id}`}
    >
      {/* Household Header Row */}
      <div className="guest-household-header">
        <button
          type="button"
          className="household-expand-btn"
          onClick={() => onToggleExpand(household.id)}
          aria-expanded={isExpanded}
          aria-label={`Toggle ${household.name} household members`}
        >
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <div className="household-title-group">
            <span className="household-name">{household.name}</span>
            <span className="household-guest-count">
              <Users size={12} style={{ marginRight: 3, verticalAlign: "middle" }} />
              {guests.length} {guests.length === 1 ? "guest" : "guests"}
            </span>
          </div>
        </button>

        {/* Household Metadata & Breakdown Pills */}
        <div className="household-header-meta">
          {/* Contact Details Preview */}
          <div className="household-contact-preview">
            {household.email && (
              <span className="contact-item" title={household.email}>
                <Mail size={12} />
                <span>{household.email}</span>
              </span>
            )}
            {household.address && (
              <span className="contact-item" title={household.address}>
                <MapPin size={12} />
                <span>{household.address}</span>
              </span>
            )}
          </div>

          {/* Quick RSVP breakdown pills */}
          <div className="household-rsvp-breakdown">
            {attendingCount > 0 && (
              <span className="rsvp-mini-pill attending" title={`${attendingCount} Attending`}>
                {attendingCount} attending
              </span>
            )}
            {pendingCount > 0 && (
              <span className="rsvp-mini-pill pending" title={`${pendingCount} Pending`}>
                {pendingCount} pending
              </span>
            )}
            {declinedCount > 0 && (
              <span className="rsvp-mini-pill declined" title={`${declinedCount} Declined`}>
                {declinedCount} declined
              </span>
            )}
          </div>

          {/* Add Guest CTA in header */}
          {onAddGuest && (
            <button
              type="button"
              className="btn-add-guest-quick"
              onClick={() => onAddGuest(household)}
              title={`Add Guest to ${household.name}`}
              aria-label={`Add guest to ${household.name}`}
            >
              <Plus size={13} style={{ marginRight: 4 }} />
              <span>Add Guest</span>
            </button>
          )}

          {/* Household Context Options Menu */}
          <div className="household-menu-container" ref={menuRef}>
            <button
              type="button"
              className="household-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={`Options for ${household.name}`}
              aria-expanded={menuOpen}
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <div className="household-dropdown-menu" role="menu">
                {onAddGuest && (
                  <button
                    type="button"
                    role="menuitem"
                    className="menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onAddGuest(household);
                    }}
                  >
                    <Plus size={14} />
                    <span>Add Member Guest</span>
                  </button>
                )}
                {onEditHousehold && (
                  <button
                    type="button"
                    role="menuitem"
                    className="menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onEditHousehold(household);
                    }}
                  >
                    <Edit2 size={14} />
                    <span>Edit Household</span>
                  </button>
                )}
                {onDeleteHousehold && (
                  <button
                    type="button"
                    role="menuitem"
                    className="menu-item danger"
                    onClick={() => {
                      setMenuOpen(false);
                      onDeleteHousehold(household);
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Delete Household</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Guest Members Table */}
      {isExpanded && (
        <div className="household-body">
          {guests.length === 0 ? (
            <div className="household-empty-guests">
              <p>No guests have been added to this household yet.</p>
              {onAddGuest && (
                <button
                  type="button"
                  className="btn-add-guest-empty"
                  onClick={() => onAddGuest(household)}
                >
                  <Plus size={13} style={{ marginRight: 4 }} />
                  Add First Guest
                </button>
              )}
            </div>
          ) : (
            <div className="guest-table-wrap">
              <table className="guest-table" aria-label={`Guests for ${household.name}`}>
                <thead>
                  <tr>
                    <th scope="col" style={{ width: "35%" }}>Guest Name</th>
                    <th scope="col" style={{ width: "25%" }}>RSVP Status</th>
                    <th scope="col" style={{ width: "30%" }}>Dietary / Special Notes</th>
                    <th scope="col" style={{ width: "10%", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {guests.map((guest) => (
                    <GuestRow
                      key={guest.id}
                      guest={guest}
                      onEditGuest={onEditGuest}
                      onDeleteGuest={onDeleteGuest}
                      onUpdateStatus={onUpdateGuestStatus}
                      isUpdatingStatus={updatingGuestId === guest.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
