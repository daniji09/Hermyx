import pool from '../config/db.config.js';

/// INSERT
// Create
export const create = async ({ rating, comment }, client = pool) => {
  const result = await client.query(
    `INSERT INTO review (rating, comment)
     VALUES ($1, NULLIF($2, ''))
     RETURNING *`,
    [rating, comment || ''],
  );
  return result.rows[0];
};

/// FIND
// Find by user uid
export const findByUserUid = async (uid, pagination) => {
  const paginationClause = pagination ? 'LIMIT $2 OFFSET $3' : '';
  const values = pagination
    ? [uid, pagination.limit, pagination.offset]
    : [uid];
  const result = await pool.query(
    `WITH received_reviews AS (
       SELECT r.id, r.rating, r.comment, r.created_at,
         m.mid AS mission_id, m.title AS mission_title,
         owner_user.uid AS owner_id, owner_user.username AS owner_username,
         owner_user.avatar AS owner_avatar, 'adventurer' AS reviewed_role
       FROM app_user adventurer
       JOIN mission_participation mp ON mp.adventurer_id = adventurer.uid
       JOIN review r ON r.id = mp.owner_review_id
       JOIN mission m ON m.mid = mp.mid
       JOIN app_user owner_user ON owner_user.uid = m.owner_id
       WHERE adventurer.uid = $1
       UNION ALL
       SELECT r.id, r.rating, r.comment, r.created_at,
         m.mid AS mission_id, m.title AS mission_title,
         adventurer.uid AS owner_id, adventurer.username AS owner_username,
         adventurer.avatar AS owner_avatar, 'owner' AS reviewed_role
       FROM app_user owner_user
       JOIN mission m ON m.owner_id = owner_user.uid
       JOIN mission_participation mp ON mp.mid = m.mid
       JOIN review r ON r.id = mp.adventurer_review_id
       JOIN app_user adventurer ON adventurer.uid = mp.adventurer_id
       WHERE owner_user.uid = $1
     )
     SELECT *, COUNT(*) OVER()::int AS total_reviews,
       ROUND(AVG(rating) OVER()::numeric, 2) AS average_rating
     FROM received_reviews
     ORDER BY created_at DESC, id DESC
     ${paginationClause}`,
    values,
  );

  if (result.rows.length === 0) {
    return { averageRating: 0, totalReviews: 0, reviews: [] };
  }
  const averageRating = Number(result.rows[0].average_rating);
  const totalReviews = Number(result.rows[0].total_reviews);
  const reviews = result.rows.map((row) => {
    // eslint-disable-next-line no-unused-vars
    const { average_rating, total_reviews, ...review } = row;
    return review;
  });
  return { averageRating, totalReviews, reviews };
};
