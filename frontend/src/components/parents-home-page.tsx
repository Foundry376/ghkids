import { Link } from "react-router-dom";

import { usePageTitle } from "../hooks/usePageTitle";
import { LESSONS } from "../lessons/lessons";

import "./app-surface.scss";

const KID_HOME_IMG = new URL("../img/parents/kid-home.jpg", import.meta.url).href;
const LESSONS_IMG = new URL("../img/parents/learn-lessons.jpg", import.meta.url).href;

/**
 * What Codako is, for grown-ups — the overview at /parents. The kids' own
 * front door is "/". Leads with what a parent deciding "should my kid use
 * this?" asks first: is it safe, is it free, how do they start.
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
                <strong>Free forever, with no ads.</strong> Codako is free to play and learn, and it
                always will be.
              </div>
            </li>
            <li>
              <i className="fa fa-comments-o" />
              <div>
                <strong>No chat or messaging.</strong> Other players can&rsquo;t contact your child.
                They can only play the games your child chooses to publish, and published games can
                be reported if their content is inappropriate.
              </div>
            </li>
            <li>
              <i className="fa fa-user-circle-o" />
              <div>
                <strong>Account optional.</strong> Kids can start right away with no sign-up. A free
                account (a nickname, a password, and a grown-up&rsquo;s email) saves games online
                and lets them publish.
              </div>
            </li>
            <li>
              <i className="fa fa-tablet" />
              <div>
                <strong>Nothing to install.</strong> Codako runs in your web browser on computers
                and iPads.
              </div>
            </li>
            <li>
              <i className="fa fa-magic" />
              <div>
                <strong>AI helps with drawing and naming.</strong> Kids can ask AI to draw a
                character or suggest a name. Nothing about your child or their account is ever sent
                to it.
              </div>
            </li>
            <li>
              <i className="fa fa-envelope-o" />
              <div>
                <strong>Updates for grown-ups.</strong> We&rsquo;ll occasionally email you about how
                your child&rsquo;s published games are being played and remixed.
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
          <h3>How your child gets started</h3>
          <ol className="parents-steps">
            <li>
              <strong>
                Click <Link to="/">Start Codako</Link>.
              </strong>{" "}
              Kids land on a menu with four big buttons: Create a Game, My Games, Learn Codako, and
              Play Games.
            </li>
            <li>
              <strong>
                Do the <Link to="/learn">Learn Codako</Link> lessons.
              </strong>{" "}
              {LESSONS.length} lessons of about 10 minutes each build a game one step at a time,
              from moving a hero around to recording rules and making a horse race. Each lesson ends
              with something they can play.
            </li>
            <li>
              <strong>Make their own game.</strong> Then they can start from a blank stage, or play
              and remix games other kids have published to see how they were made.
            </li>
          </ol>
          <p>
            The lessons involve some reading. Kids who are still learning to read will want a
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
          <div className="row">
            <div className="col-md-6">
              <h3>Based on research</h3>
              <p>
                Codako is based on KidSim, a project from Apple&rsquo;s research labs in the 1990s
                that let kids program by showing the computer what to do. Researchers and teachers
                tried it with kids in real classrooms, where kids built many games of their own.
              </p>
              <p>
                <Link to="/parents/research">Read about the ideas behind Codako &rarr;</Link>
              </p>
            </div>
            <div className="col-md-6">
              <h3>Simple to start, room to grow</h3>
              <p>
                Kids start by dragging characters around. As their games get bigger, they use
                variables, multiple levels, events, and rules that only happen some of the time.
              </p>
              <p>
                <Link to="/parents/how-it-works">See how Codako works &rarr;</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="home-region light-green">
        <div className="container">
          <h3>Why Codako in the age of AI?</h3>
          <p>
            An AI can write a game from a single sentence, but that skips the part where kids learn.
            In Codako, kids show what should happen in their own language and see how the computer
            records it in its language, so they build an understanding of how their game works.
          </p>
          <p>
            <Link to="/parents/ai">Read why we built Codako this way &rarr;</Link>
          </p>
        </div>
      </div>

      <div className="home-region">
        <div className="container">
          <h3>Who makes Codako</h3>
          <p>
            Codako is made by Ben Gotow, David Canfield Smith, and Joyce Yuan. David co-created
            KidSim at Apple and later co-founded Stagecast Software, which turned it into Stagecast
            Creator. Ben learned to program as a kid using Stagecast Creator, and years later
            rebuilt it for the web as Codako. Codako is open source, and we built it because we
            believe every kid deserves the chance to see their ideas come to life.
          </p>
          <p>
            Questions? Email us at <a href="mailto:ben@foundry376.com">ben@foundry376.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ParentsHomePage;
