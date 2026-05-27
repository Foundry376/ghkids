import { Button } from "reactstrap";
import { useRef, useState } from "react";
import { Stage } from "../../../types";
import { STAGE_CELL_SIZE } from "../../constants/constants";
import { STAGE_ZOOM_STEPS } from "../stage/stage";
import { ExploreBackgrounds } from "./explore-backgrounds";

const DEFAULT_COLOR = "#005392";

const API_ROOT = window.location.host.includes("codako") ? `` : `http://localhost:8080`;

export const StageSettings = ({
  stage,
  onChange,
}: {
  stage: Stage;
  onChange: (next: Partial<Stage>) => void;
}) => {
  const [isUploading, setUploading] = useState(false);
  const [savedImageUrl, setSavedImageUrl] = useState(
    (/url\((.*)\)/.exec(stage.background) || [])[1]?.replace(/^['"]|['"]$/g, "") ?? "",
  );

  const [showExplore, setShowExplore] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const _onUploadBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const me = window.store.getState().me;
      const formData = new FormData();
      formData.append("image", file);

      const resp = await fetch(`${API_ROOT}/upload-image`, {
        method: "POST",
        headers: {
          Authorization: me && `Basic ${btoa(me.username + ":" + me.password)}`,
        },
        body: formData,
      });
      const data = await resp.json();
      if (data.publicUrl) {
        setSavedImageUrl(data.publicUrl);
        onChange({ background: `url(${data.publicUrl})` });
      } else {
        alert("Failed to upload image. Please try again.");
      }
    } catch (error) {
      console.error("Error uploading background:", error);
      alert("Error uploading image. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const _onSelectExploredBackground = (url: string) => {
    setSavedImageUrl(url);
    onChange({ background: `url(${url})` });
  };

  const { scale, name, background } = stage;
  // Legacy `scale: "fit"` maps to the new zoomToFill + zoomToFit checkboxes; the
  // tile-size dropdown defaults to 1.0 (40px) in that case.
  const tileScale = scale === "fit" ? 1 : (scale ?? 1);
  const zoomToFill = scale === "fit" ? true : (stage.zoomToFill ?? true);
  const zoomToFit = scale === "fit" ? true : (stage.zoomToFit ?? false);

  const backgroundAsURL = (/url\((.*)\)/.exec(background) || [])[1];
  const backgroundAsColor = backgroundAsURL ? null : background;

  // Strip quotes that may exist in older saved worlds (e.g. url('/src/...'))
  const cleanedURL = backgroundAsURL?.replace(/^['"]|['"]$/g, "") ?? "";
  // Don't expose internal built-in layer paths in the URL input — they're Vite asset paths
  // that are meaningless to users and cause errors if re-saved
  const isBuiltinBg = cleanedURL.includes("Layer0_") || cleanedURL.includes("Layer1_");
  const displayURL = isBuiltinBg ? "" : cleanedURL;

  return (
    <div>
      <fieldset className="form-group">
        <legend className="col-form-legend">Name</legend>
        <input
          type="text"
          placeholder="Untitled"
          defaultValue={name}
          className="form-control"
          onBlur={(e) => onChange({ name: e.target.value })}
        />
      </fieldset>
      <fieldset className="form-group" style={{ marginTop: 12 }}>
        <legend className="col-form-legend">Tile size</legend>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
          <select
            className="form-control"
            value={tileScale}
            onChange={(e) =>
              onChange({
                scale: Number(e.target.value),
                zoomToFill,
                zoomToFit,
              })
            }
          >
            {STAGE_ZOOM_STEPS.map((s) => (
              <option value={s} key={s}>{`${Math.round(STAGE_CELL_SIZE * s)}px`}</option>
            ))}
          </select>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            rowGap: 6,
            columnGap: 16,
            marginTop: 12,
          }}
        >
          <div className="form-check">
            <label className="form-check-label" htmlFor="zoomToFill">
              <input
                style={{ marginRight: 5 }}
                className="form-check-input"
                id="zoomToFill"
                type="checkbox"
                checked={zoomToFill}
                onChange={(e) =>
                  onChange({ scale: tileScale, zoomToFill: e.target.checked, zoomToFit })
                }
              />
              Zoom in to fill the screen
            </label>
          </div>
          <div className="form-check">
            <label className="form-check-label" htmlFor="zoomToFit">
              <input
                style={{ marginRight: 5 }}
                className="form-check-input"
                id="zoomToFit"
                type="checkbox"
                checked={zoomToFit}
                onChange={(e) =>
                  onChange({ scale: tileScale, zoomToFill, zoomToFit: e.target.checked })
                }
              />
              Zoom out to fit the screen
            </label>
          </div>
        </div>
      </fieldset>
      <fieldset className="form-group" style={{ marginTop: 12 }}>
        <legend className="col-form-legend">Background</legend>

        {/* Mode toggle */}
        <div
          style={{
            display: "inline-flex",
            background: "#f0f0f0",
            borderRadius: 8,
            padding: 3,
            marginBottom: 16,
            gap: 2,
          }}
        >
          {(["Color", "Image"] as const).map((mode) => {
            const active = mode === "Color" ? !!backgroundAsColor : !!backgroundAsURL;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  if (mode === "Color") {
                    if (backgroundAsURL) setSavedImageUrl(displayURL || cleanedURL);
                    onChange({ background: DEFAULT_COLOR });
                  } else {
                    onChange({ background: savedImageUrl ? `url(${savedImageUrl})` : "url(/Layer0_2.png)" });
                  }
                }}
                style={{
                  padding: "6px 18px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: active ? 600 : 400,
                  fontSize: 14,
                  background: active ? "#fff" : "transparent",
                  color: active ? "#111" : "#666",
                  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {mode}
              </button>
            );
          })}
        </div>

        {/* Color mode */}
        {backgroundAsColor && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label
              style={{
                width: 56,
                height: 40,
                borderRadius: 8,
                border: "2px solid #ddd",
                cursor: "pointer",
                overflow: "hidden",
                display: "block",
                position: "relative",
              }}
              title="Pick a color"
            >
              <span
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  background: backgroundAsColor,
                }}
              />
              <input
                type="color"
                value={backgroundAsColor || DEFAULT_COLOR}
                onChange={(e) => {
                  if (e.target.value) onChange({ background: e.target.value });
                }}
                style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", top: 0, left: 0, cursor: "pointer" }}
              />
            </label>
            <span style={{ fontSize: 13, color: "#555", fontFamily: "monospace" }}>
              {backgroundAsColor}
            </span>
          </div>
        )}

        {/* Image mode */}
        {backgroundAsURL && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Current image preview + URL */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {displayURL && (
                <img
                  src={displayURL}
                  alt="Current background"
                  style={{
                    width: 64,
                    height: 40,
                    objectFit: "cover",
                    borderRadius: 6,
                    border: "1px solid #ddd",
                    flexShrink: 0,
                  }}
                />
              )}
              <input
                key={savedImageUrl}
                type="text"
                className="form-control"
                placeholder="Paste an image URL..."
                style={{ flex: 1, fontSize: 13 }}
                defaultValue={savedImageUrl || displayURL}
                onBlur={(e) => {
                  if (e.target.value) {
                    setSavedImageUrl(e.target.value);
                    onChange({ background: `url(${e.target.value})` });
                  }
                }}
              />
            </div>

            {/* Fade toggle */}
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                userSelect: "none",
                fontSize: 13,
                color: "#444",
              }}
            >
              <span
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: 36,
                  height: 20,
                  flexShrink: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={stage.backgroundFade !== false}
                  onChange={(e) => onChange({ backgroundFade: e.target.checked })}
                  style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
                />
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 20,
                    background: stage.backgroundFade !== false ? "#7c3aed" : "#ccc",
                    transition: "background 0.2s",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: stage.backgroundFade !== false ? 18 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    transition: "left 0.2s",
                  }}
                />
              </span>
              <span>
                <span style={{ fontWeight: 500 }}>Dim background</span>
                <span style={{ color: "#888", marginLeft: 5 }}>
                  {stage.backgroundFade !== false ? "On" : "Off"}
                </span>
              </span>
            </label>

            {/* Action row */}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={_onUploadBackground}
              />
              <Button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}
              >
                <i className={`fa ${isUploading ? "fa-spinner fa-spin" : "fa-upload"}`} />
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
              <Button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setShowExplore(true)}
                style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}
              >
                <i className="fa fa-search" />
                Explore backgrounds
              </Button>
            </div>
          </div>
        )}
      </fieldset>

      <ExploreBackgrounds
        isOpen={showExplore}
        toggle={() => setShowExplore(false)}
        stageName={stage.name}
        onSelect={(sel) => _onSelectExploredBackground(sel.fullUrl)}
      />
    </div>
  );
};
