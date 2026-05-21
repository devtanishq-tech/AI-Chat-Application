import { MyContext } from "./Mycontext";
import ChatWindow from "./ChatWindow";
import SidebarMain from "./SidebarMain";
import AuthModal from "./AuthModal";
import "./App.css";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { useEffect } from "react";

function App() {
  // ---- Chat state ----------------------------------------
  const [prompt, setprompt] = useState("");
  const [reply, setreply] = useState(null);
  const [currentID, setcurrentID] = useState(uuidv4());
  const [loading, setloading] = useState(false);
  const [prevChats, setprevChats] = useState([]);
  const [newChat, setnewChat] = useState(true);
  const [stopGeneration, setstopGeneration] = useState(false);
  const [allthread, setallthread] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authModal, setAuthModal] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    const authrequest = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/auth/me`,
          {
            withCredentials: true,
          },
        );
        setIsAuthenticated(true);
        setUser(res.data.user);
      } catch (err) {
        setIsAuthenticated(false);
        setUser(null);
        console.log("Not Authenticated", err);
      }
    };
    authrequest();
  }, []);
  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);
  // ---- Auth handlers -------------------------------------
  const handleAuthSuccess = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    setAuthModal(null);
  };
  //=========================================

  //==========================================
  const handleLogout = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/logout`,
        {},
        { withCredentials: true },
      );
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // WHY: always clear local state even if the network request fails,
      // so the user is never stuck in a broken "logged in" UI state.
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  // ---- Context value -------------------------------------
  const valuePassed = {
    prompt,
    setprompt,
    reply,
    setreply,
    currentID,
    setcurrentID,
    loading,
    setloading,
    prevChats,
    setprevChats,
    newChat,
    setnewChat,
    stopGeneration,
    setstopGeneration,
    allthread,
    setallthread,
  };

  return (
    <div className="app">
      <MyContext.Provider value={valuePassed}>
        <SidebarMain
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          isAuthenticated={isAuthenticated}
        />

        <ChatWindow
          onOpenSidebar={openSidebar}
          isAuthenticated={isAuthenticated}
          user={user}
          onLogout={handleLogout}
          onOpenLogin={() => setAuthModal("login")}
          onOpenSignup={() => setAuthModal("signup")}
        />

        {/* Auth Modal — rendered at root level so it overl ays everything.
            Conditionally mounted: unmounts on close to reset all form state. */}
        {authModal && (
          <AuthModal
            mode={authModal}
            onClose={() => setAuthModal(null)}
            onSuccess={handleAuthSuccess}
            onSwitchMode={(mode) => setAuthModal(mode)}
          />
        )}
      </MyContext.Provider>
    </div>
  );
}

export default App;
