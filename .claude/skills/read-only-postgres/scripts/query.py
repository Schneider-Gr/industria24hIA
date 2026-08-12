#!/usr/bin/env python3
"""
Read-only PostgreSQL query executor.
Connects to configured databases and executes SELECT queries only.
"""

import json
import os
import re
import stat
import sys
import argparse
from pathlib import Path
from typing import Optional

try:
    import psycopg2
except ImportError:
    print("Error: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

# Constants
SCRIPT_DIR = Path(__file__).parent.parent
CONFIG_LOCATIONS = [
    SCRIPT_DIR / "connections.json",
    Path.home() / ".config" / "claude" / "read-only-postgres-connections.json",
]
MAX_ROWS = 10000
MAX_COLUMN_WIDTH = 100
QUERY_TIMEOUT_MS = 30000
CONNECTION_TIMEOUT_SEC = 10
NULL_DISPLAY = "<NULL>"
ALLOWED_PREFIXES = ("SELECT", "SHOW", "EXPLAIN", "WITH")
DISALLOWED_KEYWORDS = (
    "INSERT",
    "UPDATE",
    "DELETE",
    "MERGE",
    "UPSERT",
    "REPLACE",
    "ALTER",
    "CREATE",
    "DROP",
    "TRUNCATE",
    "GRANT",
    "REVOKE",
    "CALL",
    "DO",
    "EXECUTE",
    "COPY",
    "REFRESH",
    "CLUSTER",
    "VACUUM",
    "ANALYZE",
    "REINDEX",
    "CHECKPOINT",
    "LOCK",
    "LISTEN",
    "NOTIFY",
    "UNLISTEN",
    "SECURITY",
    "RESET",
    "SET",
    "BEGIN",
    "COMMIT",
    "ROLLBACK",
    "SAVEPOINT",
    "RELEASE",
    "TRANSACTION",
    "INTO",
)
DISALLOWED_FUNCTIONS = (
    "nextval",
    "setval",
)
DISALLOWED_KEYWORDS_RE = re.compile(
    r"\b(" + "|".join(DISALLOWED_KEYWORDS) + r")\b", re.IGNORECASE
)
DISALLOWED_FUNCTIONS_RE = re.compile(
    r"\b(" + "|".join(DISALLOWED_FUNCTIONS) + r")\s*\(", re.IGNORECASE
)


def strip_literals_and_comments(query: str) -> str:
    """Strip SQL literals and comments to avoid false keyword matches."""
    result = []
    i = 0
    in_single = False
    in_double = False
    in_line_comment = False
    in_block_comment = False
    dollar_tag = None

    while i < len(query):
        ch = query[i]

        if in_line_comment:
            if ch == "\n":
                in_line_comment = False
                result.append(" ")
            i += 1
            continue

        if in_block_comment:
            if ch == "*" and i + 1 < len(query) and query[i + 1] == "/":
                in_block_comment = False
                i += 2
                result.append(" ")
            else:
                i += 1
            continue

        if dollar_tag:
            if query.startswith(dollar_tag, i):
                dollar_tag = None
                i += len(dollar_tag)
                result.append(" ")
            else:
                i += 1
            continue

        if in_single:
            if ch == "'":
                if i + 1 < len(query) and query[i + 1] == "'":
                    i += 2
                else:
                    in_single = False
                    i += 1
                    result.append(" ")
            else:
                i += 1
            continue

        if in_double:
            if ch == '"':
                if i + 1 < len(query) and query[i + 1] == '"':
                    i += 2
                else:
                    in_double = False
                    i += 1
                    result.append(" ")
            else:
                i += 1
            continue

        if ch == "-" and i + 1 < len(query) and query[i + 1] == "-":
            in_line_comment = True
            i += 2
            continue

        if ch == "/" and i + 1 < len(query) and query[i + 1] == "*":
            in_block_comment = True
            i += 2
            continue

        if ch == "'":
            in_single = True
            i += 1
            continue

        if ch == '"':
            in_double = True
            i += 1
            continue

        if ch == "$":
            end = query.find("$", i + 1)
            if end != -1:
                tag = query[i : end + 1]
                if re.fullmatch(r"\$[A-Za-z0-9_]*\$", tag):
                    dollar_tag = tag
                    i += len(tag)
                    continue
            result.append(ch)
            i += 1
            continue

        result.append(ch)
        i += 1

    return "".join(result)


def is_read_only(query: str) -> bool:
    """Conservative client-side check for read-only queries."""
    stripped = strip_literals_and_comments(query)
    stripped_upper = stripped.upper().strip()
    if not any(stripped_upper.startswith(cmd) for cmd in ALLOWED_PREFIXES):
        return False
    if DISALLOWED_KEYWORDS_RE.search(stripped):
        return False
    if DISALLOWED_FUNCTIONS_RE.search(stripped):
        return False
    return True


def validate_single_statement(query: str) -> bool:
    """Check query contains only one statement."""
    # Remove trailing semicolon and whitespace, then check for remaining semicolons
    clean = query.rstrip().rstrip(';')
    return ';' not in clean


def mask_value(value: str) -> str:
    """Mask middle characters of a string, keeping first and last visible.

    Examples:
        'john@email.com' -> 'j************om'
        'abc'            -> 'a*c'
        'ab'             -> 'ab'  (too short to mask)
        'a'              -> 'a'   (too short to mask)
    """
    if len(value) <= 2:
        return value
    return value[0] + "*" * (len(value) - 2) + value[-1]


def build_pii_columns(db_config: dict) -> dict[str, set[str]]:
    """Build a lookup of {table_name: {col1, col2, ...}} from pii_masking config.

    Column names are lowercased for case-insensitive matching.
    """
    masking = db_config.get("pii_masking", {})
    return {
        table.lower(): {col.lower() for col in cols}
        for table, cols in masking.items()
    }


def detect_tables_from_query(query: str) -> list[str]:
    """Extract all table names from a query (FROM, JOIN, and comma-joins).

    Handles: FROM table, FROM schema.table, FROM "table",
             JOIN table, LEFT JOIN table, INNER JOIN table, etc.
    Returns list of lowercase table names (may be empty).
    """
    # Match FROM/JOIN <table> (handles optional schema prefix and quoting)
    table_pattern = re.compile(
        r'(?:\bFROM\b|\bJOIN\b)\s+(?:"?(\w+)"?\.)?"?(\w+)"?',
        re.IGNORECASE,
    )
    tables = []
    for match in table_pattern.finditer(query):
        tables.append(match.group(2).lower())
    return tables


def validate_config_permissions(path: Path) -> None:
    """Warn if config file has insecure permissions (Unix only)."""
    if os.name != 'nt':  # Skip on Windows
        mode = path.stat().st_mode
        if bool(mode & stat.S_IRWXG) or bool(mode & stat.S_IRWXO):
            print(f"WARNING: {path} has insecure permissions!")
            print(f"Config contains credentials. Run: chmod 600 {path}")


def validate_db_config(db: dict) -> None:
    """Validate required fields exist in database config."""
    required = ['name', 'host', 'database', 'user', 'password']
    missing = [f for f in required if f not in db]
    if missing:
        print(f"Error: Database config missing fields: {', '.join(missing)}")
        sys.exit(1)


def find_config() -> Optional[Path]:
    """Find config file in supported locations."""
    for path in CONFIG_LOCATIONS:
        if path.exists():
            return path
    return None


def load_config(config_path: Optional[Path] = None) -> dict:
    """Load database connections from JSON config."""
    path = config_path or find_config()
    if not path:
        print("Config not found. Searched:")
        for loc in CONFIG_LOCATIONS:
            print(f"  - {loc}")
        print("\nCreate connections.json with format:")
        print(json.dumps({
            "databases": [{
                "name": "mydb",
                "description": "Description of database contents",
                "host": "localhost",
                "port": 5432,
                "database": "mydb",
                "user": "user",
                "password": "password",
                "sslmode": "prefer"
            }]
        }, indent=2))
        sys.exit(1)

    validate_config_permissions(path)

    with open(path) as f:
        return json.load(f)


def list_databases(config: dict) -> None:
    """List all configured databases."""
    print("Configured databases:\n")
    for db in config.get("databases", []):
        validate_db_config(db)
        print(f"  [{db['name']}]")
        print(f"    Host: {db['host']}:{db.get('port', 5432)}")
        print(f"    Database: {db['database']}")
        print(f"    Description: {db.get('description', 'No description')}")
        print()


def execute_query(db_config: dict, query: str, limit: Optional[int] = None) -> None:
    """Execute a read-only query against the specified database."""
    if not is_read_only(query):
        print(
            "Error: Only read-only queries (SELECT, SHOW, EXPLAIN, WITH) are allowed. "
            "Data-modifying keywords are blocked."
        )
        sys.exit(1)

    if not validate_single_statement(query):
        print("Error: Multiple statements not allowed. Execute queries separately.")
        sys.exit(1)

    # Apply limit using regex to avoid false positives from string content
    if limit and not re.search(r'\bLIMIT\s+\d+', query, re.IGNORECASE):
        query = f"{query.rstrip(';')} LIMIT {limit}"

    conn = None
    try:
        conn = psycopg2.connect(
            host=db_config['host'],
            port=db_config.get('port', 5432),
            database=db_config['database'],
            user=db_config['user'],
            password=db_config['password'],
            sslmode=db_config.get('sslmode', 'prefer'),
            connect_timeout=CONNECTION_TIMEOUT_SEC,
            options=f'-c statement_timeout={QUERY_TIMEOUT_MS}'
        )
        # Primary safety: readonly session prevents any write operations
        conn.set_session(readonly=True, autocommit=True)

        # Determine which columns need PII masking (merge from all tables in query)
        pii_columns = build_pii_columns(db_config)
        query_tables = detect_tables_from_query(query)
        masked_table_cols: set[str] = set()
        for tbl in query_tables:
            masked_table_cols |= pii_columns.get(tbl, set())

        with conn.cursor() as cur:
            cur.execute(query)
            if cur.description:
                columns = [desc[0] for desc in cur.description]
                rows = cur.fetchmany(MAX_ROWS)
                truncated = len(rows) == MAX_ROWS

                # Build set of column indices that need masking
                mask_indices = set()
                for i, col in enumerate(columns):
                    if col.lower() in masked_table_cols:
                        mask_indices.add(i)

                def format_cell(val, col_index: int) -> str:
                    if val is None:
                        return NULL_DISPLAY
                    val_str = str(val)
                    if col_index in mask_indices:
                        val_str = mask_value(val_str)
                    return val_str

                # Calculate column widths with cap
                widths = [min(len(col), MAX_COLUMN_WIDTH) for col in columns]
                for row in rows:
                    for i, val in enumerate(row):
                        val_str = format_cell(val, i)
                        widths[i] = min(max(widths[i], len(val_str)), MAX_COLUMN_WIDTH)

                # Print header
                header = " | ".join(col[:MAX_COLUMN_WIDTH].ljust(widths[i]) for i, col in enumerate(columns))
                print(header)
                print("-" * len(header))

                # Print rows
                for row in rows:
                    cells = []
                    for i, val in enumerate(row):
                        val_str = format_cell(val, i)
                        if len(val_str) > MAX_COLUMN_WIDTH:
                            val_str = val_str[:MAX_COLUMN_WIDTH-3] + "..."
                        cells.append(val_str.ljust(widths[i]))
                    print(" | ".join(cells))

                msg = f"\n({len(rows)} rows)"
                if truncated:
                    msg += f" [truncated at {MAX_ROWS}]"
                if mask_indices:
                    masked_names = [columns[i] for i in sorted(mask_indices)]
                    msg += f" [PII masked: {', '.join(masked_names)}]"
                print(msg)
            else:
                print("Query executed (no result set returned)")

    except psycopg2.Error as e:
        error_msg = str(e)
        # Sanitize to avoid leaking credentials
        if 'password' in error_msg.lower() or 'authentication' in error_msg.lower():
            error_msg = "Authentication failed. Check credentials in connections.json"
        print(f"Database error: {error_msg}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()


def find_database(config: dict, name: str) -> dict:
    """Find database config by name (case-insensitive)."""
    for db in config.get("databases", []):
        if db.get('name', '').lower() == name.lower():
            validate_db_config(db)
            return db
    available = [db.get('name', 'unnamed') for db in config.get("databases", [])]
    print(f"Database '{name}' not found.")
    print(f"Available: {', '.join(available)}")
    sys.exit(1)


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Execute read-only PostgreSQL queries",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --list
  %(prog)s --db mydb --tables
  %(prog)s --db mydb --query "SELECT * FROM users" --limit 100
        """
    )
    parser.add_argument("--config", "-c", type=Path, help="Path to config JSON")
    parser.add_argument("--db", "-d", help="Database name to query")
    parser.add_argument("--query", "-q", help="SQL query to execute")
    parser.add_argument("--limit", "-l", type=int, help="Limit rows returned")
    parser.add_argument("--list", action="store_true", help="List configured databases")
    parser.add_argument("--schema", "-s", action="store_true", help="Show database schema")
    parser.add_argument("--tables", "-t", action="store_true", help="List tables")

    args = parser.parse_args()
    config = load_config(args.config)

    if args.list:
        list_databases(config)
        return

    if not args.db:
        print("Error: --db required. Use --list to see available databases.")
        sys.exit(1)

    db_config = find_database(config, args.db)

    if args.tables:
        query = """
            SELECT table_schema, table_name, table_type
            FROM information_schema.tables
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
            ORDER BY table_schema, table_name
        """
        execute_query(db_config, query, args.limit)
    elif args.schema:
        query = """
            SELECT c.table_schema, c.table_name, c.column_name, c.data_type, c.is_nullable
            FROM information_schema.columns c
            JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
            WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema')
            ORDER BY c.table_schema, c.table_name, c.ordinal_position
        """
        execute_query(db_config, query, args.limit)
    elif args.query:
        execute_query(db_config, args.query, args.limit)
    else:
        print("Error: --query, --tables, or --schema required")
        sys.exit(1)


if __name__ == "__main__":
    main()
