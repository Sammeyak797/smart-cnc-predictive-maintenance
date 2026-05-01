import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import { AppProvider } from "./context/AppContext"
import { Toaster } from "react-hot-toast"
import "./index.css"

const root = ReactDOM.createRoot(document.getElementById("root"))

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />

        {/*
          FIX: was "top-right" which placed toasts directly over the sticky
          header's Logout button, making it unclickable.

          "bottom-right" keeps toasts well away from all header controls.
          containerStyle adds a bottom offset so toasts clear the page edge
          cleanly and don't sit flush against the viewport corner.
        */}
        <Toaster
          position="bottom-right"
          containerStyle={{ bottom: 24, right: 24 }}
          toastOptions={{
            // Default duration
            duration: 4000,

            // Base style — matches the app's card aesthetic
            style: {
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: "500",
              padding: "12px 16px",
              maxWidth: "360px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            },

            // Success toasts — green accent
            success: {
              style: {
                background: "#F0FDF4",
                color: "#166534",
                border: "1px solid #BBF7D0",
              },
              iconTheme: {
                primary: "#16A34A",
                secondary: "#F0FDF4",
              },
            },

            // Error toasts — red accent
            error: {
              duration: 5000,   // errors stay a little longer
              style: {
                background: "#FEF2F2",
                color: "#991B1B",
                border: "1px solid #FECACA",
              },
              iconTheme: {
                primary: "#DC2626",
                secondary: "#FEF2F2",
              },
            },
          }}
        />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
)