const http = require("node:http");
const fs = require("node:fs");
const { readFile, writeFile } = require("node:fs/promises");
const { exec } = require("node:child_process");

const mysql = require("mysql");
const connection = mysql.createConnection({
  host: "localhost",
  user: "admin",
  password: "rehjxrf21",
  database: "linkquotage",
});
connection.connect();

const authenticatedRoutes = {
  "/index.html": (_, res) => sendFile(res, "index.html"),
  "/settings.html": (_, res) => sendFile(res, "settings.html"),
  "/style.css": (_, res) => sendFile(res, "style.css"),
  "/script.js": (_, res) => sendFile(res, "script.js"),

  "/share_record": (req, res) => processShareRecord(req, res),
  "/attach_file": (req, res) => processAttachFile(req, res),
  "/get_summary": (req, res) => processGetSummary(req, res),

  "/change_password": (req, res, user, users) =>
    changePassword(req, res, user, users),
  "/tags": (_, res, user, users) => processMyTags(res, user, users),
  "/add_tag": (req, res) => processAddTag(req, res),
  "/add_to_favorites": (req, res) =>
    changeRecordStorage(req, res, "favorites.json", "favorites", true),
  "/remove_from_favorites": (req, res) =>
    changeRecordStorage(req, res, "favorites.json", "favorites", false),
  "/move_to_recycle_bin": (req, res) =>
    changeRecordStorage(req, res, "recycle_bin.json", "recycle_bin", true),
  "/restore_from_recycle_bin": (req, res) =>
    changeRecordStorage(req, res, "recycle_bin.json", "recycle_bin", false),
  "/records": (req, res, user) => processMyRecords(req, res, user),
  "/articles": (req, res, user, users) => sendData(req, res, user, users),
  "/videos": (req, res, user, users) => sendData(req, res, user, users),
  "/get_record": (req, res, user) => processGetRecord(req, res, user),
  "/favorites": (_, res, user, users) =>
    processFavorites(res, "favorites", user, users),
  "/recycle_bin": (_, res, user, users) =>
    processRecycleBin(res, "recycle_bin", user, users),
  "/edit_title": (req, res, user) => processEditTitle(req, res, user),
  "/find_tag": (req, res, user) => processFindTag(req, res, user),
  "/delete_record": (req, res) => processDeleteRecord(req, res),

  "/create_record": (req, res, user) => createRecord(req, res, user),

  "/delete_records": (req, res) => deleteRecords(req, res),
  "/restore_records": (req, res) => restoreRecords(req, res),
};

