import { Link } from "react-router-dom";

import { usePageTitle } from "../hooks/usePageTitle";
import { LESSONS } from "../lessons/lessons";

import "./app-surface.scss";

const KID_HOME_IMG = new URL("../img/parents/kid-home.jpg", import.meta.url).href;
const LESSONS_IMG = new URL("../img/parents/learn-lessons.jpg", import.meta.url).href;

/**
 * What Codako is, for grown-ups — the overview at /parents. The kids' own
 * front door is "/". Leads with what a parent deciding "should my kid use
 * this?" asks first (is it safe, is it free, how do they start), then the
 * story behind it, with links to the longer pages.
 */
const ParentsHomePage = () => {
  usePageTitle("For Parents");

  return (
    <div>
      <div className="hero">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <h2>Create your own games!</h2>
              <div>
                <p>
                  Codako is a video game construction set designed for young learners ages 6 and up.
                </p>
                <br />
                <Link className="app-cta" to="/">
                  Start Codako
                </Link>
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
                <i className="fa fa-paint-brush" /> Create Games
              </h3>
              <p>
                Kids draw their own characters and place them into a game world. They can make
                Mario-style adventure games, simulations, puzzle challenges, and more!
              </p>
            </div>
            <div className="col-md-4">
              <h3>
                <i className="fa fa-video-camera" /> Show, Don&rsquo;t Type
              </h3>
              <p>
                To bring a game to life, kids turn on the recorder and show Codako what should
                happen, like dragging a character one step to the right. Codako turns what they did
                into a rule.
              </p>
            </div>
            <div className="col-md-4">
              <h3>
                <i className="fa fa-lightbulb-o" /> Learn Real Ideas
              </h3>
              <p>
                Along the way kids learn the ideas behind all programming: if-then rules, loops,
                variables, and chance. They never have to read or write code.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="home-region">
        <div className="container">
          <h3>Safe and free</h3>
          <ul className="parents-points">
            <li>
              <i className="fa fa-heart" />
              <div>
                <strong>Free, with no ads.</strong> Codako is free to play and learn, and it always
                will be. It runs in your web browser on computers and iPads, with nothing to
                install.
              </div>
            </li>
            <li>
              <i className="fa fa-comments-o" />
              <div>
                <strong>No chat or messaging.</strong> Other players can&rsquo;t contact your child.
                They can only play the games your child chooses to publish, and any published game
                can be reported.
              </div>
            </li>
            <li>
              <i className="fa fa-user-circle-o" />
              <div>
                <strong>No sign-up needed.</strong> Kids can start right away. A free account (a
                nickname, a password, and a grown-up&rsquo;s email) saves games online and lets them
                publish, and we&rsquo;ll occasionally email you about how their games are being
                played.
              </div>
            </li>
          </ul>
          <p>
            <Link to="/parents/faq">More about safety, privacy, and devices &rarr;</Link>
          </p>
        </div>
      </div>

      <div className="home-region light-green">
        <div className="container">
          <h3>Getting started</h3>
          <p className="parents-lede">
            Click <Link to="/">Start Codako</Link> and your child lands on a menu with four big
            buttons. We suggest starting with <Link to="/learn">Learn Codako</Link>:{" "}
            {LESSONS.length} short lessons that build a game one step at a time, each ending with
            something to play. After that, kids can start their own game from a blank stage, or
            remix games other kids have published to see how they were made.
          </p>
          <p className="parents-lede">
            The lessons involve some reading, so kids who are still learning to read will want a
            grown-up next to them for the first few.
          </p>
          <div className="row parents-screens">
            <div className="col-md-6">
              <img
                src={KID_HOME_IMG}
                alt="The Codako menu: Create a Game, My Games, Learn Codako, and Play Games"
              />
              <p>What your child sees when they start Codako.</p>
            </div>
            <div className="col-md-6">
              <img
                src={LESSONS_IMG}
                alt="The first three Learn Codako lessons: Play the Game, Draw a Character, and Record a Rule"
              />
              <p>The first Learn Codako lessons.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="home-region">
        <div className="container">
          <h3>Where Codako comes from</h3>
          <p className="parents-lede">
            Codako is based on KidSim, a project from Apple&rsquo;s research labs in the 1990s that
            let kids program by showing the computer what to do. David Canfield Smith co-created
            KidSim and later turned it into a product called Stagecast Creator. Ben Gotow learned to
            program as a kid using Stagecast Creator, and years later rebuilt it for the web as
            Codako. Today the two of them make Codako with Joyce Yuan. It&rsquo;s open source, and
            we built it because we believe every kid deserves the chance to see their ideas come to
            life.
          </p>
          <p className="parents-lede">
            We also get asked why kids should learn this way when an AI can make a game from a
            single sentence. Our answer is that the AI skips the part where kids learn. Codako uses
            AI only to help kids draw characters and pick names, and nothing about your child is
            ever sent to it. The rules that make a game work are always theirs.
          </p>
          <p className="parents-lede">
            To go deeper, read <Link to="/parents/how-it-works">how Codako works</Link>,{" "}
            <Link to="/parents/research">the ideas behind it</Link>, or{" "}
            <Link to="/parents/ai">why we built it this way in the age of AI</Link>. Questions?
            Email us at <a href="mailto:ben@foundry376.com">ben@foundry376.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ParentsHomePage;
