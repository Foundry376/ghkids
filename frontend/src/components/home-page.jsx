import React, {PropTypes} from 'react';
import {Link} from 'react-router';
import {connect} from 'react-redux';
import Button from 'reactstrap/lib/Button';

import {createWorld} from '../actions/main-actions';

class HomePage extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func,
  };

  render() {
    const {dispatch} = this.props;

    return (
      <div>
        <div className="hero">
          <div className="container">
            <div className="row">
              <div className="col-md-12">
                <h2>Create your own games!</h2>
                <div>
                  <p>
                    Codako is a game programming tool designed for young learners ages 6-12.
                  </p>
                  <br />
                  <Button size="lg" onClick={() => dispatch(createWorld({from: 'tutorial'}))}>
                    Try it Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="home-region green">
          <div className="container">
            <div className="row">
              <div className="col-md-4">
                <h3><i className="fa fa-globe"/> Create Games</h3>
                <p>
                  Use Codako's built-in drawing tools to create characters and place
                  them into your game world. You can create mario-style adventure games,
                  simulations, zelda-style exploration games, and more!
                </p>
              </div>
              <div className="col-md-4">
                <h3><i className="fa fa-video-camera"/> Record Rules</h3>
                <p>
                  Bring your world to life by turning on the recorder and demonstrating
                  what you want to happen! Watch as bits of code are written automatically
                  and make the changes you want.
                </p>
              </div>
              <div className="col-md-4">
                <h3><i className="fa fa-foursquare"/> Learn Core Concepts</h3>
                <p>
                  Codako introduces young learners to programming concepts, but doesn't
                  require reading or writing code. It lays a foundation of understanding that
                  students can carry with them as they learn to program.
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
                  Codako is heavily inspired by the KidSIM research conducted by Apple's
                  Advanced Technologies Group in the late 1990s, which identified the
                  potential programming-by-demonstration environments had for engaging
                  and teaching core concepts.
                </p>
              </div>
              <div className="offset-md-2 col-md-3">
                <i className="fa fa-flask" style={{fontSize:150}} />
              </div>
            </div>
          </div>
        </div>

        <div className="home-region light-green">
          <div className="container">
            <div className="row">
              <div className="offset-md-1 col-md-3">
                <i className="fa fa-cogs" style={{fontSize:150}} />
              </div>
              <div className="offset-md-1 col-md-7">
                <h3>Advanced concepts, no downloads</h3>
                <p>
                  Codako is easy to pick up, and supports variables, events, control flow concepts,
                  and more. It leverages the latest HTML5 and JavaScript, so no
                  downloads or plugins are required.
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
                  Codako will always be free to play, and will never collect information beyond
                  the required email address, nickname and password. 20 years ago, I learned to
                  program using Apple's KidSIM and subsequently Stagecast Creator, and Codako is my effort to bring back the platform
                  that inspired me in my childhood. For more about why I've built Codako,
                  see the <Link to={'/faq'}>FAQ for Parents</Link>
                </p>
              </div>
              <div className="offset-md-2 col-md-3">
                <i className="fa fa-heart" style={{fontSize:150}} />
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }
}


export default connect(() => { return {}; })(HomePage);
