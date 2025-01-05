export function buildActorPath(worldId, stageId, actorId) {
  return { worldId, stageId, actorId };
}

export function nullActorPath() {
  return { worldId: null, stageId: null, actorId: null };
}

export function pointIsOutside({ x, y }, { xmin, xmax, ymin, ymax }) {
  return x < xmin || x > xmax || y < ymin || y > ymax;
}

export function pointIsInside(...args) {
  return !pointIsOutside(...args);
}

export function pointByAdding({ x, y }, { x: dx, y: dy }) {
  return { x: x + dx, y: y + dy };
}

export function shuffleArray(d) {
  for (let c = d.length - 1; c > 0; c--) {
    const b = Math.floor(Math.random() * (c + 1));
    const a = d[c];
    d[c] = d[b];
    d[b] = a;
  }
  return d;
}

export function getVariableValue(actor, character, id) {
  if (actor.variableValues[id] !== undefined) {
    return actor.variableValues[id] / 1;
  }
  if (character.variables[id] !== undefined) {
    return character.variables[id].defaultValue / 1;
  }
  return null;
}

export function toV2Condition(id, condition) {
  if (!condition) {
    return null;
  }
  if (condition.type) {
    return condition; // v2 already
  }
  if (id === "appearance" || id === "transform") {
    return { ...condition, comparator: "=", value: {}, type: id };
  }
  return { ...condition, value: {}, type: "variable", variableId: id };
}

export function applyVariableOperation(existing, operation, value) {
  if (operation === "add") {
    return existing / 1 + value / 1;
  }
  if (operation === "subtract") {
    return existing / 1 - value / 1;
  }
  if (operation === "set") {
    return value / 1;
  }

  throw new Error(`applyVariableOperation unknown operation ${operation}`);
}

export function findRule(node, id) {
  for (let idx = 0; idx < node.rules.length; idx++) {
    const n = node.rules[idx];
    if (n.id === id) {
      return [n, node, idx];
    } else if (n.rules) {
      const rval = findRule(n, id);
      if (rval) {
        return rval;
      }
    }
  }
  return null;
}

export function getStageScreenshot(stage, { size }) {
  const { characters } = window.editorStore.getState();

  const scale = Math.min(size / (stage.width * 40), size / (stage.height * 40));
  const pxPerSquare = Math.round(40 * scale);

  const canvas = document.createElement("canvas");
  canvas.width = stage.width * pxPerSquare;
  canvas.height = stage.height * pxPerSquare;
  const context = canvas.getContext("2d");

  if (stage.background.includes("url(")) {
    const background = new Image();
    background.src = stage.background.split("url(").pop().slice(0, -1);
    context.drawImage(background, 0, 0, canvas.width, canvas.height);
  } else {
    context.fillStyle = stage.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  Object.values(stage.actors).forEach((actor) => {
    const i = new Image();
    i.src =
      characters[actor.characterId].spritesheet.appearances[actor.appearance];
    context.drawImage(
      i,
      Math.floor(actor.position.x * pxPerSquare),
      Math.floor(actor.position.y * pxPerSquare),
      pxPerSquare,
      pxPerSquare
    );
  });

  return canvas.toDataURL("image/jpeg", 0.8);
}
