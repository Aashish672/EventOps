import React, { useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  Calendar,
  Lock,
} from "lucide-react";
import { useOrganization } from "../../context/useOrganization";
import { Membership } from "../../api/organizations";
import { InviteMemberModal } from "./InviteMemberModal";
import { ConfirmRemoveModal } from "./ConfirmRemoveModal";

export const MembersTab: React.FC = () => {
  const {
    activeOrg,
    members,
    membersLoading,
    currentUserRole,
    error,
    isUnauthenticated,
    inviteMember,
    removeMember,
    refreshOrganizations,
  } = useOrganization();

  const [searchQuery, setSearchQuery] = useState("");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Membership | null>(null);

  const isOwner = currentUserRole === "owner";

  // Filtered members based on search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  // Initials generator
  const getInitials = (name: string) => {
    return name
      .split(/[-_.\s]+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  if (!activeOrg && isUnauthenticated) {
    return (
      <div className="card-surface card-body">
        <div className="state-empty">
          <Lock size={32} color="var(--warning)" />
          <div className="state-empty-title">Authentication Required</div>
          <div className="state-empty-desc">
            You must be authenticated to access organization resources. Please log in via Django session or authenticate to view your team.
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={refreshOrganizations}
            style={{ marginTop: "0.5rem" }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!activeOrg) {
    return (
      <div className="card-surface card-body">
        <div className="state-empty">
          <Users size={32} color="var(--text-muted)" />
          <div className="state-empty-title">No Organization Selected</div>
          <div className="state-empty-desc">
            Select an organization from the top bar or create a new organization to manage team members.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card-surface">
        {/* Table Action Bar */}
        <div className="table-action-bar">
          <div className="search-input-wrapper">
            <Search size={14} className="search-input-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Filter members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter members"
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {members.length} {members.length === 1 ? "member" : "members"}
            </span>

            {isOwner ? (
              <button
                id="invite-member-btn"
                type="button"
                className="btn btn-primary"
                onClick={() => setInviteModalOpen(true)}
              >
                <UserPlus size={14} />
                <span>Invite Member</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                disabled
                title="Only organization owners can invite new members"
              >
                <UserPlus size={14} />
                <span>Invite Member</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{ padding: "0.75rem 1.25rem" }}>
            <div className="alert-banner error" role="alert">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Table Content */}
        <div className="data-table-container">
          {membersLoading ? (
            <div className="state-loading">
              <Loader2 size={24} className="spin-icon" color="var(--accent-primary)" />
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Loading organization members...
              </div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="state-empty">
              <Users size={28} color="var(--text-muted)" />
              <div className="state-empty-title">
                {searchQuery ? "No matching members" : "No members found"}
              </div>
              <div className="state-empty-desc">
                {searchQuery
                  ? "No team member matches the filter query."
                  : "This organization currently has no active team members."}
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Joined Date</th>
                  {isOwner && <th style={{ textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => {
                  const isSoleOwner =
                    member.role === "owner" &&
                    members.filter((m) => m.role === "owner").length === 1;

                  return (
                    <tr key={member.id}>
                      <td>
                        <div className="member-cell">
                          <div className="member-avatar-initials">
                            {getInitials(member.username || member.email)}
                          </div>
                          <div className="member-info">
                            <span className="member-name-text">
                              {member.username}
                            </span>
                            <span className="member-email-text">
                              {member.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge-role role-${member.role.toLowerCase()}`}>
                          {member.role.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                          <Calendar size={13} color="var(--text-muted)" />
                          <span>
                            {new Date(member.joined_at).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </td>
                      {isOwner && (
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="btn-icon-subtle"
                            title={
                              isSoleOwner
                                ? "Sole owner cannot be removed"
                                : `Remove ${member.username}`
                            }
                            disabled={isSoleOwner}
                            onClick={() => setMemberToRemove(member)}
                            aria-label={`Remove ${member.username}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onInvite={inviteMember}
        orgName={activeOrg.name}
      />

      {/* Remove Confirmation Modal */}
      <ConfirmRemoveModal
        member={memberToRemove}
        orgName={activeOrg.name}
        onClose={() => setMemberToRemove(null)}
        onConfirm={removeMember}
      />
    </>
  );
};
