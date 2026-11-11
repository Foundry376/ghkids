import { Link } from "react-router-dom";
import { Col, Container, Row } from "reactstrap";
import React from "react";

import { usePageTitle } from "../hooks/usePageTitle";
import { BookCredit, Citation, Figure, ReferenceId, References } from "./parents-article";

const LIBRARY_IMG = new URL("../img/book/library.png", import.meta.url).href;

const REFS: ReferenceId[] = ["mcleod", "star", "cocoa", "kidsim"];

const Cite = ({ id }: { id: ReferenceId }) => <Citation refs={REFS} id={id} />;

/**
 * The longer story behind the overview's "Where Codako comes from": the
 * learning theory, what kids get out of it, and where Codako came from.
 */
const ResearchPage: React.FC = () => {
  usePageTitle("The Ideas Behind Codako");

  return (
    <Container className="parents-article">
      <Row>
        <Col md={12}>
          <h3>The Ideas Behind Codako</h3>
          <p className="parents-article__intro">
            Codako lets children (&ldquo;of all ages,&rdquo; as Alan Kay used to say) build their
            own simulations. Every video game is a simulation, so we present it to kids as a video
            game construction set. But the real value lies in the simulations kids create, and in
            the process of creating them.
          </p>

          <h4>Learning by building</h4>
          <p>
            Educators call this idea constructivism: learners build knowledge on top of what they
            already know, rather than passively absorbing it from a lecture.
            <Cite id="mcleod" /> In Codako, kids don&rsquo;t just play games built by others. They
            design and build their own, which is motivating for kids and by its nature active. You
            can&rsquo;t be passive while making a game.
          </p>
          <p>
            Unlike animations, simulations don&rsquo;t run the same way every time. They respond to
            the player. That lets kids run &ldquo;what if?&rdquo; experiments, test their ideas, and
            come to understand how a complicated system behaves.
          </p>
          <p>
            Making a game exercises a whole set of thinking skills. Most schoolwork happens in words
            and symbols; Codako adds a visual way to think, since every rule is a picture of how
            part of the game looks before and after something happens. Designing levels is
            sequential thinking: to get to the goal, the player must first do this, then that.
            Debugging takes careful, critical thinking about what&rsquo;s going on and why. And
            every time a rule doesn&rsquo;t work as expected, kids practice the scientific method:
            guess why, change something, and play again to find out.
          </p>
          <p>
            On top of all that is the reward of seeing your ideas come to life. It&rsquo;s one of
            the deepest motivations people have, and it&rsquo;s what led many programmers, including
            the people who make Codako, to their careers.
          </p>

          <h4>Programming in the kids&rsquo; world</h4>
          <p>
            Codako&rsquo;s rules deal with the things kids make, like trains, tracks, intersections,
            and crossing gates, rather than machine concepts like bits, arrays, and syntax.
          </p>
          <Figure
            src={LIBRARY_IMG}
            alt="The Library from a train game: track, engine, tunnels, doors, a tree, a crossing gate, and a coach"
            caption="The characters in a train game"
          />
          <p>
            This idea has a history. In the 1970s, David Canfield Smith was one of the Xerox
            scientists designing the Xerox Star, the ancestor of the Macintosh. Its users were
            office workers who didn&rsquo;t understand computers and were a little afraid of them.
            So instead of taking office workers into the computer&rsquo;s world, the team brought
            the computer into the office world, with icons for documents, folders, printers, and
            wastebaskets. Smith invented those icons, and the &ldquo;desktop metaphor&rdquo;
            <Cite id="star" /> is still how we use computers today. Codako does the same for
            programming: instead of learning an alien language, kids simply work with the characters
            they&rsquo;ve made.
          </p>

          <h4>Where Codako came from</h4>
          <p>
            Codako began in the 1990s as a research project in Apple&rsquo;s Advanced Technology
            Group, when Apple was deeply involved in education. David Canfield Smith, Allen Cypher,
            and Alan Kay set out to help kids program computers. Their first prototype was called
            Cocoa; here&rsquo;s{" "}
            <a href="https://www.youtube.com/watch?v=NtmGTrr3R-E" target="_blank" rel="noreferrer">
              11-year-old Gregory Miller demoing it
            </a>{" "}
            at Apple in 1996.
            <Cite id="cocoa" /> A more capable version, KidSim,
            <Cite id="kidsim" /> was tested extensively with kids in schools, working with classroom
            teachers. Kids built many games with it, and some teachers built simulations to
            illustrate their lessons.
          </p>
          <p>
            In the late 1990s, part of the KidSim team left Apple to found Stagecast Software and
            turn KidSim into a product, Stagecast Creator. But educational software was a hard
            business then. There were no tablets or app stores, just a fight for shelf space in
            electronics stores, and Stagecast eventually closed.
          </p>
          <p>
            Ben Gotow used Stagecast Creator as a kid and loved it, and it&rsquo;s part of why he
            became a programmer. A few years ago he started rebuilding it from memory in his free
            time. When David Canfield Smith and Joyce Yuan found the project, they asked to join.
            Together they&rsquo;ve brought back everything important from Creator, greatly improved
            its design, and put it on the web, free for everyone.
          </p>
          <p>
            Wondering how this compares to having an AI make a game? Read{" "}
            <Link to="/parents/ai">Why Codako in the Age of AI?</Link>
          </p>

          <BookCredit />
          <References refs={REFS} />
        </Col>
      </Row>
    </Container>
  );
};

export default ResearchPage;
