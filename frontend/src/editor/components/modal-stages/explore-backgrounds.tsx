import { useEffect, useState } from "react";
import { Button, Modal, ModalBody, ModalHeader } from "reactstrap";
import { makeRequest } from "../../../helpers/api";
import {
  BACKGROUND_PROVIDERS,
  BackgroundProvider,
} from "../../constants/background-providers";

export type SelectedBackground = {
  fullUrl: string;
  // Providers that require post-selection bookkeeping (e.g. Unsplash download
  // tracking) can pass a hook the parent doesn't need to know about.
  onAfterSelect?: () => void;
};

type TaggedImage = {
  id: string;
  label: string;
  fullUrl: string;
  thumbUrl: string;
  tags: string[];
  featured: boolean;
};

type TaggedResponse = {
  provider: string;
  attribution: { label: string; url: string } | null;
  tags: string[];
  images: TaggedImage[];
};

type UnsplashResult = {
  id: string;
  thumbUrl: string;
  fullUrl: string;
  downloadLocation: string;
  photographer: string;
  photographerUrl: string;
};

const ALL_TAG = "__all__";

const Attribution = ({ provider }: { provider: BackgroundProvider }) => {
  if (!provider.attribution) return null;
  return (
    <div style={{ marginTop: 10, fontSize: 11, color: "#888" }}>
      Backgrounds from{" "}
      <a href={provider.attribution.url} target="_blank" rel="noreferrer">
        {provider.attribution.label}
      </a>
      .
    </div>
  );
};

