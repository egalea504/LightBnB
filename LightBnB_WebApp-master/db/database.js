const properties = require("./json/properties.json");
const users = require("./json/users.json");

const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */

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

  // 4
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

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */

const addProperty = (listing) => {

  const {owner_id, title , description, thumbnail_photo_url, cover_photo_url, cost_per_night, parking_spaces, street, city, province, post_code, country, number_of_bathrooms, number_of_bedrooms, active} = listing;
  return pool
    .query(
      `INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, parking_spaces, street, city, province, post_code, country, number_of_bathrooms, number_of_bedrooms, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *;`,
      [owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, parking_spaces, street, city, province, post_code, country, number_of_bathrooms, number_of_bedrooms, active || false])
    .then((result) => {
      console.log(result.rows);
      const insertedProperty = result.rows[0];
      const jsonProperty = {
        owner_id: insertedProperty.owner_id,
        title: insertedProperty.title,
        description: insertedProperty.description,
        thumbnail_photo_url: insertedProperty.thumbnail_photo_url,
        cover_photo_url: insertedProperty.cover_photo_url,
        cost_per_night: insertedProperty.cost_per_night,
        parking_spaces: insertedProperty.parking_spaces,
        street: insertedProperty.street,
        city: insertedProperty.city,
        province: insertedProperty.province,
        post_code: insertedProperty.post_code,
        country: insertedProperty.country,
        number_of_bathrooms: insertedProperty.number_of_bathrooms,
        number_of_bedrooms: insertedProperty.number_of_bedrooms,
        active: insertedProperty.active
      };
      return jsonProperty;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
