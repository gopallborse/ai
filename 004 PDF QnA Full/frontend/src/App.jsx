import { useState } from "react";

import Upload from "./components/Upload";
import Chat from "./components/Chat";

function App() {
  const [ready, setReady] = useState(false);

  return (
    <div className="container">
      <h1>PDF RAG Chat</h1>

      {!ready ? <Upload setReady={setReady} /> : <Chat />}
    </div>
  );
}

export default App;
