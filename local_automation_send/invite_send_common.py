from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Optional, Sequence

import gspread
from google.oauth2.service_account import Credentials


EMAIL_FILTERS = {"empty", "filled", "any"}
DELIVERY_STATUS_FILTERS = {
    "empty",
    "sandbox",
    "queued",
    "sent",
    "delivered",
    "opened",
    "failed",
    "any",
}

HEADER_ALIASES: dict[str, list[str]] = {
    "last_name": ["last name", "surname", "last"],
    "first_name": ["name", "first name", "first"],
    "email": ["email address", "mail"],
    "display_name": ["display name", "party label", "invite label", "invitation name"],
    "counted": ["invited", "invite", "count", "include", "active"],
    "source": ["sources"],
    "sent_whatsapp_save_the_date": [
        "sent whatsapp",
        "sent whatsapp save the date",
        "whatsapp save the date",
    ],
    "sent_instagram_save_the_date": [
        "sent instagram",
        "sent instagram save the date",
        "instagram save the date",
    ],
    "invite_url": ["invite link", "invitation link", "rsvp link"],
    "sent_invite_at": ["sent invite", "sent invitation", "invite sent"],
    "last_delivery_status": ["delivery status", "last delivery", "last_delivery"],
}


@dataclass(frozen=True)
class SheetTable:
    header_row_number: int
    data_start_row_number: int
    column_map: dict[str, int]


@dataclass(frozen=True)
class InvitePerson:
    row_number: int
    first_name: str
    last_name: str
    email: str
    display_name: str
    counted: bool
    source: str
    invite_url: str
    sent_whatsapp_save_the_date: bool
    sent_instagram_save_the_date: bool
    sent_invite_at: str
    last_delivery_status: str

    @property
    def full_name(self) -> str:
        return " ".join(part for part in [self.first_name, self.last_name] if part).strip()

    @property
    def effective_delivery_status(self) -> str:
        if self.last_delivery_status:
            return self.last_delivery_status
        if self.sent_invite_at:
            return "sent"
        return ""


def connect_worksheet(
    credentials_path: Path,
    spreadsheet_name: str,
    worksheet_name: Optional[str],
):
    if not credentials_path.exists():
        raise FileNotFoundError(f"Google Sheets credentials not found at: {credentials_path}")

    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ]
    creds = Credentials.from_service_account_file(str(credentials_path), scopes=scopes)
    client = gspread.authorize(creds)
    spreadsheet = client.open(spreadsheet_name)
    return spreadsheet.worksheet(worksheet_name) if worksheet_name else spreadsheet.sheet1


def load_invite_people(
    *,
    credentials_path: Path,
    spreadsheet_name: str,
    worksheet_name: Optional[str],
    email_filter: str,
    source_filter: Sequence[str],
    counted_filter: Optional[bool],
    last_delivery_status_filter: str,
    target_people: Sequence[tuple[str, str]],
) -> tuple[object, SheetTable, list[InvitePerson]]:
    email_filter = normalize_filter_value(email_filter)
    last_delivery_status_filter = normalize_filter_value(last_delivery_status_filter)

    if email_filter not in EMAIL_FILTERS:
        raise ValueError(f"EMAIL_FILTER must be one of {sorted(EMAIL_FILTERS)}")
    if last_delivery_status_filter not in DELIVERY_STATUS_FILTERS:
        raise ValueError(
            "LAST_DELIVERY_STATUS_FILTER must be one of "
            f"{sorted(DELIVERY_STATUS_FILTERS)}"
        )

    worksheet = connect_worksheet(credentials_path, spreadsheet_name, worksheet_name)
    values = worksheet.get_all_values()
    table = build_sheet_table(values)

    selected: list[InvitePerson] = []
    for offset, row in enumerate(values[table.data_start_row_number - 1 :]):
        row_number = table.data_start_row_number + offset
        person = person_from_row(row_number, row, table)
        if person is None:
            continue
        if matches_filters(
            person,
            email_filter=email_filter,
            source_filter=source_filter,
            counted_filter=counted_filter,
            last_delivery_status_filter=last_delivery_status_filter,
            target_people=target_people,
        ):
            selected.append(person)

    return worksheet, table, selected


def build_sheet_table(values: list[list[str]]) -> SheetTable:
    header_index = find_header_row(values)
    headers = values[header_index]
    column_map = build_column_map(headers)

    for required in ["last_name", "first_name", "counted", "source", "invite_url"]:
        if required not in column_map:
            raise RuntimeError(f"Could not find required column: {required}")

    return SheetTable(
        header_row_number=header_index + 1,
        data_start_row_number=header_index + 2,
        column_map=column_map,
    )


def find_header_row(values: list[list[str]]) -> int:
    for index, row in enumerate(values[:15]):
        column_map = build_column_map(row)
        if "last_name" in column_map and "first_name" in column_map:
            return index
    raise RuntimeError("Could not find the sheet header row with last_name and first_name.")


