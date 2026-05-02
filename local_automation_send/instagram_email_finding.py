from __future__ import annotations

import os
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
INSTAGRAM_PROFILE_DIR = SCRIPT_DIR / "ig_profile"

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
COL_SENT_WHATSAPP = 8  # I: Sent whatsapp (checkbox)
COL_SENT_INSTAGRAM = 9 # J: Sent Instagram invite (checkbox)

# Data starts at row 4 (index 3) - skip header rows
DATA_START_INDEX = 3

# Set IG_EMAIL_DRY_RUN=1 to find emails without writing them to Google Sheets.
DRY_RUN = os.environ.get("IG_EMAIL_DRY_RUN", "").lower() in {"1", "true", "yes"}

# Email regex pattern. The local-part shape avoids swallowing preceding UI text
# like "Message..." before the actual address.
EMAIL_PATTERN = re.compile(
    r'\b[a-zA-Z0-9_%+-]+(?:\.[a-zA-Z0-9_%+-]+)*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b'
)
ZERO_WIDTH_PATTERN = re.compile(r'[\u200b\u200c\u200d\ufeff]')


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
# INSTAGRAM FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────
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
    search_input = page.locator("input[aria-label='Search input']").first
    search_input.wait_for(state="visible", timeout=10_000)
    return search_input


def close_search_panel(page: Page) -> None:
    """Close the search panel by pressing Escape."""
    page.keyboard.press("Escape")
    time.sleep(0.5)


def search_and_open_profile(page: Page, name_query: str) -> bool:
    """Search for a user and open their profile."""
    click_search_button(page)
    time.sleep(0.5)
    
    search_input = get_search_input(page)
    search_input.fill("")
    time.sleep(0.2)
    search_input.fill(name_query)
    time.sleep(2.0)  # Wait for search results to load
    
    try:
        # Look for the search results and click the first result
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
    
    close_search_panel(page)
    return False


def click_message_button(page: Page) -> bool:
    """Click the Message button on a user's profile."""
    try:
        message_btn = page.locator("div[role='button']:has-text('Message')").first
        message_btn.wait_for(state="visible", timeout=10_000)
        message_btn.click()
        time.sleep(1.5)
        return True
    except (PWTimeoutError, Exception):
        return False


def normalize_text_for_email_search(text: str) -> str:
    """Normalize text that Instagram may split or decorate in the DOM."""
    text = ZERO_WIDTH_PATTERN.sub("", text or "")
    text = text.replace("\xa0", " ")
    text = re.sub(r'\s*@\s*', '@', text)
    text = re.sub(r'\s*\.\s*', '.', text)
    return text


def valid_emails_from_text(text: str) -> list[str]:
    """Return non-system email addresses from a text blob."""
    emails = EMAIL_PATTERN.findall(normalize_text_for_email_search(text))
    valid_emails = []
    for email in emails:
        email = email.strip(".,;:()[]{}<>\"'")
        email_lower = email.lower()
        if (
            "instagram" not in email_lower
            and "example" not in email_lower
            and "facebook" not in email_lower
            and email not in valid_emails
        ):
            valid_emails.append(email)
    return valid_emails


def collect_chat_text(page: Page, include_body: bool = False) -> str:
    """Collect visible/accessibility/DOM text from the current Instagram DM page."""
    text_parts: list[str] = []

    selectors = [
        "div[aria-label='Conversation']",
        "div[aria-label='Messages']",
        "div[role='main']",
        "main",
        "section main",
        "div[role='grid']",
        "div[role='row']",
        "div[dir='auto']",
        "span",
        "a[href^='mailto:']",
        "a[href*='@']",
    ]
    if include_body:
        selectors.append("body")

    try:
        text_parts.extend(page.evaluate(
            """
            (selectors) => {
                const out = [];
                for (const selector of selectors) {
                    for (const el of document.querySelectorAll(selector)) {
                        const text = el.innerText || el.textContent || "";
                        if (text) out.push(text);
                        for (const attr of ["aria-label", "title", "href"]) {
                            const value = el.getAttribute(attr) || "";
                            if (value) out.push(value.replace(/^mailto:/, " "));
                        }
                    }
                }

                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                while (walker.nextNode()) {
                    const text = walker.currentNode.nodeValue || "";
                    if (text.includes("@")) out.push(text);
                }
                for (const el of document.querySelectorAll("[aria-label], [title], [href]")) {
                    for (const attr of ["aria-label", "title", "href"]) {
                        const value = el.getAttribute(attr) || "";
                        if (value.includes("@")) out.push(value);
                    }
                }
                return out;
            }
            """,
            selectors,
        ))
    except Exception:
        for selector in selectors:
            try:
                locator = page.locator(selector)
                count = min(locator.count(), 40)
            except Exception:
                continue

            for i in range(count):
                try:
                    text = locator.nth(i).inner_text(timeout=250)
                    if text:
                        text_parts.append(text)
                except Exception:
                    pass

    return "\n".join(text_parts)


def scroll_chat_messages(page: Page) -> None:
    """Nudge the DM message area so lazily rendered text has a chance to appear."""
    for selector in [
        "div[aria-label='Conversation']",
        "div[aria-label='Messages']",
        "div[role='grid']",
        "div[role='main']",
        "main",
    ]:
        try:
            locator = page.locator(selector).first
            if locator.count() == 0:
                continue
            locator.evaluate("(el) => { el.scrollTop = el.scrollHeight; }")
            return
        except Exception:
            pass


