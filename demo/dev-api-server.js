const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;

const server = http.createServer(async (req, res) => {
  // set the request route
  if (req.url === "/device-motion-mock" && req.method === "POST") {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    // eslint-disable-next-line consistent-return
    req.on("end", () => {
      try {
        const parsedBody = JSON.parse(data);
        console.log(parsedBody, Object.keys(parsedBody));
        if (parsedBody.data) {
          return fs.writeFile(
            path.resolve(__dirname, "public", "device-motion-events.json"),
            JSON.stringify(parsedBody.data),
            (err) => {
              if (!err) {
                res.write(
                  JSON.stringify({
                    ok: true,
                  })
                );
              } else {
                JSON.stringify({
                  ok: false,
                  error: err.message,
                });
              }
              return res.end();
            }
          );
        }
        throw new Error("Missing data attribute");
      } catch (e) {
        res.write(
          JSON.stringify({
            ok: false,
            error: e.message,
          })
        );
        res.end();
      }
    });
  }
  // If no route present
  else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Route not found" }));
  }
});

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
