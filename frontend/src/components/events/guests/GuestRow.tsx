import React from "react";
import { CheckCircle2, Clock, XCircle, UtensilsCrossed, Edit2, Trash2 } from "lucide-react";
import { Guest } from "../../../api/types";

interface GuestRowProps {
  guest: Guest;
  onEditGuest?: (guest: Guest) => void;
  onDeleteGuest?: (guest: Guest) => void;
  onUpdateStatus?: (guest: Guest, newStatus: "pending" | "attending" | "declined") => void;
  isUpdatingStatus?: boolean;
}

export const GuestRow: React.FC<GuestRowProps> = ({
  guest,
  onEditGuest,
  onDeleteGuest,
  onUpdateStatus,
  isUpdatingStatus = false,
}) => {
  const getStatusBadge = () => {
    switch (guest.rsvp_status) {
      case "attending":
        return {
          icon: <CheckCircle2 size={13} />,
          label: "Attending",
          className: "rsvp-pill attending",
        };
      case "declined":
        return {
          icon: <XCircle size={13} />,
          label: "Declined",
          className: "rsvp-pill declined",
        };
      default:
        return {
          icon: <Clock size={13} />,
          label: "Pending",
          className: "rsvp-pill pending",
        };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <tr className="guest-table-row" data-testid={`guest-row-${guest.id}`}>
      {/* Guest Name */}
      <td className="guest-col-name">
        <span className="guest-full-name">
          {guest.first_name} {guest.last_name}
        </span>
      </td>

      {/* RSVP Status with Quick Status Selector */}
      <td className="guest-col-status">
        <div className="guest-status-wrapper">
          <div className={statusBadge.className}>
            {statusBadge.icon}
            <span>{statusBadge.label}</span>
          </div>

          {onUpdateStatus && (
            <select
              aria-label={`Update RSVP status for ${guest.first_name} ${guest.last_name}`}
              className="guest-status-select"
              value={guest.rsvp_status}
              disabled={isUpdatingStatus}
              onChange={(e) =>
                onUpdateStatus(guest, e.target.value as "pending" | "attending" | "declined")
              }
            >
              <option value="pending">Pending</option>
              <option value="attending">Attending</option>
              <option value="declined">Declined</option>
            </select>
          )}
        </div>
      </td>

      {/* Dietary Restrictions */}
      <td className="guest-col-dietary">
        {guest.dietary_restrictions && guest.dietary_restrictions.trim().length > 0 ? (
          <span className="guest-dietary-tag" title={guest.dietary_restrictions}>
            <UtensilsCrossed size={12} style={{ flexShrink: 0 }} />
            <span className="dietary-text">{guest.dietary_restrictions}</span>
          </span>
        ) : (
          <span className="guest-dietary-none">None</span>
        )}
      </td>

      {/* Actions */}
      <td className="guest-col-actions">
        <div className="guest-actions-wrap">
          {onEditGuest && (
            <button
              type="button"
              className="guest-action-btn edit"
              onClick={() => onEditGuest(guest)}
              title="Edit Guest"
              aria-label={`Edit ${guest.first_name} ${guest.last_name}`}
            >
              <Edit2 size={13} />
            </button>
          )}
          {onDeleteGuest && (
            <button
              type="button"
              className="guest-action-btn delete"
              onClick={() => onDeleteGuest(guest)}
              title="Delete Guest"
              aria-label={`Delete ${guest.first_name} ${guest.last_name}`}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};
