from __future__ import annotations

import re
import time

from playwright.sync_api import Page, TimeoutError as PWTimeoutError, sync_playwright

from instagram_RSVP_send import (
    INSTAGRAM_PROFILE_DIR,
    build_name_variants,
    ensure_logged_in,
    go_back_to_home,
    search_and_open_profile,
)
from invite_send_common import (
    InvitePerson,
    iso_now,
    load_invite_people,
    mark_field,
    message_from_template,
    print_selected_people,
)
from whatsapp_invite_send import (
    COUNTED_FILTER,
    DRY_RUN,
    EMAIL_FILTER,
    GOOGLE_SHEETS_CREDENTIALS_PATH,
    HEADLESS,
    INVITE_MESSAGE_TEMPLATE,
    LAST_DELIVERY_STATUS_FILTER,
    MARK_LAST_DELIVERY_STATUS_SENT,
    MARK_SENT_INVITE_AT,
    SEND_LIMIT,
    SOURCE_FILTER,
    SPREADSHEET_NAME,
    TARGET_PEOPLE,
    WAIT_AFTER_EACH_FAIL_SEC,
    WAIT_AFTER_EACH_SEND_SEC,
    WORKSHEET_NAME,
)

# These are channel-specific tracking columns already present in the sheet.
MARK_INSTAGRAM_SENT = True


def click_profile_message_button(page: Page) -> bool:
    message_button = page.get_by_role("button", name=re.compile(r"^Message$", re.I)).first
    try:
        message_button.wait_for(state="visible", timeout=5_000)
        message_button.click()
        time.sleep(1.5)
        return True
    except PWTimeoutError:
        return False


def send_text_message(page: Page, message: str) -> bool:
    try:
        message_input = page.locator("div[aria-label='Message'][contenteditable='true']").first
        if message_input.count() == 0:
            message_input = page.locator("textarea[placeholder='Message...']").first
        if message_input.count() == 0:
            message_input = page.locator("div[role='textbox']").first

        message_input.wait_for(state="visible", timeout=15_000)
        message_input.click()
        time.sleep(0.2)
        message_input.fill(message)
        time.sleep(0.3)
        page.keyboard.press("Enter")
        time.sleep(1.0)
        return True
    except PWTimeoutError as exc:
        print(f"  Timeout while sending Instagram text: {exc}")
        return False


def send_invite_if_found(page: Page, person: InvitePerson) -> bool:
    for query in build_name_variants(person.first_name, person.last_name):
        print(f"  Searching Instagram for: {query}")
        try:
            found = search_and_open_profile(page, query)
            if not found:
                continue
            print("  Found profile; opening DM...")
            if not click_profile_message_button(page):
                print("  Message button not found.")
                go_back_to_home(page)
                return False
            ok = send_text_message(page, message_from_template(INVITE_MESSAGE_TEMPLATE, person))
            go_back_to_home(page)
            return ok
        except Exception as exc:
            print(f"  Failed while searching/sending: {exc}")
            try:
                go_back_to_home(page)
            except Exception:
                pass
            return False
    return False


def update_sheet_after_send(worksheet, table, person: InvitePerson) -> None:
    if MARK_INSTAGRAM_SENT:
        mark_field(worksheet, table, person.row_number, "sent_instagram_save_the_date", "TRUE")
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
        print("DRY_RUN is enabled; not opening Instagram or sending.")
        return

    sent: list[str] = []
    not_sent: list[str] = []

    with sync_playwright() as playwright:
        context = playwright.chromium.launch_persistent_context(
            user_data_dir=str(INSTAGRAM_PROFILE_DIR),
            headless=HEADLESS,
        )
        page = context.new_page()
        ensure_logged_in(page)
        time.sleep(3)

        for person in people:
            print(f"\nProcessing: {person.full_name}")
            ok = send_invite_if_found(page, person)

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
