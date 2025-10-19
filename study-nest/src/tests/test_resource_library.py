import os, tempfile, random, string, time
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, ElementNotInteractableException
dummy_path = None

BASE = "http://localhost:5173"

# ---------- helpers ----------
def rand_str(n=6): return "".join(random.choices(string.ascii_letters, k=n))

def react_replace(el, txt):
    el.click()
    el.send_keys(Keys.CONTROL, "a")
    el.send_keys(Keys.DELETE)
    if txt: el.send_keys(txt)
    el.send_keys(Keys.TAB)

def create_dummy_pdf() -> str:
    """Create a very small valid PDF and return its absolute path."""
    pdf_bytes = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 4 0 R>>endobj\n4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 72 120 Td (Hello StudyNest) Tj ET\nendstream endobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000061 00000 n \n0000000118 00000 n \n0000000220 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n320\n%%EOF"
    fd, path = tempfile.mkstemp(suffix=".pdf", prefix="studynest_")
    with os.fdopen(fd, "wb") as f:
        f.write(pdf_bytes)
    return path

def open_resource_library(driver, wait):
    """Try a few likely routes until we see the page body + Add Resource button."""
    for path in ("/resources", "/resource-library", "/"):
        driver.get(BASE + path)
        try:
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            # Try to find "Add Resource" CTA
            btn = WebDriverWait(driver, 2).until(
                EC.presence_of_element_located((By.XPATH, "//button[normalize-space()='Add Resource']"))
            )
            return True
        except Exception:
            continue
    return False

# ---------- test ----------
chrome_options = Options()
chrome_options.add_argument("--start-maximized")
driver = webdriver.Chrome(options=chrome_options)
wait = WebDriverWait(driver, 5)

try:
    if not open_resource_library(driver, wait):
        raise RuntimeError("Could not find the Resource Library page or the 'Add Resource' button.")

    # Seed auth so backend accepts creation & points updates
    driver.execute_script("""
      localStorage.setItem('studynest.auth', JSON.stringify({
        id: 999, name: 'Selenium Bot', username: 'selenium', studentId: '011223344', points: 0
      }));
    """)
    driver.refresh()
    wait.until(EC.presence_of_element_located((By.XPATH, "//button[normalize-space()='Add Resource']")))

    # Open upload modal
    driver.find_element(By.XPATH, "//button[normalize-space()='Add Resource']").click()

    # Wait for modal to render (generic modal container)
    wait.until(EC.presence_of_element_located((By.XPATH, "//div[contains(@class,'rounded-2xl') and .//button]")))

    # Attach a dummy file
    dummy_path = create_dummy_pdf()
    file_input = driver.find_element(By.XPATH, "//input[@type='file']")
    try:
        file_input.send_keys(dummy_path)
    except ElementNotInteractableException:
        # Unhide if custom styling hides it
        driver.execute_script("arguments[0].style.display='block'; arguments[0].style.visibility='visible';", file_input)
        file_input.send_keys(dummy_path)

    # Fill fields (labels may vary; we target common ones)
    def fill_after_label(label_text, is_textarea=False):
        xp = f"//label[normalize-space()='{label_text}']" + ("/following::textarea[1]" if is_textarea else "/following::input[1]")
        try:
            el = driver.find_element(By.XPATH, xp)
            return el
        except Exception:
            return None

    title_val = f"CSE{random.randint(200,499)} - {rand_str(5)} resource"
    course_val = f"CSE{random.randint(200,499)}"
    semester_val = random.choice(["Spring", "Summer", "Fall"]) + f" {random.randint(2024,2027)}"
    tags_val = ", ".join(random.sample(["slides","lab","quiz","mid","final","assignment","notes"], k=3))
    desc_val = "Created by Selenium randomized test."

    for (label, value, is_ta) in [
        ("Title", title_val, False),
        ("Course", course_val, False),
        ("Semester", semester_val, False),
        ("Tags", tags_val, False),
        ("Description", desc_val, True),
    ]:
        el = fill_after_label(label, is_textarea=is_ta)
        if el:
            try:
                react_replace(el, value)
            except Exception:
                el.clear(); el.send_keys(value); el.send_keys(Keys.TAB)

    # Submit (try common labels or any enabled submit)
    submitted = False
    for xp in [
        "//button[@type='submit' and not(@disabled)]",
        "//button[normalize-space()='Upload' and not(@disabled)]",
        "//button[normalize-space()='Create' and not(@disabled)]",
        "//button[normalize-space()='Save' and not(@disabled)]",
        "//button[contains(.,'Add') and not(@disabled)]",
    ]:
        els = driver.find_elements(By.XPATH, xp)
        if els:
            els[0].click()
            submitted = True
            break
    if not submitted:
        raise RuntimeError("Could not find a submit button in the modal.")

    # Accept success alert
    alert = wait.until(EC.alert_is_present())
    print("Alert:", alert.text)
    alert.accept()

    # Verify the new card appears by title
    wait.until(EC.presence_of_element_located((By.XPATH, f"//h3[normalize-space()='{title_val}']")))
    print("✅ Resource card visible:", title_val)

    # Try filters (native <select>s with labels: Type, Course, Semester, Tag, Sort)
    def select_by_label(label_text):
        try:
            sel = driver.find_element(
                By.XPATH,
                f"//label[.//span[normalize-space()='{label_text}']]/select"
            )
            options = sel.find_elements(By.TAG_NAME, "option")
            if options:
                # Prefer a non-'All' option if available
                choices = [o for o in options if (o.get_attribute('value') or o.text) not in ('', 'All')]
                target = random.choice(choices or options)
                target.click()
        except Exception:
            pass

    # Search by one of the tags we used
    try:
        search = driver.find_element(By.XPATH, "//input[@placeholder='Search title, description, or #tag']")
        react_replace(search, random.choice(tags_val.split(",")).strip())
        time.sleep(1)
    except Exception:
        pass

    for label in ["Type", "Course", "Semester", "Tag", "Sort"]:
        select_by_label(label)

    time.sleep(1)
    print("✅ Filters/search exercised.")

except Exception as e:
    print("❌ Test failed:", e)
finally:
    time.sleep(1)
    try:
        # Only delete dummy file if it was actually created
        if 'dummy_path' in locals() and dummy_path and os.path.exists(dummy_path):
            os.remove(dummy_path)
    except Exception:
        pass

    # Always close the browser
    driver.quit()


