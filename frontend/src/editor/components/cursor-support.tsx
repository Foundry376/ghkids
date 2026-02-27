import { useLayoutEffect } from "react";
import { useEditorSelector } from "../../hooks/redux";
import { TOOLS } from "../constants/constants";
import { defaultAppearanceId } from "../utils/character-helpers";
import { getCurrentStage } from "../utils/selectors";
import { DEFAULT_APPEARANCE_INFO, SPRITE_TRANSFORM_CSS } from "./sprites/sprite";

const IMAGES = {
  STAMP: new URL("../img/cursor_stamp.png", import.meta.url).href,
  PAINT: new URL("../img/cursor_paint.png", import.meta.url).href,
  TRASH: new URL("../img/cursor_trashcan.png", import.meta.url).href,
  RECORD: new URL("../img/cursor_rule.png", import.meta.url).href,
  IGNORE_SQUARE: new URL("../img/cursor_ignored_square.png", import.meta.url).href,
  CURSOR_STAMP_RULE: new URL("../img/cursor_stamp_rule.png", import.meta.url).href,
  ADD_CLICK_CONDITION: new URL("../img/cursor_add_click_condition.png", import.meta.url).href,
  CREATE_CHARACTER: new URL("../img/cursor_create_character.png", import.meta.url).href,
};

/** All our normal cursors are done via css ala `tool-stamp`, `tool-record`.
 * The stamp cursor changes once you pick up a character. This adds a temporary
 * stylesheet to the page containing the cursor on-the-fly and then deletes it
 * when you exit the mode.
 */
const cursorEl =
  (document.getElementById("cursor-img") as HTMLImageElement) || document.createElement("img");
cursorEl.id = "cursor-img";
cursorEl.style.top = "0px";
cursorEl.style.left = "0px";
cursorEl.style.pointerEvents = "none";
cursorEl.style.zIndex = "1000";
cursorEl.style.position = "absolute";
cursorEl.onload = () => {
  updateCursor();
};
document.body.appendChild(cursorEl);

const lastPoint: { x: number; y: number } = { x: 0, y: 0 };
document.addEventListener("mousemove", (e) => {
  lastPoint.x = e.clientX;
  lastPoint.y = e.clientY;
  updateCursor();
});

function updateCursor() {
  if (!cursorEl.getAttribute("src")) {
    return;
  }
  // We need this to follow the cursor as fast as possible, so no React to see here.
  cursorEl.style.top = `${lastPoint.y}px`;
  cursorEl.style.left = `${lastPoint.x}px`;
  const overEl = document.elementFromPoint(lastPoint.x, lastPoint.y);
  const toolEl = overEl instanceof HTMLElement ? overEl.closest(".tool-supported") : null;
  cursorEl.style.display = toolEl ? "initial" : "none";

  let zoom = 1;
  if (cursorEl.dataset.toolIsStageItem === "true") {
    const stageZoomEl = overEl instanceof HTMLElement ? overEl.closest("[data-stage-zoom]") : null;
    if (stageZoomEl instanceof HTMLElement) {
      zoom = Number(stageZoomEl.dataset["stageZoom"] ?? 1);
    }
  }
  cursorEl.style.width = `${cursorEl.naturalWidth * zoom}px`;
  cursorEl.style.height = `${cursorEl.naturalHeight * zoom}px`;
}

export const StampCursorSupport = () => {
  const stage = useEditorSelector((state) => getCurrentStage(state));
  const characters = useEditorSelector((state) => state.characters);
  const { selectedToolId, stampToolItem } = useEditorSelector((state) => state.ui);

  useLayoutEffect(() => {
    cursorEl.style.transformOrigin = "0%,0%";
    cursorEl.style.transform = "translate(-50%, -50%)";
    cursorEl.dataset.toolIsStageItem = `false`;

    if (selectedToolId == TOOLS.STAMP && stampToolItem) {
      cursorEl.dataset.toolIsStageItem = `true`;

      if ("characterId" in stampToolItem) {
        const spritesheet = characters[stampToolItem.characterId]?.spritesheet;
        if (spritesheet) {
          const appearanceId =
            "appearanceId" in stampToolItem
              ? stampToolItem.appearanceId
              : defaultAppearanceId(spritesheet);
          cursorEl.setAttribute("src", spritesheet.appearances[appearanceId][0]);
        }
      } else if ("actorIds" in stampToolItem && stampToolItem.actorIds) {
        const actor = stage?.actors[stampToolItem.actorIds[0]];
        const character = actor && characters[actor.characterId];

        if (actor && character) {
          const { appearances, appearanceInfo } = character.spritesheet;
          const info = appearanceInfo?.[actor.appearance] || DEFAULT_APPEARANCE_INFO;
          cursorEl.setAttribute("src", appearances[actor.appearance][0]);

          const tx = ((info.anchor.x + 0.5) / info.width) * 100;
          const ty = ((info.anchor.y + 0.5) / info.height) * 100;
          cursorEl.style.transformOrigin = `${tx}% ${ty}%`;
          cursorEl.style.transform = `${SPRITE_TRANSFORM_CSS[actor.transform ?? "0"]} translate(-${tx}%, -${ty}%)`;
        }
      } else if ("ruleId" in stampToolItem) {
        cursorEl.setAttribute("src", IMAGES.CURSOR_STAMP_RULE);
      }
    } else if (selectedToolId == TOOLS.STAMP) {
      cursorEl.setAttribute("src", IMAGES.STAMP);
    } else if (selectedToolId == TOOLS.PAINT) {
      cursorEl.setAttribute("src", IMAGES.PAINT);
    } else if (selectedToolId == TOOLS.TRASH) {
      cursorEl.setAttribute("src", IMAGES.TRASH);
    } else if (selectedToolId == TOOLS.RECORD) {
      cursorEl.setAttribute("src", IMAGES.RECORD);
    } else if (selectedToolId == TOOLS.IGNORE_SQUARE) {
      cursorEl.setAttribute("src", IMAGES.IGNORE_SQUARE);
    } else if (selectedToolId == TOOLS.ADD_CLICK_CONDITION) {
      cursorEl.setAttribute("src", IMAGES.ADD_CLICK_CONDITION);
    } else if (selectedToolId == TOOLS.CREATE_CHARACTER) {
      cursorEl.setAttribute("src", IMAGES.CREATE_CHARACTER);
    } else {
      cursorEl.style.display = "none";
      cursorEl.removeAttribute("src");
    }
  }, [selectedToolId, stampToolItem, characters, stage?.actors]);

  return <span />;
};
