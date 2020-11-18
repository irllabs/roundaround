import React from 'react';
import GraphicsContext from '../graphics-context/GraphicsContext.component';
import TopBar from '../top-bar/TopBar.component';
import SettingsPane from '../settings-pane/SettingsPane.component';
import clock from '../../models/Clock';
import Round from '../../models/Round';
import styles from './MainRoute.styles.scss';

export default class MainRoute extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isOn: clock.isRunning,
      settingsAreOpen: true,
      round: new Round(),
    };
  }

  componentDidMount() {
    this.state.round.addObserver(this.updateRoundInState);
  }

  componentWillUnmount() {
    this.state.round.removeObserver(this.updateRoundInState);
  }

  // TODO: revisit this :|
  updateRoundInState = sequences => this.setState({ sequences });

  togglePlay = () => {
    clock.toggle();
    this.setState({ isOn: clock.isRunning });
  };

  toggleSettings = () => {
    this.setState(state => ({ settingsAreOpen: !state.settingsAreOpen }));
  };

  addLayer = () => this.state.round.addLayer();

  deleteLayer = (id) => this.state.round.deleteLayerById(id);

  setLayerLength = (id, length) => this.state.round.setLayerLength(id, length);

  render() {
    return (
      <div className={styles.mainContainer}>
        <GraphicsContext    
          className={styles.graphicsContext}
          round={this.state.round}
        />
        <TopBar
          isOn={this.state.isOn}
          togglePlay={this.togglePlay}
          toggleSettings={this.toggleSettings}
        />
        <SettingsPane
          className={styles.settingsPane}
          isActive={this.state.settingsAreOpen}
          round={this.state.round}
          addLayer={this.addLayer}
          deleteLayer={this.deleteLayer}
          setLayerLength={this.setLayerLength}
        />
      </div>
    );
  }
}
