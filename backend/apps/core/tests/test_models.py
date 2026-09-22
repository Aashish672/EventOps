from django.db import models

from apps.core.models import TenantModel, TimeStampedModel, UUIDModel


def test_uuid_model_is_abstract():
    """Verify UUIDModel is abstract and defines UUIDv4 primary key."""
    assert UUIDModel._meta.abstract is True
    id_field = UUIDModel._meta.get_field("id")
    assert isinstance(id_field, models.UUIDField)
    assert id_field.primary_key is True
    assert id_field.editable is False


def test_timestamped_model_is_abstract():
    """Verify TimeStampedModel is abstract and defines auto timestamp fields."""
    assert TimeStampedModel._meta.abstract is True
    created_at = TimeStampedModel._meta.get_field("created_at")
    assert created_at.auto_now_add is True
    assert created_at.editable is False

    updated_at = TimeStampedModel._meta.get_field("updated_at")
    assert updated_at.auto_now is True
    assert updated_at.editable is False


def test_tenant_model_is_abstract_and_defines_tenant_foreign_key():
    """Verify TenantModel inherits base fields and enforces organization boundary."""
    assert TenantModel._meta.abstract is True

    # Confirms inheritance of UUID primary key and timestamps
    id_field = TenantModel._meta.get_field("id")
    assert isinstance(id_field, models.UUIDField)
    assert id_field.primary_key is True

    created_at = TenantModel._meta.get_field("created_at")
    assert created_at.auto_now_add is True

    updated_at = TenantModel._meta.get_field("updated_at")
    assert updated_at.auto_now is True

    # Confirms indexed foreign key to Organization with dynamic related_name
    org_field = TenantModel._meta.get_field("organization")
    assert isinstance(org_field, models.ForeignKey)
    assert org_field.remote_field.model == "organizations.Organization"
    assert org_field.remote_field.related_name == "%(app_label)s_%(class)ss"
    assert org_field.db_index is True
