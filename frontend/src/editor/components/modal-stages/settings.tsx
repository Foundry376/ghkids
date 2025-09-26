import { useState } from "react";
import Button from "reactstrap/lib/Button";
import { makeRequest } from "../../../helpers/api";
import { Stage } from "../../../types";
import { STAGE_CELL_SIZE } from "../../constants/constants";
import { STAGE_ZOOM_STEPS } from "../stage/stage";

const DEFAULT_COLOR = "#005392";

export const StageSettings = ({
  stage,
  onChange,
}: {
  stage: Stage;
  onChange: (next: Partial<Stage>) => void;
}) => {
  const [backgroundPrompt, setBackgroundPrompt] = useState("");
  const [isGenerating, setGenerating] = useState(false);

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
        <div style={{ display: "flex", flexDirection: "row" }}>
          <div style={{ flex: 0.35 }}>
            <div className="form-check">
              <label className="form-check-label">
                <input
                  className="form-check-input"
                  type="radio"
                  style={{ marginRight: 5 }}
                  checked={!!backgroundAsColor}
                  onChange={() => onChange({ background: DEFAULT_COLOR })}
                  name="bgradio"
                />
                Color
              </label>
              <br />
              <input
                type="color"
                value={backgroundAsColor || DEFAULT_COLOR}
                onChange={(e) => {
                  if (e.target.value) {
                    onChange({ background: e.target.value });
                  }
                }}
              />
              {/*<PixelColorPicker
                color={backgroundAsColor}
                onColorChange={(color) => onChange({background: color})}
              />*/}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="form-check">
              <label className="form-check-label">
                <input
                  className="form-check-input"
                  type="radio"
                  style={{ marginRight: 5 }}
                  checked={!!backgroundAsURL}
                  onChange={() => onChange({ background: "url(/Layer0_2.png)" })}
                  name="bgradio"
                />
                Image
              </label>
              <br />
              <input
                type="text"
                className="form-control"
                placeholder="Paste an image URL..."
                style={{ width: "100%" }}
                defaultValue={backgroundAsURL}
                onBlur={(e) => {
                  if (e.target.value) {
                    onChange({ background: `url(${e.target.value})` });
                  }
                }}
              />
              <div style={{ marginTop: 10, display: "flex", gap: 4 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Describe a new background..."
                  value={backgroundPrompt}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Return") {
                      _onGenerateBackground();
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => setBackgroundPrompt(e.target.value)}
                />
                <Button
                  className="btn btn-primary btn-sm"
                  onClick={_onGenerateBackground}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <span style={{ whiteSpace: "nowrap" }}>
                      <i className="fa fa-spinner fa-spin" style={{ marginRight: "5px" }} />
                      Drawing...
                    </span>
                  ) : (
                    "Draw"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  );
};
