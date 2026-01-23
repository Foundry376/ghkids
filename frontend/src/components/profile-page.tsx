import { useEffect } from "react";
import { useDispatch } from "react-redux";
import Col from "reactstrap/lib/Col";
import Container from "reactstrap/lib/Container";
import Row from "reactstrap/lib/Row";
import {
  createWorld,
  deleteWorld,
  fetchUser,
  fetchWorldsForUser,
  Profile,
} from "../actions/main-actions";

import { useParams } from "react-router";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAppSelector } from "../hooks/redux";
import WorldList from "./common/world-list";

const LOADING_PROFILE: Profile = {
  username: "loading",
  id: 0,
};

const ProfilePage = () => {
  const dispatch = useDispatch();

  const { username } = useParams();

  const { me, profile, worlds } = useAppSelector((state) => {
    const profile = state.profiles[username!];
    return {
      me: state.me,
      profile: profile || LOADING_PROFILE,
      worlds: state.worlds
        ? Object.values(state.worlds)
            .filter((w) => profile && w.userId === profile.id)
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        : null,
    };
  });

  useEffect(() => {
    if (!username) {
      return;
    }
    dispatch(fetchUser(username));
    dispatch(fetchWorldsForUser(username));
  }, [dispatch, username]);

  usePageTitle(profile.username !== "loading" ? profile.username : null);

  return (
    <Container style={{ marginTop: 30 }} className="dashboard">
      <Row>
        <Col md={3}>
          <div className="dashboard-sidebar">
            <img
              src={new URL("../img/profile-placeholder.png", import.meta.url).href}
              style={{ maxWidth: "100%" }}
            />
            <h4>{profile.username}</h4>
          </div>
        </Col>
        <Col md={9}>
          <div className="card card-body">
            <h5>Public Worlds</h5>
            <hr />
            <WorldList
              worlds={worlds}
              onDeleteWorld={(s) => dispatch(deleteWorld(s.id))}
              onDuplicateWorld={(s) => dispatch(createWorld({ from: s.id }))}
              canEdit={me ? me.id === profile.id : false}
            />
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default ProfilePage;
