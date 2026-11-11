import { Button, Modal, ModalBody, ModalFooter } from "reactstrap";
import { useContext, useEffect, useState } from "react";
import { useDispatch } from "react-redux";

import { useEditorSelector } from "../../../hooks/redux";
import { updateWorldMetadata } from "../../actions/world-actions";
import { dismissModal } from "../../actions/ui-actions";
import { MODALS, WORLDS } from "../../constants/constants";
import { EditorContext } from "../../../components/editor-context";
import { publishWorld } from "../../../actions/main-actions";

export const PublishContainer = () => {
  const dispatch = useDispatch();
  const { saveWorld } = useContext(EditorContext);

  const open = useEditorSelector((state) => state.ui.modal.openId === MODALS.PUBLISH);
  const metadata = useEditorSelector((state) => state.world.metadata);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTitle(metadata.name || "");
      setDescription(metadata.description || "");
    }
  }, [open, metadata.name, metadata.description]);

  const _onClose = () => {
    dispatch(dismissModal());
  };

  const _onPublish = async () => {
    if (!title.trim()) {
      alert("Please enter a title for your game.");
      return;
    }
    const info = { name: title.trim(), description: description.trim() || null };

    // Save the game with its new title and description, then publish what was saved.
    dispatch(updateWorldMetadata(WORLDS.ROOT, { ...metadata, ...info, published: true }));
    dispatch(dismissModal());
    try {
      await saveWorld();
      await publishWorld(metadata.id, info);
    } catch (e) {
      dispatch(updateWorldMetadata(WORLDS.ROOT, { ...metadata, ...info, published: false }));
      alert(`Codako was unable to publish your game. (Detail: ${(e as Error).message})`);
    }
  };

  return (
    <Modal isOpen={open} backdrop="static" toggle={() => {}}>
      <div className="modal-header" style={{ display: "flex" }}>
        <h4 style={{ flex: 1 }}>Publish Your Game</h4>
      </div>
      <ModalBody>
        <p style={{ marginBottom: 16, color: "#666" }}>
          Published games appear on the Public Games page for everyone to play and remix!
        </p>
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="publish-title"
            style={{ display: "block", marginBottom: 4, fontWeight: 500 }}
          >
            Title <span style={{ color: "#c00" }}>*</span>
          </label>
          <input
            id="publish-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title for your game"
            maxLength={100}
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: 14,
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          />
        </div>
        <div>
          <label
            htmlFor="publish-description"
            style={{ display: "block", marginBottom: 4, fontWeight: 500 }}
          >
            Description <span style={{ color: "#999", fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            id="publish-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your game..."
            maxLength={300}
            rows={3}
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: 14,
              border: "1px solid #ccc",
              borderRadius: 4,
              resize: "vertical",
            }}
          />
          <div style={{ fontSize: 12, color: "#999", textAlign: "right" }}>
            {description.length}/300
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={_onClose}>
          Cancel
        </Button>
        <Button color="primary" onClick={_onPublish}>
          Publish
        </Button>
      </ModalFooter>
    </Modal>
  );
};
