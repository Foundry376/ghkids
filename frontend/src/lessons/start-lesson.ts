import { makeRequest } from "../helpers/api";
import { Lesson } from "./lessons";

/**
 * Open a lesson: put its prebuilt world somewhere the editor can load it, then
 * hand off to the editor with the lesson's walkthrough running.
 *
 * Signed-in kids get a real world in their account, so a half-finished lesson
 * is waiting for them in My Games. Everyone else gets the same localStorage
 * world an anonymous "Create a Game" produces, which the editor offers to
 * upload once they sign up.
 */
export async function startLesson(lesson: Lesson) {
  const data = await lesson.loadWorld();
  const query = `lesson=${lesson.slug}`;

  if (window.store.getState().me) {
    const created = await makeRequest<{ id: string }>(`/worlds`, { method: "POST" });
    // action=save commits the world; without it the API would file the lesson
    // as an unsaved draft and the editor would open asking to restore it.
    await makeRequest(`/worlds/${created.id}`, {
      method: "PUT",
      query: { action: "save" },
      json: { name: lesson.worldName, data },
    });
    window.location.href = `/editor/${created.id}?${query}`;
    return;
  }

  const storageKey = `ls-${Date.now()}`;
  window.localStorage.setItem(
    storageKey,
    JSON.stringify({
      id: storageKey,
      name: lesson.worldName,
      data,
      updatedAt: new Date().toISOString(),
    }),
  );
  window.location.href = `/editor/${storageKey}?localstorage=true&${query}`;
}
