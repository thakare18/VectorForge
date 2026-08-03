import { Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Chat from "./pages/Chat";
import Benchmark from "./pages/Benchmark";
import Settings from "./pages/Settings";
import Swagger from "./pages/Swagger";
import NotFound from "./pages/NotFound";

function App() {

    return (

        <Routes>

            <Route
                path="/"
                element={<Dashboard />}
            />

            <Route
                path="/upload"
                element={<Upload />}
            />

            <Route
                path="/chat"
                element={<Chat />}
            />

            <Route
                path="/benchmark"
                element={<Benchmark />}
            />

            <Route
                path="/settings"
                element={<Settings />}
            />

            <Route
                path="/swagger"
                element={<Swagger />}
            />

            <Route
                path="*"
                element={<NotFound />}
            />

        </Routes>

    );

}

export default App;