"""End-to-end check of the main LeadFlow flows in a real browser.

Run against a freshly seeded app (python -m app.seed --reset) on localhost:3000:

    pip install playwright && python -m playwright install chromium
    python e2e/flow.py
"""
import datetime
import re
import sys
from playwright.sync_api import sync_playwright, expect
out = sys.argv[1] if len(sys.argv) > 1 else "."
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 1000})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.goto("http://localhost:3000", wait_until="networkidle")

    # 1. log a note with a follow-up on Vikram (no follow-up yet) -> should appear with chip in list
    pg.get_by_role("button", name=re.compile("Vikram Shah")).click()
    dlg = pg.get_by_role("dialog")
    expect(dlg.get_by_text("Lead added to LeadFlow")).to_be_visible()
    dlg.get_by_label("Discussion note").fill("Intro call done. Runs a 6-advisor desk, wants a demo for the partners.")
    dlg.get_by_role("button", name="Tomorrow 10 AM").click()
    pg.screenshot(path=f"{out}/flow-1-compose.png")
    dlg.get_by_role("button", name="Save note").click()
    expect(dlg.get_by_text("Follow-up set for Tomorrow, 10:00 AM")).to_be_visible()
    # 2. status change
    dlg.get_by_role("combobox", name="Lead status").click()
    pg.get_by_role("option", name=re.compile("^Contacted")).click()
    expect(dlg.get_by_text("Status changed from New to Contacted")).to_be_visible()
    pg.wait_for_timeout(400)
    pg.screenshot(path=f"{out}/flow-2-after.png")
    pg.keyboard.press("Escape")
    row = pg.get_by_role("button", name=re.compile("Vikram Shah"))
    expect(row).to_contain_text("Intro call done")
    expect(row).to_contain_text("Tomorrow, 10:00 AM")
    expect(row).to_contain_text("Contacted")
    expect(row).to_contain_text("just now")

    # 3. custom follow-up later today -> pinned into Due today
    pg.get_by_role("button", name=re.compile("Meera Kapoor")).click()
    dlg = pg.get_by_role("dialog")
    dlg.get_by_label("Discussion note").fill("New financial year budget approved. Re-opening.")
    dlg.get_by_role("button", name="Pick date & time").click()
    dlg.get_by_label("Follow-up date").fill(datetime.date.today().isoformat())
    dlg.get_by_label("Follow-up time").fill("23:30")
    dlg.get_by_label("Discussion note").press("Control+Enter")
    expect(dlg.get_by_text(re.compile("Follow-up set for Today, 11:30 PM"))).to_be_visible()
    pg.keyboard.press("Escape")
    today = pg.locator("section[aria-labelledby=today-heading]")
    expect(today).to_contain_text("Meera Kapoor")

    # 4. add lead via N shortcut; validation first
    pg.keyboard.press("n")
    add = pg.get_by_role("dialog")
    add.get_by_role("button", name="Add lead").click()
    expect(add.get_by_text("Enter the lead's name")).to_be_visible()
    add.get_by_label("Full name").fill("Nisha Verma")
    add.get_by_label("Company").fill("Tidewater Advisors")
    add.get_by_role("button", name="Add lead").click()
    expect(pg.get_by_role("button", name=re.compile("Nisha Verma"))).to_contain_text("New")

    # 5. search + filter
    pg.keyboard.press("/")
    pg.keyboard.type("tidewater")
    pg.wait_for_timeout(600)
    expect(pg.get_by_role("button", name=re.compile("Nisha Verma"))).to_be_visible()
    expect(pg.get_by_role("button", name=re.compile("Ananya Iyer"))).to_have_count(0)
    pg.get_by_label("Clear search").click()
    pg.get_by_role("radio", name=re.compile("^Won")).click()
    pg.wait_for_timeout(500)
    expect(pg.get_by_role("button", name=re.compile("Sofia Alvarez"))).to_be_visible()
    expect(pg.get_by_role("button", name=re.compile("Nisha Verma"))).to_have_count(0)
    pg.get_by_role("radio", name=re.compile("^All")).click()

    # 6. persistence after reload
    pg.reload(wait_until="networkidle")
    expect(pg.get_by_role("button", name=re.compile("Vikram Shah"))).to_contain_text("Contacted")
    print("ERRORS:", errs or "none")
    print("FLOW OK")
    b.close()
