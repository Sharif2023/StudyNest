from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time, random

chrome_options = Options()
chrome_options.add_argument("--start-maximized")
driver = webdriver.Chrome(options=chrome_options)
wait = WebDriverWait(driver, 10)

def replace_input(elem, text):
    # Works well with React controlled inputs
    elem.click()
    elem.send_keys(Keys.CONTROL, "a")   # select all
    elem.send_keys(Keys.DELETE)         # delete
    elem.send_keys(text)                # type new text
    elem.send_keys(Keys.TAB)            # blur to fire change/validation

try:
    driver.get("http://localhost:5173/signup")
    wait.until(EC.presence_of_element_located((By.ID, "username")))

    # ---------- Step 1: invalid email (should be blocked) ----------
    print("Step 1: trying invalid email")

    username = driver.find_element(By.ID, "username")
    student  = driver.find_element(By.ID, "studentId")
    email    = driver.find_element(By.ID, "email")
    pw       = driver.find_element(By.ID, "password")

    replace_input(username, "wronguser")
    replace_input(student,  "011111111")
    replace_input(email,    "abc@gmail.com")     # invalid for your pattern
    replace_input(pw,       "password123")

    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

    # If HTML5 validation blocks submit, URL stays on /signup
    time.sleep(2)
    if driver.current_url.endswith("/signup"):
        print("✅ Invalid email correctly blocked.")
    else:
        print("❌ Invalid email was accepted — check input pattern.")

    # ---------- Step 2: valid email (fresh values) ----------
    print("Step 2: trying valid email")

    # Re-find elements (safer with React re-render)
    username = driver.find_element(By.ID, "username")
    student  = driver.find_element(By.ID, "studentId")
    email    = driver.find_element(By.ID, "email")
    pw       = driver.find_element(By.ID, "password")

    rnd = random.randint(1000, 9999)
    replace_input(username, f"validuser{rnd}")
    replace_input(student,  f"0222{rnd}")
    replace_input(email,    f"abc{rnd}@cse.uiu.ac.bd")  # valid
    replace_input(pw,       "password123")

    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

    # Wait for alert then accept
    alert = wait.until(EC.alert_is_present())
    print("Alert:", alert.text)
    alert.accept()

    # Verify redirect to /login
    wait.until(lambda d: "login" in d.current_url)
    print("✅ Redirected to login.")

except Exception as e:
    print("❌ Test failed:", e)
finally:
    time.sleep(2)
    driver.quit()
