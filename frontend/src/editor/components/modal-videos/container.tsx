import { useDispatch, useSelector } from "react-redux";
import Button from "reactstrap/lib/Button";
import Modal from "reactstrap/lib/Modal";
import ModalBody from "reactstrap/lib/ModalBody";
import ModalFooter from "reactstrap/lib/ModalFooter";

import { EditorState } from "../../../types";
import { dismissModal } from "../../actions/ui-actions";
import { MODALS } from "../../constants/constants";

export const VideosContainer = () => {
  const dispatch = useDispatch();
  const open = useSelector<EditorState, boolean>(
    (state) => state.ui.modal.openId === MODALS.VIDEOS,
  );

  const _onClose = () => {
    dispatch(dismissModal());
  };

  return (
    <Modal isOpen={open} backdrop="static" toggle={() => {}}>
      <div className="modal-header" style={{ display: "flex" }}>
        <h4 style={{ flex: 1 }}>Learning Videos</h4>
      </div>
      <ModalBody>
        <p>Videos are coming soon - stay tuned!</p>
      </ModalBody>
      <ModalFooter>
        <Button color="primary" onClick={_onClose}>
          Done
        </Button>{" "}
      </ModalFooter>
    </Modal>
  );
};

export default VideosContainer;
