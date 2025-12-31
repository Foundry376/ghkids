import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import Button from "reactstrap/lib/Button";

import { useState } from "react";
import { Modal, ModalBody } from "reactstrap";
import { createWorld } from "../actions/main-actions";
import { useAppSelector } from "../hooks/redux";

const HomePage = () => {
  const dispatch = useDispatch();
  const [showingNew, setShowingNew] = useState(false);

  const me = useAppSelector((root) => root.me);

  return (
    <div>
      <Modal isOpen={showingNew} backdrop centered toggle={() => setShowingNew(false)}>
        <div className="modal-header">
          <h4 style={{ marginBottom: 0 }}>Create your first game!</h4>
        </div>
        <ModalBody>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Button onClick={() => dispatch(createWorld({ from: "tutorial" }))}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <img src={new URL("../img/new-game-tutorial.png", import.meta.url).href} />
                <div style={{ textAlign: "left", height: 72 }}>
                  <strong>Tutorial Stage (Recommended)</strong>
                  <p>
                    Learn how to use Codako's drag-and-drop interface to create characters,
                    appearances, and rules.
                  </p>
                </div>
              </div>
            </Button>
            <Button onClick={() => dispatch(createWorld())}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <img src={new URL("../img/new-game-empty.png", import.meta.url).href} />
                <div style={{ textAlign: "left", height: 72 }}>
                  <strong>Blank Stage</strong>
                  <p>Start from scratch, add characters and design your own game world!</p>
                </div>
              </div>
            </Button>
          </div>
        </ModalBody>
      </Modal>
      <div className="hero">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <h2>Create your own games!</h2>
              <div>
                <p>Codako is a game programming tool designed for young learners ages 6-14.</p>
                <br />
                {me ? (
                  <div style={{ display: "inline-flex", gap: 16, margin: "auto" }}>
                    <Link to="/dashboard">
                      <Button size="lg">View your Games</Button>
                    </Link>
                    <Button size="lg" onClick={() => setShowingNew(true)}>
                      New Game
                    </Button>
                  </div>
                ) : (
                  <Button size="lg" onClick={() => setShowingNew(true)}>
                    Try it Now
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="home-region green">
        <div className="container">
          <div className="row">
            <div className="col-md-4">
              <h3>
                <i className="fa fa-globe" /> Create Games
              </h3>
              <p>
                Use Codako's built-in drawing tools to create characters and place them into your
                game world. You can create mario-style adventure games, simulations, puzzle
                challenges, and more!
              </p>
            </div>
            <div className="col-md-4">
              <h3>
                <i className="fa fa-video-camera" /> Record Rules
              </h3>
              <p>
                Bring your world to life by turning on the recorder and demonstrating what you want
                to happen! Watch as bits of code are written automatically and make the changes you
                want.
              </p>
            </div>
            <div className="col-md-4">
              <h3>
                <i className="fa fa-foursquare" /> Learn Core Concepts
              </h3>
              <p>
                Codako introduces young learners to programming concepts, but doesn't require
                reading or writing code. It lays a foundation of understanding that students can
                carry with them as they learn to program.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="home-region">
        <div className="container">
          <div className="row">
            <div className="col-md-7">
              <h3>Based on research</h3>
              <p>
                Codako is heavily inspired by the KidSIM research conducted by Apple's Advanced
                Technologies Group in the late 1990s, which showed how programming-by-demonstration
                could introduce object-oriented concepts and bring the joy of programming to young
                people.
              </p>
            </div>
            <div className="offset-md-2 col-md-3">
              <i className="fa fa-flask" style={{ fontSize: 150 }} />
            </div>
          </div>
        </div>
      </div>

      <div className="home-region light-green">
        <div className="container">
          <div className="row">
            <div className="offset-md-1 col-md-3">
              <i className="fa fa-cogs" style={{ fontSize: 150 }} />
            </div>
            <div className="offset-md-1 col-md-7">
              <h3>Advanced concepts, no downloads</h3>
              <p>
                Codako is easy to pick up, and supports variables, events, control flow concepts,
                and more. It leverages the latest HTML5 and JavaScript, so no downloads or plugins
                are required.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="home-region">
        <div className="container">
          <div className="row">
            <div className="col-md-7">
              <h3>Built with love</h3>
              <p>
                Codako will always be free to play, and will never collect information beyond the
                required email address, nickname and password. 20 years ago, I learned to program
                using Apple's KidSIM and subsequently Stagecast Creator, and Codako is my effort to
                bring back the platform that inspired me in my childhood. For more about why I've
                built Codako, see the <Link to={"/faq"}>FAQ for Parents</Link>
              </p>
            </div>
            <div className="offset-md-2 col-md-3">
              <i className="fa fa-heart" style={{ fontSize: 150 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
