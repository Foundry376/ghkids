import React, {PropTypes} from 'react';
import {Link} from 'react-router';
import timeago from 'timeago.js';

import WorldOptionsMenu from './world-options-menu';

export default class WorldCard extends React.Component {
  static propTypes = {
    world: PropTypes.object,
    onDuplicate: PropTypes.func,
    onDelete: PropTypes.func,
    canEdit: PropTypes.bool,
  };
  
  render() {
    const {world, canEdit} = this.props;

    return (
      <div className="card world-card">
        {
          canEdit ? (
            <div className="card-img-top world-thumbnail" style={{backgroundImage: `url(${world.thumbnail})`}}>
              <div>
                <Link to={`/play/${world.id}`}>
                  Play
                </Link>
                {'|'}
                <Link to={`/editor/${world.id}`}>
                  Edit
                </Link>
              </div>
            </div>
          ) : (
            <Link to={`/play/${world.id}`}>
              <img className="card-img-top world-thumbnail" src={world.thumbnail} />
            </Link>
          )
        }
        <div className="card-block">
          <WorldOptionsMenu
            onDuplicate={this.props.onDuplicate}
            onDelete={this.props.onDelete}
          />
          <Link to={canEdit ? `/editor/${world.id}` : `/play/${world.id}`}>
            <h4 className="card-title">{world.name}</h4>
          </Link>
          <small className="card-text text-muted">
            {
              world.forkParent && world.forkParent.user && (
                <div>
                  {`Forked from `}
                  <Link to={`/u/${world.forkParent.user.username}`}>{world.forkParent.user.username}</Link>
                  {`/`}
                  <Link to={`/play/${world.forkParent.id}`}>{world.forkParent.name}</Link>
                </div>
              )
            }
            Last updated {new timeago().format(world.updatedAt)}
          </small>
        </div>
      </div>
    );
  }
}
