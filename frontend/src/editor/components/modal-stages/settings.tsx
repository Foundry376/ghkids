import { Stage } from "../../../types";

export const StageSettings = ({
  stage,
  onChange,
}: {
  stage: Stage;
  onChange: (next: Partial<Stage>) => void;
}) => {
  const { name } = stage;
  const zoomToFill = stage.zoomToFill ?? true;
  const zoomToFit = stage.zoomToFit ?? false;

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
        <legend className="col-form-legend">Zoom</legend>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            rowGap: 6,
            columnGap: 16,
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
                onChange={(e) => onChange({ zoomToFill: e.target.checked, zoomToFit })}
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
                onChange={(e) => onChange({ zoomToFill, zoomToFit: e.target.checked })}
              />
              Zoom out to fit the screen
            </label>
          </div>
        </div>
      </fieldset>
      <fieldset className="form-group" style={{ marginTop: 12 }}>
        <legend className="col-form-legend">Background</legend>
        <div className="form-check">
          <label className="form-check-label" htmlFor="backgroundFade">
            <input
              style={{ marginRight: 5 }}
              className="form-check-input"
              id="backgroundFade"
              type="checkbox"
              checked={stage.backgroundFade !== false}
              onChange={(e) => onChange({ backgroundFade: e.target.checked })}
            />
            Dim background image
          </label>
        </div>
      </fieldset>
    </div>
  );
};