const TaggedPanel = ({
  provider,
  onSelect,
}: {
  provider: BackgroundProvider;
  onSelect: (image: TaggedImage) => void;
}) => {
  const [data, setData] = useState<TaggedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string>(ALL_TAG);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    makeRequest<TaggedResponse>(`/backgrounds/${provider.key}`)
      .then((resp) => {
        if (cancelled) return;
        setData(resp);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [provider.key]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", color: "#888", padding: "32px 0" }}>
        <i className="fa fa-spinner fa-spin" style={{ marginRight: 8 }} />
        Loading backgrounds...
      </div>
    );
  }
  if (error || !data) {
    return (
      <div style={{ textAlign: "center", color: "#a00", padding: "32px 0" }}>
        Failed to load backgrounds.
      </div>
    );
  }

  const visible =
    activeTag === ALL_TAG
      ? data.images
      : data.images.filter((img) => img.tags.includes(activeTag));

  return (
    <>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 16,
        }}
      >
        {[ALL_TAG, ...data.tags].map((tag) => {
          const isActive = tag === activeTag;
          const label = tag === ALL_TAG ? "All" : tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag)}
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                border: isActive ? "1px solid #7c3aed" : "1px solid #ddd",
                background: isActive ? "#7c3aed" : "#fff",
                color: isActive ? "#fff" : "#333",
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div style={{ textAlign: "center", color: "#888", padding: "32px 0" }}>
          No backgrounds with this tag.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            maxHeight: 420,
            overflowY: "auto",
          }}
        >
          {visible.map((img) => (
            <div
              key={img.id}
              style={{ cursor: "pointer", borderRadius: 6, overflow: "hidden" }}
              onClick={() => onSelect(img)}
              title={img.label}
            >
              <img
                src={img.thumbUrl}
                alt={img.label}
                style={{
                  width: "100%",
                  height: 100,
                  objectFit: "cover",
                  display: "block",
                  transition: "opacity 0.15s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = "0.8")}
                onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
              />
              <div
                style={{
                  fontSize: 10,
                  color: "#555",
                  padding: "3px 4px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {img.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {data.attribution && (
        <div style={{ marginTop: 10, fontSize: 11, color: "#888" }}>
          Backgrounds from{" "}
          <a href={data.attribution.url} target="_blank" rel="noreferrer">
            {data.attribution.label}
          </a>
          .
        </div>
      )}
    </>
  );
};

const SearchPanel = ({
  provider,
  onSelect,
}: {
  provider: BackgroundProvider;
  onSelect: (sel: SelectedBackground) => void;
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnsplashResult[]>([]);
  const [searching, setSearching] = useState(false);

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const data = await makeRequest<{ results: UnsplashResult[] }>(
        `/search-images?query=${encodeURIComponent(query)}`,
      );
      setResults(data.results);
    } catch (e) {
      console.error("Unsplash search error:", e);
      alert("Failed to search images. Make sure UNSPLASH_ACCESS_KEY is configured.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. forest, ocean, mountains, city night..."
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              runSearch();
              e.preventDefault();
            }
          }}
        />
        <Button
          className="btn btn-primary"
          onClick={runSearch}
          disabled={searching}
          style={{ whiteSpace: "nowrap" }}
        >
          {searching ? (
            <span>
              <i className="fa fa-spinner fa-spin" style={{ marginRight: 5 }} />
              Searching...
            </span>
          ) : (
            "Search"
          )}
        </Button>
      </div>

      {results.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            maxHeight: 420,
            overflowY: "auto",
          }}
        >
          {results.map((photo) => (
            <div
              key={photo.id}
              style={{ cursor: "pointer", borderRadius: 6, overflow: "hidden" }}
              onClick={() =>
                onSelect({
                  fullUrl: photo.fullUrl,
                  onAfterSelect: () => {
                    // Required by Unsplash ToS — fire and forget.
                    makeRequest(
                      `/trigger-unsplash-download?url=${encodeURIComponent(photo.downloadLocation)}`,
                    ).catch(() => {});
                  },
                })
              }
              title={`Photo by ${photo.photographer}`}
            >
              <img
                src={photo.thumbUrl}
                alt={`Photo by ${photo.photographer}`}
                style={{
                  width: "100%",
                  height: 100,
                  objectFit: "cover",
                  display: "block",
                  transition: "opacity 0.15s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = "0.8")}
                onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
              />
              <div
                style={{
                  fontSize: 10,
                  color: "#555",
                  padding: "3px 4px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {photo.photographer}
              </div>
            </div>
          ))}
        </div>
      )}

      {!searching && results.length === 0 && query && (
        <div style={{ textAlign: "center", color: "#888", padding: "32px 0" }}>
          No results found.
        </div>
      )}
      {!query && results.length === 0 && (
        <div style={{ textAlign: "center", color: "#aaa", padding: "32px 0" }}>
          Search for a background image above.
        </div>
      )}

      <Attribution provider={provider} />
    </>
  );
};

const GeneratePanel = ({
  stageName,
  onSelect,
}: {
  stageName: string;
  onSelect: (sel: SelectedBackground) => void;
}) => {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const run = async () => {
    if (!prompt.trim()) {
      alert("Please enter a description for the background");
      return;
    }
    setGenerating(true);
    try {
      const safeName = stageName.replace(/\s+/g, "_");
      const fileName = `${Date.now()}-${safeName}-background`;
      const data = await makeRequest<{ imageUrl?: string; error?: string }>(
        `/generate-background?prompt=${encodeURIComponent(prompt)}&filename=${encodeURIComponent(fileName)}`,
      );
      if (data.imageUrl) {
        onSelect({ fullUrl: data.imageUrl });
      } else {
        console.error("Failed to generate background:", data.error);
        alert("Failed to generate background. Please try again.");
      }
    } catch (e) {
      console.error("Error generating background:", e);
      alert("Error generating background. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "20px",
        background: "linear-gradient(135deg, #f5f0ff 0%, #fff0f8 100%)",
        borderRadius: 8,
        border: "1px solid #e8d8ff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 20 }}>✨</span>
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          Describe a background for the AI to draw
        </div>
      </div>
      <textarea
        className="form-control"
        rows={3}
        placeholder="e.g. a misty forest with tall trees and soft morning light..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        style={{
          fontSize: 13,
          background: "rgba(255,255,255,0.7)",
          border: "1px solid #d8c8ff",
          resize: "vertical",
        }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          className="btn"
          onClick={run}
          disabled={generating}
          style={{
            background: "linear-gradient(135deg, #7c3aed, #db2777)",
            color: "#fff",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {generating ? (
            <>
              <i className="fa fa-spinner fa-spin" />
              Drawing...
            </>
          ) : (
            "Generate"
          )}
        </Button>
      </div>
    </div>
  );
};

export const ExploreBackgrounds = ({
  isOpen,
  toggle,
  stageName,
  onSelect,
}: {
  isOpen: boolean;
  toggle: () => void;
  stageName: string;
  onSelect: (sel: SelectedBackground) => void;
}) => {
  const [activeKey, setActiveKey] = useState<string>(BACKGROUND_PROVIDERS[0].key);
  const active =
    BACKGROUND_PROVIDERS.find((p) => p.key === activeKey) ?? BACKGROUND_PROVIDERS[0];

  const handleSelect = (sel: SelectedBackground) => {
    onSelect(sel);
    sel.onAfterSelect?.();
    toggle();
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>Explore backgrounds</ModalHeader>
      <ModalBody>
        <div
          style={{
            display: "flex",
            gap: 2,
            borderBottom: "1px solid #eee",
            marginBottom: 16,
          }}
        >
          {BACKGROUND_PROVIDERS.map((p) => {
            const isActive = p.key === activeKey;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setActiveKey(p.key)}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#7c3aed" : "#666",
                  borderBottom: isActive ? "2px solid #7c3aed" : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {active.kind === "tagged" && (
          <TaggedPanel
            provider={active}
            onSelect={(img) => handleSelect({ fullUrl: img.fullUrl })}
          />
        )}
        {active.kind === "search" && (
          <SearchPanel provider={active} onSelect={handleSelect} />
        )}
        {active.kind === "generate" && (
          <GeneratePanel stageName={stageName} onSelect={handleSelect} />
        )}
      </ModalBody>
    </Modal>
  );
};
