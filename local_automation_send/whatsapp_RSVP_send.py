from __future__ import annotations

import re
import time
from pathlib import Path
from typing import Iterable, Optional

import gspread
from google.oauth2.service_account import Credentials
from playwright.sync_api import sync_playwright, Page, TimeoutError as PWTimeoutError


SCRIPT_DIR = Path(__file__).resolve().parent
INVITE_IMAGE_PATH = SCRIPT_DIR / "Invito.jpg"
WHATSAPP_PROFILE_DIR = SCRIPT_DIR / "wa_profile"

WAIT_AFTER_EACH_SEND_SEC = 3.0
WAIT_AFTER_EACH_FAIL_SEC = 1.0

# Source filter: set to a source name (e.g., "Zete") or None to send to all
SOURCE_FILTER = ["AleAI", "DidiAI", "ModuloAI", "FirenzeAI", "18esimiAI"] #CHANGE MESSAGE
#SOURCE_FILTER = ["Fresh girls", "Owls", "Penn girls", "Penn guys", "Sevenoaks", "Theos"]

# Manual test people list (used when USE_GOOGLE_SHEET is False)
TEST_PEOPLE = [
    ("Bona", ""),
    ("Michael", "Keane"),
]

# Set to True to read from Google Sheet, False to use TEST_PEOPLE
USE_GOOGLE_SHEET = True

# Google Sheets configuration
GOOGLE_SHEETS_CREDENTIALS_PATH = Path.home() / "Downloads" / "collazzi-b908241311bf.json"
SPREADSHEET_NAME = "Collazzi"  # Name of your Google Sheet
WORKSHEET_NAME = "Lista"  # Name of the worksheet/tab (or None for first sheet)

# Column indices (0-based) based on your sheet structure
COL_LAST_NAME = 0      # A: Last Name
COL_FIRST_NAME = 1     # B: Name (First Name)
COL_ALE = 3            # D: Ale (checkbox)
COL_SOURCE = 7         # H: Source
COL_SENT = 8           # I: Sent whatsapp (checkbox)
COL_SENT_INSTAGRAM = 9 # J: Sent Instagram invite (checkbox)


def build_name_variants(first: str, last: str) -> list[str]:
    first = (first or "").strip()
    last = (last or "").strip()

    variants = []
    if first and last:
        variants.append(f"{first} {last}")
        variants.append(f"{last} {first}")
    elif first:
        variants.append(first)
    elif last:
        variants.append(last)

    seen = set()
    out = []
    for v in variants:
        if v and v not in seen:
            out.append(v)
            seen.add(v)
    return out


def ensure_logged_in(page: Page) -> None:
    page.goto("https://web.whatsapp.com/", timeout=60_000)
    try:
        get_search_box(page, timeout=600_000)
        time.sleep(3.0)
    except PWTimeoutError:
        raise RuntimeError("Login not detected. Keep the window open and scan the QR code, then rerun.")


def get_search_box(page: Page, timeout: int = 30_000):
    """
    Return the left sidebar search box.

    WhatsApp has changed this element between a contenteditable div and a real
    textbox/input. Prefer search-specific locators so we do not accidentally
    grab a message composer when a chat is already open.
    """
    candidates = [
        page.locator("input[role='textbox'][data-tab='3']").first,
        page.locator("input[data-tab='3']").first,
        page.locator("input[aria-label*='Search' i]").first,
        page.locator("input[placeholder*='Search' i]").first,
        page.locator("textarea[aria-label*='Search' i]").first,
        page.locator("textarea[placeholder*='Search' i]").first,
        page.locator("div[role='textbox'][aria-label*='Search' i]").first,
        page.locator("div[role='textbox'][title*='Search' i]").first,
        page.locator("div[contenteditable='true'][aria-label*='Search' i]").first,
        page.locator("div[contenteditable='true'][title*='Search' i]").first,
        page.locator("div[contenteditable='true'][data-tab='3']").first,
        page.locator("div[contenteditable='true'][data-tab='2']").first,
        page.get_by_placeholder(re.compile(r"Search or start a new chat", re.I)),
        page.get_by_role("textbox", name=re.compile(r"Search or start a new chat", re.I)),
    ]

    deadline = time.monotonic() + (timeout / 1000)
    last_error: Optional[Exception] = None

    while time.monotonic() < deadline:
        for candidate in candidates:
            try:
                if candidate.count() > 0 and candidate.is_visible(timeout=500):
                    candidate.click()
                    return candidate
            except Exception as exc:
                last_error = exc
        time.sleep(0.2)

    raise PWTimeoutError(f"WhatsApp search box not found: {last_error}")


