import React from 'react'; import PropTypes from 'prop-types';
import Container from 'reactstrap/lib/Container';

import WorldCard from './world-card';
import PageMessage from './page-message';

export default class WorldList extends React.Component {
  static propTypes = {
    worlds: PropTypes.array,
    onDuplicateWorld: PropTypes.func,
    onDeleteWorld: PropTypes.func,
    canEdit: PropTypes.bool,
  };

  render() {
    const {worlds, onDeleteWorld, onDuplicateWorld, canEdit} = this.props;
    
    let msg = null;
    if (!worlds) {
      msg = <PageMessage text="Loading..." size="sm" />;
    } else if (worlds.length === 0) {
      msg = <PageMessage text={canEdit ? "You haven't created any games yet." : "Doesn't look like there are any games to see here!"} size="sm" />;
    }

    if (msg) {
      return (
        <Container>
          {msg}
        </Container>
      );
    }

    return (
      <div className="world-list">
        {worlds.map((s) =>
          <WorldCard
            key={s.id}
            world={s}
            canEdit={canEdit}
            onDuplicate={() => onDuplicateWorld(s)}
            onDelete={() => onDeleteWorld(s)}
          />
        )}
      </div>
    );
  }
}
