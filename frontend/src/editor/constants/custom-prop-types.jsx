import {PropTypes} from 'react';

export const WorldSelection = PropTypes.object;

export const RecordingExtent = PropTypes.shape({
  xmin: PropTypes.number,
  xmax: PropTypes.number,
  ymin: PropTypes.number,
  ymax: PropTypes.number,
});