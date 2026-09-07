import assert from "node:assert/strict";
import test from "node:test";
import { storedObjectMatches } from "./request-delivery.ts";

const webp = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0,
  0x57, 0x45, 0x42, 0x50, 0, 0, 0, 0,
]);

const response = (contentRange, contentType = "image/webp", status = 206) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Headers({ "content-range": contentRange, "content-type": contentType }),
});

test("validates signed GCS range metadata, size, type, and file signature", () => {
  assert.equal(storedObjectMatches({ contentType: "image/webp", byteSize: 101782 }, response("bytes 0-15/101782"), webp), true);
  assert.equal(storedObjectMatches({ contentType: "image/webp", byteSize: 101781 }, response("bytes 0-15/101782"), webp), false);
  assert.equal(storedObjectMatches({ contentType: "image/png", byteSize: 101782 }, response("bytes 0-15/101782"), webp), false);
  assert.equal(storedObjectMatches({ contentType: "image/webp", byteSize: 101782 }, response("bytes 0-15/101782", "image/webp", 200), webp), false);
});