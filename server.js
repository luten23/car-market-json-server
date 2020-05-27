const fs = require("fs");
const bodyParser = require("body-parser");
const jsonServer = require("json-server");
const jwt = require("jsonwebtoken");

const server = jsonServer.create();
const router = jsonServer.router("db.json");
const userdb = JSON.parse(fs.readFileSync("./users.json", "UTF-8"));

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(jsonServer.defaults());

const SECRET_KEY = "123456789";

const expiresIn = "24h";

// Create a token from a payload
function createToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

// Verify the token
function verifyToken(token) {
  return jwt.verify(token, SECRET_KEY, (err, decode) =>
    decode !== undefined ? decode : err
  );
}

// Проверка наличия пользователя в базе по email'у
function isUserExist({ email, password }) {
  const userdb = JSON.parse(fs.readFileSync("./users.json", "UTF-8")); // парсим каждый раз, чтобы при регистрации нового пользователя можно было залогиниться без перезапуска сервера
  return (
    userdb.users.findIndex(
      user => user.email === email //&& user.password === password
    ) !== -1 // если не равно -1, значит есть в массиве - возвращает true
  );
}

// Register New User
server.post("/auth/register", (req, res) => {
  console.log("register endpoint called; request body:");
  console.log(req.body);
  const { email, password, name, lastname } = req.body;

  if (isUserExist({ email, password }) === true) {
    const status = 401;
    const message = "Email already exist";
    res.status(status).json({ status, message });
    return;
  }

  fs.readFile("./users.json", (err, data) => {
    if (err) {
      const status = 401;
      const message = err;
      res.status(status).json({ status, message });
      return;
    }

    // Get current users data
    var data = JSON.parse(data.toString());

    // Get the id of last user
    var last_item_id = data.users[data.users.length - 1].id;

    //Add new user
    data.users.push({ id: last_item_id + 1, email: email, password: password , name: name, lastname: lastname }); //add some data
    var writeData = fs.writeFile("./users.json", JSON.stringify(data),(err, result) => {
        // WRITE
        if (err) {
          const status = 401;
          const message = err;
          res.status(status).json({ status, message });
          return;
        }
      }
    );
  });

  // Create token for new user
  const access_token = createToken({ email, password });
  console.log("Access Token:" + access_token);
  res.status(200).json({ access_token });
});

// Login to one of the users from ./users.json
server.post("/auth/login", (req, res) => {
  console.log("login endpoint called; request body:");
  console.log(req.body);
  const { email, password } = req.body;
  if (isUserExist({ email, password }) === false) {
    const status = 401;
    const message = "Incorrect email or password";
    res.status(status).json({ status, message });
    return;
  }
  const access_token = createToken({ email, password });
  console.log("Access Token:" + access_token);
  res.status(200).json({ access_token });
});







// дата при добовлении server-side
server.post("/item", (req, res) => {
  console.log(req.body);
  req.body.date = new Date()
  console.log(req.body);

  router.db.get("item").insert(req.body).value()
  router.db.write()

  const status = 200;
  const message = "OK";
  res.status(status).json({ status, message });
});

// дата при обновлении server-side
server.use(jsonServer.bodyParser)
server.use((req, res, next) => {
  if (req.method === 'PUT') {
		req.body.date = new Date()
  }
  // Continue to JSON Server router
  next()
})








server.use((req, res, next) => {
  const url = req.url;
  if (url.includes("/item/")) {
    next();
  } else {
    if (
      req.headers.authorization === undefined ||
      req.headers.authorization.split(" ")[0] !== "Bearer"
    ) {
      const status = 401;
      const message = "Error in authorization format";
      res.status(status).json({ status, message });
      return;
    }

    try {
      let verifyTokenResult;
      verifyTokenResult = verifyToken(req.headers.authorization.split(" ")[1]);
      console.log(verifyTokenResult);

      if (verifyTokenResult instanceof Error) {
        const status = 401;
        const message = "Access token not provided";
        res.status(status).json({ status, message });
        return;
      }

      next();
    } catch (err) {
      const status = 401;
      const message = "Error access_token is revoked";
      res.status(status).json({ status, message });
    }
  }
});

server.use(router);

server.listen(3333, () => {
  console.log("Run Auth API Server");
});
