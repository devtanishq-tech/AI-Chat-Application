import { useState } from "react";
import axios from "axios";

export default function Message() {
  const [message, setmessage] = useState("");
  const [response, setresponse] = useState("");
  const [id, setid] = useState("");
  const handleThreadID = (event) => {
    setid(event.target.value);
  };
  const handleMessage = (event) => {
    setmessage(event.target.value);
  };
  const isClick = async () => {
    try {
      let res = await axios.post("http://localhost:8080/chat/ai", {
        message: message,
        threadID: id,
      });
      // DATA IS reply.message
      console.log(res.data.reply);
      let ans = res.data.reply;
      setresponse(ans);
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <div>
      <h1>Hello</h1>
      <input
        onChange={handleThreadID}
        placeholder="Enter the thread id"
      ></input>
      <input
        onChange={handleMessage}
        placeholder="Enter the message you want to search"
      ></input>
      <button onClick={isClick}>Search</button>
      <br></br>
      <br></br>
      <textarea
        value={response}
        style={{ width: "800px", height: "100px" }}
      ></textarea>
    </div>
  );
}
