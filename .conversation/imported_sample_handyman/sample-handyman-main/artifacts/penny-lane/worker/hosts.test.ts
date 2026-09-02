/**
 * Host-matrix unit tests locking the client-side (`src/lib/hosts.ts`) and
 * worker-side (`worker/hosts.ts`) /admin host predicates together.
 *
 * Background: the dev /admin page once silently redirected to the production
 * admin domain because the client allowlist drifted from the worker's logic.
 * These tests make any future drift fail loudly.
 */
import { describe, it, expect } from "vitest";
import {
  isAdminHost as clientIsAdminHost,
  keepPathBasedAdmin as clientKeepPathBasedAdmin,
  shouldRedirectAdminPath as clientShouldRedirectAdminPath,
} from "../src/lib/hosts";
import {
  isAdminHostname as workerIsAdminHostname,
  keepPathBasedAdmin as workerKeepPathBasedAdmin,
} from "./hosts";

type HostCase = {
  hostname: string;
  /** Client: keeps path-based /admin (dev-ish host). */
  clientKeep: boolean;
  /** Client: /admin should redirect to the admin subdomain. */
  clientRedirect: boolean;
  /** Worker with ENVIRONMENT=production: keeps path-based /admin. */
  workerKeepProd: boolean;
  isAdmin: boolean;
};

const MATRIX: HostCase[] = [
  { hostname: "localhost",                          clientKeep: true,  clientRedirect: false, workerKeepProd: true,  isAdmin: false },
  { hostname: "127.0.0.1",                          clientKeep: true,  clientRedirect: false, workerKeepProd: true,  isAdmin: false },
  { hostname: "myapp.localhost",                    clientKeep: true,  clientRedirect: false, workerKeepProd: true,  isAdmin: false },
  { hostname: "abc-123.riker.replit.dev",           clientKeep: true,  clientRedirect: false, workerKeepProd: false, isAdmin: false },
  { hostname: "penny-lane.replit.app",              clientKeep: true,  clientRedirect: false, workerKeepProd: false, isAdmin: false },
  { hostname: "penny-lane-dev.example.workers.dev", clientKeep: true,  clientRedirect: false, workerKeepProd: false, isAdmin: false },
  { hostname: "pennylanehomesolutions.com",         clientKeep: false, clientRedirect: true,  workerKeepProd: false, isAdmin: false },
  { hostname: "www.pennylanehomesolutions.com",     clientKeep: false, clientRedirect: true,  workerKeepProd: false, isAdmin: false },
  { hostname: "admin.pennylanehomesolutions.com",   clientKeep: false, clientRedirect: false, workerKeepProd: false, isAdmin: true  },
];

describe("client host predicates (src/lib/hosts.ts)", () => {
  for (const c of MATRIX) {
    it(`${c.hostname}: keep=${c.clientKeep} redirect=${c.clientRedirect} admin=${c.isAdmin}`, () => {
      expect(clientKeepPathBasedAdmin(c.hostname)).toBe(c.clientKeep);
      expect(clientShouldRedirectAdminPath(c.hostname)).toBe(c.clientRedirect);
      expect(clientIsAdminHost(c.hostname)).toBe(c.isAdmin);
    });
  }
});

describe("worker host predicates (worker/hosts.ts)", () => {
  for (const c of MATRIX) {
    it(`${c.hostname}: keepProd=${c.workerKeepProd} admin=${c.isAdmin}`, () => {
      expect(workerKeepPathBasedAdmin(c.hostname, "production")).toBe(c.workerKeepProd);
      expect(workerIsAdminHostname(c.hostname)).toBe(c.isAdmin);
    });

    it(`${c.hostname}: worker keeps path-based /admin in non-production envs`, () => {
      expect(workerKeepPathBasedAdmin(c.hostname, "dev")).toBe(true);
      expect(workerKeepPathBasedAdmin(c.hostname, "")).toBe(true);
    });
  }
});

describe("client/worker consistency", () => {
  it("both layers agree on the admin host", () => {
    for (const c of MATRIX) {
      expect(clientIsAdminHost(c.hostname)).toBe(workerIsAdminHostname(c.hostname));
    }
  });

  it("client never redirects a host the worker (in any env) serves path-based /admin for, except prod marketing hosts", () => {
    for (const c of MATRIX) {
      if (c.clientRedirect) {
        // Hosts the client redirects must be production marketing hosts —
        // the worker in production also redirects them (keepProd=false, not admin).
        expect(c.workerKeepProd).toBe(false);
        expect(c.isAdmin).toBe(false);
      }
    }
  });

  it("dev-ish hosts the client keeps are never redirected by the worker outside production", () => {
    for (const c of MATRIX) {
      if (c.clientKeep) {
        expect(workerKeepPathBasedAdmin(c.hostname, "dev")).toBe(true);
      }
    }
  });
});
