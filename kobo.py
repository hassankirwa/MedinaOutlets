from pathlib import Path
from urllib.parse import urlparse
import mimetypes
import re
import time

import pandas as pd
from playwright.sync_api import sync_playwright


# =========================
# CONFIG
# =========================
EXCEL_FILE = r"C:\Users\hassan.kirwa\Downloads\kobo-data.xlsx"
IMAGE_URL_COLUMN = "FACILITY_PHOTO_URL"      # column containing the image URL
IMAGE_NAME_COLUMN = "FACILITY_PHOTO"    # column containing the name to save as
OUTPUT_DIR = "downloaded_images"

LOGIN_URL = "https://kf.kobotoolbox.org/"
HEADLESS = False                    # keep visible so you can log in manually
WAIT_AFTER_LOGIN_SECONDS = 20       # time for you to complete login if needed
REQUEST_TIMEOUT_MS = 60000


def sanitize_filename(name: str) -> str:
    """Make a safe filename."""
    name = str(name).strip()
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name)
    name = re.sub(r"\s+", "_", name)
    name = name.strip("._")
    return name or "image"


VALID_IMAGE_EXTS = frozenset({
    ".jpg", ".jpeg", ".png", ".gif", ".webp",
    ".bmp", ".tif", ".tiff", ".svg",
})


def guess_extension(url: str, content_type: str | None) -> str:
    """Guess extension from URL or content-type."""
    parsed = urlparse(url)
    suffix = Path(parsed.path).suffix.lower()

    if suffix in VALID_IMAGE_EXTS:
        return suffix

    if content_type:
        ext = mimetypes.guess_extension(content_type.split(";")[0].strip())
        if ext and ext.lower() in VALID_IMAGE_EXTS:
            return ext

    return ".jpg"


def filename_from_image_name_column(
    image_name: str, url: str, content_type: str | None
) -> str:
    """
    Build the saved filename from the Excel image-name cell for this row.
    Uses the basename stem only (e.g. IMG...jpg -> IMG...); the file
    extension always comes from the downloaded response/URL, not the cell.
    """
    raw = str(image_name).strip()
    if not raw or raw.lower() == "nan":
        return ""
    base = Path(raw).name
    stem = Path(base).stem
    safe_stem = sanitize_filename(stem)
    if not safe_stem:
        return ""
    return f"{safe_stem}{guess_extension(url, content_type)}"


def make_unique_path(base_path: Path) -> Path:
    """Avoid overwriting existing files."""
    if not base_path.exists():
        return base_path

    stem = base_path.stem
    suffix = base_path.suffix
    parent = base_path.parent

    counter = 1
    while True:
        candidate = parent / f"{stem}_{counter}{suffix}"
        if not candidate.exists():
            return candidate
        counter += 1


def main():
    output_dir = Path(OUTPUT_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_excel(EXCEL_FILE)

    missing = [c for c in [IMAGE_URL_COLUMN, IMAGE_NAME_COLUMN] if c not in df.columns]
    if missing:
        raise ValueError(f"Missing column(s): {missing}. Available columns: {list(df.columns)}")

    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=HEADLESS)

        # Same browser context = same logged-in cookies/session
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()

        print(f"Opening login page: {LOGIN_URL}")
        page.goto(LOGIN_URL, wait_until="domcontentloaded", timeout=REQUEST_TIMEOUT_MS)

        print("\\nLog in manually in the opened browser window.")
        print(f"Waiting {WAIT_AFTER_LOGIN_SECONDS} seconds for login...")
        time.sleep(WAIT_AFTER_LOGIN_SECONDS)

        # After login, requests from this context share auth/session cookies
        request_context = context.request

        for idx, row in df.iterrows():
            excel_row_num = idx + 2  # header row assumed on row 1

            raw_url = row[IMAGE_URL_COLUMN]
            raw_name = row[IMAGE_NAME_COLUMN]

            image_url = str(raw_url).strip() if pd.notna(raw_url) else ""
            image_name = str(raw_name).strip() if pd.notna(raw_name) else ""

            if not image_url or image_url.lower() == "nan":
                results.append({
                    "row": excel_row_num,
                    "url": image_url,
                    "image_name": image_name,
                    "status": "skipped",
                    "message": "Empty image URL"
                })
                print(f"[SKIPPED] Row {excel_row_num}: empty URL")
                continue

            display_name = image_name
            if not image_name or image_name.lower() == "nan":
                display_name = f"row_{excel_row_num}"

            try:
                response = request_context.get(
                    image_url,
                    timeout=REQUEST_TIMEOUT_MS,
                    fail_on_status_code=False
                )

                if not response.ok:
                    results.append({
                        "row": excel_row_num,
                        "url": image_url,
                        "image_name": display_name,
                        "status": "failed",
                        "message": f"HTTP {response.status}"
                    })
                    print(f"[FAILED] Row {excel_row_num}: HTTP {response.status}")
                    continue

                content_type = response.headers.get("content-type", "")
                body = response.body()

                # Some platforms may still return the file even with a generic content-type.
                # Filename from name column for this row; fallback stem if column empty.
                if image_name and image_name.lower() != "nan":
                    out_name = filename_from_image_name_column(
                        image_name, image_url, content_type
                    )
                    if not out_name:
                        out_name = f"{sanitize_filename(display_name)}{guess_extension(image_url, content_type)}"
                else:
                    out_name = f"{sanitize_filename(display_name)}{guess_extension(image_url, content_type)}"

                file_path = output_dir / out_name
                file_path = make_unique_path(file_path)

                file_path.write_bytes(body)

                results.append({
                    "row": excel_row_num,
                    "url": image_url,
                    "image_name": display_name,
                    "status": "success",
                    "message": str(file_path)
                })
                print(f"[SUCCESS] Row {excel_row_num}: saved -> {file_path}")

            except Exception as e:
                results.append({
                    "row": excel_row_num,
                    "url": image_url,
                    "image_name": display_name,
                    "status": "failed",
                    "message": str(e)
                })
                print(f"[FAILED] Row {excel_row_num}: {e}")

        browser.close()

    pd.DataFrame(results).to_excel("download_results.xlsx", index=False)
    print("\\nDone.")
    print(f"Images folder: {output_dir.resolve()}")
    print("Report file: download_results.xlsx")


if __name__ == "__main__":
    main()