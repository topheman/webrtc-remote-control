import "./shared/js/components/footer-display";

function init() {
  document
    .querySelector("footer-display")
    .setAttribute("to", new Date().getFullYear());
}

init();
