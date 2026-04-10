import { Button, Modal, ModalBody, ModalHeader } from "reactstrap";
import { useRef, useState } from "react";
import { makeRequest } from "../../../helpers/api";
import { Stage } from "../../../types";
import { STAGE_CELL_SIZE } from "../../constants/constants";
import { STAGE_ZOOM_STEPS } from "../stage/stage";

const DEFAULT_COLOR = "#005392";

const API_ROOT = window.location.host.includes("codako") ? `` : `http://localhost:8080`;

type UnsplashResult = {
  id: string;
  thumbUrl: string;
  fullUrl: string;
  downloadLocation: string;
  photographer: string;
  photographerUrl: string;
};

export const StageSettings = ({
  stage,
  onChange,
}: {
  stage: Stage;
  onChange: (next: Partial<Stage>) => void;
}) => {
  const [backgroundPrompt, setBackgroundPrompt] = useState("");
  const [isGenerating, setGenerating] = useState(false);
  const [isUploading, setUploading] = useState(false);

  // Unsplash picker state
  const [showPicker, setShowPicker] = useState(false);
  const [imageQuery, setImageQuery] = useState("");
  const [imageResults, setImageResults] = useState<UnsplashResult[]>([]);
  const [isSearching, setSearching] = useState(false);

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

  const _onSearchImages = async () => {
    if (!imageQuery.trim()) return;
    setSearching(true);
    try {
      const data = await makeRequest<{ results: UnsplashResult[] }>(
        `/search-images?query=${encodeURIComponent(imageQuery)}`,
      );
      setImageResults(data.results);
    } catch (error) {
      console.error("Unsplash search error:", error);
      alert("Failed to search images. Make sure UNSPLASH_ACCESS_KEY is configured.");
    } finally {
      setSearching(false);
    }
  };

  const _onSelectImage = (photo: UnsplashResult) => {
    onChange({ background: `url(${photo.fullUrl})` });
    // Required by Unsplash ToS — fire and forget
    makeRequest(`/trigger-unsplash-download?url=${encodeURIComponent(photo.downloadLocation)}`).catch(
      () => {},
    );
    setShowPicker(false);
    setImageResults([]);
    setImageQuery("");
  };

  const _onGenerateBackground = async () => {
    const stageName = stage.name.replace(/\s+/g, "_"); // Replace spaces with underscores

    if (!backgroundPrompt) {
      alert("Please enter a description for the background");
      return;
    }

    setGenerating(true);
    try {
      // First generate the image with OpenAI
      const fileName = `${Date.now()}-${stageName}-background`;
      const data = await makeRequest<{ imageUrl?: string; error?: string }>(
        `/generate-background?prompt=${encodeURIComponent(backgroundPrompt)}&filename=${encodeURIComponent(fileName)}`,
      );
      if (data.imageUrl) {
        // onChange({ background: `url(${data.imageUrl})` });
        // Then store it permanently in our system
        // const savedImage = await makeRequest('/api/images', {
        //   method: 'POST',
        //   json: {
        //     url: data.imageUrl,
        //     prompt: backgroundPrompt,
        //     type: 'generated'
        //   }
        // });

        // Use the permanent URL from our storage
        onChange({
          background: `url(${data.imageUrl})`,
        });
      } else {
        console.error("Failed to generate background:", data.error);
        alert("Failed to generate background. Please try again.");
      }
    } catch (error) {
      console.error("Error generating background:", error);
      alert("Error generating background. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const { width, height, scale, wrapX, wrapY, name, background } = stage;

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
      <fieldset className="form-group" style={{ marginTop: 32 }}>
        <legend className="col-form-legend">Size</legend>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
          <input
            className="form-control"
            type="number"
            defaultValue={width}
            onBlur={(e) => onChange({ width: Number(e.target.value) })}
          />
          <span style={{ paddingLeft: 10, paddingRight: 10 }}>x</span>
          <input
            className="form-control"
            type="number"
            defaultValue={height}
            onBlur={(e) => onChange({ height: Number(e.target.value) })}
          />
          <span style={{ paddingLeft: 20, paddingRight: 10 }}>Tiles:</span>
          <select
            className="form-control"
            value={scale ?? 1}
            onChange={(e) =>
              onChange({ scale: e.target.value === "fit" ? "fit" : Number(e.target.value) })
            }
          >
            <option value={"fit"}>Fit Screen</option>
            {STAGE_ZOOM_STEPS.map((s) => (
              <option value={s} key={s}>{`${Math.round(STAGE_CELL_SIZE * s)}px`}</option>
            ))}
          </select>
        </div>
      </fieldset>
      <fieldset className="form-group">
        <div style={{ display: "flex", flexDirection: "row" }}>
          <div className="form-check" style={{ flex: 1 }}>
            <label className="form-check-label" htmlFor="wrapX">
              <input
                style={{ marginRight: 5 }}
                className="form-check-input"
                id="wrapX"
                type="checkbox"
                defaultChecked={wrapX}
                onBlur={(e) => onChange({ wrapX: e.target.checked })}
              />
              Wrap Horizontally
            </label>
          </div>
          <div className="form-check" style={{ flex: 1, marginLeft: 10 }}>
            <label className="form-check-label" htmlFor="wrapY">
              <input
                className="form-check-input"
                id="wrapY"
                type="checkbox"
                defaultChecked={wrapY}
                onBlur={(e) => onChange({ wrapY: e.target.checked })}
              />
              Wrap Vertically
            </label>
          </div>
          <div className="form-check" style={{ flex: 1 }}></div>
        </div>
      </fieldset>
      <fieldset className="form-group" style={{ marginTop: 32 }}>
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
                onClick={() =>
                  onChange({ background: mode === "Color" ? DEFAULT_COLOR : "url(/Layer0_2.png)" })
                }
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
                type="text"
                className="form-control"
                placeholder="Paste an image URL..."
                style={{ flex: 1, fontSize: 13 }}
                defaultValue={displayURL}
                onBlur={(e) => {
                  if (e.target.value) onChange({ background: `url(${e.target.value})` });
                }}
              />
            </div>

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
                onClick={() => setShowPicker(true)}
                style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}
              >
                <i className="fa fa-search" />
                Search Unsplash
              </Button>
            </div>

            {/* AI generation row */}
            <div
              style={{
                display: "flex",
                gap: 8,
                padding: "10px 12px",
                background: "linear-gradient(135deg, #f5f0ff 0%, #fff0f8 100%)",
                borderRadius: 8,
                border: "1px solid #e8d8ff",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>✨</span>
              <input
                type="text"
                className="form-control"
                placeholder="Describe a background to generate with AI..."
                value={backgroundPrompt}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Return") {
                    _onGenerateBackground();
                    e.preventDefault();
                  }
                }}
                onChange={(e) => setBackgroundPrompt(e.target.value)}
                style={{ fontSize: 13, background: "rgba(255,255,255,0.7)", border: "1px solid #d8c8ff" }}
              />
              <Button
                className="btn btn-sm"
                onClick={_onGenerateBackground}
                disabled={isGenerating}
                style={{
                  whiteSpace: "nowrap",
                  background: "linear-gradient(135deg, #7c3aed, #db2777)",
                  color: "#fff",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  flexShrink: 0,
                }}
              >
                {isGenerating ? (
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
        )}
      </fieldset>

      {/* Unsplash image picker modal */}
      <Modal isOpen={showPicker} toggle={() => setShowPicker(false)} size="lg">
        <ModalHeader toggle={() => setShowPicker(false)}>Search Unsplash</ModalHeader>
        <ModalBody>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. forest, ocean, mountains, city night..."
              value={imageQuery}
              autoFocus
              onChange={(e) => setImageQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Return") {
                  _onSearchImages();
                  e.preventDefault();
                }
              }}
            />
            <Button
              className="btn btn-primary"
              onClick={_onSearchImages}
              disabled={isSearching}
              style={{ whiteSpace: "nowrap" }}
            >
              {isSearching ? (
                <span>
                  <i className="fa fa-spinner fa-spin" style={{ marginRight: "5px" }} />
                  Searching...
                </span>
              ) : (
                "Search"
              )}
            </Button>
          </div>

          {imageResults.length > 0 && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                  maxHeight: 420,
                  overflowY: "auto",
                }}
              >
                {imageResults.map((photo) => (
                  <div
                    key={photo.id}
                    style={{ cursor: "pointer", borderRadius: 6, overflow: "hidden", position: "relative" }}
                    onClick={() => _onSelectImage(photo)}
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
              <div style={{ marginTop: 10, fontSize: 11, color: "#888" }}>
                Photos from{" "}
                <a href="https://unsplash.com" target="_blank" rel="noreferrer">
                  Unsplash
                </a>
                . Click a photo to use it as your background.
              </div>
            </>
          )}

          {!isSearching && imageResults.length === 0 && imageQuery && (
            <div style={{ textAlign: "center", color: "#888", padding: "32px 0" }}>No results found.</div>
          )}

          {!imageQuery && imageResults.length === 0 && (
            <div style={{ textAlign: "center", color: "#aaa", padding: "32px 0" }}>
              Search for a background image above.
            </div>
          )}
        </ModalBody>
      </Modal>
    </div>
  );
};
