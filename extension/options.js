const DEFAULT_CONFIG = {
  endpoint: "http://localhost:3000/api/class-summaries",
  classId: "my-demo-class"
};
const endpoint = document.querySelector("#endpoint");
const classId = document.querySelector("#class-id");
const status = document.querySelector("#status");

function endpointOrigin(value) {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Use an http or https endpoint.");
  if (!url.pathname.endsWith("/api/class-summaries")) throw new Error("Endpoint must end with /api/class-summaries.");
  return `${url.origin}/*`;
}

const saved = await chrome.storage.sync.get(DEFAULT_CONFIG);
endpoint.value = saved.endpoint;
classId.value = saved.classId;

document.querySelector("#settings").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const origin = endpointOrigin(endpoint.value.trim());
    const allowed = await chrome.permissions.request({ origins: [origin] });
    if (!allowed) throw new Error("Permission to send summaries to that endpoint was not granted.");
    await chrome.storage.sync.set({ endpoint: endpoint.value.trim(), classId: classId.value.trim() });
    status.textContent = "Saved. Reload any open test page, then use the Pages teacher view to see the temporary class.";
    status.className = "success";
  } catch (error) {
    status.textContent = error.message;
    status.className = "error";
  }
});
