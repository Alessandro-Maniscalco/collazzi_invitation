from __future__ import annotations

import re
import time
from pathlib import Path
from typing import Optional

import gspread
from google.oauth2.service_account import Credentials
from playwright.sync_api import sync_playwright, Page, TimeoutError as PWTimeoutError


# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent
WHATSAPP_PROFILE_DIR = SCRIPT_DIR / "wa_profile"

# Source filter: list of source names to include, or None/empty to check all
SOURCE_FILTER = ["Fresh girls", "Owls", "Penn girls", "Penn guys", "Sevenoaks", "Theos", "18esimiAI", "AleAI", "DidiAI", "FirenzeAI"]

# Google Sheets configuration
GOOGLE_SHEETS_CREDENTIALS_PATH = Path.home() / "Downloads" / "collazzi-b908241311bf.json"
SPREADSHEET_NAME = "Collazzi"
WORKSHEET_NAME = "Lista"

# Column indices (0-based) based on your sheet structure
COL_LAST_NAME = 0      # A: Last Name
COL_FIRST_NAME = 1     # B: Name (First Name)
COL_EMAIL = 2          # C: Email
COL_ALE = 3            # D: Ale (checkbox)
COL_SOURCE = 7         # H: Source
COL_SENT = 8           # I: Sent save the date (checkbox)

# Data starts at row 4 (index 3) - skip header rows
DATA_START_INDEX = 3

# Email regex pattern
EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')


# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────
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


# ─────────────────────────────────────────────────────────────────────────────
# WHATSAPP FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────
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


def find_email_in_chat(page: Page) -> Optional[str]:
    """
    Look for email addresses in the visible chat messages.
    Returns the first email found, or None if no email is found.
    """
    time.sleep(0.5)
    
    # Get all message elements - WhatsApp uses various selectors for messages
    # Try to get the text content of the chat area
    chat_container = page.locator("div[data-tab='8']").first
    if chat_container.count() == 0:
        # Fallback: try to find the main chat content area
        chat_container = page.locator("div.copyable-text").first
    
    # Get all text spans that might contain messages
    message_spans = page.locator("span.selectable-text").all()
    
    all_text = ""
    for span in message_spans:
        try:
            text = span.inner_text(timeout=1000)
            all_text += " " + text
        except:
            pass
    
    # Also try to get text from copyable-text divs
    copyable_divs = page.locator("div.copyable-text").all()
    for div in copyable_divs:
        try:
            text = div.inner_text(timeout=1000)
            all_text += " " + text
        except:
            pass
    
    # Search for email in the collected text
    emails = EMAIL_PATTERN.findall(all_text)
    
    if emails:
        # Filter out common false positives
        valid_emails = []
        for email in emails:
            email_lower = email.lower()
            # Skip if it looks like a WhatsApp system email or placeholder
            if "whatsapp" not in email_lower and "example" not in email_lower:
                valid_emails.append(email)
        
        if valid_emails:
            # Return the most recently found (likely the reply)
            return valid_emails[-1]
    
    return None


def find_email_for_person(page: Page, first: str, last: str) -> Optional[str]:
    """Try to open the chat and find an email address."""
    for q in build_name_variants(first, last):
        found = open_chat_by_name(page, q)
        if found:
            email = find_email_in_chat(page)
            return email
    return None


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


def get_people_needing_email(source_filter: Optional[list[str]] = None) -> list[dict]:
    """
    Read people from Google Sheet where:
    - Save the date was sent (column I = TRUE)
    - Email is empty (column C is empty)
    - Source (column H) is in source_filter if specified
    """
    worksheet = get_google_sheet()
    all_data = worksheet.get_all_values()
    
    people = []
    for i, row in enumerate(all_data[DATA_START_INDEX:], start=DATA_START_INDEX + 1):
        # Ensure row has enough columns
        if len(row) <= max(COL_LAST_NAME, COL_FIRST_NAME, COL_EMAIL, COL_ALE, COL_SOURCE, COL_SENT):
            continue
        
        last_name = row[COL_LAST_NAME].strip()
        first_name = row[COL_FIRST_NAME].strip()
        email = row[COL_EMAIL].strip() if len(row) > COL_EMAIL else ""
        ale_checked = row[COL_ALE].strip().upper() == "TRUE" if len(row) > COL_ALE else False
        source = row[COL_SOURCE].strip() if len(row) > COL_SOURCE else ""
        sent = row[COL_SENT].strip().upper() == "TRUE" if len(row) > COL_SENT else False
        
        # Skip if no name
        if not first_name and not last_name:
            continue
        
        # Skip if "Ale" column (D) is not checked
        if not ale_checked:
            continue
        
        # Skip if save the date was NOT sent
        if not sent:
            continue
        
        # Skip if email already exists
        if email:
            continue
        
        # Filter by source if specified
        if source_filter and source not in source_filter:
            continue
        
        people.append({
            "row_number": i,  # 1-based row number for Google Sheets
            "first_name": first_name,
            "last_name": last_name,
            "source": source,
        })
    
    return people


def update_email(row_number: int, email: str) -> None:
    """Update the email column (C) for a specific row."""
    worksheet = get_google_sheet()
    cell = f"C{row_number}"
    worksheet.update_acell(cell, email)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN FUNCTION
# ─────────────────────────────────────────────────────────────────────────────
def main(source_filter: Optional[list[str]] = None) -> None:
    """Main function that finds emails in WhatsApp chats and updates the sheet."""
    print(f"Reading people from Google Sheet '{SPREADSHEET_NAME}'...")
    print("Looking for: sent=TRUE, email=empty")
    
    if source_filter:
        print(f"Filtering by sources: {source_filter}")
    
    people = get_people_needing_email(source_filter)
    
    if not people:
        print("No people found needing email (either all have emails or none match filter).")
        return
    
    print(f"Found {len(people)} people needing email:")
    for p in people:
        print(f"  - {p['first_name']} {p['last_name']} (Source: {p['source']})")
    
    print("\nStarting WhatsApp email finder...")
    
    found_list = []
    not_found_list = []
    chat_not_found_list = []
    
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
            
            print(f"\nChecking: {full_name}...")
            
            email = find_email_for_person(page, first, last)
            
            if email:
                print(f"  ✓ Found email: {email}")
                found_list.append((full_name, email))
                # Update the sheet
                try:
                    update_email(row, email)
                    print(f"  → Updated sheet (row {row})")
                except Exception as e:
                    print(f"  → Failed to update sheet: {e}")
            elif email is None:
                # Chat was found but no email in messages
                print(f"  ✗ No email found in chat")
                not_found_list.append(full_name)
            else:
                # Chat was not found
                print(f"  ✗ Chat not found")
                chat_not_found_list.append(full_name)
            
            time.sleep(1.0)
        
        time.sleep(2)
        context.close()
    
    # Print summary
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    
    print(f"\n✓ EMAILS FOUND ({len(found_list)}):")
    if found_list:
        for name, email in found_list:
            print(f"  - {name}: {email}")
    else:
        print("  (none)")
    
    print(f"\n✗ NO EMAIL IN CHAT ({len(not_found_list)}):")
    if not_found_list:
        for name in not_found_list:
            print(f"  - {name}")
    else:
        print("  (none)")
    
    if chat_not_found_list:
        print(f"\n⚠ CHAT NOT FOUND ({len(chat_not_found_list)}):")
        for name in chat_not_found_list:
            print(f"  - {name}")
    
    print("\nDone!")


if __name__ == "__main__":
    main(SOURCE_FILTER)
