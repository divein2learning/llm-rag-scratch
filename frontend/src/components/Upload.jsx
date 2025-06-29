// frontend/src/components/Upload.js
import { useState, useRef } from "react";
import "../App.css";

export default function Upload({ minimal }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef();

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData,
      });
    } catch (err) {
      // 可加全局toast
    } finally {
      setLoading(false);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="owui-upload-group">
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button
        className="owui-upload-btn"
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        disabled={loading}
        title="上传文档"
        tabIndex={0}
        aria-label="上传文档"
      >
        {/* 更大更粗的+号SVG图标，充满圆形按钮 */}
        <svg viewBox="0 0 44 44" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" style={{display:'block'}}>
          <circle cx="22" cy="22" r="19" stroke="#a5b4fc" fill="#e0e7ff"/>
          <line x1="22" y1="12" x2="22" y2="32" stroke="#6366f1"/>
          <line x1="12" y1="22" x2="32" y2="22" stroke="#6366f1"/>
        </svg>
      </button>
      {file && (
        <>
          <span className="owui-upload-filename">{file.name}</span>
          <button
            className="owui-upload-confirm-btn"
            onClick={handleUpload}
            disabled={loading}
            title="确认上传"
            tabIndex={0}
            aria-label="确认上传"
          >
            {loading ? <span style={{fontSize:'1.1em'}}>···</span> : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>}
          </button>
        </>
      )}
    </div>
  );
}