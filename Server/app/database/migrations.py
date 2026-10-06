"""Automatic schema column sync for PostgreSQL/SQLite to ensure newly added model columns exist."""

from sqlalchemy import text
from sqlalchemy.orm import Session

def sync_schema_columns(db: Session):
    """Ensure all expected columns in models exist in the database."""
    migrations = [
        # products table
        """
        CREATE TABLE IF NOT EXISTS products (
            id VARCHAR(64) PRIMARY KEY,
            sku VARCHAR(64) NOT NULL,
            name VARCHAR(128) NOT NULL,
            brand VARCHAR(32) NOT NULL,
            category VARCHAR(64) NOT NULL,
            temp VARCHAR(32) DEFAULT 'ambient' NOT NULL,
            is_chilled BOOLEAN DEFAULT FALSE NOT NULL,
            unit VARCHAR(32) DEFAULT 'units' NOT NULL,
            unit_weight FLOAT DEFAULT 5.0 NOT NULL,
            unit_vol FLOAT DEFAULT 0.01 NOT NULL,
            price FLOAT DEFAULT 1000.0 NOT NULL,
            stock_quantity INTEGER DEFAULT 500 NOT NULL,
            stock_status VARCHAR(32) DEFAULT 'in_stock' NOT NULL,
            image VARCHAR(512),
            description VARCHAR(256)
        );
        """,

        # draft_plans
        "ALTER TABLE draft_plans ADD COLUMN IF NOT EXISTS orders_closed_at TIMESTAMPTZ;",
        
        # orders
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS run_date DATE;",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS placed_by VARCHAR(128);",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS items_json JSON;",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();",
        
        # released_trips
        "ALTER TABLE released_trips ADD COLUMN IF NOT EXISTS driver_username VARCHAR(64);",
        "ALTER TABLE released_trips ADD COLUMN IF NOT EXISTS driver_name VARCHAR(128);",
        "ALTER TABLE released_trips ADD COLUMN IF NOT EXISTS otp_code VARCHAR(16);",
        "ALTER TABLE released_trips ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0;",
        "ALTER TABLE released_trips ADD COLUMN IF NOT EXISTS otp_unlocked BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE released_trips ADD COLUMN IF NOT EXISTS otp_unlocked_at TIMESTAMPTZ;",
        "ALTER TABLE released_trips ADD COLUMN IF NOT EXISTS departed_at TIMESTAMPTZ;",
        "ALTER TABLE released_trips ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;",

        # draft_trip_meta
        "ALTER TABLE draft_trip_meta ADD COLUMN IF NOT EXISTS driver_username VARCHAR(64);",
        "ALTER TABLE draft_trip_meta ADD COLUMN IF NOT EXISTS driver_name VARCHAR(128);",

        # released_manifests
        "ALTER TABLE released_manifests ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;",
        "ALTER TABLE released_manifests ADD COLUMN IF NOT EXISTS acknowledged_by VARCHAR(128);",
    ]

    for stmt in migrations:
        try:
            db.execute(text(stmt))
            db.commit()
        except Exception as e:
            db.rollback()
            # If SQLite or dialect doesn't support IF NOT EXISTS in this syntax, ignore
            pass
