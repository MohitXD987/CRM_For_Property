require("dotenv").config();
const express = require("express");
const path = require("path");


const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


const PORT = process.env.PORT || 4000;

app.get("/send-template-ui", async (req, res) => {
  const fetch = (await import("node-fetch")).default;

  const { to, ref } = req.query;

  const url = `https://graph.facebook.com/${process.env.API_VERSION}/${process.env.PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: "service_notification",
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: ref }]
        }
      ]
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  res.json(data);
});




app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
