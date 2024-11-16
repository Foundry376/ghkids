import React from 'react'; import PropTypes from 'prop-types';
// import PixelColorPicker from '../modal-paint/pixel-color-picker';

export default class StageSettings extends React.Component {
  static propTypes = {
    stage: PropTypes.object,
    onChange: PropTypes.func,
  };

  render() {
    const {stage: {width, height, wrapX, wrapY, name, background}, onChange} = this.props;

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
            onBlur={(e) => onChange({name: e.target.value})}
          />
        </fieldset>
        <fieldset className="form-group">
          <legend className="col-form-legend">Size</legend>
          <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
            <input
              className="form-control"
              type="number"
              defaultValue={width}
              onBlur={(e) => onChange({width: e.target.value / 1})}
            />
            <span style={{paddingLeft: 10, paddingRight: 10}}>x</span>
            <input
              className="form-control"
              type="number"
              defaultValue={height}
              onBlur={(e) => onChange({height: e.target.value / 1})}
            />
          </div>
        </fieldset>
        <fieldset className="form-group">
          <legend className="col-form-legend">Wrapping</legend>
          <div style={{display: 'flex', flexDirection: 'row'}}>
            <label className="form-check-label" htmlFor="wrapX" style={{flex: 1}}>
              <input
                style={{marginRight: 5}}
                className="form-check-input"
                id="wrapX"
                type="checkbox"
                defaultChecked={wrapX}
                onBlur={(e) => onChange({wrapX: e.target.checked})}
              />
              Wrap Horizontally
            </label>
            <label className="form-check-label" htmlFor="wrapY" style={{flex: 1}}>
              <input
                style={{marginRight: 5, marginLeft: 0}}
                className="form-check-input"
                id="wrapY"
                type="checkbox"
                defaultChecked={wrapY}
                onBlur={(e) => onChange({wrapY: e.target.checked})}
              />
              Wrap Vertically
            </label>
          </div>
        </fieldset>
        <fieldset className="form-group">
          <legend className="col-form-legend">Background</legend>
          <div style={{display: 'flex', flexDirection: 'row'}}>
            <div style={{flex: 1}}>
              <label className="form-check-label">
                <input
                  className="form-check-input"
                  type="radio"
                  style={{marginRight: 5}}
                  checked={!!backgroundAsColor}
                  onChange={() => onChange({background: "black"})}
                  name="bgradio"
                />
                Color
              </label>
              <input
                type="text"
                defaultValue={backgroundAsColor}
                onBlur={(e) => { if (e.target.value) { onChange({background: e.target.value}); }}}
              />
              {/*<PixelColorPicker
                color={backgroundAsColor}
                onColorChange={(color) => onChange({background: color})}
              />*/}
            </div>
            <div style={{flex: 1}}>
              <label className="form-check-label">
                <input
                  className="form-check-input"
                  type="radio"
                  style={{marginRight: 5}}
                  checked={!!backgroundAsURL}
                  onChange={() => onChange({background: "url(/Layer0_2.png)"})}
                  name="bgradio"
                />
                Image
              </label>
              <input
                type="text"
                defaultValue={backgroundAsURL}
                onBlur={(e) => { if (e.target.value) { onChange({background: `url(${e.target.value})`}); }}}
              />
            </div>
          </div>
        </fieldset>
      </div>
    );
  }
}