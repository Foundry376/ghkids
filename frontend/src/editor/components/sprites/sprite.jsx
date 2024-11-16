import React from 'react'; import PropTypes from 'prop-types';


export default class Sprite extends React.Component {
  static propTypes = {
    style: PropTypes.object,
    className: PropTypes.string,
    transform: PropTypes.string,
    spritesheet: PropTypes.object.isRequired,
    appearance: PropTypes.string,
    frame: PropTypes.number,
  }

  render() {
    const {appearance, transform, frame, spritesheet, className} = this.props;
    const {width, appearances} = spritesheet;

    let data = new URL('../../img/splat.png', import.meta.url).href;
    if (appearance && appearances[appearance]) {
      data = appearances[appearance][frame || 0];
    }

    const style = Object.assign({
      width: width,
      height: width,
      display: 'inline-block',
      transform: {
        'flip-x': 'scale(-1, 1)',
        'flip-y': 'scale(1, -1)',
        'flip-xy': 'scale(-1, -1)',
        'none': undefined,
      }[transform],
    }, this.props.style);

    return (
      <img src={data} className={`sprite ${className}`} style={style} />
    );
  }
}