def open_chat_by_name(page: Page, name_query: str) -> bool:
    search = get_search_box(page)

    search.click()
    time.sleep(0.2)
    search.fill("")
    time.sleep(0.2)
    search.fill(name_query)
    time.sleep(1.0)

    """
    Chat results often render a span with title equal to the contact or group name.
    This can vary, so we check a couple selectors.
    """
    candidate = page.locator(f"span[title='{name_query}']").first
    if candidate.count() > 0:
        candidate.click()
        time.sleep(0.8)
        return True

    candidate2 = page.locator(f"div[role='listitem'] span[title='{name_query}']").first
    if candidate2.count() > 0:
        candidate2.click()
        time.sleep(0.8)
        return True

    return False


def attach_and_send_image(page: Page, image_path: Path) -> None:
    if not image_path.exists():
        raise FileNotFoundError(f"Invite image not found at: {image_path}")

    # Click the attach button (aria-label="Attach", icon is plus-rounded)
    page.locator("button[aria-label='Attach']").click()
    time.sleep(0.8)

    # Use file chooser to intercept the native dialog when clicking "Photos & videos"
    # This ensures the file goes through the correct input (not sticker)
    # WhatsApp Web changes structure frequently, so we use text-based selector
    photos_option = page.get_by_text("Photos & videos", exact=True)
    
    with page.expect_file_chooser() as fc_info:
        photos_option.click()
    file_chooser = fc_info.value
    file_chooser.set_files(str(image_path))
    
    time.sleep(0.5)

    # Wait for send button to appear (only shows after attachment)
    # Send is a div with role="button", not a button element
    page.wait_for_selector("div[role='button'][aria-label='Send']", timeout=30_000)
    time.sleep(0.4)

    # Toggle HD quality: click the "Photo quality" button, then select "HD quality"
    hd_settings_btn = page.locator("button[aria-label='Photo quality']")
    if hd_settings_btn.count() > 0:
        hd_settings_btn.click()
        time.sleep(0.3)
        # Select "HD quality" from the dropdown (use text-based selector for robustness)
        hd_option = page.get_by_text("HD quality", exact=True)
        hd_option.click()
        time.sleep(0.4)

    # Type the message in the text box before sending
    message_box = page.locator("div[aria-label='Type a message'][contenteditable='true']")
    message_box.click()
    time.sleep(0.2)
    message_box.fill("Ciao! Mi invieresti la tua mail? Grazie!")
    #message_box.fill("Hi! Could you please send me your email? I'll send you the invitation soon. Thank you!")
    time.sleep(0.3)

    page.locator("div[role='button'][aria-label='Send']").click()
    time.sleep(1.0)


def send_invite_if_found(page: Page, first: str, last: str, image_path: Path) -> bool:
    for q in build_name_variants(first, last):
        found = open_chat_by_name(page, q)
        if found:
            attach_and_send_image(page, image_path)
            return True
    return False


# ─────────────────────────────────────────────────────────────────────────────
# GOOGLE SHEETS FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────
def get_google_sheet():
    """Connect to Google Sheets and return the worksheet."""
    if not GOOGLE_SHEETS_CREDENTIALS_PATH.exists():
        raise FileNotFoundError(
            f"Google Sheets credentials not found at: {GOOGLE_SHEETS_CREDENTIALS_PATH}\n"
            "Please download your service account JSON from Google Cloud Console."
        )
    
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ]
    creds = Credentials.from_service_account_file(str(GOOGLE_SHEETS_CREDENTIALS_PATH), scopes=scopes)
    client = gspread.authorize(creds)
    
    spreadsheet = client.open(SPREADSHEET_NAME)
    if WORKSHEET_NAME:
        worksheet = spreadsheet.worksheet(WORKSHEET_NAME)
    else:
        worksheet = spreadsheet.sheet1
    
    return worksheet


def get_people_from_sheet(source_filter: Optional[list[str]] = None) -> list[dict]:
    """
    Read people from Google Sheet, optionally filtering by Source column.
    Returns list of dicts with row_number, first_name, last_name, already_sent.
    """
    worksheet = get_google_sheet()
    all_data = worksheet.get_all_values()
    
    # Skip header rows (row 1 has numbers, row 2 has "Table1", row 3 has column headers)
    # Data starts at row 4 (index 3)
    header_row_index = 2  # Row 3 (0-indexed) has the actual headers
    data_start_index = 3  # Row 4 (0-indexed) is where data starts
    
    people = []
    for i, row in enumerate(all_data[data_start_index:], start=data_start_index + 1):
        # Ensure row has enough columns
        if len(row) <= max(COL_LAST_NAME, COL_FIRST_NAME, COL_ALE, COL_SOURCE, COL_SENT, COL_SENT_INSTAGRAM):
            continue
        
        last_name = row[COL_LAST_NAME].strip()
        first_name = row[COL_FIRST_NAME].strip()
        ale_checked = row[COL_ALE].strip().upper() == "TRUE" if len(row) > COL_ALE else False
        source = row[COL_SOURCE].strip() if len(row) > COL_SOURCE else ""
        sent_whatsapp = row[COL_SENT].strip().upper() == "TRUE" if len(row) > COL_SENT else False
        sent_instagram = row[COL_SENT_INSTAGRAM].strip().upper() == "TRUE" if len(row) > COL_SENT_INSTAGRAM else False
        
        # Skip if no name
        if not first_name and not last_name:
            continue
        
        # Skip if "Ale" column (D) is not checked
        if not ale_checked:
            continue
        
        # Skip if already sent on WhatsApp or Instagram
        if sent_whatsapp or sent_instagram:
            continue
        
        # Filter by source if specified (check if source is in the list)
        if source_filter and source not in source_filter:
            continue
        
        people.append({
            "row_number": i,  # 1-based row number for Google Sheets
            "first_name": first_name,
            "last_name": last_name,
            "source": source,
        })
    
    return people


