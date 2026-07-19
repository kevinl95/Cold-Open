const $ = (selector) => document.querySelector(selector);
const fixtures = window.COLDOPEN_FIXTURES ?? {};
let currentFeature;
let currentScript;
const fixtureNames = {
  "8AM-class": "8AM class",
  "2PM-class": "2PM class"
};
const labels = {
  drag_abandon_rate: "Abandoned drags", dead_end_dialog_rate: "Dialog exits without a selection",
  dialog_cycle_rate: "Repeated dialog cycles", median_hesitation_ms: "Median pause between actions",
  median_key_interval_ms: "Median key interval", focus_change_rate: "Focus changes"
};

function setStatus(message, isError = false) {
  const status = $("#status"); status.textContent = message; status.classList.toggle("error", isError);
}
function textList(element, values) {
  element.replaceChildren(...values.map((value) => { const item = document.createElement("li"); item.textContent = value; return item; }));
}
function formattedSignal(key, value) {
  if (key.includes("rate")) return `${Math.round(value * 100)}%`;
  return `${Math.round(value)} ms`;
}
function renderFeature(feature) {
  currentFeature = feature;
  $("#class-title").textContent = `${fixtureNames[feature.class_id] ?? feature.class_id} · ${feature.window}`;
  $("#confidence").textContent = `${feature.confidence} confidence`;
  $("#confidence").className = `badge ${feature.confidence}`;
  $("#confidence-note").textContent = `${feature.n_sessions} anonymous session summaries inform this class-level pattern.`;
  const signals = $("#signals"); signals.replaceChildren();
  for (const [key, value] of Object.entries(feature.signals)) {
    const term = document.createElement("dt"); term.textContent = labels[key];
    const definition = document.createElement("dd"); definition.textContent = formattedSignal(key, value);
    signals.append(term, definition);
  }
  $("#feature-card").classList.remove("hidden");
}
function renderScript(script, source) {
  currentScript = script;
  $("#diagnosis").textContent = script.diagnosis;
  $("#script-confidence").textContent = `${script.confidence} confidence · designed for five minutes`;
  $("#script-source").textContent = source;
  textList($("#evidence"), script.evidence);
  $("#setup").textContent = script.demo.setup;
  textList($("#steps"), script.demo.steps);
  $("#check").textContent = script.demo.check;
  $("#script-card").classList.remove("hidden");
}
function currentFixture() {
  const classId = $("#class-id").value;
  const window = $("#window").value.trim();
  const fixture = fixtures[classId];
  if (!fixture) return null;
  if (fixture.feature.window !== window) throw new Error("This fixture has data only for the displayed demo window.");
  return fixture;
}
function selectedOption() {
  return $("#class-id").selectedOptions[0];
}
async function loadSelectedClass() {
  try {
    const fixture = currentFixture();
    if (fixture) {
      renderFeature(fixture.feature);
      renderScript(fixture.script, "Fixture script · available immediately");
      setStatus("Recommendation loaded.");
      return;
    }

    const classId = $("#class-id").value;
    const window = $("#window").value.trim();
    setStatus("Loading the temporary class aggregate…");
    const response = await fetch("/api/classes");
    const payload = await response.json();
    const feature = payload.classes?.find((candidate) => candidate.class_id === classId && candidate.window === window);
    if (!response.ok || !feature) throw new Error("No temporary aggregate exists for this class and week yet.");
    renderFeature(feature);
    currentScript = null;
    $("#script-card").classList.add("hidden");
    setStatus("Temporary aggregate loaded. Generate a fresh recommendation to use the model.");
  } catch (error) { setStatus(error.message, true); }
}
async function discoverLiveClasses() {
  const status = $("#live-classes-status");
  try {
    const response = await fetch("/api/classes");
    const payload = await response.json();
    if (!response.ok) throw new Error();
    const select = $("#class-id");
    for (const feature of payload.classes ?? []) {
      if ([...select.options].some((option) => option.value === feature.class_id && option.dataset.window === feature.window)) continue;
      const option = document.createElement("option");
      option.value = feature.class_id;
      option.dataset.window = feature.window;
      option.textContent = `${feature.class_id} (temporary)`;
      select.append(option);
    }
    const count = (payload.classes ?? []).filter((feature) => !fixtures[feature.class_id]).length;
    status.textContent = count ? `${count} temporary class${count === 1 ? "" : "es"} available from the extension in this runtime.` : "";
  } catch {
    // Fixture rendering must remain independent of this optional discovery call.
    status.textContent = "";
  }
}
async function regenerate() {
  if (!currentFeature) return;
  const button = $("#generate"); button.disabled = true;
  setStatus("Generating a fresh recommendation with OpenAI…");
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentFeature)
    });
    const script = await response.json();
    if (!response.ok) throw new Error(script.error || "Unable to regenerate the demo");
    renderScript(script, "Generated live");
    setStatus("New recommendation loaded.");
  } catch (error) {
    const fallback = currentScript ? " The current recommendation is still shown." : "";
    setStatus(`${error.message}${fallback}`, true);
  } finally { button.disabled = false; }
}

$("#load").addEventListener("click", loadSelectedClass);
$("#class-id").addEventListener("change", () => {
  const window = selectedOption()?.dataset.window;
  if (window) $("#window").value = window;
  void loadSelectedClass();
});
$("#generate").addEventListener("click", regenerate);
loadSelectedClass();
void discoverLiveClasses();
