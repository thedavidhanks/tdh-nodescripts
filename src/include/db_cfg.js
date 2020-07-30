const mysql = require('mysql2/promise');
const url = require('url');

var sqlURL = new URL(process.env.SQL_CONNECTION);

var con_pool = mysql.createPool({
  host: sqlURL.host,
  user: sqlURL.username,
  password: sqlURL.password,
  database: 'heroku_bfbb423415a117e',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
  
});

async function queryPromise(query) {

  const result = await con_pool.execute(query);
  if (!result[0].length < 1) {
    throw new Error('No results found');
  }
  
  return result[0];

}

module.exports = {
    con_pool,
    queryPromise
};