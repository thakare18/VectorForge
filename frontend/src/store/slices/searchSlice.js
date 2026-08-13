import { createSlice } from "@reduxjs/toolkit";

const searchSlice = createSlice({
  name: "search",
  initialState: {
    results: [],
    trace: null,
    query: "",
    algorithm: "brute-force",
    metric: "cosine",
    topK: 5,
    loading: false,
    error: null,
    vectors: [],
    stats: null,
  },
  reducers: {
    setSearchLoading: (state, action) => {
      state.loading = action.payload;
    },
    setSearchResults: (state, action) => {
      state.results = action.payload.results || [];
      state.trace = action.payload.trace || null;
      state.algorithm = action.payload.algorithm || state.algorithm;
      state.error = null;
    },
    setSearchError: (state, action) => {
      state.error = action.payload;
      state.results = [];
    },
    setVectorsData: (state, action) => {
      state.vectors = action.payload.data || [];
      state.stats = action.payload.statistics || null;
    },
    setSearchParams: (state, action) => {
      Object.assign(state, action.payload);
    },
    setQuery: (state, action) => {
      state.query = action.payload;
    },
  },
});

export const {
  setSearchLoading,
  setSearchResults,
  setSearchError,
  setVectorsData,
  setSearchParams,
  setQuery,
} = searchSlice.actions;

export default searchSlice.reducer;
