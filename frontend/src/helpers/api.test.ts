/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from "chai";
import { SET_ME } from "../constants/action-types";

describe("makeRequest", () => {
  const realFetch = globalThis.fetch;
  const me = { id: 1, username: "kid", password: "old", email: "" };
  let makeRequest: typeof import("./api").makeRequest;
  let isSignInRequired: typeof import("./api").isSignInRequired;
  let alerts: string[];
  let dispatched: any[];
  let status: number;

  const stillPending = (promise: Promise<unknown>) =>
    Promise.race([
      promise.then(
        () => false,
        () => false,
      ),
      new Promise((resolve) => setTimeout(() => resolve(true), 10)),
    ]);

  before(async () => {
    (globalThis as any).window = {
      location: { host: "localhost", pathname: "/editor/5", search: "?a=1", href: "" },
      alert: (message: string) => alerts.push(message),
      store: {
        dispatch: (action: any) => dispatched.push(action),
        getState: () => ({ me }),
      },
    };
    globalThis.fetch = (async () =>
      ({ status, statusText: "", json: async () => ({ message: "Nope." }) }) as Response) as any;
    ({ makeRequest, isSignInRequired } = await import("./api"));
  });

  after(() => {
    delete (globalThis as any).window;
    globalThis.fetch = realFetch;
  });

  beforeEach(() => {
    alerts = [];
    dispatched = [];
  });

  // The redirect test comes last: once it runs, the module stays "signed out".
  it("leaves other failures to the caller", async () => {
    status = 401;
    const error = await makeRequest("/worlds").catch((e) => e);

    expect(error.message).to.equal("Nope.");
    expect(error.statusCode).to.equal(401);
    expect(alerts).to.deep.equal([]);
    expect(isSignInRequired()).to.equal(false);
  });

  it("leaves a rejected password to the login form", async () => {
    status = 403;
    const error = await makeRequest("/users/me", {
      headers: { Authorization: "Basic abc" },
    }).catch((e) => e);

    expect(error.message).to.equal("Nope.");
    expect(alerts).to.deep.equal([]);
    expect(isSignInRequired()).to.equal(false);
  });

  it("asks once for a new login when the saved one is rejected", async () => {
    status = 403;
    const requests = [makeRequest("/worlds/5"), makeRequest("/worlds?user=me")];

    expect(await stillPending(Promise.race(requests))).to.equal(true);
    expect(alerts).to.have.length(1);
    expect(isSignInRequired()).to.equal(true);
    expect(dispatched.filter((a) => a.type === SET_ME)).to.deep.equal([
      { type: SET_ME, me: null },
    ]);
    expect((globalThis as any).window.location.href).to.equal(
      `/login?redirectTo=${encodeURIComponent("/editor/5?a=1")}`,
    );
    const activity = dispatched.filter((a) => a.delta !== undefined);
    expect(activity.reduce((sum, a) => sum + a.delta, 0)).to.equal(0);
  });
});
