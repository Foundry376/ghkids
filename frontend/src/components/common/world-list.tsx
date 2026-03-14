import { Container } from "reactstrap";
import React from "react";
import { Game } from "../../types";
import PageMessage from "./page-message";
import WorldCard from "./world-card";

const WorldList: React.FC<{
  worlds: Game[] | null;
  onDuplicateWorld: (game: Game) => void;
  onDeleteWorld: (game: Game) => void;
  canEdit: boolean;
}> = ({ worlds, onDeleteWorld, onDuplicateWorld, canEdit }) => {
  if (!worlds) {
    return <Container>{<PageMessage text="Loading..." size="sm" />}</Container>;
  }
  if (worlds.length === 0) {
    return (
      <Container>
        <PageMessage
          text={
            canEdit
              ? "You haven't created any games yet."
              : "Doesn't look like there are any games to see here!"
          }
          size="sm"
        />
      </Container>
    );
  }

  return (
    <div className="world-list">
      {worlds.map((world) => (
        <WorldCard
          key={world.id}
          world={world}
          canEdit={canEdit}
          onDuplicate={() => onDuplicateWorld(world)}
          onDelete={() => onDeleteWorld(world)}
        />
      ))}
    </div>
  );
};

export default WorldList;
