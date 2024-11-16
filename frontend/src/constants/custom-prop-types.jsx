import {PropTypes} from 'react';

export const BoomNetworkError = PropTypes.shape({
  statusCode: PropTypes.number,
  message: PropTypes.string,
});