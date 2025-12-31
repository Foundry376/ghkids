import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Button from "reactstrap/lib/Button";
import Modal from "reactstrap/lib/Modal";
import ModalBody from "reactstrap/lib/ModalBody";
import ModalFooter from "reactstrap/lib/ModalFooter";

import { makeRequest } from "../../../helpers/api";
import { Character, EditorState } from "../../../types";
import { upsertCharacter } from "../../actions/characters-actions";
import { dismissModal } from "../../actions/ui-actions";
import { MODALS } from "../../constants/constants";
import { makeId } from "../../utils/utils";
import Sprite from "../sprites/sprite";

interface CharacterCardProps {
  name: string;
  spritesheet: Character["spritesheet"];
  onAdd: () => void;
}

const CharacterCard = ({ name, spritesheet, onAdd }: CharacterCardProps) => {
  const [added, setAdded] = useState(false);

  const _onAdd = () => {
    onAdd();
    setAdded(true);
  };

  return (
    <div className="character-card">
      <div className="actions">
        <Button size="sm" onClick={_onAdd}>
          {added ? "Added!" : "Add"}
        </Button>
      </div>
      <div className="name">{name}</div>
      <div className="appearances">
        {Object.keys(spritesheet.appearances).map((key) => (
          <Sprite key={key} spritesheet={spritesheet} appearance={key} fit />
        ))}
      </div>
    </div>
  );
};

interface CharacterBrowserProps {
  characters: Character[];
  onAddCharacter: (character: Character) => void;
}

const CharacterBrowser = ({ characters, onAddCharacter }: CharacterBrowserProps) => {
  return (
    <div className="character-cards">
      {characters.map((character) => (
        <CharacterCard
          key={character.name}
          name={character.name}
          spritesheet={character.spritesheet}
          onAdd={() => onAddCharacter(character)}
        />
      ))}
    </div>
  );
};

export const ExploreCharactersContainer = () => {
  const dispatch = useDispatch();
  const open = useSelector<EditorState, boolean>(
    (state) => state.ui.modal.openId === MODALS.EXPLORE_CHARACTERS,
  );
  const [characters, setCharacters] = useState<Character[] | null>(null);

  useEffect(() => {
    makeRequest<Character[]>("/characters").then((chars) => {
      setCharacters(chars);
    });
  }, []);

  const _onAddCharacter = (character: Character) => {
    const id = makeId("character");
    dispatch(upsertCharacter(id, { ...character, id }));
  };

  return (
    <Modal
      isOpen={open}
      backdrop="static"
      toggle={() => {}}
      style={{ minWidth: 650, maxWidth: 650 }}
    >
      <div className="modal-header" style={{ display: "flex" }}>
        <h4 style={{ flex: 1 }}>Explore Characters</h4>
      </div>
      {characters ? (
        <CharacterBrowser characters={characters} onAddCharacter={_onAddCharacter} />
      ) : (
        <ModalBody>
          <div>Loading...</div>
        </ModalBody>
      )}
      <ModalFooter>
        <Button onClick={() => dispatch(dismissModal())}>Done</Button>
      </ModalFooter>
    </Modal>
  );
};

export default ExploreCharactersContainer;
