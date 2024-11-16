import PropTypes from 'prop-types';

export const WorldSelection = PropTypes.object;

export const RecordingExtent = PropTypes.shape({
  xmin: PropTypes.number,
  xmax: PropTypes.number,
  ymin: PropTypes.number,
  ymax: PropTypes.number,
});