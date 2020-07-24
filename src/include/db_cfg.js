var mysql = require('mysql');
const url = require('url');

var sqlURL = new URL(process.env.SQL_CONNECTION);

var con = mysql.createConnection({
  host: sqlURL.host,
  user: sqlURL.username,
  password: sqlURL.password
});

module.exports = {
    con
};
