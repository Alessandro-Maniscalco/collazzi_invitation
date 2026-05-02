from __future__ import annotations

import time
from pathlib import Path
from typing import Iterable, Optional

import gspread
from google.oauth2.service_account import Credentials
from playwright.sync_api import sync_playwright, Page, TimeoutError as PWTimeoutError


SCRIPT_DIR = Path(__file__).resolve().parent
INVITE_IMAGE_PATH = SCRIPT_DIR / "Invito.jpg"
INSTAGRAM_PROFILE_DIR = SCRIPT_DIR / "ig_profile"

WAIT_AFTER_EACH_SEND_SEC = 3.0
WAIT_AFTER_EACH_FAIL_SEC = 1.0

# Source filter: list of source names to include, or None/empty to send to all
#SOURCE_FILTER = ["Fresh girls", "Owls", "Penn girls", "Penn guys", "Sevenoaks", "Theos"] # CHANGE MESSAGE
SOURCE_FILTER = ["AleAI", "AlessandroDiana", "DidiAI", "Famiglia", "ModuloAI", "FirenzeAI", "18esimiAI"]

#INVITE_MESSAGE = "Hi! Could you please send me your email? I'll send you the invitation soon. Thank you!"
INVITE_MESSAGE = "Ciao! Mi invieresti la tua mail? Grazie!"

