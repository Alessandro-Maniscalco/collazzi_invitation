from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Optional

from playwright.sync_api import Page, TimeoutError as PWTimeoutError, sync_playwright

from invite_send_common import (
    InvitePerson,
    iso_now,
    load_invite_people,
    mark_field,
    message_from_template,
    print_selected_people,
)
from whatsapp_RSVP_send import (
    WHATSAPP_PROFILE_DIR,
    build_name_variants,
    ensure_logged_in,
    open_chat_by_name,
)


# Filter constants. Use:
#   EMAIL_FILTER: "empty", "filled", or "any"
#   SOURCE_FILTER: [] for all sources, or a list like ["Zete", "Prova"]
#   COUNTED_FILTER: True, False, or None for any
#   LAST_DELIVERY_STATUS_FILTER: "empty", "sandbox", "queued", "sent",
#                                "delivered", "opened", "failed", or "any"
EMAIL_FILTER = "empty"
SOURCE_FILTER = ["Zete"]
COUNTED_FILTER: Optional[bool] = True
LAST_DELIVERY_STATUS_FILTER = "empty"

# Test target. Leave empty only when you are ready to batch send.
TARGET_PEOPLE = [("Maniscalco", "Alessandro")]
SEND_LIMIT = 1

INVITE_MESSAGE_TEMPLATE = (
    "Hi! Here is the formal invite, please rsvp by July 15th: {invite_url}"
)

GOOGLE_SHEETS_CREDENTIALS_PATH = Path.home() / "Downloads" / "collazzi-b908241311bf.json"
SPREADSHEET_NAME = "Collazzi"
WORKSHEET_NAME = "Lista"

DRY_RUN = os.environ.get("DRY_RUN", "0").strip().lower() in {"1", "true", "yes", "y"}
HEADLESS = False
WAIT_AFTER_EACH_SEND_SEC = 3.0
WAIT_AFTER_EACH_FAIL_SEC = 1.0

# These are channel-specific tracking columns already present in the sheet.
MARK_WHATSAPP_SENT = True
MARK_SENT_INVITE_AT = False
MARK_LAST_DELIVERY_STATUS_SENT = False


def send_text_message(page: Page, message: str) -> None:
    message_box = page.locator("div[aria-label='Type a message'][contenteditable='true']")
    message_box.click()
    time.sleep(0.2)
    message_box.fill(message)
    time.sleep(0.3)

    send_button = page.locator("button[aria-label='Send']").first
    if send_button.count() == 0:
        send_button = page.locator("div[role='button'][aria-label='Send']").first

    try:
        send_button.wait_for(state="visible", timeout=5_000)
        send_button.click()
    except PWTimeoutError:
        page.keyboard.press("Enter")
    time.sleep(1.0)


def send_invite_if_found(page: Page, person: InvitePerson) -> bool:
    for query in build_name_variants(person.first_name, person.last_name):
        print(f"  Searching WhatsApp for: {query}")
        if open_chat_by_name(page, query):
            send_text_message(
                page,
                message_from_template(INVITE_MESSAGE_TEMPLATE, person),
            )
            return True
    return False


def update_sheet_after_send(worksheet, table, person: InvitePerson) -> None:
    if MARK_WHATSAPP_SENT:
        mark_field(worksheet, table, person.row_number, "sent_whatsapp_save_the_date", "TRUE")
    if MARK_SENT_INVITE_AT:
        mark_field(worksheet, table, person.row_number, "sent_invite_at", iso_now())
    if MARK_LAST_DELIVERY_STATUS_SENT:
        mark_field(worksheet, table, person.row_number, "last_delivery_status", "sent")


def main() -> None:
    print(f"Reading people from Google Sheet '{SPREADSHEET_NAME}'...")
    worksheet, table, people = load_invite_people(
        credentials_path=GOOGLE_SHEETS_CREDENTIALS_PATH,
        spreadsheet_name=SPREADSHEET_NAME,
        worksheet_name=WORKSHEET_NAME,
        email_filter=EMAIL_FILTER,
        source_filter=SOURCE_FILTER,
        counted_filter=COUNTED_FILTER,
        last_delivery_status_filter=LAST_DELIVERY_STATUS_FILTER,
        target_people=TARGET_PEOPLE,
    )

    if SEND_LIMIT:
        people = people[:SEND_LIMIT]

    if not people:
        print("No matching people found.")
        return

    print(f"Selected {len(people)} people:")
    print_selected_people(people)

    if DRY_RUN:
        print("DRY_RUN is enabled; not opening WhatsApp or sending.")
        return

    sent: list[str] = []
    not_sent: list[str] = []

    with sync_playwright() as playwright:
        context = playwright.chromium.launch_persistent_context(
            user_data_dir=str(WHATSAPP_PROFILE_DIR),
            headless=HEADLESS,
        )
        page = context.new_page()
        ensure_logged_in(page)

        for person in people:
            print(f"\nProcessing: {person.full_name}")
            try:
                ok = send_invite_if_found(page, person)
            except Exception as exc:
                print(f"  Failed while sending: {exc}")
                ok = False

            if ok:
                sent.append(person.full_name)
                try:
                    update_sheet_after_send(worksheet, table, person)
                    print(f"  Updated sheet row {person.row_number}")
                except Exception as exc:
                    print(f"  Sent, but failed to update sheet: {exc}")
                time.sleep(WAIT_AFTER_EACH_SEND_SEC)
            else:
                not_sent.append(person.full_name)
                print("  Not sent")
                time.sleep(WAIT_AFTER_EACH_FAIL_SEC)

        time.sleep(3)
        context.close()

    print("\nSummary")
    print(f"Sent: {sent or ['none']}")
    print(f"Not sent: {not_sent or ['none']}")


if __name__ == "__main__":
    main()