def build_column_map(headers: list[str]) -> dict[str, int]:
    alias_to_field: dict[str, str] = {}
    for field, aliases in HEADER_ALIASES.items():
        alias_to_field[normalize_header_name(field)] = field
        for alias in aliases:
            alias_to_field[normalize_header_name(alias)] = field

    column_map: dict[str, int] = {}
    for index, header in enumerate(headers):
        field = alias_to_field.get(normalize_header_name(header))
        if field and field not in column_map:
            column_map[field] = index
    return column_map


def person_from_row(row_number: int, row: list[str], table: SheetTable) -> Optional[InvitePerson]:
    first_name = cell(row, table, "first_name")
    last_name = cell(row, table, "last_name")
    email = cell(row, table, "email")
    display_name = cell(row, table, "display_name")
    invite_url = cell(row, table, "invite_url")

    if not any([first_name, last_name, email, display_name, invite_url]):
        return None

    return InvitePerson(
        row_number=row_number,
        first_name=first_name,
        last_name=last_name,
        email=email,
        display_name=display_name,
        counted=parse_counted(cell(row, table, "counted")),
        source=cell(row, table, "source"),
        invite_url=invite_url,
        sent_whatsapp_save_the_date=parse_sheet_boolean(
            cell(row, table, "sent_whatsapp_save_the_date")
        ),
        sent_instagram_save_the_date=parse_sheet_boolean(
            cell(row, table, "sent_instagram_save_the_date")
        ),
        sent_invite_at=cell(row, table, "sent_invite_at"),
        last_delivery_status=normalize_delivery_status(cell(row, table, "last_delivery_status")),
    )


def matches_filters(
    person: InvitePerson,
    *,
    email_filter: str,
    source_filter: Sequence[str],
    counted_filter: Optional[bool],
    last_delivery_status_filter: str,
    target_people: Sequence[tuple[str, str]],
) -> bool:
    if not person.invite_url:
        return False

    if target_people and not matches_target(person, target_people):
        return False

    has_email = bool(person.email.strip())
    if email_filter == "empty" and has_email:
        return False
    if email_filter == "filled" and not has_email:
        return False

    if counted_filter is not None and person.counted is not counted_filter:
        return False

    normalized_sources = {
        source.strip().lower() for source in source_filter if source and source.strip()
    }
    if normalized_sources and person.source.strip().lower() not in normalized_sources:
        return False

    effective_status = person.effective_delivery_status
    if last_delivery_status_filter == "empty" and effective_status:
        return False
    if (
        last_delivery_status_filter not in {"empty", "any"}
        and effective_status != last_delivery_status_filter
    ):
        return False

    return True


def matches_target(person: InvitePerson, target_people: Sequence[tuple[str, str]]) -> bool:
    person_last = person.last_name.strip().lower()
    person_first = person.first_name.strip().lower()
    for target_last, target_first in target_people:
        if person_last == target_last.strip().lower() and person_first == target_first.strip().lower():
            return True
    return False


def message_from_template(template: str, person: InvitePerson) -> str:
    first_name = person.first_name or person.display_name or "ciao"
    return template.format(
        first_name=first_name,
        last_name=person.last_name,
        full_name=person.full_name or person.display_name,
        display_name=person.display_name,
        invite_url=person.invite_url,
    )


def mark_field(worksheet, table: SheetTable, row_number: int, field: str, value: str) -> None:
    column_index = table.column_map.get(field)
    if column_index is None:
        raise RuntimeError(f"Could not find column to update: {field}")
    worksheet.update_acell(f"{a1_column(column_index + 1)}{row_number}", value)


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def cell(row: list[str], table: SheetTable, field: str) -> str:
    index = table.column_map.get(field)
    if index is None or index >= len(row):
        return ""
    return str(row[index] or "").strip()


def parse_sheet_boolean(value: str) -> bool:
    return str(value or "").strip().lower() in {"true", "yes", "y", "1", "x", "checked"}


def parse_counted(value: str) -> bool:
    cleaned = str(value or "").strip().lower()
    if not cleaned:
        return True
    return cleaned not in {"false", "no", "n", "0", "unchecked"}


def normalize_delivery_status(value: str) -> str:
    cleaned = normalize_filter_value(value)
    if cleaned in DELIVERY_STATUS_FILTERS - {"empty", "any"}:
        return cleaned
    return ""


def normalize_filter_value(value: str) -> str:
    return str(value or "").strip().lower()


def normalize_header_name(value: str) -> str:
    return (
        str(value or "")
        .strip()
        .lower()
        .replace("'", "")
        .replace(".", "")
    )


def a1_column(number: int) -> str:
    letters = ""
    while number:
        number, remainder = divmod(number - 1, 26)
        letters = chr(65 + remainder) + letters
    return letters


def print_selected_people(people: Iterable[InvitePerson]) -> None:
    for person in people:
        status = person.effective_delivery_status or "empty"
        email = "filled" if person.email else "empty"
        print(
            f"  row {person.row_number}: {person.full_name} "
            f"(source={person.source or 'empty'}, email={email}, "
            f"counted={person.counted}, delivery={status})"
        )
