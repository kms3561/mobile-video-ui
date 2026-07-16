const navItems = Array.from(document.querySelectorAll(".nav-item"));
const screens = new Map(
  Array.from(document.querySelectorAll(".screen")).map((screen) => [
    screen.id.replace("screen-", ""),
    screen,
  ]),
);

function activateScreen(screenName) {
  screens.forEach((screen, name) => {
    screen.classList.toggle("active", name === screenName);
  });

  navItems.forEach((item) => {
    const isActive = item.dataset.screen === screenName;
    item.classList.toggle("active", isActive);
    if (isActive) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
  });
}

navItems.forEach((item) => {
  item.addEventListener("click", () => activateScreen(item.dataset.screen));
});
