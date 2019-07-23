import path from "path";
import cors from "cors";
import uuidv1 from "uuid/v1";
import express from "express";
import request from "request";
import querystring from "query-string";
import cookieParser from "cookie-parser";

const client_id = "//";
const client_secret = "//";
const redirect_uri = "http://localhost:8888/callback";

const stateKey = "spotify_auth_state";
const scope = "user-read-private user-read-email user-library-read";

const app = express();

app
  .use(express.static(path.join(__dirname, "..", "/public")))
  .use(cors())
  .use(cookieParser());

app.get("/login", (_req, res) => {
  const state = uuidv1();
  res.cookie(stateKey, state);

  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        state,
        scope,
        client_id,
        redirect_uri,
        response_type: "code"
      })
  );
});

app.get("/callback", ({ query, cookies }, res) => {
  const code = query.code || null;
  const state = query.state || null;
  const storedState = cookies ? cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect(`/#${querystring.stringify({ error: "state_mismatch" })}`);
  } else {
    res.clearCookie(stateKey);

    const authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code,
        redirect_uri,
        grant_type: "authorization_code"
      },
      headers: {
        Authorization: `Basic ${new Buffer(
          `${client_id}:${client_secret}`
        ).toString("base64")}`
      },
      json: true
    };

    request.post(
      authOptions,
      (error, { statusCode }, { access_token, refresh_token }) => {
        if (!error && statusCode === 200) {
          // request.get(options, function(error, response, body) {
          // //   request.get({
          // //   url: 'https://api.spotify.com/v1/recommendations?market=US&seed_genres=classical%2Ccountry&min_energy=0.4&max_popularity=1',
          // //   headers: { 'Authorization': 'Bearer ' + access_token },
          // //   json: true
          // // }, function(error, response, body) {
          // //     console.log(body.tracks.forEach(({artists}) => console.log(artists)));
          // //   });
          // });

          res.redirect(
            `/#${querystring.stringify({ access_token, refresh_token })}`
          );
        } else {
          res.redirect(
            `/#${querystring.stringify({
              error: "invalid_token"
            })}`
          );
        }
      }
    );
  }
});

app.get("/refresh_token", ({ query: { refresh_token } }, res) => {
  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    headers: {
      Authorization: `Basic ${new Buffer(
        `${client_id}:${client_secret}`
      ).toString("base64")}`
    },
    form: {
      grant_type: "refresh_token",
      refresh_token
    },
    json: true
  };

  request.post(authOptions, (error, { statusCode }, { access_token }) => {
    if (!error && statusCode === 200) {
      res.send({ access_token });
    }
  });
});

console.log("Listening on 3000");
app.listen(3000);
