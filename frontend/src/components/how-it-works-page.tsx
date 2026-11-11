import { Link } from "react-router-dom";
import { Col, Container, Row } from "reactstrap";
import React from "react";

import { usePageTitle } from "../hooks/usePageTitle";
import { BookChapterLink, BookCredit, Figure } from "./parents-article";

const img = (name: string) => new URL(`../img/book/${name}`, import.meta.url).href;

/**
 * The longer story of how Codako works, for parents: the theater metaphor,
 * before-after rules, programming by demonstration, and how a game runs. The technical version
 * lives in the book chapter, linked at the bottom.
 */
const HowItWorksPage: React.FC = () => {
  usePageTitle("How Codako Works");

  return (
    <Container className="parents-article">
      <Row>
        <Col md={12}>
          <h3>How Codako Works</h3>
          <p className="parents-article__intro">
            Codako works like a theater. The game screen is the &ldquo;stage,&rdquo; and the things
            on it are &ldquo;characters.&rdquo; Kids draw their characters, put them on the stage,
            and then show each one what to do.
          </p>
          <p>
            A new game starts with an empty stage, and kids fill it by repeating three steps: create
            a character (like a train engine), draw how it looks, and make a rule that tells it what
            to do. That&rsquo;s the whole recipe. Codako uses a few ideas consistently, so once kids
            know these steps, they can build almost anything.
          </p>
          <Figure
            src={img("authoring-window.jpg")}
            alt="The Codako editor with a train game open"
            caption="The Codako editor: the stage, the characters in the game (bottom left), the pictures for the selected engine (bottom right), and the engine's rules (right)."
          />

          <h4>Rules are pictures, not code</h4>
          <p>
            Each rule is a before-and-after picture of a small part of the game. The left side shows
            what that part must look like for the rule to happen, and the right side shows what it
            will look like afterward. You can read it as: &ldquo;IF the game looks like the left
            side, THEN make it look like the right side.&rdquo;
          </p>
          <Figure
            src={img("engine-rules.jpg")}
            alt="Four rules for a train engine: go right, go left, go up, go down"
            caption="A few rules for a train engine"
            narrow
          />
          <p>
            Because rules are pictures of the game kids are making, kids never have to type a line
            of code or learn computer terminology. People are good at spotting the differences
            between two pictures, so rules are easy to understand at a glance, even in big games.
            We&rsquo;ve seen kids go down long lists of rules explaining what each one does, even
            rules written by other kids for other games.
          </p>

          <h4>Show, don&rsquo;t type</h4>
          <p>
            To make a rule, kids don&rsquo;t describe what should happen. They do it, and Codako
            remembers. To make a train engine move along its track, they grab the engine and drag it
            where it should go:
          </p>
          <Figure
            src={[img("drag-1.jpg"), img("drag-2.jpg"), img("drag-3.jpg")]}
            alt="A train engine being dragged one square to the right"
            caption="Dragging the engine one square to the right records a rule that moves it right."
          />
          <p>
            While a rule is being made, the stage goes dark except for a &ldquo;spotlight&rdquo;
            around the character, like the light that follows an actor on stage. The rule can only
            look at and change what&rsquo;s inside the spotlight, and kids can drag its edges to
            make it bigger or smaller.
          </p>
          <Figure
            src={img("spotlight.jpg")}
            alt="The stage darkened except for a bright square around the train engine"
            caption="The spotlight around the train engine while a rule is being made"
          />
          <p>
            Rules can also check and change a character&rsquo;s variables, like its speed. In the
            rule below, a kid dragged the red car into the passing lane. It reads: if there&rsquo;s
            a car right in front of me, the passing lane is empty, and I&rsquo;m going faster than
            the other car, then move into the passing lane and speed up. Since the rule
            doesn&rsquo;t care what color the cars are, this one rule lets every car in the game
            pass.
          </p>
          <Figure
            src={img("passing-rule.jpg")}
            alt="A rule where a red car moves into the passing lane, with a speed condition and two actions"
            caption="A passing rule for cars"
          />
          <p>
            On a two-lane road, this rule isn&rsquo;t quite enough: a car could be coming the other
            way just outside the spotlight. So the rule will need some work. That&rsquo;s the point
            of simulations: kids try things, make mistakes, and learn by fixing them.
          </p>

          <h4>Pressing Play</h4>
          <p>
            When kids press Play, a clock starts ticking. On every tick, each character goes down
            its list of rules and does the first one whose picture matches what&rsquo;s around it.
            Kids can speed the clock up, slow it down, or even run it backward to find out what went
            wrong.
          </p>
          <p>
            Because characters check their rules on every tick, a rule that moves a character one
            square is enough to send it all the way across the screen. Loops and if-then logic are
            hard ideas for kids, and Codako builds them in, so kids use them from their very first
            rule. As their games get bigger, they can give characters variables like health or
            speed, add more levels, make rules that run when a key is pressed or a character is
            clicked, and make things happen only some of the time.
          </p>
          <p>
            To see where these ideas came from, read{" "}
            <Link to="/parents/research">The Ideas Behind Codako</Link>. For educators and the
            curious, our <BookChapterLink>book chapter (PDF)</BookChapterLink> goes further into how
            Codako teaches object-oriented programming and how its game engine works.
          </p>
          <BookCredit />
        </Col>
      </Row>
    </Container>
  );
};

export default HowItWorksPage;
