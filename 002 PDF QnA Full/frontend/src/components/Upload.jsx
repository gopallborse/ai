import { useState } from "react";
import api from "../api";

function Upload({ setReady }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const upload = async () => {
    if (!file) return;

    const form = new FormData();

    form.append("pdf", file);

    setLoading(true);

    try {
      const res = await api.post("/upload", form);

      alert(res.data.message);

      setReady(true);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }

    setLoading(false);
  };

  return (
    <div className="upload-card">
      <input
        type="file"
        accept=".pdf"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button onClick={upload} disabled={loading}>
        {loading ? "Processing PDF..." : "Upload"}
      </button>
    </div>
  );
}

export default Upload;
