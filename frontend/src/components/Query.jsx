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
  const chatHistoryRef = useRef(null);

  const handleQuery = async () => {
    if (!question.trim()) return;
    setShowSources(false);
    setLoading(true);
    setAnswer("");
    setSources([]);
    setHistory((h) => [...h, { role: "user", content: question }]);
    setQuestion("");
    let aiMsgIdx = null;
    let aiMsg = { role: "ai", content: "", sources: [], thinking: "", _thinkingFolded: false, _sourcesFolded: false };
    setHistory((h) => {
      aiMsgIdx = h.length + 1;
      return [...h, aiMsg];
    });
    try {
      const response = await fetch("http://localhost:8000/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          messages: history.map(({ role, content }) => ({ role, content })), // 传递历史
        }),
      });
      if (!response.ok) throw new Error("接口请求失败");
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let buffer = "";
      let thinking = "";
      let content = "";
      let inThinking = false;
      let thinkingBuffer = "";
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          // 处理多行 JSON
          let lines = buffer.split(/\r?\n/);
          buffer = lines.pop(); // 最后一行可能是不完整的，留到下次
          for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            try {
              const data = JSON.parse(line);
              if (typeof data.delta === "string") {
                let delta = data.delta;
                let i = 0;
                while (i < delta.length) {
                  if (!inThinking) {
                    const startIdx = delta.indexOf('<think>', i);
                    if (startIdx === -1) {
                      // 没有 <think>，全是普通内容
                      const normalText = delta.slice(i);
                      if (normalText) {
                        content += normalText;
                        setAnswer(content);
                        setHistory((h) => {
                          const newH = [...h];
                          const aiIdx = newH.length - 1;
                          if (aiIdx >= 0 && newH[aiIdx].role === "ai") {
                            newH[aiIdx] = { ...newH[aiIdx], content, thinking };
                          }
                          return newH;
                        });
                      }
                      break;
                    } else {
                      // 先加前面的普通内容
                      if (startIdx > i) {
                        const normalText = delta.slice(i, startIdx);
                        if (normalText) {
                          content += normalText;
                          setAnswer(content);
                          setHistory((h) => {
                            const newH = [...h];
                            const aiIdx = newH.length - 1;
                            if (aiIdx >= 0 && newH[aiIdx].role === "ai") {
                              newH[aiIdx] = { ...newH[aiIdx], content, thinking };
                            }
                            return newH;
                          });
                        }
                      }
                      // 进入思考模式
                      inThinking = true;
                      i = startIdx + 7; // 跳过 <think>
                      thinkingBuffer = "";
                    }
                  } else {
                    const endIdx = delta.indexOf('</think>', i);
                    if (endIdx === -1) {
                      // 没有 </think>，全部加到思考
                      thinkingBuffer += delta.slice(i);
                      thinking += delta.slice(i);
                      setHistory((h) => {
                        const newH = [...h];
                        const aiIdx = newH.length - 1;
                        if (aiIdx >= 0 && newH[aiIdx].role === "ai") {
                          newH[aiIdx] = { ...newH[aiIdx], thinking };
                        }
                        return newH;
                      });
                      break;
                    } else {
                      // 有 </think>，加到思考，然后退出思考模式
                      thinkingBuffer += delta.slice(i, endIdx);
                      thinking += delta.slice(i, endIdx);
                      setHistory((h) => {
                        const newH = [...h];
                        const aiIdx = newH.length - 1;
                        if (aiIdx >= 0 && newH[aiIdx].role === "ai") {
                          newH[aiIdx] = { ...newH[aiIdx], thinking };
                        }
                        return newH;
                      });
                      inThinking = false;
                      i = endIdx + 8; // 跳过 </think>
                      thinkingBuffer = "";
                    }
                  }
                }
              }
            } catch (e) {
              // 不是合法 JSON，忽略
            }
          }
        }
      }
      // 结束后可选：处理 sources
      // 可根据后端最终返回格式调整
    } catch (err) {
      setAnswer("");
      setHistory((h) => [...h, { role: "ai", content: "查询失败：" + err.message }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [history]);

  return (
    <div className="owui-chat-wrap">
      <div className="owui-chat-history" ref={chatHistoryRef}>
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