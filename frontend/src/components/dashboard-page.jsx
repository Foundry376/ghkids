import React from 'react'; import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import Button from 'reactstrap/lib/Button';
import Col from 'reactstrap/lib/Col';
import Row from 'reactstrap/lib/Row';
import Container from 'reactstrap/lib/Container';

import {fetchWorldsForUser, deleteWorld, createWorld} from '../actions/main-actions';
import WorldList from './common/world-list';

class DashboardPage extends React.Component {
  static propTypes = {
    me: PropTypes.object,
    worlds: PropTypes.array,
    dispatch: PropTypes.func,
  };

  constructor(props, context) {
    super(props, context);
  }

  componentDidMount() {
    this.props.dispatch(fetchWorldsForUser('me'));
  }

  render() {
    const {worlds, dispatch} = this.props;

    const showTutorialPrompt = (worlds && worlds.length === 0);

    return (
      <Container style={{marginTop: 30}} className="dashboard">
        <Row>
          <Col md={9}>
            {
              showTutorialPrompt && (
                <div className="card card-block tutorial-cta">
                  <div style={{display: 'flex', alignItems: 'center', maxWidth: 600, margin: 'auto'}}>
                    <div style={{flex: 1}}>
                      <p>
                        Welcome to Codako! This is your profile page. To get started, let's make a game together!
                      </p>
                      <Button
                        color="success"
                        className="float-xs-right"
                        onClick={() => dispatch(createWorld({from: 'tutorial'}))}
                      >
                        Start Tutorial
                      </Button>
                    </div>
                    <img className="tutorial-cta-girl" src={new URL('../img/get-started-girl.png', import.meta.url).href} />
                  </div>
                </div>
              )
            }
            <div className="card card-block">
              <Button
                size="sm"
                color={showTutorialPrompt ? undefined : 'success'}
                className="float-xs-right"
                onClick={() => dispatch(createWorld())}
              >
                New Game
              </Button>
              <h5>My Games</h5>
              <hr/>
              <WorldList
                worlds={worlds}
                onDeleteWorld={(s) => dispatch(deleteWorld(s.id))}
                onDuplicateWorld={(s) => dispatch(createWorld({from: s.id}))}
                canEdit
              />
            </div>
          </Col>
          <Col md={3}>
            <div className="dashboard-sidebar">
              <h5>Learn Codako</h5>
              <hr/>
              Youtube videos go here

            </div>
          </Col>
        </Row>
      </Container>
    );
  }
}

function mapStateToProps(state) {
  return {
    me: state.me,
    worlds: state.worlds && Object.values(state.worlds)
      .filter(w => w.userId === state.me.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
  };
}

export default connect(mapStateToProps)(DashboardPage);