def find_email_in_chat(page: Page, max_attempts: int = 8) -> Optional[str]:
    """
    Look for email addresses in the visible Instagram DM messages.
    Returns the first email found, or None if no email is found.
    """
    for attempt in range(1, max_attempts + 1):
        time.sleep(1.0)
        valid_emails = valid_emails_from_text(collect_chat_text(page))
        if not valid_emails:
            valid_emails = valid_emails_from_text(collect_chat_text(page, include_body=True))

        if valid_emails:
            # Return the most recently found (likely the reply).
            return valid_emails[-1]

        print(f"  → Email scan attempt {attempt}/{max_attempts}: no match yet")
        scroll_chat_messages(page)

    return None


def go_back_to_home(page: Page) -> None:
    """Navigate back to home/search state."""
    try:
        home_link = page.locator("a[href='/']").first
        if home_link.count() > 0:
            home_link.click()
            time.sleep(1.0)
        else:
            page.goto("https://www.instagram.com/")
            time.sleep(2.0)
    except Exception:
        try:
            page.goto("https://www.instagram.com/")
            time.sleep(2.0)
        except:
            pass


def find_email_for_person(page: Page, first: str, last: str) -> Optional[str]:
    """Try to find the person on Instagram, open their DM, and find an email address."""
    for q in build_name_variants(first, last):
        print(f"  Searching for: {q}")
        try:
            found = search_and_open_profile(page, q)
            if found:
                print(f"  → Found profile, opening DM...")
                if click_message_button(page):
                    print(f"  → Chat opened, searching for email...")
                    email = find_email_in_chat(page)
                    go_back_to_home(page)
                    return email
                else:
                    print(f"  → Could not find Message button")
                    go_back_to_home(page)
        except Exception as e:
            print(f"  → Error: {e}")
            try:
                go_back_to_home(page)
            except:
                pass
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
    - Instagram invite was sent (column J = TRUE)
    - Email is empty (column C is empty)
    - Source (column H) is in source_filter if specified
    """
    worksheet = get_google_sheet()
    all_data = worksheet.get_all_values()
    
    people = []
    for i, row in enumerate(all_data[DATA_START_INDEX:], start=DATA_START_INDEX + 1):
        # Ensure row has enough columns
        if len(row) <= max(COL_LAST_NAME, COL_FIRST_NAME, COL_EMAIL, COL_ALE, COL_SOURCE, COL_SENT_INSTAGRAM):
            continue
        
        last_name = row[COL_LAST_NAME].strip()
        first_name = row[COL_FIRST_NAME].strip()
        email = row[COL_EMAIL].strip() if len(row) > COL_EMAIL else ""
        ale_checked = row[COL_ALE].strip().upper() == "TRUE" if len(row) > COL_ALE else False
        source = row[COL_SOURCE].strip() if len(row) > COL_SOURCE else ""
        sent_instagram = row[COL_SENT_INSTAGRAM].strip().upper() == "TRUE" if len(row) > COL_SENT_INSTAGRAM else False
        
        # Skip if no name
        if not first_name and not last_name:
            continue
        
        # Skip if "Ale" column (D) is not checked
        if not ale_checked:
            continue
        
        # Skip if Instagram invite was NOT sent
        if not sent_instagram:
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
    """Main function that finds emails in Instagram DMs and updates the sheet."""
    print(f"Reading people from Google Sheet '{SPREADSHEET_NAME}'...")
    print("Looking for: Instagram sent=TRUE, email=empty")
    if DRY_RUN:
        print("Dry run enabled: found emails will not be written to Google Sheets")
    
    if source_filter:
        print(f"Filtering by sources: {source_filter}")
    
    people = get_people_needing_email(source_filter)
    
    if not people:
        print("No people found needing email (either all have emails or none match filter).")
        return
    
    print(f"Found {len(people)} people needing email:")
    for p in people:
        print(f"  - {p['first_name']} {p['last_name']} (Source: {p['source']})")
    
    print("\nStarting Instagram email finder...")
    
    found_list = []
    not_found_list = []
    chat_not_found_list = []
    
    with sync_playwright() as pw:
        context = pw.chromium.launch_persistent_context(
            user_data_dir=str(INSTAGRAM_PROFILE_DIR),  # Same profile as instagram_automation.py
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
                if DRY_RUN:
                    print(f"  → Dry run: would update sheet row {row}")
                else:
                    try:
                        update_email(row, email)
                        print(f"  → Updated sheet (row {row})")
                    except Exception as e:
                        print(f"  → Failed to update sheet: {e}")
            else:
                # No email found
                print(f"  ✗ No email found in DM")
                not_found_list.append(full_name)
            
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
    
    print(f"\n✗ NO EMAIL IN DM ({len(not_found_list)}):")
    if not_found_list:
        for name in not_found_list:
            print(f"  - {name}")
    else:
        print("  (none)")
    
    if chat_not_found_list:
        print(f"\n⚠ PROFILE/CHAT NOT FOUND ({len(chat_not_found_list)}):")
        for name in chat_not_found_list:
            print(f"  - {name}")
    
    print("\nDone!")


if __name__ == "__main__":
    main(SOURCE_FILTER)
