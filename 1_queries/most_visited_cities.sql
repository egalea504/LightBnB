SELECT city, COUNT(reservations.id) as total_reservations
FROM properties
JOIN reservations ON property_id = properties.id
GROUP BY city
ORDER BY COUNT(reservations.id) DESC;