const server = http.createServer((_req, res) => {
  const req = createWrapperForReq(_req);
  if (req.url === "/" || req.url === "/login.html") {
    sendFile(res, "login.html"); //Запросы для файлов
  } else if (req.url === "/login") {
    processClientData(req, cb);
    function cb(data) {
      const user = JSON.parse(data);
      const query = `SELECT * FROM users WHERE email='${user.email}' AND password='${user.password}';`;
      connection.query(query, function (error, users, fields) {
        const [actualUser] = users;
        if (actualUser) {
          const cookie = createCookie();
          const query = `UPDATE users SET cookie=${cookie} WHERE id=${actualUser.id};`;
          connection.query(query, function (error, users, fields) {
            res.writeHead(200, {
              "Content-Type": "application/json",
              "Set-Cookie": cookie,
            });
            res.end(JSON.stringify({ success: true }));
          });
        } else {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ success: false, msg: "Authentication error" })
          );
        }
      });
    }
  } else if (req.url === "/logout") {
    getUserByCookie(req._req.headers.cookie, function (err, user, users) {
      if (err) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ success: false, msg: "Authentication error" })
        );
      } else {
        user.cookie = null;
        connection.query(
          `UPDATE users SET cookie=NULL WHERE id=${user.id};`,
          function () {
            res.end(JSON.stringify({ success: true }));
          }
        );
      }
    });
  } else if (req.url === "/signup.html") {
    sendFile(res, "signup.html");
  } else if (req.url === "/signup") {
    processClientData(req, cb);
    function cb(data) {
      connection.query("SELECT * FROM users", function (error, users, fields) {
        const user = JSON.parse(data);
        for (const obj of users) {
          if (obj.email === user.email) {
            sendErrorResponse(res, "Such user already exists");
            return;
          }
        }
        const result = validateUser(user);
        if (result === true) {
          const cookie = createCookie();
          const query = `INSERT INTO users VALUES('${createUserId()}','${
            user.name
          }','${user.email}','${user.password}','${cookie}');`;
          connection.query(query, function (error, users, fields) {
            res.writeHead(200, {
              "Content-Type": "application/json",
              "Set-Cookie": cookie,
            });
            res.end(JSON.stringify({ success: true }));
          });
        } else {
          sendErrorResponse(res, result);
        }
      });
    }
  } else if (req.url === "/favicon.ico") {
    sendFile(res, "favicon.ico");
  } else if (req.url === "/test") {
    const cookie = _req.headers.cookie;
    const query = `SELECT * FROM users WHERE cookie=${cookie};`;
    connection.query(query, function (error, users, fields) {
      res.writeHead(200, { "Content-Type": "application/json" });
      if (users === undefined) {
        res.end(JSON.stringify({ success: false }));
        return;
      }
      if (users.length > 0) {
        const user = users[0]
        const query = `SELECT id FROM records WHERE user_id=${user.id};`;
        connection.query(query, function (error, records, fields) {
          const recordIds = records.map((obj) => obj.id);
          const query = `SELECT text FROM tags WHERE record_id IN (${recordIds.join(",")});`;
          connection.query(query, function (error, tags, fields) {
            const uniqueTags = new Set();
            for (const tag of tags) {
              uniqueTags.add(tag.text);
            }
            const result = [...uniqueTags];
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, username: user.name, tags: result }));
          });
        });
      } else {
        res.end(JSON.stringify({ success: false }));
      }
    });
  } else {
    const match = req.url.match(/^\/link-(\d{10})$/)
    if (match) {
      const link = match[1]
      const query = `SELECT * FROM records WHERE BINARY link='${link}';`;
      console.log(query)
      connection.query(query, function (error, records, fields) {
        console.log(records)
        if (records.length > 0) {
          fs.readFile("link.html", "utf-8", function(err, data) {
            const record = records[0]
            data = data.replace("<title>", `<title>${record.title}`)
            if (record.img) {
              data = data.replace("<img>", `<img src="screenshots/${record.id}.jpeg" width=250>`)
            }
            data = data.replace('<div class="title">', `<div class="title">${record.title}`)
            if (record.url) {
              data = data.replace('<a href="">', `<a href="${record.url}" target=blank>`)
            }
            res.writeHead(200, {
              "Content-Type": "text/html"
            });
            res.end(data);
          })
        } else {
          sendFile(res, "404.html");
          console.log(404, 1, req.url)
        }
      })
    } else {
      const match = req.url.match(/^\/screenshots\/\d+.jpeg$/)
      if (match) {
        const fileName = match[0].substring(1)
        fs.readFile(fileName, function(err, data) {
          console.log(err)
          res.writeHead(200, {
            "Content-Type": "application/octet-stream"
          });
          res.end(data);
          console.log(123)
        })
      } else {
        getUserByCookie(req._req.headers.cookie, function (err, user, users) {
          if (err) {
            if (req.url in authenticatedRoutes) {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({ success: false, msg: "Authentication error" })
              );
            } else {
              sendFile(res, "404.html");
              console.log(404, 2, req.url)
            }
          } else {
            if (req.url in authenticatedRoutes) {
              authenticatedRoutes[req.url](req, res, user, users);
            } else {
              sendFile(res, "404.html");
              console.log(404, 3, req.url)
            }
          }
        });
      }
    }
  }
});

server.listen(8000);

/************************************************** HELPERS *****************************************************************/

function createWrapperForReq(req) {
  const [url, queryString] = req.url.split("?");
  const queryParams = {};
  if (queryString) {
    for (const item of queryString.split("&")) {
      let [key, val] = item.split("=");
      queryParams[key] = decodeURI(val);
    }
    return {
      _req: req,
      url,
      queryParams,
    };
  } else {
    return {
      _req: req,
      url,
    };
  }
}

/********************************************************/

const contentTypes = {
  html: "text/html",
  css: "text/css",
  js: "application/javascript",
  ico: "image/x-icon",
};

