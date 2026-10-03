"""Initial schema for RightGo logistics database.

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-10-02 18:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Users
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('username', sa.String(length=64), nullable=False),
        sa.Column('password_hash', sa.String(length=256), nullable=False),
        sa.Column('role', sa.String(length=32), nullable=False),
        sa.Column('display_name', sa.String(length=128), nullable=False),
        sa.Column('outlet_id', sa.String(length=32), nullable=True),
        sa.Column('vehicle_id', sa.String(length=32), nullable=True),
        sa.Column('phone', sa.String(length=32), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    op.create_index(op.f('ix_users_role'), 'users', ['role'], unique=False)

    # 2. Outlets
    op.create_table(
        'outlets',
        sa.Column('outlet_id', sa.String(length=32), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('brand', sa.String(length=32), nullable=False),
        sa.Column('district', sa.String(length=64), nullable=False),
        sa.Column('depot', sa.String(length=64), nullable=False),
        sa.Column('dock_type', sa.String(length=32), nullable=False),
        sa.Column('parking_constraint', sa.String(length=32), nullable=False),
        sa.Column('mall_window', sa.String(length=32), nullable=True),
        sa.Column('window_open_time', sa.String(length=16), nullable=False),
        sa.Column('window_close_time', sa.String(length=16), nullable=False),
        sa.Column('address', sa.String(length=256), nullable=True),
        sa.Column('manager_name', sa.String(length=128), nullable=True),
        sa.Column('phone', sa.String(length=32), nullable=True),
        sa.Column('operating_days', sa.String(length=128), nullable=True),
        sa.PrimaryKeyConstraint('outlet_id')
    )

    # 3. Vehicles
    op.create_table(
        'vehicles',
        sa.Column('vehicle_id', sa.String(length=32), nullable=False),
        sa.Column('type', sa.String(length=32), nullable=False),
        sa.Column('temp', sa.String(length=32), nullable=False),
        sa.Column('weight_cap_kg', sa.Float(), nullable=False),
        sa.Column('volume_cap_m3', sa.Float(), nullable=False),
        sa.Column('fuel_type', sa.String(length=32), nullable=False),
        sa.Column('km_per_l', sa.Float(), nullable=False),
        sa.Column('weekly_fuel_quota_l', sa.Float(), nullable=False),
        sa.Column('depot', sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint('vehicle_id')
    )

    # 4. Scenario Fleet
    op.create_table(
        'scenario_fleet_entries',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('scenario', sa.String(length=32), nullable=False),
        sa.Column('vehicle_id', sa.String(length=32), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.vehicle_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_scenario_fleet_entries_scenario'), 'scenario_fleet_entries', ['scenario'], unique=False)
    op.create_index(op.f('ix_scenario_fleet_entries_vehicle_id'), 'scenario_fleet_entries', ['vehicle_id'], unique=False)

    # 5. Service Allowances
    op.create_table(
        'service_allowances',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('brand', sa.String(length=32), nullable=False),
        sa.Column('dock_type', sa.String(length=32), nullable=False),
        sa.Column('service_allowance_min', sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_service_allowances_brand'), 'service_allowances', ['brand'], unique=False)
    op.create_index(op.f('ix_service_allowances_dock_type'), 'service_allowances', ['dock_type'], unique=False)

    # 6. District Travel
    op.create_table(
        'district_travel',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('district', sa.String(length=64), nullable=False),
        sa.Column('depot', sa.String(length=64), nullable=False),
        sa.Column('road_class', sa.String(length=32), nullable=False),
        sa.Column('free_flow_kmh', sa.Float(), nullable=False),
        sa.Column('depot_to_district_km', sa.Float(), nullable=False),
        sa.Column('depot_to_district_freeflow_min', sa.Float(), nullable=False),
        sa.Column('inter_stop_km', sa.Float(), nullable=False),
        sa.Column('inter_stop_freeflow_min', sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_district_travel_district'), 'district_travel', ['district'], unique=False)
    op.create_index(op.f('ix_district_travel_depot'), 'district_travel', ['depot'], unique=False)

    # 7. Orders
    op.create_table(
        'orders',
        sa.Column('order_ref', sa.String(length=64), nullable=False),
        sa.Column('scenario', sa.String(length=32), nullable=False),
        sa.Column('outlet_id', sa.String(length=32), nullable=False),
        sa.Column('brand', sa.String(length=32), nullable=False),
        sa.Column('district', sa.String(length=64), nullable=False),
        sa.Column('depot', sa.String(length=64), nullable=False),
        sa.Column('dock_type', sa.String(length=32), nullable=False),
        sa.Column('parking_constraint', sa.String(length=32), nullable=False),
        sa.Column('mall_window', sa.String(length=32), nullable=True),
        sa.Column('window_open_time', sa.String(length=16), nullable=False),
        sa.Column('window_close_time', sa.String(length=16), nullable=False),
        sa.Column('temp_requirement', sa.String(length=32), nullable=False),
        sa.Column('order_units', sa.Integer(), nullable=False),
        sa.Column('order_weight_kg', sa.Float(), nullable=False),
        sa.Column('order_volume_m3', sa.Float(), nullable=False),
        sa.Column('deferred_yesterday', sa.Boolean(), nullable=False),
        sa.Column('days_since_last_served', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('placed_by', sa.String(length=128), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['outlet_id'], ['outlets.outlet_id'], ),
        sa.PrimaryKeyConstraint('order_ref')
    )
    op.create_index(op.f('ix_orders_scenario'), 'orders', ['scenario'], unique=False)
    op.create_index(op.f('ix_orders_outlet_id'), 'orders', ['outlet_id'], unique=False)
    op.create_index(op.f('ix_orders_brand'), 'orders', ['brand'], unique=False)
    op.create_index(op.f('ix_orders_status'), 'orders', ['status'], unique=False)

    # 8. Draft Plans & Components
    op.create_table(
        'draft_plans',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('scenario', sa.String(length=32), nullable=False),
        sa.Column('draft_revision', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_by', sa.String(length=128), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('scenario')
    )

    op.create_table(
        'draft_assignments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('scenario', sa.String(length=32), nullable=False),
        sa.Column('order_ref', sa.String(length=64), nullable=False),
        sa.Column('decision', sa.String(length=32), nullable=False),
        sa.Column('vehicle_id', sa.String(length=32), nullable=True),
        sa.Column('trip_no', sa.Integer(), nullable=True),
        sa.Column('reason_code', sa.String(length=64), nullable=True),
        sa.Column('reason_note', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['order_ref'], ['orders.order_ref'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'draft_stop_sequences',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('scenario', sa.String(length=32), nullable=False),
        sa.Column('vehicle_id', sa.String(length=32), nullable=False),
        sa.Column('trip_no', sa.Integer(), nullable=False),
        sa.Column('stop_outlet_ids', sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'draft_trip_meta',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('scenario', sa.String(length=32), nullable=False),
        sa.Column('vehicle_id', sa.String(length=32), nullable=False),
        sa.Column('trip_no', sa.Integer(), nullable=False),
        sa.Column('planned_departure_time', sa.String(length=16), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'draft_vehicle_fuel_inputs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('scenario', sa.String(length=32), nullable=False),
        sa.Column('vehicle_id', sa.String(length=32), nullable=False),
        sa.Column('prior_weekly_fuel_usage_l', sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # 9. Released Manifests & Trips
    op.create_table(
        'released_manifests',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('scenario', sa.String(length=32), nullable=False),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('published_at_str', sa.String(length=16), nullable=False),
        sa.Column('decision_maker', sa.String(length=128), nullable=False),
        sa.Column('shortfall_policy', sa.String(length=64), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('acknowledgement', sa.String(length=32), nullable=False),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('acknowledged_by', sa.String(length=128), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'released_trips',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('manifest_id', sa.Integer(), nullable=False),
        sa.Column('manifest_version', sa.Integer(), nullable=False),
        sa.Column('scenario', sa.String(length=32), nullable=False),
        sa.Column('vehicle_id', sa.String(length=32), nullable=False),
        sa.Column('trip_no', sa.Integer(), nullable=False),
        sa.Column('trip_id_str', sa.String(length=64), nullable=False),
        sa.Column('brand', sa.String(length=32), nullable=False),
        sa.Column('district', sa.String(length=64), nullable=False),
        sa.Column('depot', sa.String(length=64), nullable=False),
        sa.Column('planned_departure_time', sa.String(length=16), nullable=True),
        sa.Column('leave_by_time', sa.String(length=16), nullable=True),
        sa.Column('stop_outlet_ids', sa.JSON(), nullable=False),
        sa.Column('order_refs', sa.JSON(), nullable=False),
        sa.Column('loading_status', sa.String(length=32), nullable=False),
        sa.Column('otp_code', sa.String(length=16), nullable=True),
        sa.Column('otp_attempts', sa.Integer(), nullable=False),
        sa.Column('otp_unlocked', sa.Boolean(), nullable=False),
        sa.Column('otp_unlocked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('departed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['manifest_id'], ['released_manifests.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'order_loading_states',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('manifest_version', sa.Integer(), nullable=False),
        sa.Column('released_trip_id', sa.Integer(), nullable=False),
        sa.Column('order_ref', sa.String(length=64), nullable=False),
        sa.Column('planned_units', sa.Integer(), nullable=False),
        sa.Column('loaded_units', sa.Integer(), nullable=False),
        sa.Column('effective_units', sa.Integer(), nullable=False),
        sa.Column('is_loaded', sa.Boolean(), nullable=False),
        sa.Column('loaded_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['order_ref'], ['orders.order_ref'], ),
        sa.ForeignKeyConstraint(['released_trip_id'], ['released_trips.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # 10. Operations (Loading Issues, Driver Issues, Deliveries, Receipts)
    op.create_table(
        'loading_issues',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('manifest_version', sa.Integer(), nullable=False),
        sa.Column('vehicle_id', sa.String(length=32), nullable=False),
        sa.Column('trip_no', sa.Integer(), nullable=False),
        sa.Column('order_ref', sa.String(length=64), nullable=False),
        sa.Column('outlet_id', sa.String(length=32), nullable=False),
        sa.Column('issue_type', sa.String(length=32), nullable=False),
        sa.Column('units_affected', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('action_taken', sa.String(length=64), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('reported_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reported_by', sa.String(length=128), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_by', sa.String(length=128), nullable=True),
        sa.ForeignKeyConstraint(['order_ref'], ['orders.order_ref'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'driver_issues',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('trip_id', sa.String(length=64), nullable=False),
        sa.Column('vehicle_id', sa.String(length=32), nullable=False),
        sa.Column('stop_code', sa.String(length=32), nullable=True),
        sa.Column('order_ref', sa.String(length=64), nullable=True),
        sa.Column('outlet_name', sa.String(length=128), nullable=False),
        sa.Column('category_id', sa.String(length=64), nullable=False),
        sa.Column('category_label', sa.String(length=128), nullable=False),
        sa.Column('category_icon', sa.String(length=64), nullable=False),
        sa.Column('categories', sa.JSON(), nullable=True),
        sa.Column('related_scope', sa.String(length=64), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('photo_name', sa.String(length=128), nullable=True),
        sa.Column('photo_url', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('offline_created', sa.Boolean(), nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('synced_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('source_device_id', sa.String(length=64), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'delivery_records',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('manifest_version', sa.Integer(), nullable=True),
        sa.Column('trip_id', sa.String(length=64), nullable=True),
        sa.Column('vehicle_id', sa.String(length=32), nullable=False),
        sa.Column('stop_id', sa.String(length=32), nullable=False),
        sa.Column('stop_name', sa.String(length=128), nullable=False),
        sa.Column('outcome', sa.String(length=32), nullable=False),
        sa.Column('expected_qty', sa.Integer(), nullable=False),
        sa.Column('delivered_qty', sa.Integer(), nullable=False),
        sa.Column('discrepancy_type', sa.String(length=64), nullable=True),
        sa.Column('discrepancy_notes', sa.Text(), nullable=True),
        sa.Column('not_delivered_reason', sa.String(length=64), nullable=True),
        sa.Column('not_delivered_notes', sa.Text(), nullable=True),
        sa.Column('pod_photo_name', sa.String(length=128), nullable=True),
        sa.Column('pod_photo_url', sa.Text(), nullable=True),
        sa.Column('pod_signer_name', sa.String(length=128), nullable=True),
        sa.Column('pod_has_signature', sa.Boolean(), nullable=False),
        sa.Column('pod_signature_url', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('offline_created', sa.Boolean(), nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('synced_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('source_device_id', sa.String(length=64), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'receipt_records',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('order_ref', sa.String(length=64), nullable=False),
        sa.Column('outlet_id', sa.String(length=32), nullable=False),
        sa.Column('delivery_record_id', sa.String(length=64), nullable=True),
        sa.Column('confirmed_units', sa.Integer(), nullable=False),
        sa.Column('has_issue', sa.Boolean(), nullable=False),
        sa.Column('issue_type', sa.String(length=32), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('confirmed_by', sa.String(length=128), nullable=False),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['order_ref'], ['orders.order_ref'], ),
        sa.ForeignKeyConstraint(['outlet_id'], ['outlets.outlet_id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # 11. Memory, Notifications, Ledger, Offline Events
    op.create_table(
        'deferral_memory',
        sa.Column('outlet_id', sa.String(length=32), nullable=False),
        sa.Column('consecutive_skips', sa.Integer(), nullable=False),
        sa.Column('last_deferred_scenario', sa.String(length=32), nullable=True),
        sa.Column('last_reason_code', sa.String(length=64), nullable=True),
        sa.Column('last_reason_note', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('outlet_id')
    )

    op.create_table(
        'deferral_acknowledgements',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('outlet_id', sa.String(length=32), nullable=False),
        sa.Column('order_ref', sa.String(length=64), nullable=False),
        sa.Column('manifest_version', sa.Integer(), nullable=False),
        sa.Column('acknowledged_by', sa.String(length=128), nullable=False),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'notifications',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('target_role', sa.String(length=32), nullable=False),
        sa.Column('target_user', sa.String(length=128), nullable=True),
        sa.Column('target_outlet_id', sa.String(length=32), nullable=True),
        sa.Column('kind', sa.String(length=64), nullable=False),
        sa.Column('title', sa.String(length=128), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('link', sa.String(length=256), nullable=True),
        sa.Column('plan_version', sa.Integer(), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'ledger_entries',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('action', sa.String(length=64), nullable=False),
        sa.Column('actor', sa.String(length=128), nullable=False),
        sa.Column('order_ref', sa.String(length=64), nullable=True),
        sa.Column('outlet_id', sa.String(length=64), nullable=True),
        sa.Column('vehicle_id', sa.String(length=32), nullable=True),
        sa.Column('trip_no', sa.Integer(), nullable=True),
        sa.Column('reason_code', sa.String(length=64), nullable=True),
        sa.Column('reason_note', sa.Text(), nullable=True),
        sa.Column('previous_state', sa.Text(), nullable=True),
        sa.Column('updated_state', sa.Text(), nullable=True),
        sa.Column('plan_version', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'offline_processed_events',
        sa.Column('event_id', sa.String(length=64), nullable=False),
        sa.Column('event_type', sa.String(length=64), nullable=False),
        sa.Column('device_id', sa.String(length=64), nullable=True),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('synced_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('payload_json', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('event_id')
    )

def downgrade() -> None:
    op.drop_table('offline_processed_events')
    op.drop_table('ledger_entries')
    op.drop_table('notifications')
    op.drop_table('deferral_acknowledgements')
    op.drop_table('deferral_memory')
    op.drop_table('receipt_records')
    op.drop_table('delivery_records')
    op.drop_table('driver_issues')
    op.drop_table('loading_issues')
    op.drop_table('order_loading_states')
    op.drop_table('released_trips')
    op.drop_table('released_manifests')
    op.drop_table('draft_vehicle_fuel_inputs')
    op.drop_table('draft_trip_meta')
    op.drop_table('draft_stop_sequences')
    op.drop_table('draft_assignments')
    op.drop_table('draft_plans')
    op.drop_table('orders')
    op.drop_table('district_travel')
    op.drop_table('service_allowances')
    op.drop_table('scenario_fleet_entries')
    op.drop_table('vehicles')
    op.drop_table('outlets')
    op.drop_table('users')
