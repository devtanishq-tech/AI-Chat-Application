import { MyContext } from "./Mycontext";
import ChatWindow from "./ChatWindow";
import SidebarMain from "./SidebarMain";
import "./App.css";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

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

  // ---- Mobile sidebar toggle state -----------------------
  // WHY: sidebar open/close lives in App so both SidebarMain
  // (which needs to know if it's open) and ChatWindow (which
  // has the hamburger button to open it) can share this state
  // without a third-party state manager.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);

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
        {/* isOpen + onClose power the mobile slide-in drawer */}
        <SidebarMain isOpen={sidebarOpen} onClose={closeSidebar} />
        {/* onOpenSidebar wires the hamburger button in the navbar */}
        <ChatWindow onOpenSidebar={openSidebar} />
      </MyContext.Provider>
    </div>
  );
}

export default App;
