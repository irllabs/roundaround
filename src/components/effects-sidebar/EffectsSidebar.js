import React, { Component } from 'react'
import styles from './EffectsSidebar.scss'
import { sortableContainer, sortableElement, sortableHandle } from 'react-sortable-hoc';
import _ from 'lodash'
import arrayMove from 'array-move'
import { DragIndicator } from '@material-ui/icons';
import EffectThumbControl from './EffectThumbControl';
import { connect } from "react-redux";
import AudioEngine from "../../audio-engine/AudioEngine"

const DragHandle = sortableHandle(() => <span className={`${styles.effectsSidebarListItemDragHandle}`}><DragIndicator /></span>);
const SortableItem = sortableElement(({ fx }) => (
    <li className={`${styles.effectsSidebarListItem}`}>
        <DragHandle />
        <EffectThumbControl label={fx.label} fxId={fx.id} userId={fx.userId} />
    </li>
));
const SortableContainer = sortableContainer(({ children }) => {
    return <ul className={`${styles.effectsSidebarList}`}>{children}</ul>;
});

class EffectsSidebar extends Component {
    constructor (props) {
        super(props)
        this.state = {
            items: []
        }
        this.effects = [
            {
                name: "tape-delay",
                id: "123-123-123",
                order: 0,
                parameters: {
                    feedback: 0.7,
                    mix: 0.3,
                    time: "8n"
                },
                isOn: false
            }
        ]
    }
    componentDidUpdate () {
        console.log('EffectsSidebar:componentDidUpdate ()', this.props.round);
    }
    onSortEnd = ({ oldIndex, newIndex }) => {
        this.setState(({ items }) => ({
            items: arrayMove(items, oldIndex, newIndex),
        }));
    };
    render () {
        let items = []
        if (!_.isNil(this.props.round.userBusFx)) {
            for (const fx of this.props.round.userBusFx[this.props.user.id]) {
                let item = {
                    id: fx.id,
                    label: fx.name,
                    userId: this.props.user.id
                }
                items.push(item)
            }
        }
        return (
            <div className={`${styles.effectsSidebar}`}>
                <SortableContainer onSortEnd={this.onSortEnd} useDragHandle >
                    {items.map((fx, index) => (
                        <SortableItem key={`item-${fx.id}`} index={index} fx={fx} />
                    ))}
                </SortableContainer>
            </div>
        )
    }
}
const mapStateToProps = state => {
    //console.log('mapStateToProps', state);
    return {
        round: state.round,
        user: state.user,
        collaboration: state.collaboration,
        selectedLayer: state.display.selectedLayer
    };
};


export default connect(
    mapStateToProps
)(EffectsSidebar);