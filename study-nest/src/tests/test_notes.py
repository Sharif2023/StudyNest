from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import ElementNotInteractableException, TimeoutException
import time, random, string

BASE = "http://localhost:5173"
NOTES_PATH = "/notes"  # change if your route differs
TEST_FILE_PATH = r"C:\Users\User\Downloads\Presentation1.pptx"   # <-- put a real file path here

chrome_options = Options()
chrome_options.add_argument("--start-maximized")
driver = webdriver.Chrome(options=chrome_options)
wait = WebDriverWait(driver, 5)

def rand_str(n=6):
    import string, random
    return "".join(random.choices(string.ascii_letters, k=n))

def react_replace(el, text):
    el.click()
    el.send_keys(Keys.CONTROL, "a")
    el.send_keys(Keys.DELETE)
    if text:
        el.send_keys(text)
    el.send_keys(Keys.TAB)

try:
    # 1) Open page
    driver.get(BASE + NOTES_PATH)
    wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))

    # Seed localStorage with a fake logged-in user (so upload can include user_id and award points)
    driver.execute_script("""
        localStorage.setItem('studynest.auth', JSON.stringify({
          id: 1, username: 'selenium', studentId: '011223344', points: 0
        }));
    """)
    driver.refresh()
    wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))

    # 2) Open Upload modal
    upload_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[.//text()[normalize-space()='Upload Notes'] or normalize-space()='Upload Notes']")))
    upload_btn.click()

    # Modal visible
    wait.until(EC.presence_of_element_located((By.XPATH, "//div[@class='mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-zinc-200']")))

    # 3) Attach file (input[type=file] is hidden inside the label)
    file_input = driver.find_element(By.XPATH, "//input[@type='file']")

    # If hidden, force-display then send keys
    try:
        file_input.send_keys(TEST_FILE_PATH)
    except ElementNotInteractableException:
        driver.execute_script("arguments[0].style.display='block'; arguments[0].style.visibility='visible';", file_input)
        file_input.send_keys(TEST_FILE_PATH)

    # 4) Fill fields with random-but-valid values
    title_val = f"CSE{random.randint(200,499)} - {rand_str(5)} notes"
    course_val = f"CSE{random.randint(200,499)}"
    semester_val = random.choice(["Spring", "Summer", "Fall"]) + f" {random.randint(2024,2027)}"
    tags_val = ", ".join(random.sample(["dp","graphs","quiz","mid","final","slides","lab","assignment"], k=3))
    desc_val = "Uploaded via Selenium randomized test."

    title = driver.find_element(By.XPATH, "//label[normalize-space()='Title']/following::input[1]")
    course = driver.find_element(By.XPATH, "//label[normalize-space()='Course']/following::input[1]")
    semester = driver.find_element(By.XPATH, "//label[normalize-space()='Semester']/following::input[1]")
    tags = driver.find_element(By.XPATH, "//label[normalize-space()='Tags']/following::input[1]")
    desc = driver.find_element(By.XPATH, "//label[normalize-space()='Description']/following::textarea[1]")

    react_replace(title, title_val)
    react_replace(course, course_val)
    react_replace(semester, semester_val)
    react_replace(tags, tags_val)
    desc.click(); desc.clear(); desc.send_keys(desc_val); desc.send_keys(Keys.TAB)

    # 5) Click Upload
    submit = driver.find_element(By.XPATH, "//button[normalize-space()='Upload' and not(@disabled)]")
    submit.click()

    # Accept success alert (backend returns message; component uses alert(data.message))
    alert = wait.until(EC.alert_is_present())
    print("Alert:", alert.text)
    alert.accept()

    # 6) Verify the new note card shows up (title text visible)
    # It re-fetches notes after success, so wait for list update
    wait.until(EC.presence_of_element_located((By.XPATH, f"//h3[normalize-space()='{title_val}']")))
    print("✅ Note card appears:", title_val)

    # 7) Randomly exercise filters & search
    #   - pick random Course, Semester, Tag from the dropdowns (these are native <select>s)
    def pick_random_from_select(label_text):
        try:
            sel = driver.find_element(By.XPATH, f"//label[span[normalize-space()='{label_text}']]/select")
            opts = sel.find_elements(By.TAG_NAME, "option")
            # Avoid "All" sometimes to actually filter
            choices = [o for o in opts if o.get_attribute("value") != "All"] or opts
            choice = random.choice(choices)
            choice.click()
        except Exception:
            pass

    # Search for a tag word to filter list
    try:
        search = driver.find_element(By.XPATH, "//input[@placeholder='Search title, description, or tag…']")
        react_replace(search, random.choice(tags_val.split(",")).strip())
        time.sleep(1)
    except Exception:
        pass

    pick_random_from_select("Course")
    pick_random_from_select("Semester")
    pick_random_from_select("Tag")

    time.sleep(1)  # brief pause so you can see the filtered grid
    print("✅ Filters/search exercised.")

except TimeoutException as te:
    print("❌ Timed out:", te)
except Exception as e:
    print("❌ Test failed:", e)
finally:
    time.sleep(3)
    driver.quit()
