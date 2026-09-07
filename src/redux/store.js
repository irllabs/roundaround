import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./reducers";

// configureStore brings the development-only immutability and serializability checks with it: a
// component that writes to something it read out of the store, or a value that could not survive a
// round trip through Firestore, fails loudly instead of quietly. Both checks are compiled out of
// the production build.
export default configureStore({ reducer: rootReducer });
