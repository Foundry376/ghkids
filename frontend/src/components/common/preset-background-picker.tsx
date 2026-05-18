import { useEffect, useState } from "react";
import { Button } from "reactstrap";
import { makeRequest } from "../../helpers/api";

interface PresetBackgroundPickerProps {
  onSelect: (backgroundUrl: string) => void;
  onSkip: () => void;
}

type Preset = { label: string; url: string };

type TaggedResponse = {
  attribution: { label: string; url: string } | null;
  images: { id: string; label: string; fullUrl: string; thumbUrl: string; featured: boolean }[];
};

const FEATURED_PROVIDER = "craftpix";
const FEATURED_COUNT = 12;

export const PresetBackgroundPicker = ({ onSelect, onSkip }: PresetBackgroundPickerProps) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [presets, setPresets] = useState<Preset[] | null>(null);
  const [attribution, setAttribution] = useState<TaggedResponse["attribution"]>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    makeRequest<TaggedResponse>(`/backgrounds/${FEATURED_PROVIDER}`)
      .then((resp) => {
        if (cancelled) return;
        const featured = resp.images.filter((i) => i.featured).slice(0, FEATURED_COUNT);
        setPresets(featured.map((i) => ({ label: i.label, url: i.fullUrl })));
        setAttribution(resp.attribution);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!presets && !error) {
    return (
      <div style={{ textAlign: "center", color: "#888", padding: "32px 0" }}>
        <i className="fa fa-spinner fa-spin" style={{ marginRight: 8 }} />
        Loading backgrounds...
      </div>
    );
  }

  if (error || !presets || presets.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ textAlign: "center", color: "#888", padding: "16px 0" }}>
          Couldn't load backgrounds. You can start with a default and pick one later.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button color="primary" onClick={onSkip}>
            Create Game
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        {presets.map((preset) => {
          const isSelected = selected === preset.url;
          return (
            <button
              key={preset.url}
              type="button"
              title={preset.label}
              onClick={() => setSelected(preset.url)}
              style={{
                position: "relative",
                padding: 0,
                border: isSelected ? "2px solid #7c3aed" : "2px solid transparent",
                borderRadius: 8,
                overflow: "hidden",
                cursor: "pointer",
                background: "none",
                aspectRatio: "16/9",
                boxShadow: isSelected
                  ? "0 0 0 2px #7c3aed44"
                  : "0 1px 3px rgba(0,0,0,0.15)",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
            >
              <img
                src={preset.url}
                alt={preset.label}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "4px 6px",
                  background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 500,
                  textAlign: "left",
                }}
              >
                {preset.label}
              </div>
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: 5,
                    right: 5,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#7c3aed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i className="fa fa-check" style={{ fontSize: 9, color: "#fff" }} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {attribution && (
        <div style={{ fontSize: 11, color: "#888", textAlign: "center" }}>
          Backgrounds from{" "}
          <a href={attribution.url} target="_blank" rel="noreferrer">
            {attribution.label}
          </a>
          .
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          type="button"
          onClick={onSkip}
          style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 14 }}
        >
          Skip, use default
        </button>
        <Button
          color="primary"
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
        >
          Create Game
        </Button>
      </div>
    </div>
  );
};
