import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(

    <StrictMode>

        <BrowserRouter>

            <App />

            <Toaster
                position="top-right"
                reverseOrder={false}
            />

        </BrowserRouter>

    </StrictMode>

);