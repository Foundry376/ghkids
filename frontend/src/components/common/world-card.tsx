import { Link } from "react-router-dom";

import { format } from "timeago.js";
import { Game } from "../../types";
import WorldOptionsMenu from "./world-options-menu";

const WorldCard = ({
  world,
  onDelete,
  onDuplicate,
  canEdit,
  showAuthorAndPlays,
}: {
  world: Game;
  onDuplicate: () => void;
  onDelete: () => void;
  canEdit: boolean;
  /** For other people's games: who made it, and how often it's been played. */
  showAuthorAndPlays?: boolean;
}) => {
  return (
    <div className="card world-card">
      {canEdit ? (
        <div
          className="card-img-top world-thumbnail"
          style={{ backgroundImage: `url(${world.thumbnail})` }}
        >
          <div>
            <Link to={`/play/${world.id}`}>Play</Link>
            {"|"}
            <Link to={`/editor/${world.id}`}>Edit</Link>
          </div>
        </div>
      ) : (
        <Link to={`/play/${world.id}`}>
          <img className="card-img-top world-thumbnail" src={world.thumbnail} />
        </Link>
      )}
      <div className="card-body card-body">
        <WorldOptionsMenu onDuplicate={onDuplicate} onDelete={onDelete} />
        <Link to={canEdit ? `/editor/${world.id}` : `/play/${world.id}`}>
          <h4 className="card-title">{world.name}</h4>
        </Link>
        <small className="card-text text-muted">
          {showAuthorAndPlays && (
            <div>
              {world.user && (
                <>
                  by <Link to={`/u/${world.user.username}`}>{world.user.username}</Link>
                  {" · "}
                </>
              )}
              {world.playCount === 1 ? "1 play" : `${world.playCount.toLocaleString()} plays`}
            </div>
          )}
          {world.forkParent && world.forkParent.user && (
            <div>
              {`Forked from `}
              <Link to={`/u/${world.forkParent.user.username}`}>
                {world.forkParent.user.username}
              </Link>
              {`/`}
              <Link to={`/play/${world.forkParent.id}`}>{world.forkParent.name}</Link>
            </div>
          )}
          Last updated {format(world.updatedAt)}
        </small>
      </div>
    </div>
  );
};

export default WorldCard;
