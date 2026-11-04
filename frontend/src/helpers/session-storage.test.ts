/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from "chai";
import { SET_ME } from "../constants/action-types";
import { getInitialState, legacyPassword, sessionStorageMiddleware } from "./session-storage";

describe("session-storage", () => {
  const setCookie = (value: object | string) => {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    (globalThis as any).document = { cookie: `session=${encodeURIComponent(text)}` };
  };

  afterEach(() => {
    delete (globalThis as any).document;
  });

  it("reads the profile the API set", () => {
    setCookie({ me: { id: 7, username: "kid" } });

    expect(getInitialState()).to.deep.equal({ me: { id: 7, username: "kid" } });
    expect(legacyPassword()).to.equal(undefined);
  });

  it("keeps a password from an old cookie out of the initial state", () => {
    setCookie({ me: { id: 7, username: "kid", password: "secret", email: "" } });

    expect(getInitialState()).to.deep.equal({ me: { id: 7, username: "kid" } });
    expect(legacyPassword()).to.equal("secret");
  });

  it("treats no cookie, or a broken one, as signed out", () => {
    (globalThis as any).document = { cookie: "" };
    expect(getInitialState()).to.equal(null);

    setCookie("{not json");
    expect(getInitialState()).to.equal(null);
    expect(legacyPassword()).to.equal(undefined);
  });

  it("removes the cookie on sign out, and only then", () => {
    setCookie({ me: { id: 7, username: "kid" } });
    const cookieBefore = (globalThis as any).document.cookie;
    const dispatch = sessionStorageMiddleware()((action: any) => action);

    dispatch({ type: SET_ME, me: { id: 7, username: "kid" } });
    dispatch({ type: "SOMETHING_ELSE" });
    expect((globalThis as any).document.cookie).to.equal(cookieBefore);

    dispatch({ type: SET_ME, me: null });
    expect((globalThis as any).document.cookie).to.match(/^session=;/);
  });
});

describe("upgradeLegacySession", () => {
  const realFetch = globalThis.fetch;
  const me = { id: 7, username: "kid" };
  let upgradeLegacySession: typeof import("../actions/main-actions").upgradeLegacySession;
  let dispatched: any[];
  let requests: { url: string; init: RequestInit }[];
  let respond: () => Promise<unknown>;

  const run = () =>
    upgradeLegacySession()((action: any) => dispatched.push(action), () => ({ me }) as any);

  before(async () => {
    (globalThis as any).window = {
      location: { host: "localhost:5173", hostname: "localhost" },
      store: { dispatch: () => {}, getState: () => ({ me }) },
    };
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      requests.push({ url, init });
      return respond();
    }) as any;
    ({ upgradeLegacySession } = await import("../actions/main-actions"));
  });

  after(() => {
    delete (globalThis as any).window;
    globalThis.fetch = realFetch;
  });

  beforeEach(() => {
    dispatched = [];
    requests = [];
    (globalThis as any).document = {
      cookie: `session=${encodeURIComponent(JSON.stringify({ me: { ...me, password: "secret" } }))}`,
    };
  });

  afterEach(() => {
    delete (globalThis as any).document;
  });

  it("trades the saved password for a session", async () => {
    respond = async () => ({ status: 200, json: async () => me });
    await run();

    expect(requests[0].url).to.equal("http://localhost:8080/sessions");
    expect(requests[0].init.method).to.equal("POST");
    expect((requests[0].init.headers as any).Authorization).to.equal(
      `Basic ${btoa("kid:secret")}`,
    );
    expect(dispatched).to.deep.equal([]);
  });

  it("does nothing for a browser that's already upgraded", async () => {
    (globalThis as any).document = {
      cookie: `session=${encodeURIComponent(JSON.stringify({ me }))}`,
    };
    await run();

    expect(requests).to.deep.equal([]);
  });

  it("signs out when the saved password no longer works", async () => {
    respond = async () => ({ status: 403, json: async () => ({ message: "Nope." }) });
    await run();

    expect(dispatched).to.deep.equal([{ type: SET_ME, me: null }]);
  });

  it("stays signed in to try again when the network is down", async () => {
    respond = async () => {
      throw new TypeError("Failed to fetch");
    };
    await run();

    expect(dispatched).to.deep.equal([]);
  });
});
