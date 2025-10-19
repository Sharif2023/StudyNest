import time, random, string
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    ElementClickInterceptedException,
)

BASE = "http://localhost:5173"
API_CREATE = "http://localhost/StudyNest/study-nest/src/api/meetings.php"


# ---------- Helpers ----------
def rand_str(n=6):
    return "".join(random.choices(string.ascii_letters, k=n))


def strict_room_url(url: str) -> bool:
    # Must be /rooms/<something> but NOT /rooms or /rooms/newform
    return "/rooms/" in url and not url.rstrip("/").endswith("/rooms") and "newform" not in url


def react_replace(el, text):
    el.click()
    el.send_keys(Keys.CONTROL, "a")
    el.send_keys(Keys.DELETE)
    if text:
        el.send_keys(text)
    el.send_keys(Keys.TAB)


# ---------- Chrome setup ----------
chrome_options = Options()
chrome_options.add_argument("--start-maximized")
chrome_options.add_argument("--use-fake-device-for-media-stream")
chrome_options.add_argument("--use-fake-ui-for-media-stream")

driver = webdriver.Chrome(options=chrome_options)
wait = WebDriverWait(driver, 15)

try:
    # 1️⃣ Open /rooms and seed localStorage auth
    driver.get(f"{BASE}/rooms")
    wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
    driver.execute_script("""
      localStorage.setItem('studynest.auth', JSON.stringify({
        id: 777, name: 'Selenium Bot', username: 'selenium', studentId: '011223344', points: 0
      }));
    """)
    driver.refresh()
    wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
    print("✅ Rooms page loaded and auth seeded.")

    # 2️⃣ Create a new room via backend API
    title = f"Quick Study {rand_str(5)}"
    course = "CSE220"
    room_id = driver.execute_async_script(
        """
        const done = arguments[arguments.length - 1];
        const url = arguments[0];
        const payload = arguments[1];
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        .then(r => r.json())
        .then(j => done(j && j.ok && j.id ? j.id : null))
        .catch(() => done(null));
        """,
        API_CREATE,
        {"title": title, "course": course},
    )

    if not room_id:
        raise RuntimeError("API did not return a room id. Check PHP endpoint / CORS / server logs.")

    # 3️⃣ Go to that room
    driver.get(f"{BASE}/rooms/{room_id}")
    wait.until(lambda d: strict_room_url(d.current_url))
    print("✅ Entered Study Room:", driver.current_url)

    # 4️⃣ Verify essential UI
    wait.until(EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Type a message']")))
    wait.until(EC.presence_of_element_located((By.XPATH, "//button[contains(., 'Mute') or contains(., 'Unmute')]")))
    wait.until(EC.presence_of_element_located((By.XPATH, "//button[contains(., 'Camera')]")))
    print("✅ Room UI loaded (chat + controls).")

    # 5️⃣ Toggle mic & cam
    try:
        mic_btn = driver.find_element(By.XPATH, "//button[contains(., 'Mute') or contains(., 'Unmute')]")
        mic_btn.click(); time.sleep(3)
        cam_btn = driver.find_element(By.XPATH, "//button[contains(., 'Camera off') or contains(., 'Camera on') or contains(., 'Camera')]")
        cam_btn.click(); time.sleep(3)
        print("🎚️ Toggled mic/camera.")
    except Exception:
        print("ℹ️ Mic/cam toggle skipped (not visible in this run).")

    # 6️⃣ Send a chat message
    msg = f"Hello from Selenium {rand_str(4)}"
    chat_input = driver.find_element(By.XPATH, "//input[@placeholder='Type a message']")
    chat_input.click()
    chat_input.send_keys(msg)
    driver.find_element(By.XPATH, "//button[normalize-space()='Send']").click()
    WebDriverWait(driver, 5).until(
        EC.presence_of_element_located((By.XPATH, f"//ul/li[contains(., '{msg}')]"))
    )
    print("💬 Chat message sent & visible.")

    # 7️⃣ Open & close whiteboard
    try:
        wb_btn = driver.find_element(By.XPATH, "//button[normalize-space()='Whiteboard']")
        wb_btn.click(); time.sleep(3)
        from selenium.webdriver.common.action_chains import ActionChains
        from selenium.webdriver.common.keys import Keys
        ActionChains(driver).send_keys(Keys.ESCAPE).perform()
        print("🧑‍🏫 Whiteboard opened & closed.")
    except Exception:
        print("ℹ️ Whiteboard step skipped (not found).")

    # 8️⃣ Safely leave room
    def overlays_gone():
        """Wait briefly for modals or fixed overlays to vanish."""
        try:
            WebDriverWait(driver, 3).until(
                EC.invisibility_of_element_located(
                    (By.XPATH, "//div[contains(@class,'fixed') and contains(@class,'inset-0')]")
                )
            )
        except TimeoutException:
            pass

    overlays_gone()
    driver.execute_script("window.scrollTo(0, 0);")

    leave_btn = wait.until(EC.presence_of_element_located((By.XPATH, "//button[normalize-space()='Leave']")))
    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", leave_btn)
    time.sleep(3)

    try:
        leave_btn.click()
    except ElementClickInterceptedException:
        driver.execute_script("arguments[0].click();", leave_btn)

    wait.until(lambda d: not strict_room_url(d.current_url))
    print("✅ Left the room. Current URL:", driver.current_url)

except Exception as e:
    print("❌ Test failed:", e)
finally:
    time.sleep(3)
    driver.quit()
