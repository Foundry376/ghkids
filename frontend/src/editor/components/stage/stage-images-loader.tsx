import { useEffect } from "react";

import { useEditorSelector } from "../../../hooks/redux";
import { getStagesList } from "../../utils/selectors";
import { prepareCrossoriginImages } from "../../utils/stage-helpers";

export const StageImagesLoader = () => {
  const stages = useEditorSelector((state) => getStagesList(state));
  useEffect(() => {
    prepareCrossoriginImages(stages);
  }, [stages]);

  return <span />;
};