function sendFile(res, fileName) {
  const fileExtension = fileName.split(".")[1];
  const contentType = contentTypes[fileExtension];
  fs.readFile(fileName, function (err, data) {
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

/********************************************************/

function addKeys(arr, key, value) {
  for (let i = 0; i < arr.length; i++) {
    arr[i][key] = value;
  }
}
/********************************************************/

function sendData({ url }, res, user) {
  const contentCategory = url.slice(1, -1);
  const query = `SELECT id FROM record_types WHERE name='${contentCategory}';`;
  connection.query(query, function (error, record_types, fields) {
    const [record_type] = record_types;
    const query = `SELECT * FROM records WHERE user_id='${user.id}' AND record_type='${record_type.id}';`;
    console.log(query);
    connection.query(query, function (error, records, fields) {
      addKeys(records, "content_category", contentCategory);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, data: records }));
    });
  });
  // const fileName = contentCategory + ".json";
  // fs.readFile(fileName, { encoding: "utf8" }, function (err, data) {
  //   const records = JSON.parse(data);
  //   const result = filterRecordsByUserId(records, user.id);
  //   addKeys(result, "content_category", contentCategory);
  //   res.writeHead(200, { "Content-Type": "application/json" });
  //   res.end(JSON.stringify({ success: true, data: result }));
  // });
}

/********************************************************/

function processClientData(req, cb) {
  let data = "";
  req._req.on("data", (chunk) => (data += chunk));
  req._req.on("end", () => cb(data));
}

/********************************************************/

function createCookie() {
  return random(6);
}

/********************************************************/

function getUserByCookie(cookie, cb) {
  connection.query("SELECT * FROM users;", function (error, users, fields) {
    for (let i = 0; i < users.length; i++) {
      if (users[i].cookie === cookie) {
        cb(false, users[i], users);
        return;
      }
    }
    cb(true);
  });
}

/********************************************************/

function sendErrorResponse(res, msg) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ success: false, msg }));
}

/********************************************************/

function validateUser(user) {
  if (!/[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,3}$/.test(user.email)) {
    return "Incorrect email";
  } else if (!/^[a-zA-Zа-яА-ЯёЁ -]{5,30}$/.test(user.name)) {
    return "Incorrect name";
  } else {
    return validatePassword(user.password);
  }
}

/********************************************************/

function createRecord(req, res, user) {
  processClientData(req, async function (data) {
    const record = JSON.parse(data);
    connection.query(`SELECT id FROM record_types WHERE name = '${record.type}';`, function(error, recordTypes, fields) {
      record.content = record.content.replace('\'', '\\\'')
      const query = `INSERT INTO records (user_id, record_type, url, title, content, comment, favorites, recycle_bin)
      VALUES ('${user.id}',${recordTypes[0].id},'${record.url}','${record.title}','${record.content}','${record.comment}', false, false);`;
      connection.query(query, function (error, result, fields) {
        connection.query("SELECT LAST_INSERT_ID();", function(error, result, fields) {
          const recordId = result[0]["LAST_INSERT_ID()"]
          const values = [];
          for (const tag of record.tags) {
            values.push(`(${recordId}, '${tag}')`);
          }
          const query = `INSERT INTO tags (record_id, text) VALUES ${values.join(
            ", "
          )};`;
          connection.query(query, function (error, users, fields) {
            fs.writeFile(`screenshots/${recordId}.jpeg`, Buffer.from(record.screenshot, 'base64').subarray(15), () => {});
            console.log(recordId)
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
          })
        })
      });
    })

    // let primaryFileName, secondaryFileName;
    // if (typeArticle) {
    //   primaryFileName = "articles.json";
    //   secondaryFileName = "videos.json";
    // } else {
    //   primaryFileName = "videos.json";
    //   secondaryFileName = "articles.json";
    // }
    // let myRecords = await Promise.all([
    //   JSON.parse(await readFile(primaryFileName)),
    //   JSON.parse(await readFile(secondaryFileName)),
    // ]);
    // const [primaryArr, secondaryArr] = myRecords;
    // const arr = [];
    // let recordId = 1;
    // for (const item of [...primaryArr, ...secondaryArr]) {
    //   if (item.record_id > recordId) {
    //     recordId = item.record_id;
    //   }
    // }
    // recordId++;
    // const newRecord = JSON.parse(data);
    // for (let i = 0; i < primaryArr.length; i++) {
    //   if (primaryArr[i].content === newRecord.content) {
    //     res.writeHead(200, { "Content-Type": "application/json" });
    //     res.end(
    //       JSON.stringify({ success: false, msg: "Such record already exists" })
    //     );
    //     return;
    //   }
    // }
    // primaryArr.push({
    //   user_id: user.id,
    //   record_id: recordId,
    //   ...newRecord,
    // });
    // await writeFile(primaryFileName, JSON.stringify(primaryArr, null, 4));
    // res.writeHead(200, { "Content-Type": "application/json" });
    // res.end(JSON.stringify({ success: true }));
  });
}

