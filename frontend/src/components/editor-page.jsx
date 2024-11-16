import React, {PropTypes} from 'react';
import {replace, push} from 'react-router-redux';
import {connect} from 'react-redux';

import RootEditor from '../editor/root-editor';
import {createWorld} from '../actions/main-actions';
import StoreProvider from '../editor/store-provider';
import {makeRequest} from '../helpers/api';

import PageMessage from './common/page-message';


const APIAdapter = {
  load: function (props) {
    const {dispatch, params: {worldId}, me} = props;

    return makeRequest(`/worlds/${worldId}`).then((world) => {
      if (!world || !me || world.userId !== me.id) {
        if (!me) {
          dispatch(replace({
            pathname: `/login`,
            state: {
              redirectTo: `/editor/${worldId}`,
            },
          }));
          return Promise.reject(new Error("Redirecting..."));
        }
        return Promise.reject(new Error("Sorry, this world could not be found."));
      }
      return Promise.resolve(world);
    });
  },
  save: function (json) {
    return makeRequest(`/worlds/${this.props.params.worldId}`, {method: 'PUT', json});
  },
};

const LocalStorageAdapter = {
  load: function (props) {
    const {dispatch, params: {worldId}} = props;

    try {
      this._value = JSON.parse(window.localStorage.getItem(worldId));
    } catch (err) {
      window.alert(err.toString());
    }

    if (!this._value) {
      dispatch(replace(`/`));
      return Promise.reject(new Error("This world was not found in your browser's storage."));
    } else if (this._value.uploadedAsId) {
      dispatch(replace(`/editor/${this._value.uploadedAsId}`));
      return Promise.reject(new Error("Redirecting to the new path for this world."));
    }
    return Promise.resolve(this._value);
  },
  save: function (json) {
    this._value.data = json.data;
    window.localStorage.setItem(this.props.params.worldId, JSON.stringify(this._value));
    return Promise.resolve(this._value);
  },
};


class EditorPage extends React.Component {
  static propTypes = {
    me: PropTypes.object,
    dispatch: PropTypes.func,
    location: PropTypes.shape({
      query: PropTypes.shape({
        localstorage: PropTypes.string,
      }),
    }),
    params: PropTypes.shape({
      worldId: PropTypes.string,
    }),
  }

  static childContextTypes = {
    usingLocalStorage: PropTypes.bool,
    saveWorldAnd: PropTypes.func,
  };

  static layoutConsiderations = {
    hidesNav: true,
    hidesFooter: true,
    unwrapped: true,
  };

  constructor(props, context) {
    super(props, context);

    this._mounted = false;
    this.state = {
      loaded: false,
      error: null,
      world: null,
    };
  }

  getChildContext() {
    return {
      usingLocalStorage: this.getAdapter(this.props) === LocalStorageAdapter,
      saveWorldAnd: this.saveWorldAnd,
    };
  }

  componentDidMount() {
    this._mounted = true;
    window.addEventListener("beforeunload", this._onBeforeUnload);
    this.loadWorld(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.params.worldId !== nextProps.params.worldId) {
      this.loadWorld(nextProps);
    }
  }

  componentWillUnmount() {
    this._mounted = false;
    window.removeEventListener("beforeunload", this._onBeforeUnload);
  }

  getAdapter(props) {
    if (props.location.query.localstorage) {
      return LocalStorageAdapter;
    }
    return APIAdapter;
  }

  loadWorld(props) {
    this.getAdapter(props).load.call(this, props).then((world) => {
      if (!this._mounted) { return; }

      try {
        this.setState({world, loaded: true});
      } catch (err1) {
        world.data = JSON.parse(JSON.stringify(world.data));
        delete world.data.ui;
        delete world.data.recording;
        try {
          this.setState({world, loaded: true, retry: 1});
        } catch (err2) {
          this.setState({world: null, error: err1.toString(), loaded: true});
        }
      }

    }).catch((error) => {
      if (!this._mounted) { return; }
      this.setState({error: error.message, loaded: true});
    });
  }

  saveWorld() {
    const json = this.storeProvider.getWorldSaveData();
    const fn = this.getAdapter(this.props).save;

    clearTimeout(this._saveTimeout);
    this._saveTimeout = null;

    if (this._savePromise) {
      this.saveWorldSoon();
      return this._savePromise;
    }

    this._savePromise = fn.call(this, json).then(() => {
      if (!this._mounted) { return; }
      this._savePromise = null;
    }).catch((e) => {
      if (!this._mounted) { return; }
      this._savePromise = null;
      alert(`Codako was unable to save changes to your world. Your internet connection may be offline. \n(Detail: ${e.message})`);
      throw new Error(e);
    });

    return this._savePromise;
  }

  saveWorldSoon = () => {
    clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => {
      this.saveWorld();
    }, 5000);
  }

  saveWorldAnd = (dest) => {
    this.saveWorld().then(() => {
      if (dest === 'tutorial') {
        this.props.dispatch(createWorld({from: 'tutorial'}));
      } else {
        this.props.dispatch(push(dest));
      }
    });
  }

  _onBeforeUnload = () => {
    if (this._saveTimeout) {
      this.saveWorld();

      const msg = 'Your changes are still saving. Are you sure you want to close the editor?';
      event.returnValue = msg; // Gecko, Trident, Chrome 34+
      return msg; // Gecko, WebKit, Chrome <34
    }
    return undefined;
  }

  render() {
    const {world, loaded, error, retry} = this.state; 

    if (error || !loaded) {
      return (
        <PageMessage text={error ? error : "Loading..."} />
      );
    }

    return (
      <StoreProvider
        ref={(r) => this.storeProvider = r}
        key={`${world.id}${retry}`}
        world={world}
        onWorldChanged={this.saveWorldSoon}
      >
        <RootEditor />
      </StoreProvider>
    );
  }
}

function mapStateToProps(state) {
  return {
    me: state.me,
  };
}

export default connect(mapStateToProps)(EditorPage);


