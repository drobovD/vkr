const { exec } = require('node:child_process');
const fs = require("node:fs");

const arg = "Новый день"
const cmd = `C:/Users/home/AppData/Local/Programs/Python/Python311/python.exe script.py "${arg}"`
exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error(`exec ${error}`);
    return;
  }
  // console.log(`stdout: ${stdout}`);
  // console.error(`stderr: ${stderr}`);
  fs.readFile("D:/Projects/Front/temp.txt", "utf8", function(err, data) {
    console.log(data)
  })
}); 