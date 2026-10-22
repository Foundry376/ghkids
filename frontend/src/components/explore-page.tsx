import React, { useCallback, useEffect, useRef, useState } from "react";

import { makeRequest } from "../helpers/api";
import { usePageTitle } from "../hooks/usePageTitle";
import { Game } from "../types";
import WorldList, { WorldListEmpty } from "./common/world-list";
import { KidButton, KidSearchField } from "./kid";

import "./app-surface.scss";

const PAGE_SIZE = 24;
/** Long enough that typing a name doesn't fire a search per letter. */
const SEARCH_DELAY_MS = 300;

/**
 * Everyone's published games, most played first. Search matches a game's
 * title or its author's username; "More Games" pages further down the list.
 */
const ExplorePage: React.FC = () => {
  const [worlds, setWorlds] = useState<Game[] | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  /** Bumped whenever the list starts over, so a late "More Games" for an older list is dropped. */
  const listVersion = useRef(0);

  usePageTitle("Public Games");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPage = useCallback(
    (offset: number) =>
      makeRequest<Game[]>(`/worlds/explore`, {
        query: { limit: PAGE_SIZE, offset, ...(query ? { q: query } : {}) },
      }),
    [query],
  );

  useEffect(() => {
    let current = true;
    listVersion.current += 1;
    setWorlds(null);
    fetchPage(0).then((page) => {
      if (current) {
        setWorlds(page);
        setHasMore(page.length === PAGE_SIZE);
      }
    });
    // A newer search replaces this one; drop its results if they arrive late.
    return () => {
      current = false;
    };
  }, [fetchPage]);

  const onMore = async () => {
    if (!worlds) return;
    const version = listVersion.current;
    setLoadingMore(true);
    try {
      const page = await fetchPage(worlds.length);
      // The search changed while this was loading: this page belongs to the
      // old list, and appending it would mix it into the new one.
      if (listVersion.current !== version) return;
      // Pages come by offset in play-count order, and every visit raises a
      // game's count, so one can climb from this page into the part already
      // shown. Skip anything we have rather than listing it twice.
      setWorlds((prev) => {
        const shown = new Set((prev ?? []).map((w) => w.id));
        return [...(prev ?? []), ...page.filter((w) => !shown.has(w.id))];
      });
      setHasMore(page.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="games-page">
      <div className="games-page__body">
        <div className="games-page__heading">
          <div className="games-page__title">
            <h1>Public Games</h1>
            <p>Games other kids have published. The most played are first.</p>
          </div>
          <KidSearchField
            className="games-page__search"
            label="Search by game or author"
            placeholder="Search by game or author"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <WorldList
          worlds={worlds}
          canEdit={false}
          showAuthor
          showPlays
          empty={
            query ? (
              <WorldListEmpty icon="search" title={`No games match \u201c${query}\u201d.`}>
                Try a different word, or part of someone&rsquo;s name.
              </WorldListEmpty>
            ) : (
              <WorldListEmpty icon="play" title="No games to play yet.">
                When kids share their games, they&rsquo;ll show up here.
              </WorldListEmpty>
            )
          }
        />
        {worlds && hasMore && (
          <div className="games-page__more">
            <KidButton size="large" busy={loadingMore} onClick={onMore}>
              {loadingMore ? "Loading more…" : "More Games"}
            </KidButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