/********************************************************/

function changePassword(req, res, user) {
  processClientData(req, function (data) {
    const userData = JSON.parse(data);
    if (userData.currentPassword === user.password) {
      const result = validatePassword(userData.newPassword);
      if (result === true) {
        user.password = userData.newPassword;
        const query = `UPDATE users SET password='${userData.newPassword}' WHERE id='${user.id}';`;
        connection.query(query, function () {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        });
      } else {
        sendErrorResponse(res, result);
      }
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, msg: "Authentication error" }));
    }
  });
}

/********************************************************/

function validatePassword(password) {
  if (!/^.*[a-zа-яё].*$/.test(password)) {
    return "Password must contain at least one lowercase letter";
  } else if (!/^.*[A-ZА-ЯЁ].*$/.test(password)) {
    return "Password must contain at least one uppercase letter";
  } else if (!/^.*\d.*$/.test(password)) {
    return "Password must contain at least one number";
  } else if (!/^.*[$%#!*].*$/.test(password)) {
    return "Password must contain at least one special character ($%#!*)";
  } else if (/^.*[^a-zA-Zа-яА-ЯёЁ\d`$%#!*-].*$/.test(password)) {
    return "Password contains characters that are not allowed";
  } else if (!/^[a-zA-Zа-яА-ЯёЁ\d`$%#!*-]{8,15}$/.test(password)) {
    return "Password must contain 8-15 characters";
  } else {
    return true;
  }
}

/********************************************************/

function createUserId() {
  return random(8);
}

/********************************************************/

function random(length) {
  return String(Math.floor(Math.random() * 10 ** length)).padStart(length, 0);
}

/********************************************************/

function filterRecordsByUserId(records, userId) {
  const result = [];
  for (const record of records) {
    if (record.user_id === userId) {
      result.push(record);
    }
  }
  return result;
}

/********************************************************/

function filterRecordsByTag(records, tag) {
  const result = [];
  for (const record of records) {
    if (record.tags.includes(tag)) {
      result.push(record);
    }
  }
  return result;
}

/********************************************************/

async function processMyRecords({ queryParams }, res, user) {
  // let myRecords = await Promise.all([
  //   readFile("articles.json"),
  //   readFile("videos.json"),
  // ]);
  // myRecords[0] = JSON.parse(myRecords[0])
  // myRecords[1] = JSON.parse(myRecords[1])
  // myRecords[0].forEach((record) => (record.content_category = "articles"));
  // myRecords[1].forEach((record) => (record.content_category = "videos"));
  // myRecords = myRecords.flat();
  // myRecords = filterRecordsByUserId(myRecords, user.id);
  const query = `SELECT * FROM records WHERE user_id=${user.id};`;
  connection.query(query, function (error, myRecords, fields) {
    if (queryParams.filter === "tags") {
      myRecords = filterRecordsByTag(myRecords, queryParams.tag);
    }
    const result = [];
    for (const item of myRecords) {
      if (!item.recycle_bin) {
        result.push(item);
      }
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, data: result }));
  });
}

/********************************************************/

