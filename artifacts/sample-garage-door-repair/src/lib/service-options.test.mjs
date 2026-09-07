import assert from "node:assert/strict";
import test from "node:test";
import { approvedServiceOptions } from "./service-options.ts";

test("booking uses approved names and preserves session handoff values", () => {
  const options = approvedServiceOptions([
    { slug: "cable-roller-off-track-repair", name: "Owner's hardware service" },
    { slug: "commercial-garage-door-services", name: "Commercial Garage Door Services" },
    { slug: "springs", name: "Preserved legacy spring page" },
  ]);
  assert.deepEqual(options, [
    { value: "hardware", label: "Owner's hardware service" },
    { value: "commercial", label: "Commercial Garage Door Services" },
    { value: "springs", label: "Preserved legacy spring page" },
    { value: "other", label: "Not sure / other" },
  ]);
});

test("unpublished or unavailable offerings are never reintroduced by fallbacks", () => {
  assert.deepEqual(approvedServiceOptions(), [{ value: "other", label: "Not sure / other" }]);
  assert.equal(approvedServiceOptions([{ slug: "custom-service", name: "Owner service" }])
    .some(option => option.value === "repair"), false);
});