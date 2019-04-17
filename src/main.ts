if (location.pathname === "/pub") {
  import("./pub");
} else if (location.pathname === "/sub") {
  import("./sub");
} else {
  document.body.innerHTML = `
    Go to ...
    <a href="/pub">pub</a>
    |
    <a href="/sub">sub</a>
  `;
}