async function processGetRecord(req, res, user) {
  // let myRecords = await Promise.all([
  //   readFile("articles.json"),
  //   readFile("videos.json"),
  // ]);
  // myRecords[0] = JSON.parse(myRecords[0])
  // myRecords[1] = JSON.parse(myRecords[1])
  // myRecords = myRecords.flat();
  // myRecords = filterRecordsByUserId(myRecords, user.id);

  if (req.queryParams === null) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: false,
        msg: "recordId is required",
      })
    );
  }
  const recordId = req.queryParams.id;
  const query = `SELECT * FROM records WHERE user_id=${user.id} AND id=${recordId};`;
  connection.query(query, function (error, myRecords, fields) {
    const [record] = myRecords;
    if (record) {
      const query = `SELECT text FROM tags WHERE record_id=${recordId};`;
      connection.query(query, function (error, tags, fields) {
        record.tags = tags.map((obj) => obj.text);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            data: record
          })
        );
      });
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: false,
          msg: "record not found",
        })
      );
    }
  });
}

/********************************************************/

function processMyTags(res, user, users) {
  const query = `SELECT id FROM records WHERE user_id=${user.id};`;
  connection.query(query, function (error, records, fields) {
    const recordIds = records.map((obj) => obj.id);
    const query = `SELECT text FROM tags WHERE record_id IN (${recordIds.join(
      ","
    )});`;
    connection.query(query, function (error, tags, fields) {
      const uniqueTags = new Set();
      for (const tag of tags) {
        uniqueTags.add(tag.text);
      }
      const result = [...uniqueTags];
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, data: result }));
    });
  });
}

/********************************************************/

function processFindTag(req, res, user) {
  const query = `SELECT id FROM records WHERE user_id = '${user.id}';`;
  connection.query(query, function (error, records, fields) {
    const recordIds = records.map((obj) => obj.id);
    console.log(recordIds);
    const query = `SELECT text FROM tags WHERE text LIKE '%${
      req.queryParams.tag
    }%' AND record_id IN (${recordIds.join(",")});`;
    connection.query(query, function (error, tags, fields) {
      const uniqueTags = new Set();
      for (const obj of tags) {
        uniqueTags.add(obj.text);
      }
      const result = [...uniqueTags];
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, data: result }));
    });
  });
}

/********************************************************/

function processFavorites(res, propertyName, user, users) {
  const query = `SELECT * FROM records WHERE user_id=${user.id} AND ${propertyName}=1 AND recycle_bin = 0;`;
  connection.query(query, function (error, records, fields) {
    const record_types = {
      1: "article",
      2: "video",
    };
    for (const record of records) {
      record.content_category = record_types[record.record_type];
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, data: records }));
  });
}

function processRecycleBin(res, propertyName, user, users) {
  const query = `SELECT * FROM records WHERE user_id=${user.id} AND ${propertyName}=1;`;
  connection.query(query, function (error, records, fields) {
    const record_types = {
      1: "article",
      2: "video",
    };
    for (const record of records) {
      record.content_category = record_types[record.record_type];
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, data: records }));
  });
}

/********************************************************/

function changeRecordStorage(
  req,
  res,
  secondaryFileName,
  propertyName,
  propertyValue
) {
  processClientData(req, async function (data) {
    const obj = JSON.parse(data);
    const recordId = Number(obj.recordId);
    const query = `UPDATE records SET ${propertyName}=${propertyValue} WHERE id=${recordId};`;
    connection.query(query, function (error, users, fields) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    });
  });
}

/********************************************************/

async function deleteRecords(req, res) {
  processClientData(req, async function (data) {
    const arr = JSON.parse(data);
    const articlesIds = [];
    const videosIds = [];
    for (const record of arr) {
      if (record.contentCategory === "articles") {
        articlesIds.push(record.recordId);
      } else {
        videosIds.push(record.recordId);
      }
    }
    const myRecords = await Promise.all([
      readFile("articles.json"),
      readFile("videos.json"),
    ]);
    const articlesArr = [];
    for (const record of JSON.parse(myRecords[0])) {
      if (!articlesIds.includes(record.record_id)) {
        articlesArr.push(record);
      }
    }
    const videosArr = [];
    for (const record of JSON.parse(myRecords[1])) {
      if (!videosIds.includes(record.record_id)) {
        videosArr.push(record);
      }
    }
    await Promise.all([
      writeFile("articles.json", JSON.stringify(articlesArr, null, 4)),
      writeFile("videos.json", JSON.stringify(videosArr, null, 4)),
    ]);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true }));
  });
}

