from organizations.models import Membership, Organization
from rest_framework import permissions


def get_organization_from_object(obj):
    """Helper to extract the Organization whether obj is an Organization or a TenantModel."""
    if isinstance(obj, Organization):
        return obj
    if hasattr(obj,"organization"):
        return obj.organization
    return None

class IsOrganizationMember(permissions.BasePermission):
    """Allows access only to active members of the target organization.
    """

    def has_permission(self,request,view):
        return bool(request.user and request.user.is_authenticated)
    
    def has_object_permission(self, request, view, obj):
        org = get_organization_from_object(obj)
        if not org:
            return False
        return Membership.objects.filter(organization=org, user=request.user).exists()

class IsOrganizationPlannerOrOwner(permissions.BasePermission):
    """
    Allows safe methods (GET, HEAD, OPTIONS) to any member,
    but mutating methods (POST, PUT, PATCH, DELETE) require 'owner' or 'planner'.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        org = get_organization_from_object(obj)
        if not org:
            return False

        if request.method in permissions.SAFE_METHODS:
            return Membership.objects.filter(organization=org, user=request.user).exists()

        return Membership.objects.filter(
            organization=org,
            user=request.user,
            role__in=["owner", "planner"],
        ).exists()
    
class IsOrganizationOwner(permissions.BasePermission):
    """
    Strictly restricts access to users with the 'owner' role in the organization.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)
    def has_object_permission(self, request, view, obj):
        org = get_organization_from_object(obj)
        if not org:
            return False
        return Membership.objects.filter(
            organization=org,
            user=request.user,
            role="owner",
        ).exists()
