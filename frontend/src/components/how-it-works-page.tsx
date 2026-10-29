import { Link } from "react-router-dom";
import { Col, Container, Row } from "reactstrap";
import React from "react";

import { usePageTitle } from "../hooks/usePageTitle";
import { BookChapterLink, BookCredit, Figure, InShort } from "./parents-article";

const img = (name: string) => new URL(`../img/book/${name}`, import.meta.url).href;

/**
 * The longer story behind the overview's "Simple to start, room to grow"
 * block, for parents: the theater metaphor, before-after rules,
 * programming by demonstration, and how a game runs. The technical version
 * lives in the book chapter, linked at the bottom.
 */
const HowItWorksPage: React.FC = () => {
  usePageTitle("How Codako Works");

  return (
    <Container className="parents-article">
      <Row>
        <Col md={12}>
          <h3>How Codako Works</h3>
          <InShort>
            <li>Kids draw characters and place them on a stage, like actors in a play.</li>
            <li>
              To make something happen, they show Codako by dragging characters around. Codako
              records it as a before-and-after picture called a rule.
            </li>
            <li>
              When the game runs, each character checks its rules over and over, so kids get loops
              and if-then logic without having to write them.
            </li>
          </InShort>

          <h4>A stage, characters, and rules</h4>
          <p>
            Codako uses a theater metaphor. The game screen is called the &ldquo;stage,&rdquo; and
            the things on it are called &ldquo;characters.&rdquo; In a new game the stage is empty,
            and kids fill it by repeating three steps:
          </p>
          <ol>
            <li>
              <strong>Create a Character</strong>, like a train engine.
            </li>
            <li>
              <strong>Draw an Appearance</strong> for it with the built-in drawing tools.
            </li>
            <li>
              <strong>Make a Rule</strong> that tells it what to do.
            </li>
          </ol>
          <p>
            That&rsquo;s the whole recipe. Codako applies a small number of ideas consistently, so
            once kids know these three steps, they can build almost anything.
          </p>
          <Figure
            src={img("authoring-window.jpg")}
            alt="The Codako editor with a train game open"
            caption="The Codako editor: the stage, the characters in the game (bottom left), the pictures for the selected engine (bottom right), and the engine's rules (right)."
          />

          <h4>Rules are pictures, not code</h4>
          <p>
            A Codako program is a set of before-and-after pictures. Each rule shows a small part of
            the game around a character. The left picture shows what that part must look like for
            the rule to happen, and the right picture shows what it will look like afterward. You
            can read it as: &ldquo;IF the game looks like the left side, THEN make it look like the
            right side.&rdquo;
          </p>
          <Figure
            src={img("engine-rules.jpg")}
            alt="Four rules for a train engine: go right, go left, go up, go down"
            caption="A few rules for a train engine"
            narrow
          />
          <p>
            Because rules only involve pictures of the game kids are making, they stay in the
            kids&rsquo; world: the &ldquo;cast of characters on the stage.&rdquo; At no time do kids
            have to type a single line of computer code or learn computer terminology.
          </p>

          <h4>Show, don&rsquo;t type</h4>
          <p>
            So how do kids make a rule? Instead of typing a description of what should happen, they
            simply do it themselves, and Codako remembers. If kids want a train engine to move along
            a track, they grab the engine and drag it to where they want it to go:
          </p>
          <Figure
            src={[img("drag-1.jpg"), img("drag-2.jpg"), img("drag-3.jpg")]}
            alt="A train engine being dragged one square to the right"
            caption="Dragging the engine one square to the right records a rule that moves it right."
          />
          <p>
            While a rule is being made, the stage goes dark except for a bright
            &ldquo;spotlight&rdquo; around the character, like the light that follows an actor on
            stage. Kids can drag its edges to make it bigger or smaller. The rule can only look at
            and change things inside the spotlight.
          </p>
          <Figure
            src={img("spotlight.jpg")}
            alt="The stage darkened except for a bright square around the train engine"
            caption="The spotlight around the train engine while a rule is being made"
          />
          <p>
            Rules can also check and change a character&rsquo;s variables, like its speed. In the
            rule below, a kid dragged the red car into the passing lane to pass another car:
          </p>
          <Figure
            src={img("passing-rule.jpg")}
            alt="A rule where a red car moves into the passing lane, with a speed condition and two actions"
            caption="A passing rule for cars"
          />
          <ul>
            <li>
              The picture says: &ldquo;if there is a car directly in front of me, and the passing
              lane next to me is empty.&rdquo;
            </li>
            <li>The check under it says: &ldquo;if I am going faster than the other car.&rdquo;</li>
            <li>The actions say: &ldquo;move me into the passing lane and speed me up.&rdquo;</li>
          </ul>
          <p>
            Since the rule doesn&rsquo;t care what color the cars are, it works for every car in the
            game. All cars can pass all other cars with this one rule.
          </p>
          <p>
            Of course, on a two-lane road this rule isn&rsquo;t quite enough. The passing lane might
            look empty inside the spotlight while a car is coming the other way just outside it, and
            there may not be time to pass. The rule will need refining. But that is the very point
            of simulations. Kids can experiment, try things out, make mistakes, and learn by doing.
          </p>

          <h4>Big games stay easy to read</h4>
          <p>
            A rule can have lots of checks and actions in it, but it&rsquo;s always shown as a
            single before-and-after picture. That&rsquo;s the rule&rsquo;s meaning at a glance, and
            the details stay hidden until kids ask to see them. People are good at spotting the
            differences between two pictures, so kids have little trouble understanding what a rule
            does. We&rsquo;ve seen kids go down long lists of rules explaining what each one does,
            even rules written by other kids for other games. That&rsquo;s what lets kids build big
            games, not just small ones.
          </p>

          <h4>How a game runs</h4>
          <p>
            When kids press Play, a clock starts ticking. On every tick, each character on the stage
            goes down its list of rules and does the first one whose picture matches what&rsquo;s
            around it. If none match, it waits for the next tick. Kids can speed the clock up, slow
            it down, stop it, or even run it backward to find out what went wrong.
          </p>
          <p>
            Because every character checks its rules on every tick, a rule that moves a character
            one square is enough to send it all the way across the screen. And every rule is an
            &ldquo;if this, then that.&rdquo; Loops and if-then logic are hard ideas for kids, and
            Codako builds them in, so kids use them from their very first rule.
          </p>

          <h4>Room to grow</h4>
          <p>
            The same few ideas take kids a long way. As their games get bigger, they can give
            characters variables like health or speed, build games with multiple levels, make rules
            that run only when a key is pressed or a character is clicked, and roll dice so things
            happen only some of the time. To see where these ideas came from, read{" "}
            <Link to="/parents/research">The Ideas Behind Codako</Link>.
          </p>

          <h4>The full story</h4>
          <p>
            For educators and the curious: our book chapter covers how Codako teaches
            object-oriented programming, the research behind each of these ideas, and how
            Codako&rsquo;s game engine works, with references.{" "}
            <BookChapterLink>Read the book chapter (PDF) &rarr;</BookChapterLink>
          </p>
          <BookCredit />
        </Col>
      </Row>
    </Container>
  );
};

export default HowItWorksPage;
