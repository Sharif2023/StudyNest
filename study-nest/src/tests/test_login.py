from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# ---- fill these with a real, existing account ----
VALID_EMAIL = "hello123@bscse.uiu.ac.bd"
VALID_PASSWORD = "123456"

chrome_options = Options()
chrome_options.add_argument("--start-maximized")
driver = webdriver.Chrome(options=chrome_options)
wait = WebDriverWait(driver, 10)

def replace_input(elem, text):
    """Reliable value replacement for React-controlled inputs."""
    elem.click()
    elem.send_keys(Keys.CONTROL, "a")
    elem.send_keys(Keys.DELETE)
    elem.send_keys(text)
    elem.send_keys(Keys.TAB)

try:
    # Open login page
    driver.get("http://localhost:5173/login")
    wait.until(EC.presence_of_element_located((By.ID, "email")))

    # Grab elements
    email = driver.find_element(By.ID, "email")
    password = driver.find_element(By.ID, "password")
    submit = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")

    # ----------------- Step 1: Wrong credentials -----------------
    print("Step 1: trying WRONG credentials...")
    replace_input(email, "doesnotexist@gmail.com")   # wrong email
    replace_input(password, "wrongpassword123")      # wrong password

    submit.click()

    # Expect an error alert (Login.jsx shows alert(err.message) on failure)
    try:
        alert = wait.until(EC.alert_is_present())
        print("❗ Failure alert (expected):", alert.text)
        alert.accept()
    except Exception:
        print("⚠️ No alert appeared on failed login. Check backend error handling.")

    # ----------------- Clear fields properly -----------------
    # Re-find (safer if React re-rendered)
    email = driver.find_element(By.ID, "email")
    password = driver.find_element(By.ID, "password")

    replace_input(email, "")
    replace_input(password, "")

    # ----------------- Step 2: Correct credentials -----------------
    print("Step 2: trying VALID credentials...")
    replace_input(email, VALID_EMAIL)
    replace_input(password, VALID_PASSWORD)

    # Optional: toggle Remember me (default is checked in your component)
    # If you want to uncheck it:
    # remember = driver.find_element(By.CSS_SELECTOR, "input[name='remember']")
    # if remember.is_selected():
    #     remember.click()

    submit = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
    submit.click()

    # On success, your code may show a points alert (only if points_earned > 0)
    # Handle it if it appears, otherwise continue.
    try:
        alert = WebDriverWait(driver, 3).until(EC.alert_is_present())
        print("🎉 Success/points alert:", alert.text)
        alert.accept()
    except Exception:
        print("No points alert (that's fine).")

    # Verify redirect to /home or /admin
    wait.until(lambda d: ("/home" in d.current_url) or ("/admin" in d.current_url))
    print("✅ Logged in. Current URL:", driver.current_url)

except Exception as e:
    print("❌ Test failed:", e)
finally:
    time.sleep(4)
    driver.quit()
