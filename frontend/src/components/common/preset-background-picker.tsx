import { useState } from "react";
import { Button } from "reactstrap";
import { PRESET_BACKGROUNDS } from "../../editor/constants/preset-backgrounds";

interface PresetBackgroundPickerProps {
  onSelect: (backgroundUrl: string) => void;
  onSkip: () => void;
}

export const PresetBackgroundPicker = ({ onSelect, onSkip }: PresetBackgroundPickerProps) => {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        {PRESET_BACKGROUNDS.map((preset) => {
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
                src={`${preset.url}?w=300&auto=format&fit=crop`}
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
