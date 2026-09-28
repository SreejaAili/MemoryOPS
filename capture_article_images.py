from playwright.sync_api import sync_playwright

def capture_screenshots():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        # 1. Architecture / Dashboard view
        page.goto("http://localhost:5173")
        page.wait_for_timeout(1000)
        page.screenshot(path="article/images/architecture.png")

        # 2. Investigation view
        page.get_by_role("button", name="Investigation").click()
        page.wait_for_timeout(2000)
        page.screenshot(path="article/images/investigation-view.png")

        # 3. Memory Explorer view
        page.get_by_role("button", name="Memory").click()
        page.wait_for_timeout(1000)
        page.screenshot(path="article/images/memory-explorer.png")

        # 4. Fallback behavior view (shows heuristic reasoning in investigation or warning)
        page.get_by_role("button", name="Investigation").click()
        page.wait_for_timeout(1000)
        page.screenshot(path="article/images/fallback-behavior.png")

        context.close()
        browser.close()

if __name__ == "__main__":
    capture_screenshots()
