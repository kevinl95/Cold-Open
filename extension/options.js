const DEFAULT_CONFIG = {
  endpoint: "http://localhost:3000/api/class-summaries",
  classId: "my-demo-class",
  captureOrigins: ["http://localhost/*"]
};
const endpoint = document.querySelector("#endpoint");
const captureSites = document.querySelector("#capture-sites");
const classId = document.querySelector("#class-id");
const status = document.querySelector("#status");

function sitePattern(value, label) {
  const url = new URL(value);
  if (url.protocol === "http:" && url.hostname === "localhost") return "http://localhost/*";
  if (url.protocol !== "https:") throw new Error(`${label} must use HTTPS (or http://localhost for testing).`);
  return `https://${url.hostname}/*`;
}

function endpointOrigin(value) {
  const url = new URL(value);
  if (!url.pathname.endsWith("/api/class-summaries")) throw new Error("Endpoint must end with /api/class-summaries.");
  return sitePattern(value, "Summary endpoint");
}

function parseCaptureSites(value) {
  const sites = value.split(",").map((site) => site.trim()).filter(Boolean);
  if (!sites.length) throw new Error("Enter at least one capture site.");
  return [...new Set(sites.map((site) => sitePattern(site, "Each capture site")))];
}

const saved = await chrome.storage.sync.get(["endpoint", "classId", "captureOrigins", "captureOrigin"]);
const savedCaptureOrigins = Array.isArray(saved.captureOrigins) ? saved.captureOrigins : typeof saved.captureOrigin === "string" ? [saved.captureOrigin] : DEFAULT_CONFIG.captureOrigins;
endpoint.value = typeof saved.endpoint === "string" ? saved.endpoint : DEFAULT_CONFIG.endpoint;
captureSites.value = savedCaptureOrigins.map((site) => site.replace(/\/\*$/, "")).join(", ");
classId.value = typeof saved.classId === "string" ? saved.classId : DEFAULT_CONFIG.classId;

document.querySelector("#settings").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const endpointPattern = endpointOrigin(endpoint.value.trim());
    const captureOrigins = parseCaptureSites(captureSites.value);
    const patterns = [...new Set([endpointPattern, ...captureOrigins])].filter((pattern) => pattern !== "http://localhost/*");
    const allowed = !patterns.length || await chrome.permissions.request({ origins: patterns });
    if (!allowed) throw new Error("Permission to use the selected endpoint or capture sites was not granted.");
    await chrome.storage.sync.set({ endpoint: endpoint.value.trim(), classId: classId.value.trim(), captureOrigins });
    const previousEndpoint = endpointOrigin(typeof saved.endpoint === "string" ? saved.endpoint : DEFAULT_CONFIG.endpoint);
    const noLongerNeeded = [...new Set([previousEndpoint, ...savedCaptureOrigins])]
      .filter((pattern) => pattern !== "http://localhost/*" && !patterns.includes(pattern));
    if (noLongerNeeded.length) await chrome.permissions.remove({ origins: noLongerNeeded });
    status.textContent = "Saved. Reload each selected capture site, then use the Pages teacher view to see the temporary class.";
    status.className = "success";
  } catch (error) {
    status.textContent = error.message;
    status.className = "error";
  }
});
