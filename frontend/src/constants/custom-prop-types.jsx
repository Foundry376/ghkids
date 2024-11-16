import PropTypes from 'prop-types';

export const BoomNetworkError = PropTypes.shape({
  statusCode: PropTypes.number,
  message: PropTypes.string,
});