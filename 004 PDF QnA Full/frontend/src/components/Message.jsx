function Message({ message }) {
  return (
    <div className={message.role}>
      <strong>{message.role === "user" ? "You" : "AI"}</strong>

      <p>{message.content}</p>

      {message.sources && (
        <div className="sources">
          <strong>Sources</strong>

          {message.sources.map((s, i) => (
            <div key={i}>Page {s.page}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Message;
