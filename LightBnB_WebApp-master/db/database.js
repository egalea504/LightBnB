const properties = require("./json/properties.json");
const users = require("./json/users.json");

const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

//test to see if connection works
// // the following assumes that you named your connection variable `pool`
// pool.query(`SELECT title FROM properties LIMIT 10;`).then(response => {console.log(response)})

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
// const getUserWithEmail = function (email) {
//   let resolvedUser = null;
//   for (const userId in users) {
//     const user = users[userId];
//     if (user?.email.toLowerCase() === email?.toLowerCase()) {
//       resolvedUser = user;
//     }
//   }
//   return Promise.resolve(resolvedUser);
// };

const getUserWithEmail = (email) => {

  return pool
    .query(
      `SELECT id, name, email, password
      FROM users
      WHERE email = $1`,
      [email])
    .then((result) => {
      console.log(result.rows);
      const user = result.rows[0];
      if (!user) {
        return null;
      }
      const jsonUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
      };
      return jsonUser;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
// const getUserWithId = function (id) {
//   return Promise.resolve(users[id]);
// };

const getUserWithId = (id) => {

  return pool
    .query(
      `SELECT id, name, email, password
      FROM users
      WHERE id = $1`,
      [id])
    .then((result) => {
      console.log(result.rows);
      const user = result.rows[0];
      if (!user) {
        return null;
      }
      const jsonUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
      };
      return jsonUser;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
// const addUser = function (user) {
//   const userId = Object.keys(users).length + 1;
//   user.id = userId;
//   users[userId] = user;
//   return Promise.resolve(user);
// };

const addUser = (user) => {

  const {name, email, password} = user;
  return pool
    .query(
      `INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING *;`,
      [name, email, password])
    .then((result) => {
      console.log(result.rows);
      const insertedUser = result.rows[0];
      const jsonUser = {
        id: insertedUser.id,
        name: insertedUser.name,
        email: insertedUser.email,
        password: insertedUser.password,
      };
      return jsonUser;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
// const getAllReservations = function (guest_id, limit = 10) {
//   return getAllProperties(null, 2);
// };

const getAllReservations = (guest_id, limit = 10) => {

  return pool
    .query(
      `SELECT properties.*, reservations.id as id, reservations.start_date, AVG(property_reviews.rating) as average_rating
      FROM reservations
      JOIN properties ON reservations.property_id = properties.id
      JOIN property_reviews ON property_reviews.property_id = properties.id
      WHERE reservations.guest_id = $1
      GROUP BY reservations.id, properties.id
      ORDER BY start_date
      LIMIT $2;` ,
      [guest_id, limit])
    .then((result) => {
      console.log(result.rows);
      return(result.rows);
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
// const getAllProperties = function (options, limit = 10) {
//   const limitedProperties = {};
//   for (let i = 1; i <= limit; i++) {
//     limitedProperties[i] = properties[i];
//   }
//   return Promise.resolve(limitedProperties);
// };

const getAllProperties = (options, limit = 10) => {

  // 1
  const queryParams = [];
  // 2
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  // 3
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }

  if (options.owner_id) {
    queryParams.push(`${options.owner_id}`);
    // takes in owner_id which is the user signed in
    queryString += `WHERE owner_id = $${queryParams.length} `;
  }

  if (options.minimum_price_per_night) {
    // this will transform price in the format contained in database (in cents)
    let requestedMinCost = options.minimum_price_per_night * 100;
    // push param to params array
    queryParams.push(`${requestedMinCost}`);
    // add string to query cost_per_night should be higher or equal to param for min cost
    queryString += `AND cost_per_night >= $${queryParams.length} `;
  }

  if (options.maximum_price_per_night) {
    // this will transform price in the format contained in database (in cents)
    let requestedMaxCost = options.maximum_price_per_night * 100;
    // push param to params array
    queryParams.push(`${requestedMaxCost}`);
    // add string to query cost_per_night should be higher or equal to param for min cost
    queryString += `AND cost_per_night <= $${queryParams.length} `;
  }

  if (options.maximum_price_per_night) {
    // this will transform price in the format contained in database (in cents)
    let requestedMaxCost = options.maximum_price_per_night * 100;
    // push param to params array
    queryParams.push(`${requestedMaxCost}`);
    // add string to query cost_per_night should be lower or equal to param for max cost
    queryString += `AND cost_per_night <= $${queryParams.length} `;
  }

  if (options.minimum_rating) {
    queryParams.push(`${options.minimum_rating}`);
    // create a special if statement for rating as HAVING needs to be added after GROUP BY so the string is not the same as for the other params
    queryString += `
    GROUP BY properties.id
    HAVING avg(property_reviews.rating) >= $${queryParams.length} `;

    queryParams.push(limit);
    queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;
  } else {

  // 4
  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;
  }

  // 5
  console.log(queryString, queryParams);

  // 6
  return pool.query(queryString, queryParams).then((res) => res.rows);
};

  // return pool
  //   .query(
  //     `SELECT properties.*, avg(property_reviews.rating) as average_rating
  //     FROM properties
  //     LEFT JOIN property_reviews ON properties.id = property_id
  //     GROUP BY properties.id
  //     LIMIT $1`,
  //     [limit])
  //   .then((result) => {
  //     console.log(result.rows);
  //     return result.rows;
  //   })
  //   .catch((err) => {
  //     console.log(err.message);
  //   });
// };

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
