import argparse
from pathlib import Path

from sqlalchemy import MetaData, Table, create_engine, func, inspect, select
from sqlalchemy.engine import URL

from app import models  # noqa: F401
from app.config import get_settings
from app.database import Base


def migrate_sqlite_database(source_path: Path, destination_url: str) -> dict[str, int]:
    if not source_path.is_file():
        raise FileNotFoundError(f"SQLite source database does not exist: {source_path}")
    if not destination_url.startswith(("mysql://", "mysql+")):
        raise ValueError("DATABASE_URL must point to a MySQL database.")

    source_engine = create_engine(URL.create("sqlite", database=str(source_path.resolve())))
    destination_engine = create_engine(destination_url, pool_pre_ping=True)
    try:
        Base.metadata.create_all(bind=destination_engine)

        with source_engine.connect() as source, destination_engine.begin() as destination:
            source_table_names = set(inspect(source).get_table_names())
            tables = Base.metadata.sorted_tables
            missing_tables = [table.name for table in tables if table.name not in source_table_names]
            if missing_tables:
                raise RuntimeError(
                    "SQLite source is missing LMS tables: " + ", ".join(missing_tables)
                )

            populated_tables = [
                table.name
                for table in tables
                if destination.execute(
                    select(func.count()).select_from(table)
                ).scalar_one()
            ]
            if populated_tables:
                raise RuntimeError(
                    "MySQL target tables must be empty; rows already exist in: "
                    + ", ".join(populated_tables)
                )

            migrated_rows: dict[str, int] = {}
            for table in tables:
                source_table = Table(table.name, MetaData(), autoload_with=source)
                rows = [
                    dict(row)
                    for row in source.execute(select(source_table)).mappings()
                ]
                if rows:
                    destination.execute(table.insert(), rows)
                migrated_rows[table.name] = len(rows)

        return migrated_rows
    finally:
        source_engine.dispose()
        destination_engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Copy the existing SQLite LMS database into MySQL."
    )
    parser.add_argument(
        "source",
        nargs="?",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "lms.db",
        help="SQLite database file (default: backend/lms.db)",
    )
    args = parser.parse_args()

    migrated_rows = migrate_sqlite_database(args.source, get_settings().database_url)
    print("SQLite data migration completed:")
    for table_name, row_count in migrated_rows.items():
        print(f"  {table_name}: {row_count} rows")


if __name__ == "__main__":
    main()
