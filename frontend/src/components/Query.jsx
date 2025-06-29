// frontend/src/components/Query.js
import { useState, useRef, useEffect } from "react";
import Upload from "./Upload";
import ReactMarkdown from "react-markdown";
import "../App.css";

function KnowledgeBaseList() {
  const [vectorFiles, setVectorFiles] = useState([]);
  useEffect(() => {
    fetch("http://localhost:8000/api/vector_files")
      .then((res) => res.json())
      .then((data) => setVectorFiles(data.files || []));
  }, []);
  return (
    <ul className="kb-list">
      {vectorFiles.length === 0 && <li className="kb-list-empty">暂无文件</li>}
      {vectorFiles.map((file, idx) => (
        <li key={idx} className="kb-list-item">{file}</li>
      ))}
    </ul>
  );
}

export default function Query() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [history, setHistory] = useState([]); // 聊天历史
  const answerRef = useRef("");

  const handleQuery = async () => {
    if (!question.trim()) return;
    setShowSources(false);
    setLoading(true);
    setAnswer("");
    setSources([]);
    setHistory((h) => [...h, { role: "user", content: question }]);
    setQuestion("");
    try {
      const response = await fetch("http://localhost:8000/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!response.ok) throw new Error("接口请求失败");
      const data = await response.json();
      setAnswer(data.answer || "");
      setSources(Array.isArray(data.sources) ? data.sources : []);
      setShowSources(!!(data.sources && data.sources.length));
      setHistory((h) => [
        ...h,
        {
          role: "ai",
          content: data.answer || "",
          sources: Array.isArray(data.sources) ? data.sources : [],
          thinking: data.thinking || "",
          _thinkingFolded: false, // 新增：默认不折叠
          _sourcesFolded: false // 新增：默认不折叠
        }
      ]);
    } catch (err) {
      setAnswer("");
      setHistory((h) => [...h, { role: "ai", content: "查询失败：" + err.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="owui-chat-wrap">
      <div className="owui-chat-history">
        {history.length === 0 && (
          <div className="owui-empty">开始你的知识库对话吧~</div>
        )}
        {history.map((msg, idx) =>
          msg.role === "user" ? (
            <div key={idx} className="owui-msg owui-msg-user">
              <div className="owui-msg-bubble owui-msg-bubble-user">
                <span className="owui-msg-role">我：</span> {msg.content}
              </div>
            </div>
          ) : (
            <div key={idx} className="owui-msg owui-msg-ai" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
              {/* 展示thinking内容 */}
              {msg.thinking && (
                <div className="owui-msg-bubble-thinking-wrap" style={{width: '100%'}}>
                  <div
                    className={`owui-msg-bubble owui-msg-bubble-thinking${msg._thinkingFolded ? ' folded' : ''}`}
                    style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                    onClick={() => {
                      setHistory((h) =>
                        h.map((item, i) =>
                          i === idx ? { ...item, _thinkingFolded: !item._thinkingFolded } : item
                        )
                      );
                    }}
                  >
                    <span className="owui-msg-thinking-arrow">{msg._thinkingFolded ? '▶' : '▼'}</span>
                    <span className="owui-msg-role">AI思考：</span>
                    {Boolean(msg.thinking) && !msg._thinkingFolded && (
                      <span className="owui-msg-thinking-content" style={{
                        width: '100%',
                        whiteSpace: 'pre-wrap',
                        verticalAlign: 'top',
                        marginTop: 2,
                      }}>{msg.thinking}</span>
                    )}
                  </div>
                </div>
              )}
              <div className="owui-msg-bubble owui-msg-bubble-ai" style={{margin: '2px 0'}}>
                <span className="owui-msg-role">AI：</span>
                <span className="owui-msg-markdown-answer">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </span>
              </div>
              {/* RAG引用气泡 */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="owui-msg-bubble-sources-wrap">
                  <div
                    className={`owui-msg-bubble owui-msg-bubble-sources${msg._sourcesFolded ? ' folded' : ''}`}
                    onClick={() => {
                      setHistory((h) =>
                        h.map((item, i) =>
                          i === idx ? { ...item, _sourcesFolded: !item._sourcesFolded } : item
                        )
                      );
                    }}
                  >
                    <span className="owui-msg-thinking-arrow">{msg._sourcesFolded ? '▶' : '▼'}</span>
                    <span className="owui-msg-role">引用：</span>
                    <ul className="owui-msg-sources-list" style={{ maxHeight: msg._sourcesFolded ? 0 : 500, opacity: msg._sourcesFolded ? 0 : 1, transition: 'max-height 0.35s cubic-bezier(.4,0,.2,1), opacity 0.25s' }}>
                      {msg.sources.map((source, i) => (
                        <li key={i} className="owui-msg-source-item">
                          {source}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>
      <form
        className="owui-chat-inputbar"
        onSubmit={(e) => {
          e.preventDefault();
          handleQuery();
        }}
      >
        <Upload minimal />
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="输入你的问题..."
          className="owui-input"
          disabled={loading}
        />
        <button className="owui-send-btn" type="submit" disabled={loading || !question.trim()}>
          发送
        </button>
      </form>
    </div>
  );
}

Query.KnowledgeBaseList = KnowledgeBaseList;