import { expect } from "chai";
import { makeActor, makeCharacter, makeEventGroup, makeRule } from "./__tests__/test-fixtures";
import { soundUrlsForCharacters } from "./sound-player";

describe("soundUrlsForCharacters", () => {
  const ruleWithSounds = (id: string, urls: string[]) =>
    makeRule({
      id,
      mainActorId: "rule-actor",
      actors: { "rule-actor": makeActor({ id: "rule-actor", characterId: "char-1" }) },
      actions: urls.map((url) => ({ type: "sound" as const, url, name: url })),
    });

  it("collects sound URLs from rules nested in groups, once each", () => {
    const characters = {
      "char-1": makeCharacter({
        id: "char-1",
        rules: [
          ruleWithSounds("top", ["/sound-library/coin.mp3"]),
          makeEventGroup({
            id: "idle",
            event: "idle",
            rules: [
              ruleWithSounds("nested", ["/sound-library/jump.mp3", "/sound-library/coin.mp3"]),
            ],
          }),
        ],
      }),
      "char-2": makeCharacter({ id: "char-2" }),
    };

    expect([...soundUrlsForCharacters(characters)]).to.deep.equal([
      "/sound-library/coin.mp3",
      "/sound-library/jump.mp3",
    ]);
  });
});
