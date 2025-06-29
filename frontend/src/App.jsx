// frontend/src/App.jsx
import { useState } from "react";
import Query from "./components/Query";
import "./App.css";

function App() {
  const [showKB, setShowKB] = useState(true);
  return (
    <div className="owui-bg">
      <div className="owui-layout">
        {/* 知识库侧边栏 */}
        <aside className={`kb-sidebar${showKB ? "" : " kb-sidebar-hide"}`}>
          <div className="kb-header">
            <span>📁 知识库</span>
            <button
              className="kb-hide-btn"
              onClick={() => setShowKB(false)}
              title="隐藏"
            >
              ×
            </button>
          </div>
          <Query.KnowledgeBaseList />
        </aside>
        {/* 主聊天区 */}
        <main className="owui-main">
          <div className="owui-chat-area">
            {/* 对话标题 */}
            <div className="owui-chat-title">💬 智能知识库对话</div>
            <Query />
          </div>
          <button
            className="kb-show-btn"
            onClick={() => setShowKB(true)}
            style={{
              display: showKB ? "none" : "inline-block",
              position: "fixed",
              left: 10,
              top: 10,
              zIndex: 20,
            }}
            title="显示知识库"
          >
            ☰
          </button>
        </main>
      </div>
      <footer className="footer">© 2025 LLM RAG App</footer>
    </div>
  );
}

export default App;