# Manual test people list (used when USE_GOOGLE_SHEET is False)
TEST_PEOPLE = [
    ("Bona", "Maniscalco"),
    ("Yuv", "Malik"),
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
COL_SENT_WHATSAPP = 8  # I: Sent whatsapp (checkbox)
COL_SENT = 9           # J: Sent Instagram invite (checkbox)

# Message to send with the invite



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
    """Navigate to Instagram and wait for login."""
    page.goto("https://www.instagram.com/")
    try:
        # Wait for the search icon to appear (indicates logged in state)
        page.wait_for_selector("svg[aria-label='Search']", timeout=600_000)
        time.sleep(3.0)
    except PWTimeoutError:
        raise RuntimeError("Login not detected. Keep the window open and log in, then rerun.")


def click_search_button(page: Page) -> None:
    """Click the Search button in the Instagram sidebar."""
    search_btn = page.locator("svg[aria-label='Search']").first
    search_btn.wait_for(state="visible", timeout=30_000)
    search_btn.click()
    time.sleep(0.8)


def get_search_input(page: Page):
    """Get the search input field that appears after clicking Search."""
    # Wait for search panel to open and find the input
    search_input = page.locator("input[aria-label='Search input']").first
    search_input.wait_for(state="visible", timeout=10_000)
    return search_input


def close_search_panel(page: Page) -> None:
    """Close the search panel by clicking elsewhere or pressing Escape."""
    page.keyboard.press("Escape")
    time.sleep(0.5)


def search_and_open_profile(page: Page, name_query: str) -> bool:
    """Search for a user and open their profile."""
    # Click search button
    click_search_button(page)
    time.sleep(0.5)
    
    # Get search input and type the name
    search_input = get_search_input(page)
    search_input.fill("")
    time.sleep(0.2)
    search_input.fill(name_query)
    time.sleep(2.0)  # Wait for search results to load
    
    # Try to click the first search result
    # Instagram search results appear in a dialog/dropdown
    try:
        # Look for the search results container and click the first result
        # The results are typically in links within the search panel
        first_result = page.locator("div[role='dialog'] a[role='link']").first
        if first_result.count() > 0:
            first_result.click()
            time.sleep(1.5)
            return True
        
        # Alternative selector for search results
        first_result_alt = page.locator("a[href^='/']").filter(has=page.locator("img")).first
        if first_result_alt.count() > 0:
            first_result_alt.click()
            time.sleep(1.5)
            return True
            
    except PWTimeoutError:
        pass
    
    # Close search panel if no result found
    close_search_panel(page)
    return False


def click_message_button(page: Page) -> bool:
    """Click the Message button on a user's profile."""
    try:
        # Look for the Message button on the profile
        message_btn = page.locator("div[role='button']:has-text('Message')").first
        message_btn.wait_for(state="visible", timeout=10_000)
        message_btn.click()
        time.sleep(1.5)
        return True
    except (PWTimeoutError, Exception) as e:
        # Message button not found - could be not following, private account, etc.
        return False


def send_image_with_message(page: Page, image_path: Path, message: str) -> bool:
    """Send an image with a message in the Instagram chat."""
    if not image_path.exists():
        raise FileNotFoundError(f"Invite image not found at: {image_path}")
    
    try:
        # Wait for the chat to load - look for the message input area
        # Instagram DM input can be identified by placeholder or aria-label
        message_input = page.locator("div[aria-label='Message'][contenteditable='true']").first
        
        # If not found, try alternative selectors
        if message_input.count() == 0:
            message_input = page.locator("textarea[placeholder='Message...']").first
        
        if message_input.count() == 0:
            message_input = page.locator("div[role='textbox']").first
            
        message_input.wait_for(state="visible", timeout=15_000)
        time.sleep(0.5)
        
        # First, send the image
        # Click the "Add photo or video" button (media button in chat)
        # This is typically an SVG with aria-label containing "photo" or "media"
        media_btn = page.locator("svg[aria-label='Add Photos or Videos']").first
        if media_btn.count() == 0:
            media_btn = page.locator("svg[aria-label='Add photo or video']").first
        if media_btn.count() == 0:
            # Try clicking the parent element
            media_btn = page.locator("div[role='button']:has(svg[aria-label*='hoto'])").first
        
        if media_btn.count() > 0:
            with page.expect_file_chooser() as fc_info:
                media_btn.click()
            file_chooser = fc_info.value
            file_chooser.set_files(str(image_path))
            time.sleep(1.0)
            
            # Wait for image preview and click send
            # The send button typically appears after selecting media
            send_btn = page.locator("button:has-text('Send')").first
            if send_btn.count() == 0:
                send_btn = page.locator("div[role='button']:has-text('Send')").first
            
            send_btn.wait_for(state="visible", timeout=10_000)
            send_btn.click()
        

        time.sleep(4)
        
        # Now send the text message
        message_input = page.locator("div[aria-label='Message'][contenteditable='true']").first
        if message_input.count() == 0:
            message_input = page.locator("textarea[placeholder='Message...']").first
        if message_input.count() == 0:
            message_input = page.locator("div[role='textbox']").first
            
        message_input.wait_for(state="visible", timeout=10_000)
        message_input.click()
        time.sleep(0.2)
        message_input.fill(message)
        time.sleep(0.3)
        
        # Press Enter to send the message or click send button
        page.keyboard.press("Enter")
        time.sleep(1.0)
        
        return True
        
    except PWTimeoutError as e:
        print(f"  → Timeout error in send_image_with_message: {e}")
        return False


def go_back_to_home(page: Page) -> None:
    """Navigate back to home/search state."""
    try:
        # Click Instagram logo to go home
        home_link = page.locator("a[href='/']").first
        if home_link.count() > 0:
            home_link.click()
            time.sleep(1.0)
        else:
            # Alternative: use keyboard shortcut or navigate directly
            page.goto("https://www.instagram.com/")
            time.sleep(2.0)
    except Exception as e:
        # If clicking home fails, try navigating directly
        try:
            page.goto("https://www.instagram.com/")
            time.sleep(2.0)
        except:
            pass


def send_invite_if_found(page: Page, first: str, last: str, image_path: Path) -> bool:
    """Search for a user, open their profile, send message with image."""
    for q in build_name_variants(first, last):
        print(f"  Searching for: {q}")
        try:
            found = search_and_open_profile(page, q)
            if found:
                print(f"  → Found profile, clicking Message...")
                if click_message_button(page):
                    print(f"  → Sending image and message...")
                    if send_image_with_message(page, image_path, INVITE_MESSAGE):
                        print(f"  → Message sent!")
                        go_back_to_home(page)
                        return True
                    else:
                        print(f"  → Failed to send message, skipping...")
                        go_back_to_home(page)
                        return False  # Don't try other name variants
                else:
                    print(f"  → Could not find Message button (might not be following), skipping person...")
                    go_back_to_home(page)
                    return False  # Don't try other name variants, skip to next person
        except Exception as e:
            print(f"  → Error occurred: {e}, skipping...")
            try:
                go_back_to_home(page)
            except:
                pass
            return False  # Don't try other name variants on error
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
    Read people from Google Sheet, optionally filtering by Source column (include if in list).
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
        if len(row) <= max(COL_LAST_NAME, COL_FIRST_NAME, COL_ALE, COL_SOURCE, COL_SENT_WHATSAPP, COL_SENT):
            continue
        
        last_name = row[COL_LAST_NAME].strip()
        first_name = row[COL_FIRST_NAME].strip()
        ale_checked = row[COL_ALE].strip().upper() == "TRUE" if len(row) > COL_ALE else False
        source = row[COL_SOURCE].strip() if len(row) > COL_SOURCE else ""
        sent_whatsapp = row[COL_SENT_WHATSAPP].strip().upper() == "TRUE" if len(row) > COL_SENT_WHATSAPP else False
        sent_instagram = row[COL_SENT].strip().upper() == "TRUE" if len(row) > COL_SENT else False
        
        # Skip if no name
        if not first_name and not last_name:
            continue
        
        # Skip if "Ale" column (D) is not checked
        if not ale_checked:
            continue
        
        # Skip if already sent on WhatsApp or Instagram
        if sent_whatsapp or sent_instagram:
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


def mark_as_sent(row_number: int) -> None:
    """Mark the 'Sent Instagram invite' checkbox as TRUE for a specific row."""
    worksheet = get_google_sheet()
    # Column J is index 10 in A1 notation (A=1, B=2, ..., J=10)
    cell = f"J{row_number}"
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
        print(f"Filtering by sources: {source_filter}")
    
    people = get_people_from_sheet(source_filter)
    
    if not people:
        print("No people found to send invites to (either all sent or none match filter).")
        return
    
    print(f"Found {len(people)} people to send invites to")
    
    print("\nStarting Instagram automation...")
    
    sent_list = []
    not_sent_list = []
    
    with sync_playwright() as pw:
        context = pw.chromium.launch_persistent_context(
            user_data_dir=str(INSTAGRAM_PROFILE_DIR),  # Separate profile for Instagram
            headless=False,
        )
        page = context.new_page()

        ensure_logged_in(page)

        time.sleep(10)

        for person in people:
            first = person["first_name"]
            last = person["last_name"]
            row = person["row_number"]
            full_name = f"{first} {last}".strip()
            
            print(f"\nProcessing: {full_name}")
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
                print(f"  → Not found or could not send: {full_name}")
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


def main(people: Iterable[tuple[str, str]]) -> None:
    """Original main function for manual list of people (without Google Sheets)."""
    sent_list = []
    not_sent_list = []
    
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(INSTAGRAM_PROFILE_DIR),
            headless=False,
        )
        page = context.new_page()

        ensure_logged_in(page)

        time.sleep(10)

        for first, last in people:
            full_name = f"{first} {last}".strip()
            print(f"\nProcessing: {full_name}")
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
