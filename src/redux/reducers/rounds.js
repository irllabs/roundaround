import { ADD_ROUND, REMOVE_ROUND, SET_ROUNDS, UPDATE_ROUND, RESET_ROUNDS_STORE } from "../actionTypes";
import update from 'immutability-helper';

const initialState = [];

export default function(state = initialState, action) {
  switch (action.type) {
    case RESET_ROUNDS_STORE: {
      console.log('reset');
      return initialState;
    }
    case SET_ROUNDS: {
        return action.payload.rounds;
    };
    case UPDATE_ROUND: {
      const {round, roundIndex} = action.payload;
      return update(state, {
        [roundIndex]: {
          $merge: round
        }
      })
    }
    case ADD_ROUND: {
      return update(state, {
          $push: [action.payload.round]
      })
    }
    case REMOVE_ROUND: {
        return update(state, {
          $splice: [[action.payload.roundIndex, 1]]
        });
    }
    default:
      return state;
  }
}
