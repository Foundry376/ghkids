import { Button, Col, Container, Input, Row } from "reactstrap";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { makeRequest } from "../helpers/api";
import { usePageTitle } from "../hooks/usePageTitle";
import { Game } from "../types";
import WorldList from "./common/world-list";

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

  usePageTitle("Published Games");

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
      setWorlds((prev) => [...(prev ?? []), ...page]);
      setHasMore(page.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Container style={{ marginTop: 30 }} className="explore">
      <Row>
        <Col md={12}>
          <div className="card card-body">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h5 style={{ flex: 1, margin: 0 }}>Published Games</h5>
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by game or author"
                aria-label="Search by game or author"
                style={{ maxWidth: 260 }}
              />
            </div>
            <hr />
            <WorldList
              worlds={worlds}
              onDeleteWorld={() => {}}
              onDuplicateWorld={() => {}}
              canEdit={false}
              showAuthorAndPlays
              emptyText={query ? `No published games match "${query}".` : undefined}
            />
            {worlds && hasMore && (
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <Button outline disabled={loadingMore} onClick={onMore}>
                  {loadingMore ? "Loading…" : "More Games"}
                </Button>
              </div>
            )}
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default ExplorePage;
