import { expect } from "chai";

import { DEFAULT_POST_AUTH_PATH, postAuthPath } from "./post-auth-path";

const ORIGIN = "https://www.codako.org";

describe("postAuthPath", () => {
  it("follows paths within Codako, keeping the query", () => {
    expect(postAuthPath("/dashboard", ORIGIN)).to.equal("/dashboard");
    expect(postAuthPath("/join-send-world?storageKey=ls-1", ORIGIN)).to.equal(
      "/join-send-world?storageKey=ls-1",
    );
  });

  it("goes home when there's nowhere to go", () => {
    expect(postAuthPath("", ORIGIN)).to.equal(DEFAULT_POST_AUTH_PATH);
    expect(postAuthPath(null, ORIGIN)).to.equal(DEFAULT_POST_AUTH_PATH);
    expect(postAuthPath(undefined, ORIGIN)).to.equal(DEFAULT_POST_AUTH_PATH);
  });

  it("never leaves Codako", () => {
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/\t/evil.com",
      "/\n/evil.com",
      "/\r/evil.com",
      "javascript:alert(1)",
      "evil.com",
    ]) {
      expect(postAuthPath(bad, ORIGIN), JSON.stringify(bad)).to.equal(DEFAULT_POST_AUTH_PATH);
    }
  });
});
