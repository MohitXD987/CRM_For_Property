async function sendMessage() {
  const phone = document.getElementById("phone").value;
  const ref = document.getElementById("var1").value;

  const res = await fetch(`/send-template-ui?to=${phone}&ref=${ref}`);
  const data = await res.json();

  addMessage("You", `Reference ID: ${ref}`);
}

function addMessage(sender, text) {
  const chat = document.getElementById("chat");
  const div = document.createElement("div");
  div.className = "msg";
  div.innerText = text;
  chat.appendChild(div);
}