/********************************************************/

async function restoreRecords(req, res) {
  processClientData(req, async function (data) {
    const arr = JSON.parse(data);
    const articlesIds = [];
    const videosIds = [];
    for (const record of arr) {
      if (record.contentCategory === "articles") {
        articlesIds.push(record.recordId);
      } else {
        videosIds.push(record.recordId);
      }
    }
    const myRecords = await Promise.all([
      readFile("articles.json"),
      readFile("videos.json"),
    ]);
    const articlesArr = JSON.parse(myRecords[0]);
    for (const record of articlesArr) {
      if (articlesIds.includes(record.record_id)) {
        record.recycle_bin = false;
      }
    }
    const videosArr = JSON.parse(myRecords[1]);
    for (const record of videosArr) {
      if (videosIds.includes(record.record_id)) {
        record.recycle_bin = false;
      }
    }
    await Promise.all([
      writeFile("articles.json", JSON.stringify(articlesArr, null, 4)),
      writeFile("videos.json", JSON.stringify(videosArr, null, 4)),
    ]);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true }));
  });
}

/********************************************************/

function addUniqueTag(oldTags, newTag) {
  for (const oldTag of oldTags) {
    if (oldTag === newTag) {
      return;
    }
  }
  oldTags.push(newTag);
}

/********************************************************/

function processAddTag(req, res) {
  processClientData(req, function (data) {
    const obj = JSON.parse(data);
    const recordId = obj.recordId;
    const values = [];
    for (const tag of obj.tags) {
      values.push(`(${recordId}, '${tag}')`);
    }
    const query = `INSERT INTO tags (record_id, text) VALUES ${values.join(
      ", "
    )};`;
    connection.query(query, function (error, users, fields) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    });

    //   fs.readFile(fileName, function (err, contents) {
    //     const records = JSON.parse(contents);
    //     for (let i = 0; i < records.length; i++) {
    //       if (records[i].record_id == obj.recordId) {
    //         //Сравнение id
    //         for (const tag of obj.tags) {
    //           addUniqueTag(records[i].tags, tag);
    //         }

    //         fs.writeFile(fileName, JSON.stringify(records, null, 4), function () {
    //           res.writeHead(200, { "Content-Type": "application/json" });
    //           res.end(JSON.stringify({ success: true }));
    //         });

    //         return;
    //       }
    //     }
    //   });
  });
}

/********************************************************/

function processShareRecord(req, res) {
  processClientData(req, function (recordId) {
    const link = random(10)
    const query = `UPDATE records SET link='${link}' WHERE id=${recordId};`
    connection.query(query, function () {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, link }));
    })
  })
}

/********************************************************/

function processDeleteRecord(req, res) {
  processClientData(req, function (data) {
    const obj = JSON.parse(data);
    const query = `DELETE FROM records WHERE id=${obj.recordId};`;
    connection.query(query, function (error, users, fields) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    });
  });
}

/********************************************************/

function processEditTitle(req, res, user) {
  processClientData(req, function (data) {
    const obj = JSON.parse(data);
    console.log(obj);
    const query = `UPDATE records SET title='${obj.title}' WHERE user_id=${user.id} AND id=${obj.recordId};`;
    console.log(query);
    connection.query(query, function (error, users, fields) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    });
  });
}

/********************************************************/

function createFileName(contentType) {
  const fileType = contentType.split("/")[1];
  return `userData/${random(8)}.${fileType}`;
}

/********************************************************/

function processAttachFile(req, res) {
  processClientData(req, function (data) {
    fs.writeFile(createFileName("image/jpeg"), data, function () {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    });
  });
}

/********************************************************/

function processGetSummary(req, res) {
  processClientData(req, function (data) {
    fs.writeFile("temp.txt", data, function (err) {
      const cmd =
        "C:/Users/home/AppData/Local/Programs/Python/Python311/python.exe script.py";
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec ${error}`);
          return;
        }
        // console.log(`stdout: ${stdout}`);
        // console.error(`stderr: ${stderr}`);
        fs.readFile("temp.txt", "utf8", function (err, data) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, data }));
        });
      });
    });
  });
}
