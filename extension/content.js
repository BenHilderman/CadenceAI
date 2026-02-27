// Inject floating CadenceAI orb button
(function () {
  if (document.getElementById("cadence-ai-orb")) return;

  const orb = document.createElement("button");
  orb.id = "cadence-ai-orb";
  orb.setAttribute("aria-label", "Open CadenceAI");
  orb.title = "CadenceAI — Schedule by voice";

  // Inner glow layer
  const glow = document.createElement("div");
  glow.className = "cadence-orb-glow";
  orb.appendChild(glow);

  // Inner gradient layer
  const inner = document.createElement("div");
  inner.className = "cadence-orb-inner";
  orb.appendChild(inner);

  // Icon: simple calendar/mic symbol using SVG
  const icon = document.createElement("div");
  icon.className = "cadence-orb-icon";
  icon.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`;
  orb.appendChild(icon);

  orb.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
  });

  document.body.appendChild(orb);
})();