def mark_as_sent(row_number: int) -> None:
    """Mark the 'Sent whatsapp' checkbox as TRUE for a specific row."""
    worksheet = get_google_sheet()
    # Column I is index 9 in A1 notation (A=1, B=2, ..., I=9)
    cell = f"I{row_number}"
    worksheet.update_acell(cell, "TRUE")


def get_available_sources() -> list[str]:
    """Get list of unique sources from the sheet."""
    worksheet = get_google_sheet()
    all_data = worksheet.get_all_values()
    
    sources = set()
    for row in all_data[3:]:  # Skip header rows
        if len(row) > COL_SOURCE:
            source = row[COL_SOURCE].strip()
            if source:
                sources.add(source)
    
    return sorted(sources)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────
def main_with_sheet(source_filter: Optional[list[str]] = None) -> None:
    """Main function that reads from Google Sheet and updates it after sending."""
    print(f"Reading people from Google Sheet '{SPREADSHEET_NAME}'...")
    
    if source_filter:
        print(f"Filtering by sources: {', '.join(source_filter)}")
    
    people = get_people_from_sheet(source_filter)
    
    if not people:
        print("No people found to send invites to (either all sent or none match filter).")
        return
    
    print(f"Found {len(people)} people to send invites to")
    
    print("\nStarting WhatsApp automation...")
    
    sent_list = []
    not_sent_list = []
    
    with sync_playwright() as pw:
        context = pw.chromium.launch_persistent_context(
            user_data_dir=str(WHATSAPP_PROFILE_DIR),
            headless=False,
        )
        page = context.new_page()

        ensure_logged_in(page)

        for person in people:
            first = person["first_name"]
            last = person["last_name"]
            row = person["row_number"]
            full_name = f"{first} {last}".strip()
            
            ok = send_invite_if_found(page, first, last, INVITE_IMAGE_PATH)
            if ok:

                sent_list.append(full_name)
                # Mark as sent in Google Sheet
                try:
                    mark_as_sent(row)
                    print(f"  → Updated sheet (row {row})")
                except Exception as e:
                    print(f"  → Failed to update sheet: {e}")
                time.sleep(WAIT_AFTER_EACH_SEND_SEC)
            else:

                not_sent_list.append(full_name)
                time.sleep(WAIT_AFTER_EACH_FAIL_SEC)
        
        time.sleep(3)
        context.close()
    
    # Print summary
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    
    print(f"\n✓ SENT ({len(sent_list)}):")
    if sent_list:
        for name in sent_list:
            print(name)
    else:
        print("  (none)")
    
    print(f"\n✗ NOT SENT ({len(not_sent_list)}):")
    if not_sent_list:
        for name in not_sent_list:
            print(name)
    else:
        print("  (none)")
    
    print("\nDone!")


def main(people: Iterable[tuple[str, str]]) -> None:
    """Original main function for manual list of people (without Google Sheets)."""
    sent_list = []
    not_sent_list = []
    
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(WHATSAPP_PROFILE_DIR),
            headless=False,
        )
        page = context.new_page()

        ensure_logged_in(page)

        for first, last in people:
            full_name = f"{first} {last}".strip()
            ok = send_invite_if_found(page, first, last, INVITE_IMAGE_PATH)
            if ok:
                print(f"✓ Sent: {first} {last}")
                sent_list.append(full_name)
                time.sleep(WAIT_AFTER_EACH_SEND_SEC)
            else:
                print(f"✗ Not found: {first} {last}")
                not_sent_list.append(full_name)
                time.sleep(WAIT_AFTER_EACH_FAIL_SEC)
        time.sleep(3)
        context.close()
    
    # Print summary
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    
    print(f"\n✓ SENT ({len(sent_list)}):")
    if sent_list:
        for name in sent_list:
            print(f"  - {name}")
    else:
        print("  (none)")
    
    print(f"\n✗ NOT SENT ({len(not_sent_list)}):")
    if not_sent_list:
        for name in not_sent_list:
            print(f"  - {name}")
    else:
        print("  (none)")
    
    print("\nDone!")


if __name__ == "__main__":
    if USE_GOOGLE_SHEET:
        main_with_sheet(SOURCE_FILTER)
    else:
        main(TEST_PEOPLE)
